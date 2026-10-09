# Shopyos Delivery v2 — delivering through CPS

**Audience:** Shopyos backend engineers.
**Scope:** Shopyos **backend only**. **No change to `frontend/` (the Expo app).** Every buyer and seller screen was checked against this design, and v2 returns the same fields and statuses those screens already read. Section 11 lists each screen.
**Switch:** `DELIVERY_PROVIDER=v2` turns it on. `off` is the emergency stop: delivery unavailable everywhere, pickup only.

> **Rule: v2 never hands an order to Shopyos drivers or hubs.** Shopyos has no riders. Promising a delivery nobody will make deceives the buyer. CPS is the only delivery option. Where CPS can't deliver, the buyer is told so and can choose **Pickup · Free**. When CPS is temporarily unreachable, Shopyos waits and retries; it never switches provider.

The CPS API itself is documented on the CPS `/developers` page (source: `cps/backend/openapi/partner-v1.yaml`). This guide covers what Shopyos has to build to use it. File and line references are to the Shopyos repo as of this writing.

---

## 1. What changes

| | v1 (today) | v2 (CPS) |
|---|---|---|
| Who delivers | Shopyos drivers claim jobs from a pool | CPS assigns its own riders |
| Delivery fee | Distance formula (`utils/distance.js`), store settings, hubs for cross-region | CPS binding price for the **store's city → buyer's city** (section 5) |
| Store and buyer in different regions (e.g. Kumasi → Accra, Accra → Tamale) | **Inter-regional hub flow**: store → origin hub → transit → destination hub → last mile | **One CPS delivery, door to door.** No hubs, no transit fee, no last-mile request. |
| Store and buyer in the same city (e.g. Accra → Accra) | Local driver | CPS rider in that city, GHS 35 |
| Dispatch trigger | Seller marks `ready_for_pickup` → `createAndDispatchDelivery` notifies nearby drivers | Seller marks `ready_for_pickup` → Shopyos creates a CPS shipment |
| Status updates | Driver app → `PUT /deliveries/:id/status` | CPS webhook → Shopyos sets the **same** statuses v1 uses |
| Delivery PIN | Generated at pickup; driver enters it | Generated at dispatch and sent to CPS as `deliveryCode`; CPS rider enters it. The buyer still sees it only once the order is in transit. |
| Escrow release | `verify_delivery_pin` → `confirm_delivery_atomic` | CPS `shipment.delivered` webhook (code verified) → `confirm_delivery_atomic` |
| Payout | Driver gets `driver_earnings_percentage` (85%) of the fee | CPS gets the same `driver_earnings_percentage` (**85%**); Shopyos keeps **15%** |
| Live GPS map | Driver location updates | None. The map shows store and destination only. |
| Driver chat / in-app call | Agora call and chat with the driver (Shopyos user) | Not available. CPS riders aren't Shopyos users. The rider's name and phone are shown instead (section 10). |
| Store or buyer outside the 5 CPS cities (e.g. Cape Coast, Ho) | In-house drivers / hubs | **Delivery not available; Pickup · Free only.** No driver or hub flow runs. |
| CPS temporarily unreachable | — | Checkout: "Couldn't calculate delivery fee. Retry". Dispatch: order waits as "Ready" and retries. **Never** switches to Shopyos drivers. |

### Delivery options under v2

```
delivery_option(store, buyerPin) =
  DELIVERY_PROVIDER == 'off'                                              → pickup only
  cpsCityForPoint(store) ∉ coverage.pickupRegions                          → pickup only   ("not available from this store yet")
  cpsCityForPoint(buyerPin) ∉ coverage.dropoffRegions                       → pickup only   ("CPS doesn't deliver to your area")
  otherwise                                                                 → CPS delivery, fee = route(storeCity → buyerCity)
```

CPS has people in **Kumasi, Accra, Takoradi, Sunyani and Tamale**. They collect from stores and deliver to buyers in any of these cities, within a city and between cities. Only stores or buyers **outside** these five cities get pickup only. If CPS adds a city, `GET /coverage` lists it, and Shopyos needs only a new circle in `utils/cpsGeo.js` (section 5.1).

**CPS prices** (the same in both directions; `GET /coverage` → `routes`):

| From \ To | Kumasi | Accra | Takoradi | Sunyani | Tamale |
|---|---|---|---|---|---|
| **Kumasi** | 35 (KNUST area 20) | 45 | 55 | 55 | 60 |
| **Accra** | 45 | 35 | 55 | 55 | 60 |
| **Takoradi** | 55 | 55 | 35 | 55 | 60 |
| **Sunyani** | 55 | 55 | 55 | 35 | 60 |
| **Tamale** | 60 | 60 | 60 | 60 | 35 |

