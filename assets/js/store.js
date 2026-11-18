/* ==========================================================================
   HABITAT SYSTEMS — shared state + escrow engine (window.HS)

   Everything money-related lives here so the Marketplace, Client Dashboard,
   Professional Dashboard and Network sign-up all read/write one source of truth.

   ESCROW RULES (as configured)
   - Contract sum (T) is what the client funds into escrow, in portions if they like.
   - 20% of T is the HABITAT SYSTEMS service charge. It is DEDUCTED from the
     contract sum (never added on top), HELD in escrow until the whole contract
     is completed, then remitted to the settlement account.
   - The remaining 80% (net) is released to the professional's payout account in
     portions, as each milestone is approved by the client.

   DEMO NOTE: this runs entirely in the browser (localStorage) so the whole flow
   can be demonstrated. Real money movement + the editable bank details must be
   enforced server-side — see ESCROW-INTEGRATION.md.
   All money is stored as integer KOBO to avoid floating-point errors.
   ========================================================================== */
(function () {
  const KEY = "hs_state_v1";
  const CART_KEY = "hs_cart_v1";
  const SERVICE_RATE = 0.2;

  const BANKS = [
    "Access Bank","Citibank Nigeria","Ecobank Nigeria","Fidelity Bank","First Bank of Nigeria",
    "First City Monument Bank (FCMB)","Globus Bank","Guarantee Trust Bank","Heritage Bank","Jaiz Bank",
    "Keystone Bank","Kuda Microfinance Bank","Moniepoint Microfinance Bank","OPay","PalmPay","Polaris Bank",
    "Providus Bank","Stanbic IBTC Bank","Standard Chartered Bank","Sterling Bank","SunTrust Bank",
    "Taj Bank","Titan Trust Bank","Union Bank of Nigeria","United Bank for Africa (UBA)","Unity Bank",
    "Wema Bank","Zenith Bank",
  ];

  const ROLES = {
    "Town Planner": { icon: "🗺️", body: "TOPREC", bodyFull: "Town Planners Registration Council of Nigeria",
      tools: [["Project Planner","planner.html"],["State Approval Guide","state-guide.html"],["Document Tracker","doc-tracker.html"],["Web GIS","gis.html"]],
      deliverables: ["Site analysis & planning brief","Layout / land-use drawings","Planning permit application forms","Submission & approval follow-up","Development control compliance letter"] },
    "Architect": { icon: "📐", body: "ARCON", bodyFull: "Architects Registration Council of Nigeria",
      tools: [["Cost Estimator","cost-estimator.html"],["Document Tracker","doc-tracker.html"],["Project Planner","planner.html"]],
      deliverables: ["Concept sketches & brief sign-off","Working drawings","Approval drawings","Specification & BoQ handover","Site supervision reports"] },
    "Structural Engineer": { icon: "🏗️", body: "COREN", bodyFull: "Council for the Regulation of Engineering in Nigeria",
      tools: [["Document Tracker","doc-tracker.html"],["Cost Estimator","cost-estimator.html"],["Project Planner","planner.html"]],
      deliverables: ["Soil investigation review","Structural design & calculations","Structural drawings","Integrity test reports","Stamped compliance certificate"] },
    "Surveyor": { icon: "📏", body: "SURCON", bodyFull: "Surveyors Council of Nigeria",
      tools: [["Web GIS","gis.html"],["Document Tracker","doc-tracker.html"],["State Approval Guide","state-guide.html"]],
      deliverables: ["Boundary / pillar identification","Topographic survey data","Survey plan (signed & sealed)","Coordinates schedule","Registry submission receipt"] },
    "Quantity Surveyor": { icon: "🧮", body: "QSRBN", bodyFull: "Quantity Surveyors Registration Board of Nigeria",
      tools: [["Cost Estimator","cost-estimator.html"],["Document Tracker","doc-tracker.html"]],
      deliverables: ["Measurement & take-off","Bill of Quantities","Cost plan & cash-flow forecast","Tender evaluation report","Final account"] },
    "Estate Surveyor & Valuer": { icon: "🏘️", body: "ESVARBON", bodyFull: "Estate Surveyors & Valuers Registration Board of Nigeria",
      tools: [["Cost Estimator","cost-estimator.html"],["State Approval Guide","state-guide.html"]],
      deliverables: ["Inspection & market data","Comparable analysis","Valuation / feasibility report","Signed & stamped report"] },
    "Builder": { icon: "🧱", body: "CORBON", bodyFull: "Council of Registered Builders of Nigeria",
      tools: [["Project Planner","planner.html"],["Cost Estimator","cost-estimator.html"],["Document Tracker","doc-tracker.html"]],
      deliverables: ["Site mobilisation","Progress photos & site reports","Material test certificates","Stage completion sign-off","Handover & snag list"] },
    "Environmental Consultant": { icon: "🌿", body: "EHORECON", bodyFull: "Environmental Health Officers Registration Council of Nigeria",
      tools: [["EIA Screening","eia-tools.html"],["Document Tracker","doc-tracker.html"],["State Approval Guide","state-guide.html"]],
      deliverables: ["Screening & scoping report","Baseline data collection","Impact assessment","Environmental Management Plan","Regulatory submission"] },
  };
  const ROLE_ALIAS = { "Engineer": "Structural Engineer" };
  const roleKey = (r) => (ROLES[r] ? r : ROLE_ALIAS[r] || "Town Planner");

  /* ---------- money helpers ---------- */
  const toKobo = (n) => Math.round(Number(n) * 100);
  const fmt = (k) => "₦" + (k / 100).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtShort = (k) => "₦" + Math.round(k / 100).toLocaleString("en-NG");
  const charge = (total) => Math.round(total * SERVICE_RATE);
  const validAcct = (n) => /^\d{10}$/.test(String(n || "").replace(/\s/g, ""));
  const mask = (acct) => (acct ? `${acct.bank} ••••${String(acct.accountNumber).slice(-4)}` : "No payout account");
  const uid = (p) => p + "-" + Math.random().toString(36).slice(2, 8).toUpperCase();

  /* ---------- seed data ---------- */
  function ms(list, total) {
    // list = [[name, pct], ...] -> milestones; net amounts split the 80% share, last takes remainder
    const net = total - charge(total);
    let used = 0;
    return list.map(([name, pct], i) => {
      const last = i === list.length - 1;
      const amt = last ? net - used : Math.round((net * pct) / 100);
      used += amt;
      return { id: "m" + (i + 1), name, pct, net: amt, status: "pending", note: "", submittedAt: null, approvedAt: null };
    });
  }

  const sampleAcct = (bank, n, name) => ({ bank, accountNumber: n, accountName: name });
  const SEED_PROS = [
    { id: "p1", name: "Tpl. Ngozi Adeyemi", role: "Town Planner", bodyNumber: "TOPREC/R.20418", city: "Lagos", years: 11, rating: 4.9, jobs: 58, payout: sampleAcct("Access Bank", "0123456789", "Ngozi Adeyemi") },
    { id: "p2", name: "Arc. Chinedu Okafor", role: "Architect", bodyNumber: "ARCON/A.11873", city: "Abuja", years: 14, rating: 4.8, jobs: 73, payout: sampleAcct("Zenith Bank", "2012345678", "Chinedu Okafor") },
    { id: "p3", name: "Engr. Funmilayo Bello", role: "Structural Engineer", bodyNumber: "COREN/R.38112", city: "Lagos", years: 9, rating: 4.9, jobs: 44, payout: sampleAcct("First Bank of Nigeria", "3098765432", "Funmilayo Bello") },
    { id: "p4", name: "Sur. Ibrahim Danjuma", role: "Surveyor", bodyNumber: "SURCON/S.5021", city: "Kaduna", years: 16, rating: 4.7, jobs: 91, payout: sampleAcct("Guarantee Trust Bank", "0456123987", "Ibrahim Danjuma") },
    { id: "p5", name: "QS Tunde Adewale", role: "Quantity Surveyor", bodyNumber: "QSRBN/Q.2290", city: "Ibadan", years: 8, rating: 4.6, jobs: 37, payout: sampleAcct("United Bank for Africa (UBA)", "1023456780", "Tunde Adewale") },
    { id: "p6", name: "Est. Amaka Eze", role: "Estate Surveyor & Valuer", bodyNumber: "ESVARBON/E.7714", city: "Enugu", years: 12, rating: 4.8, jobs: 64, payout: sampleAcct("Fidelity Bank", "5090011223", "Amaka Eze") },
    { id: "p7", name: "Bldr. Samuel Ogunleye", role: "Builder", bodyNumber: "CORBON/B.3305", city: "Lagos", years: 18, rating: 4.7, jobs: 29, payout: sampleAcct("Wema Bank", "0230998877", "Ogunleye Samuel Builders") },
    { id: "p8", name: "Dr. Halima Sule", role: "Environmental Consultant", bodyNumber: "EHORECON/H.1190", city: "Abuja", years: 13, rating: 4.9, jobs: 52, payout: sampleAcct("Stanbic IBTC Bank", "0034567891", "Halima Sule") },
  ].map((p, i) => ({ verified: true, email: p.name.split(" ").pop().toLowerCase() + "@example.com", mobile: "0800 000 000" + (i + 1), address: "", createdAt: Date.now() - 86400000 * 200, demo: true, ...p }));

  const SEED_SERVICES = [
    { id: "s1", proId: "p1", title: "Planning Permit Application Package", price: 450000, days: 21, icon: "📋", desc: "Site analysis, drawings and complete statutory permit application, with submission follow-up until approval.", ms: [["Site analysis & planning brief", 30], ["Drawings & application forms", 40], ["Submission & approval follow-up", 30]] },
    { id: "s2", proId: "p1", title: "Estate Layout & Master Plan", price: 2400000, days: 45, icon: "🗺️", desc: "Land-use layout, road network, plot subdivision and approval-ready master plan for estates up to 10 hectares.", ms: [["Concept layout", 30], ["Detailed layout & plot schedule", 40], ["Approval-ready package", 30]] },
    { id: "s3", proId: "p2", title: "Residential Duplex Design Package", price: 1800000, days: 30, icon: "🏠", desc: "Concept, working and approval drawings for a 4-bedroom duplex, with specification notes.", ms: [["Concept design sign-off", 30], ["Working drawings", 45], ["Approval drawings & handover", 25]] },
    { id: "s4", proId: "p2", title: "Commercial Plaza Design", price: 4500000, days: 60, icon: "🏢", desc: "Full architectural package for a multi-storey commercial plaza, including fire & egress strategy.", ms: [["Concept & massing", 25], ["Schematic design", 25], ["Working drawings", 35], ["Approval set & handover", 15]] },
    { id: "s5", proId: "p3", title: "Structural Design & Calculations", price: 1200000, days: 25, icon: "🏗️", desc: "Foundation and superstructure design with calculation notes and stamped drawings.", ms: [["Soil review & design basis", 30], ["Structural design & calcs", 45], ["Stamped drawings & certificate", 25]] },
    { id: "s6", proId: "p3", title: "Structural Integrity Assessment", price: 650000, days: 14, icon: "🔍", desc: "Non-destructive testing and integrity report for existing buildings.", ms: [["Site inspection & testing", 50], ["Integrity report & recommendations", 50]] },
    { id: "s7", proId: "p4", title: "Site Survey & Topographic Plan", price: 380000, days: 10, icon: "📏", desc: "Boundary pick-up, topographic detail and contour plan up to 5,000 sqm.", ms: [["Fieldwork", 50], ["Plan production & delivery", 50]] },
    { id: "s8", proId: "p4", title: "Survey Plan for C of O / Perfection", price: 520000, days: 18, icon: "📍", desc: "Registry-ready survey plan with coordinates, signed and sealed.", ms: [["Fieldwork & pillar placement", 40], ["Plan production & sealing", 40], ["Registry submission", 20]] },
    { id: "s9", proId: "p5", title: "Bill of Quantities & Cost Plan", price: 750000, days: 20, icon: "🧮", desc: "Detailed take-off, BoQ and cash-flow forecast for tendering and budgeting.", ms: [["Measurement & take-off", 40], ["BoQ & cost plan", 40], ["Tender support", 20]] },
    { id: "s10", proId: "p6", title: "Property Valuation Report", price: 300000, days: 7, icon: "🏘️", desc: "Market valuation for mortgage, sale, insurance or reporting purposes.", ms: [["Inspection & market data", 50], ["Signed valuation report", 50]] },
    { id: "s11", proId: "p6", title: "Feasibility & Appraisal Study", price: 950000, days: 21, icon: "📈", desc: "Development appraisal with market study, cost-benefit and return analysis.", ms: [["Market study", 40], ["Appraisal model", 35], ["Final report", 25]] },
    { id: "s12", proId: "p7", title: "Residential Duplex Construction (Shell & Core)", price: 25000000, days: 150, icon: "🧱", desc: "Foundation to roofing and envelope for a 4-bedroom duplex, with weekly site reports.", ms: [["Foundation", 20], ["Structural frame", 30], ["Roofing & envelope", 25], ["Finishing & handover", 25]] },
    { id: "s13", proId: "p7", title: "Perimeter Fence & Gatehouse", price: 6500000, days: 45, icon: "🚧", desc: "Block perimeter fence, gate piers and gatehouse for a standard plot.", ms: [["Mobilisation & foundations", 30], ["Fence & piers", 45], ["Gatehouse & handover", 25]] },
    { id: "s14", proId: "p8", title: "EIA Screening & Environmental Report", price: 1100000, days: 30, icon: "🌿", desc: "Screening, scoping and environmental report for regulatory submission.", ms: [["Screening & scoping", 30], ["Baseline & impact assessment", 45], ["Report & submission", 25]] },
    { id: "s15", proId: "p8", title: "Environmental Management Plan", price: 850000, days: 21, icon: "♻️", desc: "Mitigation, monitoring and compliance plan aligned with permit conditions.", ms: [["Impact register", 40], ["Management plan", 60]] },
  ].map((s) => ({ ...s, price: toKobo(s.price) }));

  function seedState() {
    const now = Date.now(), day = 86400000;
    const total = toKobo(10000000);
    const c1ms = ms([["Site Survey & Foundation", 20], ["Structural Frame", 20], ["Roofing & Envelope", 20], ["Finishing & Fittings", 25], ["Final Inspection & Handover", 15]], total);
    c1ms[0].status = "approved"; c1ms[0].submittedAt = now - day * 40; c1ms[0].approvedAt = now - day * 38;
    c1ms[1].status = "approved"; c1ms[1].submittedAt = now - day * 20; c1ms[1].approvedAt = now - day * 18;
    c1ms[2].status = "submitted"; c1ms[2].submittedAt = now - day * 3; c1ms[2].note = "Roof trusses and cover complete; photos and test certificates uploaded.";
    const t2 = toKobo(4500000);
    const acct = SEED_PROS.find((p) => p.id === "p7").payout;
    const t3 = toKobo(450000);
    const c3ms = ms([["Site analysis & planning brief", 30], ["Drawings & application forms", 40], ["Submission & approval follow-up", 30]], t3);
    c3ms[0].status = "in_progress";
    const ref = (i) => "HS-TXN-" + (100000 + i);
    const ledger = [
      { id: "l1", ts: now - day * 45, contractId: "HB/EM/0001", type: "fund", amount: total, from: "Emeka Udeogu", to: "Escrow", ref: ref(1), note: "Escrow funded (bank transfer)" },
      { id: "l2", ts: now - day * 38, contractId: "HB/EM/0001", type: "release", amount: c1ms[0].net, from: "Escrow", to: mask(acct), ref: ref(2), note: "Milestone 1 approved — Site Survey & Foundation" },
      { id: "l4", ts: now - day * 5, contractId: "HB/PP/0007", type: "fund", amount: t3, from: "Emeka Udeogu", to: "Escrow", ref: ref(4), note: "Escrow funded (bank transfer)" },
      { id: "l3", ts: now - day * 18, contractId: "HB/EM/0001", type: "release", amount: c1ms[1].net, from: "Escrow", to: mask(acct), ref: ref(3), note: "Milestone 2 approved — Structural Frame" },
    ];
    return {
      version: 1,
      platform: {
        settlement: { bank: "Guarantee Trust Bank", accountName: "Habitat Systems Planning Consultants", accountNumber: "0043237265" },
        collection: { bank: "Guarantee Trust Bank", accountName: "Habitat Systems Planning Consultants", accountNumber: "0043237265" },
        collectionSame: true,
      },
      client: { name: "Emeka Udeogu", sc: "HS-0123", phone: "0809 000 8000", email: "udeoguen@gmail.com" },
      session: { role: "client", proId: "p1", dark: false },
      pros: SEED_PROS,
      services: SEED_SERVICES,
      contracts: [
        { id: "HB/EM/0001", title: "Residential Duplex, Lekki — Construction", location: "Lekki, Lagos", proId: "p7", total, funded: total, releasedNet: c1ms[0].net + c1ms[1].net, chargeSettled: false, status: "active", createdAt: now - day * 46, milestones: c1ms },
        { id: "HB/OB/0014", title: "Commercial Plaza Design, Abuja", location: "Wuse II, Abuja", proId: "p2", total: t2, funded: 0, releasedNet: 0, chargeSettled: false, status: "awaiting_funding", createdAt: now - day * 2, milestones: ms([["Concept & massing", 25], ["Schematic design", 25], ["Working drawings", 35], ["Approval set & handover", 15]], t2) },
        { id: "HB/PP/0007", title: "Planning Permit Application — Lekki Duplex", location: "Lekki, Lagos", proId: "p1", total: t3, funded: t3, releasedNet: 0, chargeSettled: false, status: "active", createdAt: now - day * 6, milestones: c3ms },
      ],
      ledger,
      audit: [],
    };
  }

  /* ---------- load / save ---------- */
  let state;
  function load() {
    try { state = JSON.parse(localStorage.getItem(KEY)); } catch (e) { state = null; }
    if (!state || state.version !== 1) { state = seedState(); save(); }
    return state;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode: runs in-memory */ } }
  function reset() { state = seedState(); save(); try { localStorage.removeItem(CART_KEY); } catch (e) {} return state; }
  function audit(what) { state.audit.unshift({ ts: Date.now(), what }); state.audit = state.audit.slice(0, 40); }

  /* ---------- lookups ---------- */
  const pro = (id) => state.pros.find((p) => p.id === id);
  const contract = (id) => state.contracts.find((c) => c.id === id);
  const service = (id) => state.services.find((s) => s.id === id);
  const sc = (c) => charge(c.total);                                 // service charge (20%)
  const netTotal = (c) => c.total - sc(c);                           // payable to professional
  const settledCharge = (c) => (c.chargeSettled ? sc(c) : 0);
  const balance = (c) => c.funded - c.releasedNet - settledCharge(c); // funds currently held in escrow
  const toFund = (c) => Math.max(0, c.total - c.funded);              // outstanding to reach the contract sum
  const progress = (c) => Math.round(c.milestones.filter((m) => m.status === "approved").reduce((a, m) => a + m.pct, 0));
  // every naira funded is 20% service charge (held until completion) + 80% releasable to the professional
  const chargeHeld = (c) => (c.chargeSettled ? 0 : Math.round(c.funded * SERVICE_RATE));
  const releasable = (c) => Math.max(0, Math.round(c.funded * (1 - SERVICE_RATE)) - c.releasedNet);
  // how much more the client must fund before this milestone can be released
  const fundingNeeded = (c, m) => {
    const isLast = c.milestones.filter((x) => x.status !== "approved").length === 1;
    let need = Math.max(0, Math.ceil((m.net - releasable(c)) / (1 - SERVICE_RATE)));
    if (isLast) need = Math.max(need, toFund(c));
    return Math.min(need, toFund(c));
  };
  const nextOpen = (c) => c.milestones.find((m) => m.status !== "approved");

  /* ---------- contracts ---------- */
  function createContract({ title, location, proId, total, milestones }) {
    let id;
    do { id = "HB/MK/" + String(1000 + Math.floor(Math.random() * 9000)); } while (contract(id));
    const c = {
      id,
      title, location: location || "", proId, total, funded: 0, releasedNet: 0, chargeSettled: false,
      status: "awaiting_funding", createdAt: Date.now(), milestones: ms(milestones, total),
    };
    state.contracts.unshift(c); save(); return c;
  }

  function fund(contractId, amount, ref) {
    const c = contract(contractId);
    if (!c) return { ok: false, msg: "Contract not found." };
    if (amount <= 0) return { ok: false, msg: "Enter an amount greater than ₦0." };
    if (amount > toFund(c)) return { ok: false, msg: `That exceeds the outstanding contract sum (${fmt(toFund(c))}).` };
    c.funded += amount;
    if (c.status === "awaiting_funding") c.status = "active";
    state.ledger.unshift({ id: uid("l"), ts: Date.now(), contractId, type: "fund", amount, from: state.client.name, to: "Escrow", ref: ref || uid("HS-TXN"), note: "Escrow funded (bank transfer)" });
    save(); return { ok: true };
  }

  function startMilestone(cid, mid) {
    const c = contract(cid), m = c && c.milestones.find((x) => x.id === mid);
    if (!m) return { ok: false, msg: "Milestone not found." };
    if (c.funded <= 0) return { ok: false, msg: "The client has not funded escrow yet." };
    const idx = c.milestones.indexOf(m);
    if (idx > 0 && c.milestones[idx - 1].status !== "approved") return { ok: false, msg: "Previous milestone must be approved first." };
    m.status = "in_progress"; save(); return { ok: true };
  }

  function submitMilestone(cid, mid, note) {
    const c = contract(cid), m = c && c.milestones.find((x) => x.id === mid);
    if (!m) return { ok: false, msg: "Milestone not found." };
    m.status = "submitted"; m.note = note || ""; m.submittedAt = Date.now(); save(); return { ok: true };
  }

  function disputeMilestone(cid, mid, reason) {
    const c = contract(cid), m = c && c.milestones.find((x) => x.id === mid);
    if (!m) return { ok: false };
    m.status = "disputed"; m.dispute = reason || ""; save(); return { ok: true };
  }

  // Release = approve a submitted milestone. Moves its NET share to the pro's payout account.
  function approveMilestone(cid, mid) {
    const c = contract(cid), m = c && c.milestones.find((x) => x.id === mid);
    if (!m || m.status !== "submitted") return { ok: false, msg: "This milestone isn't awaiting approval." };
    const p = pro(c.proId);
    if (!p || !p.payout) return { ok: false, code: "no_payout", msg: "The professional hasn't added a payout account yet, so escrow has nowhere to remit funds." };
    const isLast = c.milestones.filter((x) => x.status !== "approved").length === 1;
    const need = fundingNeeded(c, m);
    if (need > 0) return { ok: false, code: "short", need, msg: `Escrow doesn't yet hold enough for this milestone${isLast ? " (the contract must be fully funded before final release, so the 20% service charge is secured)" : ""}. Fund at least ${fmt(need)} to continue.` };

    m.status = "approved"; m.approvedAt = Date.now(); c.releasedNet += m.net;
    const snap = { ...p.payout };
    state.ledger.unshift({ id: uid("l"), ts: Date.now(), contractId: cid, type: "release", amount: m.net, from: "Escrow", to: mask(snap), ref: uid("HS-TXN"), note: `Milestone ${c.milestones.indexOf(m) + 1} approved — ${m.name}` });

    let completed = false;
    if (isLast) {
      c.chargeSettled = true; c.status = "completed"; completed = true;
      const s = state.platform.settlement;
      state.ledger.unshift({ id: uid("l"), ts: Date.now(), contractId: cid, type: "charge", amount: sc(c), from: "Escrow", to: `${s.bank} ••••${s.accountNumber.slice(-4)} (${s.accountName})`, ref: uid("HS-TXN"), note: "20% service charge settled on contract completion" });
    }
    save(); return { ok: true, completed, released: m.net, charge: completed ? sc(c) : 0 };
  }

  /* ---------- accounts ---------- */
  function setPlatform({ settlement, collection, collectionSame }) {
    state.platform.settlement = settlement;
    state.platform.collectionSame = !!collectionSame;
    state.platform.collection = collectionSame ? { ...settlement } : collection;
    audit(`Platform bank details updated: settlement → ${settlement.bank} ••••${settlement.accountNumber.slice(-4)}`);
    save();
  }
  function setPayout(proId, acct) {
    const p = pro(proId); if (!p) return false;
    p.payout = acct; audit(`${p.name} updated payout account → ${acct.bank} ••••${acct.accountNumber.slice(-4)}`); save(); return true;
  }

  function registerPro(r) {
    const id = uid("p").toLowerCase();
    const p = {
      id, name: r.fullName, role: r.profession, bodyNumber: r.bodyNumber, address: r.address, mobile: r.mobile, email: r.email,
      years: Number(r.years) || 0, city: (r.address || "").split(",").slice(-2, -1)[0] ? r.address.split(",").slice(-2, -1)[0].trim() : "Nigeria",
      specializations: r.specializations || [], verified: !!r.verified, payout: r.payout, rating: 0, jobs: 0, createdAt: Date.now(), demo: false,
    };
    state.pros.push(p);
    const rc = roleKey(r.profession);
    // starter listing so a new professional shows up in the Marketplace straight away
    state.services.push({ id: uid("s").toLowerCase(), proId: id, title: `${r.profession} Consultation & Advisory`, price: toKobo(75000), days: 7, icon: ROLES[rc].icon, desc: `Initial consultation, site review and written advice from ${r.fullName}.`, ms: [["Consultation & site review", 50], ["Written advice delivered", 50]] });
    state.session.proId = id; state.session.role = "pro";
    audit(`${r.fullName} registered as ${r.profession} with payout account ${r.payout.bank} ••••${r.payout.accountNumber.slice(-4)}`);
    save(); return p;
  }

  /* ---------- cart ---------- */
  const cart = {
    get() { try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; } catch (e) { return []; } },
    set(a) { try { localStorage.setItem(CART_KEY, JSON.stringify(a)); } catch (e) {} },
    add(id) { const a = cart.get(); if (!a.includes(id)) a.push(id); cart.set(a); return a; },
    remove(id) { const a = cart.get().filter((x) => x !== id); cart.set(a); return a; },
    clear() { cart.set([]); },
  };

  load();
  window.HS = {
    SERVICE_RATE, BANKS, ROLES, roleKey, toKobo, fmt, fmtShort, charge, validAcct, mask, uid,
    get state() { return state; }, load, save, reset,
    pro, contract, service, sc, netTotal, balance, toFund, progress, nextOpen, chargeHeld, releasable, fundingNeeded,
    createContract, fund, startMilestone, submitMilestone, disputeMilestone, approveMilestone,
    setPlatform, setPayout, registerPro, cart,
  };
})();
