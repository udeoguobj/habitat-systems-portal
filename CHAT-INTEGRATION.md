# Connecting the chat to a real backend — chat.html / assets/js/chat.js

`assets/js/chat.js` is a **working** end-to-end encryption demo — it really does use the browser's Web Crypto API to run an ECDH key exchange and encrypt every message with AES-GCM before "sending" it. What makes it a demo rather than a production system is *where the keys and messages live*:

| In this demo | In production |
|---|---|
| Both identities' keypairs are generated together in one browser and stored in `localStorage` | Each real user generates their own keypair, once, in their own browser/device |
| Messages are "sent" by writing ciphertext to `localStorage` | Messages are sent over a WebSocket (e.g. Socket.io) to your server, which relays ciphertext to the recipient |
| Anyone opening this page can decrypt (it's simulating both sides for the demo) | Only the two device(s) holding the matching private key can decrypt |

## Steps to make it real
1. **Key generation on signup/first login**: run `generateKeyPair()` once per real user, keep the private key in the browser (IndexedDB, not exportable if possible), and upload only the **public** key to your backend, associated with their account.
2. **Key exchange**: when a client opens a chat with a professional, fetch the other party's public key from your backend, then run the same `deriveSharedKey()` this demo already implements.
3. **Transport**: replace the `localStorage` "send"/"read" functions with a WebSocket connection. Your server relays `{iv, ciphertext, senderId, ts}` — it never sees plaintext.
4. **Persistence**: store ciphertext + IV in your real database (e.g. Postgres/Mongo) instead of `localStorage`, keyed by conversation ID.
5. **Multi-device**: if a user should read messages on two devices, you need a key-backup or per-device-key strategy — this is the hardest real-world part of E2EE and worth scoping deliberately (see Signal's "sealed sender" / device-linking approach as prior art).
6. **Mediator access**: never build a "master key" that silently decrypts everything — see `mediation.js` / `MEDIATION-INTEGRATION.md` for the consent-gated pattern this project uses instead (both parties re-encrypt/share their conversation key with a mediator's key only after explicit consent).

## What stays as-is
The cryptographic core — `generateKeyPair()`, `deriveSharedKey()`, `encryptMessage()`, `decryptMessage()` — is standard Web Crypto API usage and can be lifted directly into a production chat client.