**Under v2, `createAndDispatchDelivery`, `notifyNearbyDrivers`, the hub/parcel-partner flow and last-mile requests must never run for new orders.** Guard them behind `DELIVERY_PROVIDER !== 'v2'` so a code path can't promise a Shopyos driver by accident.

Use **coordinates**, not region names (section 5.1). Get store coordinates with the existing `resolveStoreCoords` (`utils/ghanaRegions.js`, around line 80).

---

## 2. Setup

1. **Get access.** On the CPS web app, sign up with **Account type: Business (API access)**. CPS approves the account. Then, in the CPS Business portal:
   - **API keys → Create key.** Create one for production and one for staging.
   - **Webhooks.** Set the URL to `https://shopyos-api-production.up.railway.app/api/v1/webhooks/cps` and copy the signing secret.
2. **Environment variables** (add them to `utils/validateEnv.js` as optional, required only when v2 is on):

   ```
   DELIVERY_PROVIDER=v2                  # v2 = CPS delivery | off = pickup only (never back to in-house drivers)
   CPS_API_URL=https://cps-production-6d97.up.railway.app/api/partner/v1
   CPS_API_KEY=cps_live_...
   CPS_WEBHOOK_SECRET=whsec_...
   ```
3. **Fee config:** nothing new. CPS is paid with the existing `driver_earnings_percentage` (85) in `platform_fee_config`, so CPS and in-house drivers always get the same share.
4. **Hours.** CPS runs on the same Railway schedule as Shopyos (about 05:00–20:00 UTC daily). CPS riders work Mon–Sat, 08:00–19:30.

---

## 3. Database migration

Add `migrations/078_cps_delivery_provider.sql` (applied by `scripts/applyMigrations.js`):

```sql
ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS provider              text NOT NULL DEFAULT 'inhouse'
                                                 CHECK (provider IN ('inhouse','cps')),
  ADD COLUMN IF NOT EXISTS external_ref          text,      -- = orders.id, sent as externalReference
  ADD COLUMN IF NOT EXISTS tracking_code         text,      -- CPS tracking code, e.g. CPS-7KQ2M9XA
  ADD COLUMN IF NOT EXISTS external_status       text,      -- last CPS status seen
  ADD COLUMN IF NOT EXISTS external_sequence     bigint,    -- last webhook sequence applied
  ADD COLUMN IF NOT EXISTS external_driver_name  text,
  ADD COLUMN IF NOT EXISTS external_driver_phone text,
  ADD COLUMN IF NOT EXISTS pod_photo_url         text,
  ADD COLUMN IF NOT EXISTS dispatch_error        text,      -- last failed create attempt
  ADD COLUMN IF NOT EXISTS dispatch_attempts     int NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS deliveries_cps_tracking_code ON deliveries (tracking_code) WHERE provider = 'cps';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS cps_pickup_region    text,       -- store's CPS city, as quoted
  ADD COLUMN IF NOT EXISTS cps_dropoff_region   text,       -- buyer's CPS city, as quoted; both reused at dispatch
  ADD COLUMN IF NOT EXISTS cps_kumasi_sub_area  text;

CREATE TABLE IF NOT EXISTS cps_webhook_events (
  event_id    text PRIMARY KEY,                -- CPS-Event-Id: de-duplication
  type        text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);
```

- **`deliveries.driver_id`** is already nullable; CPS rows keep it **`NULL`**. Never put a fake value there. `POST /reviews/driver` and foreign keys depend on it being a real user.
- **`confirm_delivery_atomic` (`038_instant_payout.sql`)** already skips the driver wallet credit when `driver_id` is NULL. It doesn't need changing, but note two things about how it behaves:
  - Its `v_platform_fee` books the **whole** delivery fee as platform revenue. The webhook must move the CPS 85% out of platform revenue (section 8).
  - It only sets `deliveries.status = 'delivered'` inside the driver branch. The webhook must set it itself (section 7).

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

**Caching coverage.** Store `GET /coverage` in Redis for about an hour, and keep the last good copy indefinitely as a fallback (rates rarely change). Routing (which stores are CPS stores) uses the cached `pickupRegions`, falling back to the five CPS cities if nothing has ever been cached. Never move a store to Shopyos drivers because CPS is unreachable (Shopyos has no riders). Checkout shows "Retry" (section 5.2), and dispatch waits and retries (section 6).

---

## 5. Checkout: any CPS city → any CPS city

This is the part that differs most from v1. A store in any CPS city selling to a buyer in any CPS city is **one CPS delivery at one CPS price**: Kumasi → Accra, Accra → Kumasi, Accra → Accra, Takoradi → Tamale, and so on. Shopyos's inter-regional hub flow must not run for any of them.

### 5.1 Map points to CPS cities by coordinates

