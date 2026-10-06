# Shopyos Delivery v2 — delivering through CPS

**Audience:** Shopyos backend engineers.
**Scope:** Shopyos **backend only**. The buyer, seller and admin apps keep working unchanged, because v2 fills the same fields and statuses they already read.
**Switch:** `DELIVERY_PROVIDER=v2` turns it on; `v1` (the current in-house drivers) is the rollback.

The CPS API itself is documented on the CPS `/developers` page (source: `cps/backend/openapi/partner-v1.yaml`). This guide covers what Shopyos has to build to use it.

---

## 1. What changes

| | v1 (today) | v2 (CPS) |
|---|---|---|
| Who delivers | Shopyos drivers claim jobs from a pool | CPS assigns its own riders |
| Delivery fee | Distance formula (`utils/distance.js`) + store settings | CPS binding quote (by buyer city) |
| Dispatch trigger | Seller marks `ready_for_pickup` → `createAndDispatchDelivery` notifies nearby drivers | Seller marks `ready_for_pickup` → Shopyos creates a CPS shipment |
| Status updates | Driver app → `PUT /deliveries/:id/status` | CPS webhook → Shopyos maps to the same statuses |
| Delivery PIN | Generated at pickup, driver enters it | Generated at dispatch, sent to CPS as `deliveryCode`; CPS rider enters it |
| Escrow release | `verify_delivery_pin` → `confirm_delivery_atomic` | CPS `shipment.delivered` webhook (code verified) → `confirm_delivery_atomic` |
| Payout | Driver gets `driver_earnings_percentage` (85%) of the fee | CPS gets **97.5%** of the fee; Shopyos keeps **2.5%** |
| Live GPS map | Driver location updates | None. CPS doesn't share GPS, so the map shows store and destination only. |

### Who goes through v2

**Only orders whose store is in a CPS pickup region** (today: Kumasi). CPS is based in Kumasi and collects from there. Every other store, for example in Accra, stays on v1 (in-house drivers and hubs). When CPS adds a pickup region, `GET /coverage` lists it and those stores move to v2 automatically. No code change is needed.

```
delivery_provider(order) =
  DELIVERY_PROVIDER == 'v2' AND store region ∈ CPS coverage.pickupRegions   → 'cps'
  otherwise                                                                  → 'inhouse'
```

Resolve the store region with the existing `utils/ghanaRegions.js` (`resolveStoreRegion`, around line 50).

---

## 2. Setup

1. **Get access.** On the CPS web app, sign up with **Account type: Business (API access)**. CPS approves the account. Then, in the CPS Business portal:
   - **API keys → Create key.** Create one for production and one for staging.
   - **Webhooks.** Set the URL to `https://shopyos-api-production.up.railway.app/api/v1/webhooks/cps` and copy the signing secret.
2. **Environment variables** (add them to `utils/validateEnv.js` as optional, required only when v2 is on):

   ```
   DELIVERY_PROVIDER=v2                  # v1 | v2
   CPS_API_URL=https://cps-production-6d97.up.railway.app/api/partner/v1
   CPS_API_KEY=cps_live_...
   CPS_WEBHOOK_SECRET=whsec_...
   ```
3. **Fee config** (`platform_fee_config`, read through `services/feeConfigService.js`): add `logistics_partner_commission_pct = 2.5`.
4. **Hours.** CPS runs on the same Railway schedule as Shopyos (about 05:00–20:00 UTC daily), so both are up at the same time. CPS riders work Mon–Sat, 08:00–19:30.

---

## 3. Database migration

Add `migrations/078_cps_delivery_provider.sql` (applied by `scripts/applyMigrations.js`):

```sql
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS provider            text NOT NULL DEFAULT 'inhouse'
                                               CHECK (provider IN ('inhouse','cps')),
  ADD COLUMN IF NOT EXISTS external_ref        text,          -- = orders.id, sent as externalReference
  ADD COLUMN IF NOT EXISTS tracking_code       text,          -- CPS tracking code, e.g. CPS-7KQ2M9XA
  ADD COLUMN IF NOT EXISTS external_status     text,          -- last CPS status seen
  ADD COLUMN IF NOT EXISTS external_sequence   bigint,        -- last webhook sequence applied
  ADD COLUMN IF NOT EXISTS external_driver_name  text,
  ADD COLUMN IF NOT EXISTS external_driver_phone text,
  ADD COLUMN IF NOT EXISTS pod_photo_url       text,
  ADD COLUMN IF NOT EXISTS dispatch_error      text,          -- last failed create attempt
  ADD COLUMN IF NOT EXISTS dispatch_attempts   int NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS deliveries_cps_tracking_code ON deliveries (tracking_code) WHERE provider = 'cps';

CREATE TABLE IF NOT EXISTS cps_webhook_events (
  event_id    text PRIMARY KEY,                -- CPS-Event-Id: de-duplication
  type        text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
```

