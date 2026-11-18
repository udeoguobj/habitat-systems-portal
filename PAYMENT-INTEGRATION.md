# Connecting real payments — network.html

`assets/js/network.js` currently **simulates** the payment step (spinner + timeout) so the registration flow can be demoed end-to-end. It does **not** move any real money, and it does **not** contain your bank account or any API secret — that's intentional, and it should stay that way.

## Why the bank details/API keys can't live in this front end
Anything shipped in HTML/CSS/JS is visible to anyone who views page source. A secret key or account credential placed there is a public leak, not a security feature. Real payment collection needs a small backend.

## How to wire it up (Paystack/Flutterwave/Stripe — any works the same way)

1. **Create a backend endpoint** (Node/Express, PHP, Django, etc.) that holds your **secret key** as an environment variable, never in a committed file.
2. **Replace the "I've Made the Transfer" step** in `network.js` with a real Checkout call:
   - Paystack: `PaystackPop.setup({ key: PUBLIC_KEY, email, amount: 1500000, ref: registration.txnId, callback: ... })` — the *public* key is safe client-side, the secret key stays on your server.
   - Flutterwave: `FlutterwaveCheckout({ public_key: ..., tx_ref: registration.txnId, amount: 15000, ... })`.
3. **Verify server-side, not client-side.** After checkout, call your backend, which calls the gateway's "verify transaction" API using the secret key, and only then marks the registration as paid. Never trust a `success` callback in the browser alone — a user could fake that JS event.
4. **Use the gateway's webhook** as the source of truth (e.g. Paystack's `charge.success` webhook) so payment status updates even if the user closes the browser mid-flow.
5. **Store your real settlement account** (the account you actually get paid into) directly in your Paystack/Flutterwave/Stripe dashboard — not in this code. The gateway handles the transfer to your bank; the code only needs to know the public key and your backend's verification logic.

## What stays as-is
- The transaction ID generator (`generateTxnId()`), the copy-to-clipboard button, and the step UI (Pay → Confirm → Verify → Done) can all stay exactly as built — just point `madePaymentBtn`'s click handler at your gateway's real Checkout call instead of the `setTimeout` simulation.