Region names won't work:
- `deliveryState` from the app is a Ghana administrative region from `nearestGhanaRegion` (for example "Ashanti" or "Greater Accra").
- `checkout.tsx` hardcodes `deliveryCity: 'Accra'` for every order.
- `resolveStoreRegion` returns free text.

CPS uses **city** names. Use the coordinates the app already sends (`buyerLat`/`buyerLng`; checkout requires a map pin) and the store's coordinates.

Add `utils/cpsGeo.js`:

```js
const { haversineKm } = require('./distance');

// CPS service areas (confirm radii with CPS ops; adjust as they grow).
const CPS_CITIES = [
  { city: 'Kumasi',   lat: 6.6885, lng: -1.6244, radiusKm: 20 },
  { city: 'Accra',    lat: 5.6037, lng: -0.1870, radiusKm: 30 },   // includes Tema
  { city: 'Takoradi', lat: 4.8960, lng: -1.7550, radiusKm: 20 },   // Sekondi-Takoradi
  { city: 'Sunyani',  lat: 7.3399, lng: -2.3268, radiusKm: 15 },
  { city: 'Tamale',   lat: 9.4008, lng: -0.8393, radiusKm: 20 },
];
// KNUST campus & environs (Ayeduase, Ayigya, Bomso, Kotei) — CPS "CampusAndEnvirons" rate
const KNUST = { lat: 6.6745, lng: -1.5716, radiusKm: 3 };

function cpsCityForPoint(lat, lng) {
  if (lat == null || lng == null || (Number(lat) === 0 && Number(lng) === 0)) return null;
  const hit = CPS_CITIES
    .map(c => ({ ...c, d: haversineKm(Number(lat), Number(lng), c.lat, c.lng) }))
    .filter(c => c.d <= c.radiusKm)
    .sort((a, b) => a.d - b.d)[0];
  return hit?.city ?? null;
}

function kumasiSubArea(lat, lng) {
  return haversineKm(Number(lat), Number(lng), KNUST.lat, KNUST.lng) <= KNUST.radiusKm
    ? 'CampusAndEnvirons' : 'Other';
}

module.exports = { cpsCityForPoint, kumasiSubArea };
```

- **Use it for both ends.** `storeCity = cpsCityForPoint(storeCoords)` (from `resolveStoreCoords`) and `buyerCity = cpsCityForPoint(buyerPin)`.
- **Same function for quote and order creation**, so the fee shown is the fee charged. A Kumasi sub-area guessed from address text at order time (GHS 20) but `Other` at quote time (GHS 35) would charge the buyer a different amount from the one shown.
- **The KNUST sub-area only matters within Kumasi** (store and buyer both in Kumasi). Accra → KNUST is the normal Accra ↔ Kumasi price, 45.
- **Store or buyer outside every circle** (for example Cape Coast, Ho, or a village in Ashanti outside Kumasi): CPS can't serve that end, so the quote is `withinRange:false` with a clear note, and the buyer can choose Pickup · Free. Never offer a Shopyos driver instead.

### 5.2 Quote endpoint

Touch point: `controllers/deliveryFeeController.js` `getDeliveryQuote` (around line 53).

With v2 on, **every** quote goes through this branch; nothing falls through to the v1 pricing below. For a store CPS can't collect from (or `DELIVERY_PROVIDER=off`), return:

```js
return ApiResponse.withEntity(res, 'quote', {
  withinRange: false, deliveryFee: null, combinedDeliveryFee: null, isInterRegional: false,
  parcelTransitFee: 0, lastMileFee: 0,
  note: 'Delivery isn\'t available from this store yet. Choose Pickup to collect it from the store.',
});
```

For a CPS store, **short-circuit before** `resolveCoordinateFee` (line 63) and before the regional/inter-regional branch (lines 77–148). Otherwise:
- the store's `delivery_max_km` makes Kumasi → Accra `withinRange:false`;
- the cross-region branch sets `isInterRegional:true` and adds hub transit fees.

Price from the **cached route list** (`GET /coverage` → `routes`, refreshed hourly). It's identical to `POST /quotes`, and a CPS hiccup can't break checkout:

```js
// cpsPricing.js — fee from cached coverage; same function used at order creation.
async function cpsFee(storeCity, buyerCity, subArea) {
  const coverage = await getCachedCoverage();          // Redis; refetch if older than 1h
  if (!coverage) throw new Error('CPS rates unavailable');   // → 5xx → app shows "Couldn't calculate… Retry"
  const withinKumasi = storeCity === 'Kumasi' && buyerCity === 'Kumasi';
  const row = coverage.routes.find(r =>
    r.pickupRegion === storeCity && r.dropoffRegion === buyerCity &&
    (withinKumasi ? r.kumasiSubArea === subArea : r.kumasiSubArea === null));
  return row ? row.fee : null;                         // null = CPS doesn't serve this route
}

if (provider === 'cps') {                              // store is inside a CPS city
  const storeCity = cpsCityForPoint(storeLat, storeLng);
  const buyerCity = cpsCityForPoint(buyerLat, buyerLng);
  const subArea = buyerCity === 'Kumasi' ? kumasiSubArea(buyerLat, buyerLng) : undefined;
  const fee = buyerCity ? await cpsFee(storeCity, buyerCity, subArea) : null;   // throws if no rates at all
  const q = fee == null ? { serviceable: false } : { serviceable: true, fee };
  return ApiResponse.withEntity(res, 'quote', {          // keep the existing { success, quote } wrapper
    withinRange: q.serviceable,
    deliveryFee: q.serviceable ? q.fee : null,
    combinedDeliveryFee: q.serviceable ? q.fee : null,
    isInterRegional: false,                              // hides the hub picker; no hub required
    parcelTransitFee: 0,
    lastMileFee: 0,
    storeRegion: storeCity,
    note: q.serviceable ? undefined
      : 'Delivery is available to Kumasi, Accra, Takoradi, Sunyani and Tamale only. Choose Pickup to collect it from the store.',
  });
}
```

What the app does with this (`app/checkout.tsx`):
- reads `res.success` and `res.quote.*` (lines 257–262);
- shows the fee line and total from `deliveryFee`/`combinedDeliveryFee` (lines 298, 349, 617–631);
- with `isInterRegional:false`, never shows the cross-region card or the hub picker, and doesn't require `pickupHubId` (lines 299, 452, 698+, 920+, 1054);
- with `withinRange:false`, shows "Not available", blocks Place Order, and displays `note` (line 1003).

No app change.

**What the buyer sees**:

| Store → buyer's pin | That store's line in Order Summary | Place Order |
|---|---|---|
| Kumasi → Accra, or Accra → Kumasi | `Delivery  GHS 45.00` (one line; no hub legs, no "Cross-region" badge) | enabled |
| Kumasi → near KNUST / rest of Kumasi | `GHS 20.00` / `GHS 35.00` | enabled |
| Accra → Accra (any same-city delivery outside Kumasi) | `GHS 35.00` | enabled |
| Kumasi → Takoradi / Sunyani / Tamale | `GHS 55.00` / `GHS 55.00` / `GHS 60.00` | enabled |
| Accra → Takoradi or Sunyani / Accra → Tamale | `GHS 55.00` / `GHS 60.00` | enabled |
| Store or buyer outside the 5 CPS cities | `Not available` plus a red banner with our `note` | disabled; the buyer can choose **Pickup · Free** for that store |
| CPS rates unavailable and nothing cached | "Couldn't calculate delivery fee. **Retry**" banner (from the 5xx) | disabled |

Never answer "CPS unreachable" with `withinRange:false`. That would tell buyers delivery isn't available when it is.

### 5.3 Order creation

Touch points in `services/orderService.js`:
- `validateStoreDeliveryRanges` (lines 55–68, called at 455) rejects the order: "outside the delivery radius". **Skip it for CPS stores.**
- `quoteStoreOrder` (lines 156–215): the `crossRegion` branch (line 159/167) makes the order inter-regional, adding a transit fee and hubs and setting `order_type='inter_regional'` (lines 308–333). That sends the buyer to the transit tracker and tells the seller "deliver it to the origin hub". **For CPS stores, skip the whole cross-region branch:**
  - `delivery_fee` = CPS quote (re-quoted server-side with the same `cpsCityForPoint`/`kumasiSubArea` from `buyerLat`/`buyerLng`; never trust the client fee)
  - `parcel_transit_fee = 0`, `last_mile_fee = 0`
  - `order_type = 'local'`
  - save `cps_pickup_region`, `cps_dropoff_region` and `cps_kumasi_sub_area` on the order so dispatch sends exactly what was quoted
- Use the same `cpsFee()` (cached rate card) as the quote, so the charged fee always equals the fee shown. If there are no rates at all, reject with a retryable error rather than "not available".
- **"Pickup · Free" orders** (`delivery_method = 'pickup'`, chosen per store in checkout) have no delivery fee and are **never** sent to CPS. Leave them on the existing pickup flow.

Multi-store checkout already creates one order per store with its own fee. That stays: **one CPS shipment per store order.**
- **Mixed cart** (a Kumasi store and an Accra store, buyer in Accra): two CPS shipments. Kumasi → Accra costs 45 and Accra → Accra costs 35, each picked up in its own city.
- **A store outside the 5 cities** (e.g. Cape Coast) in the same cart shows "Not available", and the app blocks Place Order until the buyer picks **Pickup · Free** for it. That's existing app behaviour, so there's no way to place a delivery order nobody can fulfil.
- **Server-side guard:** `orderService` must also reject (400, same note) any `delivery_method='delivery'` order CPS can't serve under v2. The app already prevents it; this stops API misuse.