`deliveries.driver_id` is already nullable, because unassigned deliveries exist today. CPS deliveries keep it `NULL`.

**`confirm_delivery_atomic` (`038_instant_payout.sql`)** credits `driver_earnings` to the driver's wallet. Change it, in the same migration, to **skip the driver wallet credit when `deliveries.provider = 'cps'`**. Everything else stays: seller escrow release and order → `completed`. The CPS payout is recorded separately (section 7).

---

## 4. `services/cpsClient.js`

A thin axios client. Every call needs a timeout and must never hang checkout.

```js
const axios = require('axios');

const cps = axios.create({
  baseURL: process.env.CPS_API_URL,
  timeout: 8000,
  headers: { Authorization: `Bearer ${process.env.CPS_API_KEY}` },
});

/** Throws CpsError with .code from the CPS error body: fee_mismatch, not_serviceable, ... */
class CpsError extends Error {
  constructor(err) {
    const body = err.response?.data?.error;
    super(body?.message || err.message);
    this.code = body?.code || (err.response ? 'http_error' : 'unreachable');
    this.status = err.response?.status;
    this.details = body?.details;
  }
}
const call = p => p.then(r => r.data).catch(e => { throw new CpsError(e); });

module.exports = {
  CpsError,
  coverage: () => call(cps.get('/coverage')),                      // cache in Redis ~1h
  quote: body => call(cps.post('/quotes', body)),
  createShipment: body => call(cps.post('/shipments', body)),       // idempotent on externalReference
  getShipment: ref => call(cps.get(`/shipments/${encodeURIComponent(ref)}`)),
  listShipments: params => call(cps.get('/shipments', { params })),
  cancel: (ref, reason) => call(cps.post(`/shipments/${encodeURIComponent(ref)}/cancel`, { reason })),
};
```

**Caching coverage.** Store `GET /coverage` in Redis for about an hour. If CPS is unreachable, use the last cached copy for routing and quotes, because rates rarely change. If there's no cache at all, treat the store as `inhouse`.

---

## 5. Checkout: delivery fee

Touch points: `controllers/deliveryFeeController.js` `getQuote` (around line 53) and `services/orderService.js`, where the fee is quoted per store (around lines 461–464) and recomputed at order creation (around lines 211–215).

When the provider is `cps`:

1. **Map the buyer's address to a CPS drop-off region.**
   - Use the buyer's city or region (`delivery_city` / resolved region) and match it case-insensitively against `coverage.dropoffRegions[].region`.
   - **Kumasi sub-area:** if the address mentions KNUST, Ayeduase, Ayigya, Bomso or Kotei, send `dropoffKumasiSubArea: 'CampusAndEnvirons'` (GHS 20). Otherwise send `'Other'` (GHS 35). When unsure, use `'Other'`.
2. **Get the fee:** `cpsClient.quote({ pickupRegion: storeRegion, dropoffRegion, dropoffKumasiSubArea })`.
3. **Return the existing quote shape** so `app/checkout.tsx` is unchanged:

   ```js
   { withinRange: q.serviceable, deliveryFee: q.fee, combinedDeliveryFee: q.fee,
     isInterRegional: false, parcelTransitFee: 0, lastMileFee: 0 }
   ```

   `withinRange: false` already shows "Not available" and blocks Place Order.
4. **At order creation**, re-quote server-side (never trust the client fee, same as today) and store it in `orders.delivery_fee`. Also store the region and sub-area you used (for example in `orders.buyer_notes` metadata, or a new column) so dispatch sends exactly what was quoted.

Multi-store checkout already creates one order per store with its own fee. That stays the same: one CPS shipment per store order.

---

## 6. Dispatch: seller marks "Ready"

Touch point: `controllers/orderController.js` `updateOrderStatus` (around line 339). The `ready_for_pickup` branch currently calls `createAndDispatchDelivery` (around lines 383–389).

1. **Add the missing guard (both v1 and v2):** reject `ready_for_pickup` unless the order is paid (`status` is `paid`/`confirmed`/`preparing` and escrow is `HELD`). Today an unpaid order can be dispatched.
2. If the provider is `cps`:
   - Generate the 6-digit PIN now. Use the same generator as `deliveryController.js` around line 269, and store it in `orders.verification_pin` exactly as today.
   - Insert a `deliveries` row with `provider='cps'`, `external_ref=order.id`, `status='unassigned'`, `driver_id=NULL`, and the existing address and fee columns.
   - Call:

     ```js
     await cpsClient.createShipment({
       externalReference: order.id,
       pickup:  { name: store.store_name, phone: store.phone, region: storeRegion,
                  location: [store.address_line1, store.city].filter(Boolean).join(', ') },
       dropoff: { name: buyer.full_name, phone: order.delivery_phone, region: dropoffRegion,
                  kumasiSubArea, location: order.delivery_address_line1,
                  latitude: order.delivery_latitude || undefined, longitude: order.delivery_longitude || undefined },
       package: { type: 'parcel', size: 'medium', description: `${itemCount} item(s) from ${store.store_name}` },
       expectedFee: Number(order.delivery_fee),
       deliveryCode: order.verification_pin,
       instructions: order.buyer_notes || undefined,
     });
     ```
   - Save `tracking_code` from the response.
