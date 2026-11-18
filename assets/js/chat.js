/* ==========================================================================
   HABITAT SYSTEMS — End-to-end encrypted chat DEMO.

   This is a genuine client-side implementation of the E2EE pattern
   (ECDH key exchange + AES-GCM message encryption) using the browser's
   built-in Web Crypto API — not a fake padlock icon. What it demonstrates:

     1. Two participants (Client, Professional) each get an ECDH keypair.
     2. They derive a shared AES-256 key via ECDH — this key never leaves
        the browser and is never sent to any server.
     3. Every message is encrypted with AES-GCM before being "sent."
     4. The mock server (here: localStorage, standing in for a real
        backend) only ever stores ciphertext + an IV. Open dev tools and
        inspect `localStorage.hs_chat_messages` — it's unreadable.

   WHAT'S DIFFERENT IN A REAL DEPLOYMENT — see CHAT-INTEGRATION.md:
     - Keys must be generated per real user account and persisted securely
       (e.g. IndexedDB, non-exportable where possible), not regenerated
       in localStorage on every browser as this demo does for simplicity.
     - Messages relay over WebSockets (e.g. Socket.io) to a real backend,
       which stores only ciphertext exactly as this demo does locally.
     - You need a key-verification/trust step (e.g. safety numbers) so
       users can confirm they're talking to who they think they are.
     - Group/mediator access (see mediation.js) requires a separate,
       explicitly-consented key-sharing step — the platform does NOT hold
       a master key that can silently decrypt everything.
   ========================================================================== */

const STORE_KEYS = "hs_chat_keypairs";
const STORE_MSGS = "hs_chat_messages";

async function generateKeyPair() {
  return crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
}

async function exportKey(key) {
  const raw = await crypto.subtle.exportKey(key.type === "public" ? "spki" : "pkcs8", key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}
async function importPublicKey(b64) {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("spki", raw, { name: "ECDH", namedCurve: "P-256" }, true, []);
}
async function importPrivateKey(b64) {
  const raw = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey("pkcs8", raw, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
}

async function deriveSharedKey(privateKey, publicKey) {
  return crypto.subtle.deriveKey(
    { name: "ECDH", public: publicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptMessage(sharedKey, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const enc = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, sharedKey, enc);
  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };
}
async function decryptMessage(sharedKey, ivB64, ciphertextB64) {
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0));
  const ciphertext = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, sharedKey, ciphertext);
  return new TextDecoder().decode(plainBuf);
}

// ---- Bootstrap two demo identities (Client + Professional) -----------------
async function setupIdentities() {
  let stored = JSON.parse(localStorage.getItem(STORE_KEYS) || "null");
  if (stored) return stored;

  const clientPair = await generateKeyPair();
  const proPair = await generateKeyPair();

  stored = {
    client: {
      pub: await exportKey(clientPair.publicKey),
      priv: await exportKey(clientPair.privateKey),
    },
    professional: {
      pub: await exportKey(proPair.publicKey),
      priv: await exportKey(proPair.privateKey),
    },
  };
  localStorage.setItem(STORE_KEYS, JSON.stringify(stored));
  return stored;
}

function loadMessages() {
  return JSON.parse(localStorage.getItem(STORE_MSGS) || "[]");
}
function saveMessages(msgs) {
  localStorage.setItem(STORE_MSGS, JSON.stringify(msgs));
}

let sharedKey = null;
let currentView = "client";

async function init() {
  const identities = await setupIdentities();

  const clientPriv = await importPrivateKey(identities.client.priv);
  const proPub = await importPublicKey(identities.professional.pub);
  sharedKey = await deriveSharedKey(clientPriv, proPub);
  // (Deriving from the client's private key + professional's public key,
  // or vice-versa, yields the same shared secret — that's the point of ECDH.
  // Either "side" can decrypt what the other sent; nobody without a
  // matching private key can.)

  await renderMessages();

  if (loadMessages().length === 0) {
    await sendMessage("Hi Emeka, checking in on the foundation milestone.", "client");
    await sendMessage("Hi! Yes, foundation work wrapped up yesterday — photos uploaded to the project tracker.", "professional");
  }
  await renderMessages();
}

async function sendMessage(text, sender) {
  const { iv, ciphertext } = await encryptMessage(sharedKey, text);
  const msgs = loadMessages();
  msgs.push({ sender, iv, ciphertext, ts: Date.now() });
  saveMessages(msgs);
}

async function renderMessages() {
  const body = document.getElementById("chatBody");
  body.innerHTML = "";
  const msgs = loadMessages();
  for (const m of msgs) {
    const text = await decryptMessage(sharedKey, m.iv, m.ciphertext);
    const div = document.createElement("div");
    const mine = m.sender === currentView;
    div.className = "bubble " + (mine ? "me" : "them");
    const time = new Date(m.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    div.innerHTML = `${escapeHtml(text)}<time>${time}</time>`;
    body.appendChild(div);
  }
  body.scrollTop = body.scrollHeight;
  const preview = document.getElementById("previewText");
  if (preview && msgs.length) {
    const last = await decryptMessage(sharedKey, msgs[msgs.length - 1].iv, msgs[msgs.length - 1].ciphertext);
    preview.textContent = last.slice(0, 40);
  }
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
  init();

  document.querySelectorAll(".role-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".role-toggle button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentView = btn.dataset.view;
      renderMessages();
    });
  });

  document.getElementById("sendBtn").addEventListener("click", async () => {
    const input = document.getElementById("chatInput");
    if (!input.value.trim()) return;
    await sendMessage(input.value.trim(), currentView);
    input.value = "";
    await renderMessages();
  });
  document.getElementById("chatInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("sendBtn").click();
  });
});