---

## 6. Dispatch: seller marks "Ready"

Touch point: `controllers/orderController.js` `updateOrderStatus` (around line 339). The `ready_for_pickup` branch currently calls `createAndDispatchDelivery` (around lines 383–389).

1. **Add the missing guard (v1 and v2):** reject `ready_for_pickup` unless the order is paid (escrow `HELD`). Today an unpaid order can be dispatched.
2. If the provider is `cps` **and** `order.delivery_method !== 'pickup'` (store-pickup orders are never sent to CPS):
   - Generate the 6-digit PIN now. Use the same generator as `deliveryController.js` around line 269, and store it in `orders.verification_pin` exactly as today. The buyer app shows the PIN card only when `order.status` is `picked_up`/`in_transit` (`app/order/[id].tsx` line 389), so creating it earlier doesn't show it earlier.
   - Insert the `deliveries` row:
     - `provider='cps'`, `leg='local'`, `external_ref=order.id`, `status='unassigned'`, `driver_id=NULL`
     - **Real coordinates:** `delivery_latitude/longitude` from the order, and `pickup_latitude/longitude` from `resolveStoreCoords`. Not `store.latitude || 0`: the tracking screen centres the map on these, and `0,0` puts the pin in the Gulf of Guinea.
   - Call:

     ```js
     await cpsClient.createShipment({
       externalReference: order.id,
       pickup:  { name: store.store_name, phone: store.phone, region: order.cps_pickup_region,
                  location: [store.address_line1, store.city].filter(Boolean).join(', ') },
       dropoff: { name: buyer.full_name, phone: order.delivery_phone,
                  region: order.cps_dropoff_region, kumasiSubArea: order.cps_kumasi_sub_area || undefined,
                  location: order.delivery_address_line1,
                  latitude: Number(order.delivery_latitude) || undefined,
                  longitude: Number(order.delivery_longitude) || undefined },
       package: { type: 'parcel', size: 'medium', description: `${itemCount} item(s) from ${store.store_name}` },
       expectedFee: Number(order.delivery_fee),
       deliveryCode: order.verification_pin,
       instructions: order.buyer_notes || undefined,
     });
     ```
   - Save `tracking_code` from the response.
3. **Order status stays `ready_for_pickup` until pickup**, exactly like v1. v1 never sets the order to `assigned`; only the delivery row changes.
4. **If the create fails:**
   - **`unreachable`, `http_error` or 5xx:** keep `ready_for_pickup`, increment `dispatch_attempts`, store `dispatch_error`, and retry from a cron every 5 minutes (creates are idempotent on `externalReference`). **Never** fall back to Shopyos drivers.
     - If it's still failing after 2 hours of CPS uptime, alert admin.
     - Tell the seller and buyer honestly ("Courier booking is delayed; we'll update you").
     - The order stays "Ready" and keeps retrying. Overnight downtime (both services sleep about 20:00–05:00 UTC) isn't a failure: the retry at wake-up books it.
   - **`fee_mismatch`:** CPS rates changed after checkout. The buyer has already paid, so **don't re-charge**. Alert admin, and retry with `expectedFee: err.details.fee` only once admin decides who absorbs the difference.
   - **`not_serviceable`:** CPS coverage shrank after checkout, which is rare. **Don't** hand it to Shopyos drivers. Mark the delivery `cancelled` with `dispatch_error`, alert admin, and tell the buyer and seller the delivery can't be made. Admin then offers store pickup or a refund (escrow is still held).
5. **Seller UI:** "Waiting for driver to accept" shows while the order is `ready_for_pickup` (`app/business/orderDetails.tsx` lines 295–304). That stays correct until CPS picks up.

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

