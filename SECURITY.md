# Security notes — HABITAT SYSTEMS portal

## What's already in the code
- Every page sends `Content-Security-Policy: upgrade-insecure-requests`, `X-Content-Type-Options: nosniff`, and a strict `referrer` policy via `<meta>` tags.
- `assets/js/main.js` redirects any `http://` visit to `https://` on the same host.
- No inline secrets, API keys, or bank credentials anywhere in the front end (see PAYMENT-INTEGRATION.md for why).
- Forms use `required` fields and client-side validation, but **client-side validation is never a security boundary** — re-validate everything server-side too.

## What a static HTML/CSS/JS site cannot do by itself
"Strong SSL" is a property of how a site is **served**, not something you can bake into the HTML files themselves. To get real SSL/TLS on this portal:

1. **Get a certificate.** Use a free auto-renewing certificate from **Let's Encrypt** (via your host, or `certbot`), or a paid cert from your registrar/host.
2. **Terminate TLS at your host/CDN.** Most static hosts (Netlify, Vercel, Cloudflare Pages, GitHub Pages with a custom domain, or an Nginx/Apache box) provision this automatically once you point your domain at them.
3. **Enforce it server-side**, not just client-side:
   - Redirect all `:80` traffic to `:443`.
   - Send `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` (HSTS) as a real HTTP response header — this cannot be set from a `<meta>` tag, it must come from the server/CDN config.
   - Set `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and a full `Content-Security-Policy` as response headers.
4. **Use TLS 1.2/1.3 only** — disable TLS 1.0/1.1 and weak ciphers in your server/CDN config.
5. **If you add a backend** (for payments, verification, login — see the other two docs), also:
   - Use HTTPS for every API call, never plain HTTP.
   - Store passwords hashed with bcrypt/argon2, never in plain text.
   - Rate-limit login and registration endpoints.
   - Set cookies with `Secure`, `HttpOnly`, `SameSite=Strict`.

## Recommended next step
Deploy this folder behind Cloudflare (free tier) or your hosting provider's managed TLS — that alone gets you a valid certificate, HSTS, and DDoS protection with no code changes.
