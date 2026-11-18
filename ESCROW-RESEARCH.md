# Escrow account research — Nigeria

*Research deliverable for the "set up and operate an escrow account" task. This is background research to brief your banker/legal counsel with, not legal or financial advice — confirm everything below with a lawyer and your bank before acting on it, as fintech regulation changes frequently.*

## The core regulatory fact to plan around
The Central Bank of Nigeria (CBN) restricts **who is allowed to hold customer funds on behalf of a third party**. In the current licensing framework:
- A **Payment Solution Service Provider (PSSP)** licence — the cheapest, most common licence fintechs start with — explicitly **does not** permit holding customer funds.
- Only entities with a **Mobile Money Operator (MMO)** licence, a **Payment Service Bank (PSB)** licence, a **Switching/Processing licence with settlement-agent status**, or an actual **deposit money bank**, are generally permitted to hold funds belonging to others.
- Licence categories carry large minimum capital + escrow deposit requirements — e.g. PSSP/PTSP applicants must lodge ₦100m in a CBN escrow account themselves as part of licensing; other categories run into the billions of naira.
- **Practical implication for HABITAT SYSTEMS:** building your own "hold client funds until milestone approval" system in-house would likely mean applying for a CBN licence yourself — a significant regulatory and capital undertaking. For an MVP, the realistic path is to **use a bank or an already-licensed fintech's escrow/split-payment product** rather than building fund custody from scratch.

## Option 1 — Bank-provided escrow account (recommended starting point)
Nigerian commercial banks (e.g. Zenith, GTBank, Access, First Bank) offer corporate escrow account products, typically used for real estate and M&A transactions, that can be adapted to a marketplace use case.

**How to pursue it:**
- Approach your relationship manager or the bank's trade/corporate banking desk and ask specifically for their **"escrow account" product** (distinct from an ordinary corporate current account).
- Ask about:
  - Minimum opening balance and setup fee.
  - Whether they support **API-triggered disbursement** (so a milestone approval in your app can programmatically instruct a partial release) or whether releases require manual bank instruction/signatories.
  - KYC/AML documentation needed for both HABITAT SYSTEMS and, potentially, for each client/professional pair using the account.
  - Whether interest accrues on held balances and who it belongs to.
- **Pros:** strongest regulatory footing (the bank is already licensed to hold funds); clients trust a named bank.
- **Cons:** typically slower to set up than a fintech integration; API/automation support varies a lot by bank — some still require manual release instructions, which would need an internal ops process until you can automate it.

## Option 2 — Fintech split-payment / marketplace product (fastest to launch)
Paystack and Flutterwave — both already referenced in `PAYMENT-INTEGRATION.md` — offer **Split Payments / Subaccounts**, which is the closest fintech-native equivalent to escrow-style marketplace payouts:
- A client pays once; the platform (Paystack/Flutterwave) automatically splits the payout between HABITAT SYSTEMS' account (commission) and the professional's subaccount, by percentage or flat fee.
- Important limits to plan around (confirmed from Paystack's own documentation and integration guides):
  - **You are not a licensed escrow provider by using splits** — splits reduce your regulatory exposure (money moves straight to each party) but don't make holding funds compliant if you also try to delay settlement indefinitely.
  - **Settlement is typically T+1/T+2**, not held indefinitely — there are limits on how long a subaccount's funds can be withheld, so "hold until final milestone, which might be months away" doesn't map cleanly onto standard split payments.
  - **Split ratio is locked at payment time** and refunds after a subaccount has settled come out of your main balance, not the professional's — build a dispute/hold window into your product logic to avoid being out of pocket.
- **Pros:** fast to integrate (days, not months), well-documented APIs, works naturally with the payment modal already built in `network.html`.
- **Cons:** not a true multi-milestone hold-and-release model out of the box — you'd likely combine this with your own **ledger** (tracking what's "owed" vs "released" per milestone in your database) rather than relying on the gateway to hold funds across the whole project lifecycle.

## Option 3 — Dedicated escrow-as-a-service fintech
There are African fintechs positioned specifically as escrow infrastructure for marketplaces (e.g. **TradeSafe**, based in South Africa, serving multiple African markets) that provide dispute-logic and fund-holding as a packaged product rather than a generic payment gateway. Worth a scoping call to confirm Nigerian coverage, licensing, and whether they support milestone-based release schedules — this wasn't independently verified for Nigeria-specific licensing status in this research pass and should be confirmed directly with them.

## Recommended approach
| Stage | Approach |
|---|---|
| **MVP / early launch** | Paystack or Flutterwave split payments + your own internal ledger tracking milestone status. Funds move quickly to each party's account; your app enforces the "only release on approval" logic in software, with clear dispute-hold windows. |
| **Scale** | Open a bank escrow account in parallel, and/or evaluate a dedicated escrow-as-a-service provider, once transaction volume justifies the extra setup and compliance overhead. |
| **Either stage** | Get a lawyer to confirm whether your specific milestone-hold model requires you to hold a CBN payments licence yourself, given how long and how much money you intend to hold between milestones. |

## Questions to bring to your banker meeting
1. Do you offer a dedicated escrow account product, and is release of funds API-triggerable or manual-only?
2. What KYC/AML documentation is required, both for HABITAT SYSTEMS and per transaction?
3. What are your fees — setup, monthly, and per-release?
4. What's the maximum period funds can sit in the account before a compliance issue is triggered?
5. Do you have existing marketplace/proptech clients using this product we could reference?

## Sources consulted
- CBN Payment Service Provider licensing overviews (Tetra Consultants, 618bees, PayAtlas, RegCompass) — for licence categories, capital requirements, and the "only MMOs/PSBs may hold customer funds" rule.
- Paystack's own developer documentation and third-party integration guides (Split Payments / Subaccounts) — for settlement timing, refund handling, and the explicit "you are not a licensed escrow service" caveat.
- StartupList Africa's escrow-sector listing — for awareness of dedicated escrow fintechs operating on the continent (e.g. TradeSafe).

*This document should be treated as a starting brief, not a final compliance determination — confirm current rules with the CBN's published circulars and your own legal counsel before opening any account.*