1. Load the delivery by `event.data.shipment.externalReference` (= order id), with `FOR UPDATE`. **Ignore the event if `event.sequence <= deliveries.external_sequence`**. Otherwise save `sequence`, `external_status` and the rider's name and phone (`shipment.rider`).
2. Map to the **existing v1 statuses**, so the apps need no changes:

   | CPS `shipment.status` | `deliveries.status` | `orders.status` | Also do |
   |---|---|---|---|
   | `pending`, `rider` null | `unassigned` | `ready_for_pickup` (unchanged) | — |
   | `pending`, `rider` set | `assigned` | **`ready_for_pickup` (unchanged)** | Set `assigned_at`; send `sendOrderNotification(buyer, order, 'assigned')`, as v1 does (`deliveryController.js` line 129) |
   | `picked_up` | `picked_up` | `in_transit` | Set `picked_up_at`; send the existing PIN notification `_notifyPickedUp` (`deliveryController.js` lines 214–247; export it for the webhook) |
   | `in_transit` / `out_for_delivery` | `in_transit` | `in_transit` | Kumasi → Accra spends hours here; that's normal |
   | `delayed` | (unchanged) | (unchanged) | Notify the buyer as `order_update` with `events[-1].note` (there is no `order_delayed` type in the app) |
   | `delivered` **and** `proofOfDelivery.deliveryCodeVerified` | **`delivered`** (set it yourself) | via `confirm_delivery_atomic` → `completed` | Clear `verification_pin` and set `pin_verified_at`, as v1's `verify_delivery_pin` does; save `pod_photo_url`; record the CPS payout (section 8); send the delivered notification |
   | `delivered` without a verified code | — | — | Should not happen; alert admin and **don't** release escrow |
   | `failed` | `cancelled` | (unchanged) | Hold escrow and payout; alert admin (decided case by case) |
   | `cancelled` | `cancelled` | (unchanged) | If Shopyos didn't request it, alert admin |

   **Never set `orders.status = 'assigned'`.** The buyer app has no entry for it:
   - `STATUS_RANK` in `app/order/[id].tsx` (line 127) would make the whole timeline grey.
   - The status pill would show raw text.
   - The buyer's order list filters wouldn't include it.
3. **Notifications** must use notification types the app already routes: `order_update`, `order_assigned`, `order_picked_up`, `order_delivered`, `delivery_update`, `delivery_issue`. Include `data.orderId`, and for push `data: { screen: 'order', orderId }`, matching `utils/notificationRouting.ts` (lines 33–36, 104–107, 150–154, 230). `sendOrderNotification` already does this.
4. The app refreshes the order screens by polling (buyer, every 10 s) and pull-to-refresh (seller). No socket event is needed. `order:transit_update` is only listened to by the transit tracker, which CPS orders never open.

---

## 8. Paying CPS

On `delivered`, in the same transaction as `confirm_delivery_atomic`:

```
pct        = feeConfig.driver_earnings_percentage                      -- 85, same share as in-house drivers
cps_amount = round(order.delivery_fee × pct/100, 2)                     -- 45 × 85% → 38.25
platform_revenue -= cps_amount                                          -- confirm_delivery_atomic booked the whole fee; keep only 6.75
```

