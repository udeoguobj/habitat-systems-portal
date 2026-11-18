/* ==========================================================================
   HABITAT SYSTEMS — Network registration, payment & verification flow.

   IMPORTANT (read before wiring this to production):
   - The "payment" here is a UI simulation. A real payment can only be taken
     by a licensed payment processor (Paystack / Flutterwave / Stripe) using
     a SECRET key held on a server you control — never in this front-end
     file. Wire the "I've Made the Transfer" button to your gateway's
     Checkout/Charge API, then confirm success via that gateway's webhook,
     not client-side JS. See PAYMENT-INTEGRATION.md in the project root.
   - The "professional body verification" step is likewise a placeholder.
     Nigerian regulatory councils (COREN, ARCON, SURCON, TOPREC, ESVARBON,
     CORBON, EHORECON) do not universally expose a public verification API,
     so real verification needs either (a) a backend integration with a
     council that does offer one, or (b) a queued manual-check step handled
     by your compliance team, which is what "Pending manual review" means
     below. See VERIFICATION-INTEGRATION.md.
   ========================================================================== */

const BODY_MAP = {
  "Engineer": { body: "COREN — Council for the Regulation of Engineering in Nigeria", url: "https://coren.gov.ng" },
  "Structural Engineer": { body: "COREN — Council for the Regulation of Engineering in Nigeria", url: "https://coren.gov.ng" },
  "Surveyor": { body: "SURCON — Surveyors Council of Nigeria", url: "https://surcon.gov.ng" },
  "Architect": { body: "ARCON — Architects Registration Council of Nigeria", url: "https://arcon.gov.ng" },
  "Town Planner": { body: "TOPREC — Town Planners Registration Council of Nigeria", url: "https://toprec.gov.ng" },
  "Estate Surveyor & Valuer": { body: "ESVARBON — Estate Surveyors & Valuers Registration Board of Nigeria", url: "https://esvarbon.gov.ng" },
  "Transport Planner": { body: "CILT Nigeria — Chartered Institute of Logistics & Transport", url: "https://ciltnigeria.org" },
  "Quantity Surveyor": { body: "QSRBN — Quantity Surveyors Registration Board of Nigeria", url: "https://qsrbn.gov.ng" },
  "Builder": { body: "CORBON — Council of Registered Builders of Nigeria", url: "https://corbon.gov.ng" },
  "Project Manager": { body: "PMI Nigeria / relevant chartered body", url: "https://pmi.org" },
  "Environmental Consultant": { body: "EHORECON — Environmental Health Officers Registration Council of Nigeria", url: "https://ehorecon.gov.ng" },
  "Planning Services Consultant": { body: "TOPREC — Town Planners Registration Council of Nigeria", url: "https://toprec.gov.ng" },
};

const profType = document.getElementById("profType");
const bodyHint = document.getElementById("bodyHint");
profType.addEventListener("change", () => {
  const info = BODY_MAP[profType.value];
  bodyHint.textContent = info
    ? `Will be checked against ${info.body}.`
    : "Select a profession to see which regulatory body this will be checked against.";
});

// ---- Payout account (where escrow remits released funds) -------------------
const payBank = document.getElementById("payBank");
HS.BANKS.forEach((b) => payBank.add(new Option(b, b)));

// "All of the above" checkbox behaviour
const specAll = document.getElementById("specAll");
const specBoxes = () => Array.from(document.querySelectorAll('input[name="spec"]'));
specAll.addEventListener("change", () => {
  specBoxes().forEach((b) => (b.checked = specAll.checked));
});
document.querySelectorAll('input[name="spec"]').forEach((b) =>
  b.addEventListener("change", () => {
    specAll.checked = specBoxes().every((x) => x.checked);
  })
);

// ---- Registration form submit -> open payment modal -----------------------
const form = document.getElementById("regForm");
const modal = document.getElementById("paymentModal");
let registration = null;

