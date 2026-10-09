# CPS Partner API

The Partner API lets other businesses (starting with Shopyos) create CPS deliveries from their own systems, charge their customers CPS's price, and follow each delivery through webhooks.

| | |
|---|---|
| **Reference (rendered)** | `/developers` in the CPS web app |
| **Spec (source of truth)** | [`backend/openapi/partner-v1.yaml`](../../backend/openapi/partner-v1.yaml), also served at `GET /api/partner/v1/openapi.yaml` |
| **Base URL** | `https://cps-production-6d97.up.railway.app/api/partner/v1` |
| **Auth** | `Authorization: Bearer cps_live_…` (secret key from the Business portal) |
| **Hours** | API up 05:00–20:00 GMT daily; riders work Mon–Sat 08:00–19:30 |

The spec's description has the full partner-facing guide: quickstart, pricing, lifecycle, delivery codes, webhooks with signature verification, errors and versioning. **Edit the spec when behaviour changes.** The docs page always shows the copy the API is actually serving.

Shopyos-specific implementation notes are in [`docs/shopyos-delivery-v2.md`](../shopyos-delivery-v2.md).

---

## How it fits together (for CPS developers)

```
Business user ──(JWT)──► /api/business/*        portal: keys, webhook, orders, statement
CPS admin     ──(JWT)──► /api/admin/businesses  approve / suspend
Partner server ─(API key)► /api/partner/v1/*    coverage, quotes, shipments
                                    │
                                    ▼
                     Shipment (businessId, externalReference, prepaid,
                               deliveryCodeHash …) — same table ops/riders use
                                    │  every state change in routes/shipments.ts
                                    ▼
                     recordShipmentEvent() ──► webhook_events (outbox)
                                                     │  webhook worker (10 s poll,
                                                     ▼  signed POST, backoff ≈22 h)
                                              partner's webhook URL
```

| Piece | File |
|---|---|
| Partner routes and error handler | `backend/server/routes/partner/v1.ts` |
| API-key middleware and error shape | `backend/server/middleware/apiKey.ts` |
| Key and webhook-secret generation | `backend/server/lib/apiKeys.ts` |
| Coverage, pickup zones and binding quote | `backend/server/lib/coverage.ts` (rates in `lib/pricing.ts`) |
| Public shipment shape | `backend/server/lib/partnerSerializer.ts` |
| Outbox, signing, worker | `backend/server/lib/webhooks.ts` |
| Delivery-code hashing | `backend/server/lib/deliveryCode.ts` |
| Business portal API | `backend/server/routes/business.ts` |
| Admin approval API | `backend/server/routes/businessAdmin.ts` |
| Portal UI | `frontend/src/pages/business/*`, `frontend/src/pages/public/DevelopersPage.tsx` |
| Tests | `backend/test/partner.test.ts`, `backend/test/business.test.ts` |

### Rules that keep partners safe

- **Partner orders skip ops pricing.** They are created as `pending` with the quoted fee and `prepaid: true`. Ops can't change that fee (`/price` and `/process` return 409), and the receiver SMS never asks for money.
- **Delivery codes can't be bypassed.**
  - The rider must enter the code at proof of delivery.
  - Ops can't set `delivered` directly while a code is unverified. They must use `PATCH /api/shipments/:id/delivery-code-override` with a reason, which is recorded in the status history.
  - Codes are stored as an HMAC keyed with `DELIVERY_CODE_SECRET` (falls back to `JWT_SECRET`).
- **Every state change emits an event.** If you add a route that changes a shipment, call `recordShipmentEvent` after it commits. It never throws. Partners can still reconcile with `GET /shipments?updatedSince=`.
- **Don't break `toPartnerShipment`.** Its output is the public contract for both responses and webhooks. Add fields; don't rename or remove them. Breaking changes need `/api/partner/v2`.
- **Business accounts are isolated.**
  - The `business` role can't read or cancel shipments through the internal `/api/shipments` routes.
  - The partner routes scope every query to `req.business.id`.

### Operating it

- **Approving a business:** Admin panel → *Business accounts* → Approve. Suspending a business disables all its keys immediately.
- **Coverage and prices:** CPS collects from and delivers to Kumasi, Accra, Takoradi, Sunyani and Tamale. The route price list is `calculateRouteCost` in `lib/pricing.ts`:
  - Within a city: 35 (KNUST area of Kumasi: 20).
  - Kumasi ↔ another city: that city's rate, both ways (Accra 45, Takoradi/Sunyani 55, Tamale 60).
  - Between two non-Kumasi cities: the higher of the two rates.

  To stop collecting from a city temporarily, set `CPS_PICKUP_ZONES` (comma-separated, e.g. `Kumasi,Accra`). Partners see changes in `GET /coverage` straight away.
- **Webhook failures:** partners can see and retry deliveries under *Webhooks* in the portal. Events are stored in the `webhook_events` table: `deliveredAt` set means delivered, `failedAt` set means retries ran out.
- **Environment:** `DELIVERY_CODE_SECRET` (recommended; don't change it once codes exist, or open codes stop verifying) and `CPS_PICKUP_ZONES` (optional).

### Testing locally

```bash
cd backend
npm test              # vitest on in-process Postgres (PGlite), no DB needed
npm run dev           # then sign up as a Business, approve it as admin, create a key
```

A quick webhook receiver for manual testing: point the webhook URL at https://webhook.site, or at a local server built from the verification snippet in the spec.
