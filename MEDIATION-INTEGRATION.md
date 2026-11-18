# Connecting mediation to a real backend — mediation.html

`mediation.html` and the inline script in it simulate the full flow end-to-end so you can see and test the UX, but three things need a real backend before this is safe to launch:

## 1. Consent must be recorded and checked server-side
The demo's "Simulate Other Party's Consent" button stands in for the other party independently checking their own consent box in their own session. In production:
- `POST /api/mediation/cases` creates a case from the initiator's form, storing `initiator_consent: true`.
- The other party gets a notification (email/SMS/in-app) linking to the same case with their own consent checkbox.
- `POST /api/mediation/cases/{id}/consent` records **their** consent, tied to their authenticated session — never accept consent typed by the other party.
- Mediator access is only granted once your backend confirms **both** `client_consent` and `professional_consent` are `true`.

## 2. Mediator access should be a real, revocable grant — not a shared master key
Because chat is end-to-end encrypted (see CHAT-INTEGRATION.md), a mediator can't just "turn on" access to ciphertext they don't hold a key for. The clean pattern:
- When both parties consent, each of their clients (browsers) uses their existing shared key to **re-encrypt a copy of the conversation key** to the mediator's public key, and uploads that wrapped key to your backend.
- The mediator's client can now derive the same AES key and read messages **going forward from that point** (or, if you choose, re-share message history too) — but only until access is revoked.
- On disengagement, delete the wrapped key server-side. The mediator's client can no longer decrypt new messages. Past messages they already decrypted client-side are, as with any read receipt, not "unseen" — communicate this to both parties as part of the consent language.

## 3. Every access and revocation event must be logged
- Log: case ID, mediator ID, grant timestamp, consent records, and revocation timestamp.
- Make this log available to both the client and professional on request — transparency here is what makes the consent meaningful.

## What stays as-is
The two-form UX (Initiation → consent → mediator access → Disengagement → revoke) in `mediation.html` maps directly onto the backend flow above — you're mainly replacing the `setTimeout`/`localStorage`-style simulation with real API calls and the key-wrapping step described above.
