# Escrow, Marketplace & Dashboards — integration notes

## What was added
| File | Purpose |
|---|---|
| `dashboard.html` + `assets/js/dashboard.js` | Dynamic **Client** and **Professional** dashboards (toggle at top; deep links `#client/contracts`, `#pro/payout`) |
| `marketplace.html` + `assets/js/marketplace.js` | E-commerce storefront: search, filters, cart, checkout → escrow contract |
| `assets/js/store.js` | Shared state + escrow engine (`window.HS`) |
| `assets/css/escrow.css` | Green/orange e-commerce + dashboard styling, dark mode |
| `network.html` / `network.js` | Pro sign-up now captures the **payout account** and registers the pro |
| `project-tracker.html` | Redirects to the dashboard's My Contracts view |
| `main.js` | Injects promo bar, Marketplace/Dashboard links and cart badge on every page |

## Escrow rules implemented
- Client funds the **contract sum** (any custom ₦ amount, in portions).
- **20% service charge** is deducted from the contract sum (never added on top) and **held in escrow until the contract is completed**, then settled to the settlement account (default: Habitat Systems Planning Consultants · Guarantee Trust Bank · 0043237265).
- The **net 80%** is released per milestone when the client approves, to the professional's payout account.
- Release needs enough funded escrow; the final milestone needs the contract fully funded so the 20% is secured.
- Collection and settlement accounts are editable (Escrow & Ledger → Edit bank details); changes are logged.

## Before going live (important)
All state lives in the browser (`localStorage`) so the flow can be demoed. For real money:
1. Hold funds with a CBN-licensed escrow/payment partner (see `ESCROW-RESEARCH.md`, `PAYMENT-INTEGRATION.md`); confirm funding via gateway webhooks, not client JS.
2. Move `HS.fund / approveMilestone / setPayout / setPlatform` to server endpoints with authentication and audit logs.
3. Restrict bank-detail editing to authorised admins with re-authentication; verify payout account names with a bank name-enquiry API.
4. Never trust the 20% calculation client-side; compute it on the server.
