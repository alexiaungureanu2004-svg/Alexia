# LOOMY payments

Stripe Checkout is connected to the Vercel Marketplace sandbox. There are no real
charges or shipments in this mode. Secrets live in Vercel environment variables;
no secret key is included in browser code or this repository.

`api/checkout.js` creates Checkout Sessions in RON from the server catalog in
`lib/payments.js`. Browser prices are ignored, sizes/quantities are validated,
and retries are idempotent. Shipping details, phone and email are collected by
Stripe. Fit measurements and photos remain outside the payment flow.

`api/stripe-webhook.js` verifies raw-body Stripe signatures. It handles completed,
asynchronously successful and failed payments. Paid orders are registered on
their PaymentIntent with `order_status=paid_awaiting_atelier`, the Checkout
Session reference and the SKU/size/quantity list. Stripe Payments is the durable
order register. Atelier processing and shipping are manual. This does not send
LOOMY confirmation emails, allocate inventory or arrange delivery.

The success page only verifies payment and removes purchased quantities from
the local cart. It never triggers order registration or fulfillment. An unpaid,
cancelled or unverifiable payment keeps the cart.

## Configuration

- `STRIPE_SECRET_KEY`: provided by the Stripe Marketplace integration.
- `STRIPE_WEBHOOK_SECRET`: signing secret for the configured webhook.
- Webhook URL: `https://alexia-theta.vercel.app/api/stripe-webhook`.
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
  `checkout.session.async_payment_failed`.

The sandbox shipping option is explicitly labelled as a zero-cost test simulation.
Before accepting real payments: claim/activate the Stripe account, connect live
keys, create a live shipping rate matching the actual delivery policy, configure
the live webhook and its signing secret, and verify a full payment flow. Then set
`STRIPE_SHIPPING_RATE_ID` and `STRIPE_LIVE_ENABLED=true`. Update the cart's test-mode
notice at the same time. Live checkout refuses requests until these settings exist.
Keep `lib/payments.js` catalog prices aligned with `app.js` and root static files
aligned with `dist/`. Do not enable automatic tax without configuring actual tax
registrations. Restrict Stripe keys to the needed Checkout/PaymentIntent access.

Run `node --test test/payments.test.js` to verify price validation, retries,
payment confirmation and signature handling.