3. **If the create fails:**
   - **`unreachable`, `http_error` or 5xx:** keep the order `ready_for_pickup`, increment `dispatch_attempts`, store `dispatch_error`, and retry from a cron every 5 minutes. Creates are idempotent on `externalReference`, so retrying is always safe.
   - **`fee_mismatch`:** CPS rates changed after checkout. The buyer has already paid, so **don't re-charge**. Alert admin and retry with `expectedFee: err.details.fee` only after an admin decides who absorbs the difference.
   - **`not_serviceable`:** coverage shrank. Fall back to the v1 in-house dispatch for this order and alert admin.
4. **Seller UI:** "Waiting for driver to accept" is still correct while the delivery is `unassigned`.

---

## 7. Webhook: CPS → Shopyos

Add `POST /api/v1/webhooks/cps` (controller `controllers/cpsWebhookController.js`). Mount it with a raw body parser, like the Paystack webhook (`server.js` around line 114). The signature is computed over the raw bytes.

```js
const crypto = require('crypto');

function verify(raw, header, secret) {
  const parts = Object.fromEntries((header || '').split(',').map(p => p.split('=')));
  if (!parts.t || !parts.v1 || Math.abs(Date.now() / 1000 - Number(parts.t)) > 300) return false;
  const expected = crypto.createHmac('sha256', secret).update(`${parts.t}.${raw}`).digest('hex');
  return expected.length === parts.v1.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1));
}

exports.handle = async (req, res) => {
  const raw = req.body.toString('utf8');
  if (!verify(raw, req.get('CPS-Signature'), process.env.CPS_WEBHOOK_SECRET)) return res.status(400).end();
  const event = JSON.parse(raw);

  // De-duplicate: CPS may send an event more than once.
  const { rowCount } = await pool.query(
    'INSERT INTO cps_webhook_events (event_id, type) VALUES ($1, $2) ON CONFLICT DO NOTHING',
    [event.id, event.type]);
  if (rowCount === 0) return res.sendStatus(200);

  res.sendStatus(200);                // ack within 10s; CPS retries anything else
  await applyCpsShipment(event);      // errors here are logged; reconciliation (section 9) catches up
};
```

`applyCpsShipment(event)` does the following:

1. Load the delivery by `event.data.shipment.externalReference` (= order id), with `FOR UPDATE`. **Ignore the event if `event.sequence <= deliveries.external_sequence`**, because it is older than what's applied. Otherwise save the `sequence`, `external_status` and rider name/phone.
2. Map the status to the **existing** Shopyos statuses, so the apps need no changes:

   | CPS `shipment.status` (and event) | `deliveries.status` | `orders.status` | Also do |
   |---|---|---|---|
   | `pending`, `rider` null | `unassigned` | `ready_for_pickup` | — |
   | `pending`, `rider` set (`shipment.rider_assigned`) | `assigned` | `assigned` | Set `assigned_at` |
   | `picked_up` | `picked_up` | `in_transit` | Set `picked_up_at`; send the existing **PIN notification** (`ORDER_PICKED_UP` template, `deliveryController.js` around lines 214–247) |
   | `in_transit` / `out_for_delivery` | `in_transit` | `in_transit` | — |
   | `delayed` | (unchanged) | (unchanged) | Notify buyer with `events[-1].note` |
   | `delivered` **and** `proofOfDelivery.deliveryCodeVerified` | `delivered` | via `confirm_delivery_atomic` → `completed` | Save `pod_photo_url`; record the CPS payout (section 8); send `ORDER_DELIVERED` |
   | `delivered` without a verified code | — | — | Should not happen; alert admin and **don't** release escrow |
   | `failed` | `cancelled` | (unchanged) | Hold escrow and payout; alert admin (decided case by case) |
   | `cancelled` | `cancelled` | (unchanged) | If Shopyos didn't request it, alert admin |

3. Publish `order:transit_update` through `services/realtimePublisher.js` (see `services/transitEvents.js`) so open app screens refresh.

---

## 8. Paying CPS

On `delivered`, inside the same transaction as `confirm_delivery_atomic`:

```
cps_amount = round(order.delivery_fee × (1 − logistics_partner_commission_pct/100), 2)   -- 45 → 43.88
platform_revenue += order.delivery_fee − cps_amount                                      -- 1.12
```

- **Payout record.** Write a payout with a new payee type `logistics_partner` (recipient: CPS's Paystack transfer recipient, created once and stored in config).
- **Transfer.** Then use the existing flow: `attemptInstantPayout` (`payoutController.js` around line 501) for an immediate transfer, with the nightly sweep in `workers/payoutScheduler.js` retrying failures. This mirrors driver payouts today.
- **Duplicates.** Guard with a unique key on `(order_id, payee_type)` so a duplicated webhook can't pay twice.
- **Reconciliation.** CPS's Business portal has a **Statement** of delivered orders and fees for any date range. Use it to check the transfers.

---

## 9. Cancellations and reconciliation

- **Buyer or seller cancels** (`orderController.cancelOrder`, `orderService.js` around line 581): for a CPS order, call `cpsClient.cancel(order.id, reason)` **first**.
  - `409 conflict` means the rider has already picked it up. Refuse the cancellation and tell the user to contact support. Admin handles it with CPS.
  - On success, also mark the delivery cancelled with the existing (currently unused) `DeliveryRepository.cancelDelivery`.
- **Reconciliation cron** (every 15 min while up, plus once at startup): call `cpsClient.listShipments({ updatedSince: lastSyncedAt })`, page through `nextCursor`, and run each shipment through `applyCpsShipment`. Use a synthetic sequence, or skip the sequence check when the CPS status is further along. This covers webhooks missed while Shopyos was down or deploying.

---

## 10. Keeping the apps unchanged

The apps read deliveries through `DeliveryRepository` (for example `findById` joins `driver:driver_id (… user_profiles (full_name, phone, avatar_url))`). For `provider = 'cps'` rows, have the repository or controller fill in the same shape:

```js
if (delivery.provider === 'cps') {
  delivery.driver = delivery.external_driver_name ? {
    id: `cps:${delivery.tracking_code}`,
    user_profiles: { full_name: delivery.external_driver_name, phone: delivery.external_driver_phone, avatar_url: null },
    vehicle_type: 'motorbike',
    plate_number: null,
  } : null;
  delivery.delivery_location_updates = [];   // no GPS from CPS
}
```

What happens to each existing screen:

- **Buyer order screen** (`app/order/[id].tsx`): the timeline, the PIN card (shown on `picked_up`/`in_transit`), the driver card with Call, and "Confirm Delivery" all keep working.
- **Driver chat:** in-app driver chat has no Shopyos user to talk to. The Call button uses the CPS rider's phone.
- **Live map** (`app/order/tracking.tsx`): shows store and destination with no moving marker. `GET /deliveries/:id/latest-location` returns nothing for CPS rows.
- **Seller order screen:** "Waiting for driver", then the driver card. Unchanged.
- **Admin Deliveries page:** works off `deliveries`. Optionally show `provider` and `tracking_code` later.
- **Driver app:** CPS deliveries never appear in `GET /deliveries/available`. Filter `provider = 'inhouse'` there and in `/assign`.

---

## 11. Rollout checklist

1. Deploy the migration, client, webhook and dispatch code with `DELIVERY_PROVIDER=v1`. Nothing changes yet.
2. In staging (CPS staging key): set `v2`. Then, with a Kumasi store and an Accra buyer:
   1. Checkout shows GHS 45.
   2. Pay, then mark Ready. The order appears in CPS Ops → Active Orders with a "Shopyos · prepaid" badge.
   3. CPS assigns a rider. The Shopyos buyer sees the driver card.
   4. Rider picks up. The buyer gets the PIN.
   5. Rider enters a wrong PIN, then the right one. The order becomes `completed`, seller escrow is released, and a CPS payout of GHS 43.88 is recorded.
3. Repeat with an **Accra** store. It must stay on v1 drivers.
4. Cancel before pickup (works) and after pickup (refused).
5. Stop the Shopyos backend, advance a CPS shipment, restart. The CPS retry or the reconciliation cron applies the change.
6. Production: switch `DELIVERY_PROVIDER=v2`. Watch the CPS portal **Webhooks** log and the Shopyos logs for the first day.
7. **Rollback:** set `DELIVERY_PROVIDER=v1`. New orders go back to in-house drivers. CPS orders already dispatched keep updating through webhooks until they finish.

## 12. Known limitations

- No live GPS for CPS deliveries.
- No in-app chat with CPS riders; buyers call them.
- CPS picks up from Kumasi only, so other stores stay on v1.
- The fee is set by the buyer's city. Wrong Kumasi sub-area detection gives the wrong fee, which is still binding. Default to `Other`.
- Failed deliveries and returns are handled manually by admins on both sides.
