# LOOMY newsletter welcome offer

- The native dialog opens after 8 seconds, after the cookie choice, and never over another dialog or while a visitor is typing.
- Dismissal suppresses automatic display for 7 days. A successful signup suppresses automatic display on that browser. The floating button remains available.
- Explicit newsletter consent is required. The form explains Supabase storage and Stripe processing for the welcome offer.
- POST /api/newsletter stores normalized, consented emails using the existing insert-only Supabase key and RLS. It does not expose the subscriber list.
- Stripe receives the normalized email and retains the customer and customer-bound promotion code. The site owner approved this processing.
- LOOMY10 references a 10% coupon, restricted to the subscribed customer, first-time transactions, and one redemption. Re-subscribing does not renew a redeemed or inactive promotion.
- Checkout uses the same Stripe customer for each normalized email, including orders without a discount. Paid LOOMY sessions across customer records for that email make the offer ineligible.
- The server validates the promotion and trusted catalog prices. Discount percentages and prices supplied by the browser are ignored.
- The benefit applies to product subtotal, excludes shipping, and cannot be combined with another code. The existing free-shipping calculation is unchanged.
- Existing STRIPE_SECRET_KEY must permit customers, coupons, promotion codes, and Checkout Sessions. Live payments remain subject to the existing Stripe launch checks.
- The code is displayed on screen and prefilled in the cart. No automatic welcome email is claimed or sent: sending to visitors requires a verified Resend sender domain and a separate email-delivery implementation.
- Session storage keeps the email and code for the current tab only. Local storage stores dismissal time and subscription status without the email. Private browsing or disabled storage does not prevent form submission.

Verification: node --test test/*.test.js. The local UI test harness is outside the repository and does not send test subscriber data to external services.
