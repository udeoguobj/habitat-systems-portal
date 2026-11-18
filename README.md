<<<<<<< HEAD
# HABITAT SYSTEMS — Web Portal (v2)

## Structure (one HTML file per feature, so each can be edited independently)

**Public / marketing**
- `index.html` — homepage: hero, testimonials carousel, collapsed Tools banner, Articles/News/Blogs
- `resources.html` — Articles / News / Blogs
- `services.html` — services overview
- `tools.html` — single hub for all planning tools, gated by sign-up opt-in modal
- `professionals.html` — browse verified professionals
- `professional-profile.html` — single profile template (experience, qualifications, jobs done, publications, contact pop-up, chat button)
- `login.html` / `signup.html` — auth (Client vs Professional roles)

**Tools** (linked from `tools.html`)
- `state-guide.html`, `planner.html`, `doc-tracker.html`, `eia-tools.html`, `cost-estimator.html`, `gis.html`

**Logged-in**
- `dashboard.html` — client dashboard: projects, messages, browse professionals, tools, escrow, billing
- `project-tracker.html` — milestone tracker linked to escrow release
- `chat.html` — end-to-end encrypted client↔professional chat (real Web Crypto API demo)
- `mediation.html` — mediation initiation + disengagement forms with consent gating
- `network.html` — professional registration, payment & professional-body verification flow
- `projects.html` — legacy project list (now points into `project-tracker.html`)

## Shared assets
- `assets/css/style.css` — single stylesheet used by every page
- `assets/js/main.js` — shared nav/footer behaviour
- `assets/js/network.js` — registration, payment modal, verification simulation
- `assets/js/chat.js` — real ECDH + AES-GCM encryption demo (Web Crypto API)
- `assets/img/habitat-logo.png` — your logo
- `assets/img/hero-placeholder.svg` — placeholder hero graphic (see note below)

## Read before going live
- `SECURITY.md` — SSL/TLS: what's built in vs. what your host must provide
- `PAYMENT-INTEGRATION.md` — wiring the payment modal to a real Paystack/Flutterwave/Stripe charge
- `VERIFICATION-INTEGRATION.md` — wiring professional-body verification to COREN/ARCON/SURCON/etc.
- `CHAT-INTEGRATION.md` — moving the E2EE chat demo to a real backend + WebSocket relay
- `MEDIATION-INTEGRATION.md` — consent-gated mediator access, done properly server-side
- `ESCROW-RESEARCH.md` — researched options for a real Nigerian escrow account (bank vs. fintech split payments vs. dedicated escrow provider), with CBN licensing constraints explained

## Outstanding item
The homepage hero currently uses an abstract SVG graphic in your brand colors rather than a photo — real candidate photography still needs to be sourced and licensed (see note in the delivery message). Swap it in at `assets/img/hero-placeholder.svg` (or update the `<img src>` in `index.html`) once you've picked one.

## Try it locally
Open `index.html` directly in a browser — no build step needed. To see the sign-up gate, click any card on `tools.html`. To see real E2EE in action, open `chat.html`, send a message, then check your browser's dev tools → Application → Local Storage → `hs_chat_messages` to see the ciphertext.
=======
# habitat-systems-portal
An Urban and Regional Town Planning Jobs Hub powered by Habsypec Consultants
>>>>>>> d70e35d8e5ff3698e0b2ee897fdc74da92045f2c