function generateTxnId() {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `HBSYS-VERIFY-${rand}`;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }
  const specs = specBoxes()
    .filter((b) => b.checked)
    .map((b) => b.value);
  if (specs.length === 0) {
    alert("Please select at least one area of specialization.");
    return;
  }

  const payout = {
    bank: payBank.value,
    accountNumber: document.getElementById("payNum").value.replace(/\s/g, ""),
    accountName: document.getElementById("payName").value.trim(),
  };
  if (!HS.validAcct(payout.accountNumber)) {
    alert("Your payout account number must be exactly 10 digits.");
    document.getElementById("payNum").focus();
    return;
  }

  registration = {
    payout,
    fullName: document.getElementById("fullName").value.trim(),
    profession: profType.value,
    bodyNumber: document.getElementById("bodyNumber").value.trim(),
    address: document.getElementById("officeAddress").value.trim(),
    mobile: document.getElementById("mobile").value.trim(),
    email: document.getElementById("email").value.trim(),
    years: document.getElementById("years").value,
    specializations: specs,
    txnId: generateTxnId(),
  };

  // Verification fee is paid to the (editable) Habitat Systems collection account
  const acct = HS.state.platform.collection;
  document.getElementById("bankName").textContent = acct.bank;
  document.getElementById("bankAcctName").textContent = acct.accountName;
  document.getElementById("acctNum").textContent = acct.accountNumber;
  document.getElementById("txnId").textContent = registration.txnId;
  resetModalSteps();
  modal.classList.add("open");
});

document.getElementById("closePayment").addEventListener("click", () => {
  modal.classList.remove("open");
});
modal.addEventListener("click", (e) => {
  if (e.target === modal) modal.classList.remove("open");
});

// ---- Copy-to-clipboard helpers --------------------------------------------
function wireCopy(btnId, textEl) {
  const btn = document.getElementById(btnId);
  btn.addEventListener("click", async () => {
    const text = document.getElementById(textEl).textContent;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    btn.textContent = "Copied ✓";
    btn.classList.add("copied");
    setTimeout(() => {
      btn.textContent = "Copy";
      btn.classList.remove("copied");
    }, 1600);
  });
}
wireCopy("copyTxn", "txnId");

// ---- Modal step machine -----------------------------------------------------
const steps = document.querySelectorAll("#progressSteps li");
function setStep(n) {
  steps.forEach((li, i) => {
    li.classList.toggle("done", i < n - 1);
    li.classList.toggle("active", i === n - 1);
  });
}
function resetModalSteps() {
  setStep(1);
  document.getElementById("stepPay").style.display = "block";
  document.getElementById("stepConfirm").style.display = "none";
  document.getElementById("stepVerify").style.display = "none";
  document.getElementById("stepDone").style.display = "none";
}

document.getElementById("madePaymentBtn").addEventListener("click", () => {
  setStep(2);
  document.getElementById("stepPay").style.display = "none";
  document.getElementById("stepConfirm").style.display = "block";

  // In production: poll your backend, which itself listens for the
  // gateway's webhook (charge.success) before treating payment as real.
  setTimeout(() => {
    setStep(3);
    document.getElementById("stepConfirm").style.display = "none";
    document.getElementById("stepVerify").style.display = "block";
    const info = BODY_MAP[registration.profession];
    document.getElementById("verifyingText").textContent =
      `Verifying ${registration.bodyNumber} with ${info ? info.body.split(" — ")[0] : "the regulatory council"}…`;

    // In production: call your backend, which queries the council's
    // register (API where available, or queues a manual check).
    setTimeout(() => {
      setStep(4);
      document.getElementById("stepVerify").style.display = "none";
      document.getElementById("stepDone").style.display = "block";

      document.getElementById("doneTxn").textContent = registration.txnId;
      document.getElementById("doneBody").textContent = registration.bodyNumber;

      // Simulated outcome — swap for the real API/manual-review result.
      const verified = registration.bodyNumber.length >= 5;
      // Save the professional + payout account so escrow knows where to remit funds
      HS.registerPro({ ...registration, verified });
      const statusEl = document.getElementById("doneStatus");
      const alertEl = document.getElementById("doneAlert");
      if (verified) {
        statusEl.innerHTML = '<span class="status-pill status-verified">Verified</span>';
        alertEl.className = "alert alert-success";
        alertEl.textContent = "✅ Payment confirmed and professional body number verified. You're now listed on the Network.";
      } else {
        statusEl.innerHTML = '<span class="status-pill status-pending">Pending manual review</span>';
        alertEl.className = "alert alert-warn";
        alertEl.textContent = "⏳ Payment confirmed. We couldn't auto-verify this number — our compliance team will confirm it manually within 2 business days.";
      }
    }, 2200);
  }, 1800);
});