- **Payout record.** Write a payout with a new payee type `logistics_partner` (recipient: CPS's Paystack transfer recipient, created once and stored in config).
- **Transfer.** Then use the existing flow: `attemptInstantPayout` (`payoutController.js` around line 501) for an immediate transfer, with the nightly sweep in `workers/payoutScheduler.js` retrying failures. This mirrors driver payouts.
- **No double payment.** Guard with a unique key on `(order_id, payee_type)` so a duplicated webhook can't pay twice.
- **Escrow released early.** If escrow was already released (an admin release, or a buyer calling `PUT /orders/:id/confirm-delivery` through the API), `confirm_delivery_atomic` returns `success:false`. **Still** mark the delivery delivered and record the CPS payout.
- **Reconciliation.** CPS's Business portal has a **Statement** of delivered orders and fees per period. Use it to check the transfers.

---

## 9. Cancellations and reconciliation

There are two cancel paths, and both must call CPS first for CPS orders:

- **Buyer cancel** (`orderController.cancelOrder`, `orderService.js` around line 581). Buyers can only cancel `pending` orders, which is before dispatch, so there's usually no CPS shipment yet. Check anyway.
- **Seller cancel**: `app/business/orderDetails.tsx` (lines 331–340) shows Cancel for every status except delivered/cancelled, and it calls `PUT /orders/:id/status` with `cancelled`, which is `updateOrderStatus`, not `cancelOrder`. In `updateOrderStatus`, for a CPS order with a delivery row:
  1. `await cpsClient.cancel(order.id, reason)`. A **`409 conflict`** means the rider has the parcel. **Refuse** with "This order has been picked up by CPS and can't be cancelled. Contact support." The app shows the backend error message.
  2. On success, mark the delivery cancelled (the existing, unused `DeliveryRepository.cancelDelivery`) and carry on with the existing cancellation logic.
  3. Refuse `cancelled` for any order already `in_transit`/`completed` (v1 has no guard here either).

**Reconciliation cron** (every 15 minutes while up, plus once at startup): call `cpsClient.listShipments({ updatedSince: lastSyncedAt })`, page through `nextCursor`, and apply each shipment with the same mapping (skip the sequence check when the CPS status is further along). This covers webhooks missed while Shopyos was down or deploying.

---

## 10. Shaping data so the app needs no change

### 10.1 The driver card: `_shimOrders`, not `DeliveryRepository`

`GET /orders/:id` (buyer and seller order screens, review screen) builds `order.deliveries[]` by hand in **`db/adapters/supabaseLikePgClient.js` `_shimOrders`** (around lines 490–558). The repository's select string is replaced by `*`. Today:

```js
driver: d.driver_id ? { user_profiles: {...}, vehicle_type: d.vehicle_type, plate_number: d.license_plate } : null
```

With `driver_id` NULL, CPS orders would never show a rider. Change it to:

```js
const isCps = d.provider === 'cps';
const cpsRiderVisible = isCps && d.external_driver_name
  && d.status !== 'cancelled' && !['completed', 'delivered', 'cancelled'].includes(order.status);

acc[d.order_id].push({
  ...d,
  ...(isCps ? { vehicle_type: 'motorbike' } : {}),   // seller screen reads vehicle at delivery level
  driver: isCps
    ? (cpsRiderVisible ? {
        id: `cps:${d.tracking_code}`,                 // only used as an avatar seed by the app
        user_profiles: {
          // The app shows the name but never prints the phone, so include it in the name.
          full_name: `${d.external_driver_name} · ${d.external_driver_phone}`,
          phone: d.external_driver_phone,
          avatar_url: null,
        },
        vehicle_type: 'motorbike',
        plate_number: null,
      } : null)
    : (d.driver_id ? { /* existing v1 shape, unchanged */ } : null),
});
```

Why the rider is hidden once the order is finished:
- The review screen (`app/review/[id].tsx` lines 118–160) shows a "Driver Performance" card whenever `deliveries[0].driver` is set. Hiding it hides that card.
- Submitting a review already skips the driver review when `driver_id` is NULL (lines 76–79).
- When cancelled, the tracking screen won't keep saying "Driver is on the way".

Also add **`ORDER BY created_at DESC`** to the deliveries query in `_shimOrders`. The app reads `deliveries[0]`.

Mirror the same driver shape in `_shimDeliveries` (around lines 876–919) so `GET /deliveries/*` agrees.

### 10.2 Calls and chat with the rider

The app's Call buttons start an **in-app Agora call** to a Shopyos user. They don't dial a phone:
- buyer `app/order/[id].tsx` line 443
- seller driver card, line 454
- tracking screen, lines 359–366

These all go through `useStartCall` → `POST /calls`. CPS riders aren't Shopyos users, so add guards that return a helpful message instead of a crash or "receiverId is required". The app shows the backend's `error.message` in a toast.

- **`callController.initiateCall`**, before line 180 and before `canUsersCall` (line 183):

  ```js
  const cpsDelivery = orderId && await findBuyerFacingDelivery(orderId);
  if (cpsDelivery?.provider === 'cps' && (!receiverId || String(receiverId).startsWith('cps:'))) {
    return ApiResponse.error(res,
      `In-app calls aren't available for CPS riders. Call ${cpsDelivery.external_driver_name} on ${cpsDelivery.external_driver_phone}.`, 400);
  }
  ```

- **`messagingController.startConversation`** (lines 56–70): `if (String(participantId).startsWith('cps:')) return 400`. The seller app shows its fixed "Could not open chat." toast. The buyer's Chat button already does nothing when `driver_id` is null (`app/order/[id].tsx` line 201).

The microphone permission prompt still appears before the call attempt. That can't be removed without an app change, and it is harmless.

### 10.3 Don't leak the PIN to the seller

`GET /orders/:id` (`orderController.getOrderDetails` lines 178–190), `GET /orders/store/:storeId` and `GET /orders/my-orders` return `*`, which includes `verification_pin`. In v1 the PIN is created at pickup, after the parcel has left the seller. In v2 it's created at dispatch, **while the seller still holds the parcel**, so the seller could read it.

**Strip `verification_pin` from every order payload unless the requester is the buyer.** The buyer app only reads it when the order is `picked_up`/`in_transit`.

### 10.4 Tracking screen

`app/order/tracking.tsx` already copes with no GPS:
- It makes one `GET /deliveries/:id/latest-location` call, which returns `location:null`.
- No socket updates arrive, and there's no endless spinner.
- The status title falls back to "Driver is on the way" / "Looking for a driver…".

It needs **real coordinates on the delivery row** (section 6). With none, it shows "Loading map…" indefinitely.

---

## 11. Screen-by-screen check (Expo app, unchanged)

| Screen | What it reads | Works because |
|---|---|---|
| Checkout `app/checkout.tsx` | `{success, quote:{withinRange, deliveryFee, combinedDeliveryFee, isInterRegional, note}}` | Section 5.2: same shape; `isInterRegional:false` means no hub picker |
| Buyer order `app/order/[id].tsx` | `order.status` timeline, `deliveries[0].driver`, `verification_pin` at `picked_up`/`in_transit`, fees | Sections 7 and 10.1: v1 statuses only, synthesized rider, PIN timing unchanged |
| Buyer orders list `app/order.tsx` | `order.status` filters | No `assigned` order status |
| Tracking `app/order/tracking.tsx` | coordinates, `delivery.status`, driver name | Sections 6 and 10.4: real coordinates; no GPS is handled |
| Seller order `app/business/orderDetails.tsx` | `order.status`, `deliveries[0]` vehicle/driver, Cancel | Sections 6, 9, 10.1, 10.2 |
| Seller orders list and dashboard | `assigned`/`picked_up`/`in_transit` = Processing; `completed` = Delivered | Unchanged |
| Review `app/review/[id].tsx` | `deliveries[0].driver`, `driver_id` | Rider hidden once completed; no driver review sent |
| Receipt `app/receipt/[id].tsx` | `delivery_fee`, optional `distance_km` | Unchanged |
| Returns | order `delivered`/`completed` | CPS orders end `completed` |
| Notifications `utils/notificationRouting.ts` | `order_*`/`delivery_*` types with `orderId` | Section 7, step 3 |

---

## 12. Rollout checklist

1. Deploy the migration and code with the switch unset. Nothing changes yet.
2. In staging (CPS staging key), set `v2`.
3. **Kumasi store → Accra buyer** (pin in Osu):
   1. Checkout shows GHS 45, with **no** "Cross-Region Shipment" card and no hub picker.
   2. Pay, then the seller marks Ready. The seller sees "Waiting for driver"; CPS Ops shows the order with a "Shopyos · prepaid" badge.
   3. CPS assigns a rider. The buyer's order stays "Ready" and the rider card shows name · phone. The order screen timeline is not grey.
   4. Pickup: the order goes `in_transit`, and the buyer gets the PIN and sees the PIN card. The seller's payload has **no** PIN.
   5. Wrong PIN, then the right PIN: `completed`, seller escrow released, CPS payout of **GHS 38.25** recorded, platform keeps 6.75.
   6. The review screen shows no driver card.
4. **Kumasi store → buyer near KNUST**: GHS 20. Same store → elsewhere in Kumasi: GHS 35. Same store → Cape Coast: "Not available" with the CPS note. Move the pin between areas and the fee updates.
   - Same store with **Pickup · Free**: no fee, and nothing appears in CPS when it's marked Ready.
   - Clear the coverage cache and block the CPS API: checkout shows "Couldn't calculate delivery fee. Retry", **not** "Not available".
5. **Kumasi store → Takoradi, Sunyani, Tamale**: 55 / 55 / 60, all door to door, no hubs.
6. **Accra store**:
   - → Accra buyer: GHS 35. → Kumasi buyer (even near KNUST): GHS 45. → Takoradi: 55. → Tamale: 60.
   - Mark Ready: CPS shows the pickup in **Accra**. The full flow (rider, PIN, delivery, payout) works as in step 3.
   - Mixed cart (Kumasi store and Accra store, buyer in Accra): two CPS deliveries, 45 and 35.
7. **Store outside the 5 cities** (e.g. Cape Coast): Delivery shows "Not available". Place Order is blocked until Pickup · Free is chosen. No driver, hub or last-mile option appears, and nothing is ever sent to the Shopyos driver app.
   - Block the CPS API while an order is marked Ready: the order stays "Ready" and retries. It is **never** offered to Shopyos drivers.
8. Tap Call or Chat on the rider: the toast shows the rider's phone or "Could not open chat"; nothing crashes.
9. Seller cancels before pickup (works) and after pickup (refused with a message).
10. Stop the Shopyos backend, advance a CPS shipment, restart: the CPS retry or reconciliation applies it.
11. Production: switch `DELIVERY_PROVIDER=v2`. Watch the CPS portal **Webhooks** log for the first day.
12. **Emergency stop:** set `DELIVERY_PROVIDER=off`. Checkout offers pickup only, everywhere. Already-dispatched CPS orders keep updating through webhooks until they finish. Don't switch back to the old in-house flow: there are no riders behind it.

## 13. Known limitations

- No live GPS and no in-app call or chat with CPS riders. Buyers see the rider's name and phone.
- CPS serves Kumasi, Accra, Takoradi, Sunyani and Tamale. Stores or buyers elsewhere get **pickup only** until CPS adds their city.
- Delivery areas are circles around each city (section 5.1). Confirm the radii with CPS before launch.
- The fee is set by the buyer's pin location. A wrongly placed pin gives the wrong (binding) fee, the same risk as v1's distance pricing.
- Failed deliveries and returns are handled manually by admins on both sides.
