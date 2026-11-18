/* ==========================================================================
   HABITAT SYSTEMS — Dynamic dashboard (Client + Professional views)
   Rebuilt from the Teamily AI "Client Dashboard" and "Professional Dashboard"
   specs, wired to the shared escrow engine in store.js.
   ========================================================================== */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = HS.fmt;
  const S = () => HS.state;
  const date = (t) => new Date(t).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

  const ui = { client: { view: "overview", cid: null }, pro: { view: "overview", cid: null }, tab: "News" };

  /* ---------- content for the Resources tabs ---------- */
  const CONTENT = {
    News: [
      ["Escrow-protected milestone payments now live", "Funds are held safely and released to professionals only when you approve each milestone."],
      ["How the 20% service charge works", "Deducted from the contract sum, held in escrow, and settled only when your contract is completed."],
      ["Professionals can now add payout accounts", "Verified professionals register an account so escrow knows exactly where to remit released funds."],
      ["Marketplace: 15 verified services listed", "Browse, compare and order planning, design, survey and construction services in Naira."],
    ],
    Articles: [
      ["Documents you need before a planning permit application", "A practical checklist for land owners and developers."],
      ["Setbacks, plot coverage and why approvals get queried", "Understand the common reasons applications are returned."],
      ["Reading a survey plan: what to check before you buy land", "Coordinates, beacons and encumbrances explained."],
      ["Do you need an EIA? A plain-language guide", "Screening categories and when a full study is triggered."],
    ],
    Blogs: [
      ["Why milestone-based payments reduce project disputes", "Clear stages, clear payments, clear expectations."],
      ["Choosing between an architect and a design-and-build firm", "Cost, control and accountability compared."],
      ["Budgeting for professional fees on a duplex project", "Where the money goes from concept to handover."],
      ["Site inspection day: what a good report looks like", "Photos, measurements and sign-off essentials."],
    ],
    Events: [
      ["Planning Clinic — permit walkthrough (webinar)", "Monthly · Online · Free for registered clients"],
      ["Meet the Professionals — Q&A session", "Quarterly · Online · Ask verified experts anything"],
      ["Escrow 101 for developers", "On demand · Learn how funding and release work"],
      ["Site visit safety briefing", "Monthly · Lagos & Abuja · Register on the Network page"],
    ],
  };

  /* ---------- small helpers ---------- */
  function toast(msg, err) {
    const t = document.createElement("div");
    t.className = "toast" + (err ? " err" : "");
    t.textContent = msg;
    $("#toasts").appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }
  const mstatus = (s) => ({
    pending: ["status-pending", "Not started"], in_progress: ["status-progress", "In progress"],
    submitted: ["status-pending", "Awaiting approval"], approved: ["status-verified", "Approved & released"], disputed: ["status-failed", "Disputed"],
  }[s] || ["status-pending", s]);
  const cstatus = (s) => ({ awaiting_funding: ["status-await", "Awaiting funding"], active: ["status-progress", "Active"], completed: ["status-done", "Completed"] }[s]);
  const pill = ([cls, txt]) => `<span class="status-pill ${cls}">${txt}</span>`;
  const role = () => S().session.role;
  const myPro = () => HS.pro(S().session.proId) || S().pros[0];
  const clientContracts = () => S().contracts;
  const proContracts = () => S().contracts.filter((c) => c.proId === myPro().id);
  function selContract(list, key) {
    let c = list.find((x) => x.id === ui[key].cid);
    if (!c) { c = list[0]; ui[key].cid = c ? c.id : null; }
    return c;
  }

  /* ---------- modal ---------- */
  function openModal(html, wide) {
    $("#modalRoot").innerHTML = `<div class="modal-overlay open" id="mo"><div class="modal ${wide ? "wide" : ""}">${html}</div></div>`;
    $("#mo").addEventListener("mousedown", (e) => { if (e.target.id === "mo") closeModal(); });
  }
  function closeModal() { $("#modalRoot").innerHTML = ""; }
  const mHead = (t, sub) => `<div class="modal-head"><div><h3>${t}</h3>${sub ? `<p>${sub}</p>` : ""}</div><button class="modal-close" data-act="close">✕</button></div>`;

  /* ======================================================================
     RENDER ROOT
     ====================================================================== */
  function render() {
    const r = role();
    document.body.classList.toggle("dark", !!S().session.dark);
    $("#darkSw").classList.toggle("on", !!S().session.dark);
    document.querySelectorAll("#roleSeg button").forEach((b) => b.classList.toggle("active", b.dataset.role === r));
    $("#actingAs").innerHTML = r === "pro"
      ? `<select id="proPick" aria-label="Act as professional">${S().pros.map((p) => `<option value="${p.id}" ${p.id === myPro().id ? "selected" : ""}>Acting as: ${esc(p.name)}</option>`).join("")}</select>`
      : "";
    renderNav();
    const v = ui[r].view;
    const views = r === "client"
      ? { overview: cOverview, contracts: cContracts, escrow: cEscrow, settings: cSettings }
      : { overview: pOverview, jobs: pJobs, earnings: pEarnings, payout: pPayout };
    $("#app").innerHTML = (views[v] || views.overview)();
    afterRender();
  }

  function renderNav() {
    const r = role();
    const awaiting = r === "client"
      ? clientContracts().reduce((a, c) => a + c.milestones.filter((m) => m.status === "submitted").length, 0)
      : proContracts().reduce((a, c) => a + c.milestones.filter((m) => m.status === "disputed").length, 0);
    const items = r === "client"
      ? [["overview", "🏠 Dashboard"], ["contracts", "📑 My Contracts", awaiting], ["escrow", "🔐 Escrow & Ledger"], ["settings", "⚙️ Settings & Billing"]]
      : [["overview", "🏠 Overview"], ["jobs", "🛠️ My Jobs"], ["earnings", "💰 Earnings & Statement"], ["payout", "🏦 Payout Account", myPro().payout ? 0 : "!"]];
    const links = [["marketplace.html", "🛒 Marketplace"], ["chat.html", "💬 Messages"], ["professionals.html", "🤝 Professionals"], ["mediation.html", "⚖️ Mediation"], ["tools.html", "🧰 Tools"]];
    $("#sideNav").innerHTML =
      items.map(([k, l, n]) => `<button data-act="nav" data-view="${k}" class="${ui[r].view === k ? "active" : ""}">${l}${n ? `<span class="nbadge">${n}</span>` : ""}</button>`).join("") +
      '<div class="sep"></div>' + links.map(([h, l]) => `<a href="${h}">${l}</a>`).join("");
  }

  /* ======================================================================
     CLIENT VIEWS
     ====================================================================== */
  function profileCardClient() {
    const c = S().client;
    return `<div class="profile-card">
      <img class="avatar" src="assets/img/habitat-logo.png" alt="Profile photo">
      <div><div class="profile-name">${esc(c.name)}</div><div class="profile-sc">SC: ${esc(c.sc)}</div></div>
      <div class="profile-meta">
        <div><p>Contact</p><p>📞 ${esc(c.phone)}</p></div>
        <div><p>Email</p><p>✉️ ${esc(c.email)}</p></div>
        <div><p>Active contracts</p><p>${clientContracts().filter((x) => x.status !== "completed").length}</p></div>
      </div></div>`;
  }

  function totals() {
    const cs = clientContracts();
    return {
      active: cs.filter((c) => c.status === "active").length,
      balance: cs.reduce((a, c) => a + HS.balance(c), 0),
      released: cs.reduce((a, c) => a + c.releasedNet, 0),
      chargeHeld: cs.reduce((a, c) => a + HS.chargeHeld(c), 0),
      chargePaid: cs.reduce((a, c) => a + (c.chargeSettled ? HS.sc(c) : 0), 0),
    };
  }

  function cOverview() {
    const t = totals(), c = selContract(clientContracts(), "client");
    return `
    ${profileCardClient()}
    <div class="kpis">
      <div class="kpi"><p>Active contracts</p><h3>${t.active}</h3><small>${clientContracts().length} in total</small></div>
      <div class="kpi"><p>Held in escrow</p><h3>${money(t.balance)}</h3><small>Safe until you approve</small></div>
      <div class="kpi"><p>Released to professionals</p><h3>${money(t.released)}</h3><small>Milestone by milestone</small></div>
      <div class="kpi orange"><p>Service charge held (20%)</p><h3>${money(t.chargeHeld)}</h3><small>${money(t.chargePaid)} settled on completion</small></div>
    </div>
    ${clientContracts().length > 1 ? `<div class="form-card no-print" style="margin-bottom:1.5rem;padding:1rem 1.25rem;display:flex;gap:1rem;align-items:center;flex-wrap:wrap"><label style="font-weight:800;font-size:.85rem">Project</label>
      <select class="form-control" style="max-width:420px" data-act="selc">${clientContracts().map((x) => `<option value="${esc(x.id)}" ${x.id === (c && c.id) ? "selected" : ""}>${esc(x.id)} — ${esc(x.title)}</option>`).join("")}</select>
      <a class="btn btn-accent btn-sm" href="marketplace.html">＋ Start new project</a></div>` : ""}
    ${c ? `<div class="two-col">
      <div>
        <div class="card">
          <h3>Project Progress — ${esc(c.id)}</h3>
          <p class="hint" style="margin-top:.2rem">${esc(c.title)} · ${esc(HS.pro(c.proId).name)}</p>
          <div class="pbar"><i style="width:${HS.progress(c)}%"></i></div>
          <div style="display:flex;justify-content:space-between;font-size:.78rem;font-weight:700;color:var(--text-muted)"><span>${HS.progress(c)}% complete</span><span>${c.milestones.filter((m) => m.status === "approved").length}/${c.milestones.length} milestones approved</span></div>
          <div class="phase-track" style="margin-top:1.2rem">${c.milestones.map((m, i) => `<div class="${m.status === "approved" ? "done" : ""}" title="${esc(m.name)}">M${i + 1}</div>`).join("")}</div>
          <button class="btn btn-ghost btn-sm" data-act="nav" data-view="contracts" data-cid="${esc(c.id)}">View milestones →</button>
        </div>
        <div class="card" style="margin-top:1.5rem"><h3>Application status timeline</h3>${timeline(c)}</div>
      </div>
      ${escrowCard(c)}
    </div>` : '<div class="card empty">No contracts yet. <a class="btn btn-accent btn-sm" href="marketplace.html">Browse the Marketplace</a></div>'}
    ${resourceTabs()}`;
  }

  function escrowCard(c) {
    const sub = c.milestones.find((m) => m.status === "submitted");
    const net = HS.netTotal(c), chg = HS.sc(c), rel = c.releasedNet;
    const pct = (n) => ((n / c.total) * 100).toFixed(2);
    return `<div class="escrow-card" id="escrowCard">
      <h3>🔐 Escrow — ${esc(c.id)}</h3>
      <div class="escrow-row"><span>Contract sum</span><span>${money(c.total)}</span></div>
      <div class="escrow-row sub"><span>Funded so far</span><span>${money(c.funded)}</span></div>
      <div class="escrow-row sub"><span>Still to fund</span><span>${money(HS.toFund(c))}</span></div>
      <div class="split-bar" title="Contract sum split"><i class="rel" style="width:${pct(rel)}%"></i><i class="net" style="width:${pct(net - rel)}%"></i><i class="chg" style="width:${pct(chg)}%"></i></div>
      <div class="legend"><span style="--c:#0f6e8c">Released</span><span style="--c:var(--primary)">Net to release</span><span style="--c:var(--accent)">20% service charge</span></div>
      <div style="margin-top:.9rem">
        <div class="escrow-row"><span>Paid to professional</span><span>${money(rel)}</span></div>
        <div class="escrow-row orange"><span>Service charge held (20%)</span><span>${money(c.chargeSettled ? 0 : chg)}</span></div>
        <div class="escrow-row"><span>Escrow balance</span><span>${money(HS.balance(c))}</span></div>
      </div>
      <div class="btns no-print">
        <button class="btn btn-primary" data-act="fund" data-cid="${esc(c.id)}" ${HS.toFund(c) <= 0 ? "disabled" : ""}>＋ Fund</button>
        <button class="btn btn-orange" data-act="approve" data-cid="${esc(c.id)}" data-mid="${sub ? sub.id : ""}" ${sub ? "" : "disabled"}>✓ Approve${sub ? " M" + (c.milestones.indexOf(sub) + 1) : ""}</button>
      </div>
      <p class="hint" style="margin-top:.9rem">${c.chargeSettled ? "✅ Contract completed — the service charge was settled to Habitat Systems." : "20% of the contract sum is deducted as the service charge but stays held in escrow until the contract is completed. The other 80% is released in portions as you approve milestones."}</p>
    </div>`;
  }

  function timeline(c) {
    const ev = [{ t: c.createdAt, h: "Contract created", s: `${money(c.total)} · ${HS.pro(c.proId).name}`, k: "" }];
    S().ledger.filter((l) => l.contractId === c.id).forEach((l) => ev.push({ t: l.ts, h: l.note, s: `${money(l.amount)} · ${esc(l.ref)}`, k: l.type === "charge" ? "orange" : "" }));
    c.milestones.forEach((m, i) => { if (m.submittedAt) ev.push({ t: m.submittedAt, h: `M${i + 1} submitted — ${m.name}`, s: m.status === "submitted" ? "Awaiting your approval" : "Submitted for approval", k: "orange" }); });
    ev.sort((a, b) => b.t - a.t);
    const next = HS.nextOpen(c);
    return `<div class="timeline">${next ? `<div class="tl-item grey"><strong>Up next: ${esc(next.name)}</strong><span>${mstatus(next.status)[1]} · ${money(next.net)} on approval</span></div>` : ""}${ev.slice(0, 7).map((e) => `<div class="tl-item ${e.k}"><strong>${esc(e.h)}</strong><span>${date(e.t)} · ${e.s}</span></div>`).join("")}</div>`;
  }

  function resourceTabs() {
    const tabs = Object.keys(CONTENT);
    return `<div class="card no-print" style="margin-top:1.75rem">
      <h3 style="margin-bottom:.8rem">Resources</h3>
      <div class="tabs">${tabs.map((t) => `<button data-act="tab" data-tab="${t}" class="${ui.tab === t ? "active" : ""}">${t}</button>`).join("")}</div>
      <div class="carousel"><button class="car-btn l" data-act="car" data-dir="-1" aria-label="Previous">‹</button>
        <div class="carousel-track" id="track">${CONTENT[ui.tab].map(([h, p], i) => `<div class="slide"><div class="thumb ${i % 2 ? "o" : ""}">${ui.tab}</div><div class="b"><h4>${esc(h)}</h4><p>${esc(p)}</p></div></div>`).join("")}</div>
        <button class="car-btn r" data-act="car" data-dir="1" aria-label="Next">›</button></div></div>`;
  }

  function milestoneList(c, who) {
    const p = HS.pro(c.proId);
    return c.milestones.map((m, i) => {
      const prevOk = i === 0 || c.milestones[i - 1].status === "approved";
      let actions = "";
      if (who === "client" && m.status === "submitted") actions = `<div class="milestone-actions no-print"><button class="btn btn-primary btn-sm" data-act="approve" data-cid="${esc(c.id)}" data-mid="${m.id}">✓ Approve &amp; Release ${money(m.net)}</button><button class="btn btn-ghost btn-sm" data-act="dispute" data-cid="${esc(c.id)}" data-mid="${m.id}">⚠ Not satisfied — raise issue</button></div>`;
      if (who === "pro") {
        if (m.status === "pending" && prevOk && c.funded > 0) actions = `<div class="milestone-actions"><button class="btn btn-ghost btn-sm" data-act="start" data-cid="${esc(c.id)}" data-mid="${m.id}">▶ Start milestone</button></div>`;
        if (m.status === "in_progress" || m.status === "disputed") actions = `<div class="milestone-actions"><button class="btn btn-primary btn-sm" data-act="submitms" data-cid="${esc(c.id)}" data-mid="${m.id}">📤 ${m.status === "disputed" ? "Revise &amp; resubmit" : "Submit for approval"}</button></div>`;
        if (m.status === "pending" && prevOk && c.funded <= 0) actions = `<p class="hint">Waiting for the client to fund escrow before work can start.</p>`;
      }
      const hint = m.status === "approved" ? `Approved ${date(m.approvedAt)} · ${money(m.net)} released to ${esc(HS.mask(p.payout))}`
        : m.status === "submitted" ? `Submitted ${date(m.submittedAt)} — awaiting client approval · ${money(m.net)} pending release`
        : m.status === "disputed" ? `Issue raised by client${m.dispute ? ": " + esc(m.dispute) : ""}` : `${m.status === "in_progress" ? "In progress" : "Not started"} · ${money(m.net)} on approval`;
      return `<div class="milestone"><div class="milestone-dot ${m.status}">${m.status === "approved" ? "✓" : i + 1}</div>
        <div class="milestone-body"><strong>${i + 1}. ${esc(m.name)}</strong> ${pill(mstatus(m.status))}<p class="hint">${hint}</p>${m.note ? `<div class="note-box">“${esc(m.note)}”</div>` : ""}${actions}</div>
        <div class="milestone-amt">${money(m.net)}<small>${m.pct}% of contract</small></div></div>`;
    }).join("");
  }

  function breakdown(c) {
    return `<table><tbody>
      <tr><td>Contract sum</td><td style="text-align:right;font-weight:800">${money(c.total)}</td></tr>
      <tr><td>Less: Habitat Systems service charge (20%) <span class="hint">— held in escrow until completion</span></td><td style="text-align:right;font-weight:800;color:var(--accent-dark)">− ${money(HS.sc(c))}</td></tr>
      <tr><td><strong>Net payable to professional (80%)</strong> <span class="hint">— released per milestone</span></td><td style="text-align:right;font-weight:800;color:var(--primary)">${money(HS.netTotal(c))}</td></tr></tbody></table>`;
  }

  function cContracts() {
    const list = clientContracts(), c = selContract(list, "client");
    if (!c) return '<div class="card empty">No contracts yet. <a class="btn btn-accent btn-sm" href="marketplace.html">Browse the Marketplace</a></div>';
    const p = HS.pro(c.proId);
    return `<div class="view-title"><div><h2>My Contracts</h2><p>Approve milestones to release escrow in portions.</p></div><a class="btn btn-accent" href="marketplace.html">＋ New project</a></div>
      <div class="contract-pick">${list.map((x) => `<div class="contract-row ${x.id === c.id ? "active" : ""}" data-act="selc" data-cid="${esc(x.id)}"><div><h4>${esc(x.title)}</h4><p>${esc(x.id)} · ${esc(HS.pro(x.proId).name)}</p></div>${pill(cstatus(x.status))}<div class="amt">${money(x.total)}<p>${HS.progress(x)}% done</p></div></div>`).join("")}</div>
      <div class="two-col"><div>
        <div class="card"><h3>Milestones — ${esc(c.title)}</h3><div style="margin-top:1rem">${milestoneList(c, "client")}</div></div>
        <div class="card" style="margin-top:1.5rem"><h3>Contract sum &amp; service charge</h3><div style="margin-top:.8rem">${breakdown(c)}</div></div>
      </div><div>
        ${escrowCard(c)}
        <div class="card" style="margin-top:1.5rem"><h3>Remittance instruction</h3>
          <p class="hint" style="margin:.4rem 0 .8rem">Escrow releases each approved milestone to the professional's payout account:</p>
          ${p.payout ? `<div class="bank-box"><div class="bank-row"><span>Professional</span><span>${esc(p.name)}</span></div><div class="bank-row"><span>Bank</span><span>${esc(p.payout.bank)}</span></div><div class="bank-row"><span>Account</span><span>••••${esc(p.payout.accountNumber.slice(-4))}</span></div><div class="bank-row"><span>Name</span><span>${esc(p.payout.accountName)}</span></div></div>` : `<div class="alert alert-warn">⚠ This professional hasn't added a payout account yet.</div>`}
          <p class="hint">On completion the 20% service charge is remitted to <strong>${esc(S().platform.settlement.accountName)}</strong>, ${esc(S().platform.settlement.bank)}.</p></div>
        <div class="card" style="margin-top:1.5rem"><h3>Disagree on a milestone?</h3><p style="margin-top:.5rem">Either party can request mediation.</p><a href="mediation.html" class="btn btn-ghost btn-block" style="margin-top:1rem">⚖️ Start Mediation</a></div>
      </div></div>`;
  }

  function acctCard(a, label, tag, editAct) {
    return `<div class="acct-card"><span class="tag-o">${tag}</span><br><small>${label}</small><h3>${esc(a.accountNumber.replace(/(\d{4})(\d{4})(\d{2})/, "$1 $2 $3"))}</h3><p>${esc(a.accountName)}</p><p style="opacity:.85">${esc(a.bank)}</p>${editAct ? `<button class="btn btn-orange btn-sm no-print" data-act="${editAct}">✏️ ${editAct === "editpayout" ? "Edit payout account" : "Edit bank details"}</button>` : ""}</div>`;
  }

  function cEscrow() {
    const t = totals(), pf = S().platform;
    const rows = S().ledger.map((l) => `<tr><td>${date(l.ts)}</td><td><span class="type-pill t-${l.type}">${l.type === "fund" ? "Funded" : l.type === "release" ? "Released" : "Service charge"}</span></td><td>${esc(l.contractId)}<br><span class="hint">${esc(l.note)}</span></td><td>${esc(l.type === "fund" ? "From " + l.from : "To " + l.to)}</td><td style="text-align:right" class="${l.type === "fund" ? "amt-in" : l.type === "charge" ? "amt-chg" : "amt-out"}">${l.type === "fund" ? "+" : "−"} ${money(l.amount)}</td><td class="hint">${esc(l.ref)}</td></tr>`).join("");
    return `<div class="view-title"><div><h2>Escrow &amp; Ledger</h2><p>Every naira held, released and settled — in one place.</p></div></div>
      <div class="kpis"><div class="kpi"><p>Escrow balance</p><h3>${money(t.balance)}</h3></div><div class="kpi"><p>Released</p><h3>${money(t.released)}</h3></div><div class="kpi orange"><p>Service charge held</p><h3>${money(t.chargeHeld)}</h3></div><div class="kpi orange"><p>Service charge settled</p><h3>${money(t.chargePaid)}</h3></div></div>
      <div class="grid grid-2" style="margin-bottom:1.5rem">
        ${acctCard(pf.collection, "Escrow collection account — clients fund here", "FUNDING ACCOUNT", "editplat")}
        ${acctCard(pf.settlement, "Service-charge settlement account", "20% PAID HERE ON COMPLETION", "editplat")}
      </div>
      <div class="card"><h3>Ledger</h3><div class="table-wrap" style="margin-top:.8rem"><table><thead><tr><th>Date</th><th>Type</th><th>Contract</th><th>Account</th><th style="text-align:right">Amount</th><th>Ref</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="hint">No transactions yet.</td></tr>'}</tbody></table></div></div>
      <div class="card" style="margin-top:1.5rem"><h3>Bank-detail change log</h3><ul class="audit" style="margin-top:.6rem">${S().audit.length ? S().audit.map((a) => `<li>${date(a.ts)} — ${esc(a.what)}</li>`).join("") : "<li>No changes yet.</li>"}</ul></div>`;
  }

  function cSettings() {
    const c = S().client, pf = S().platform;
    return `<div class="view-title"><div><h2>Settings &amp; Billing</h2><p>Your profile, payment accounts and display preferences.</p></div></div>
      <div class="two-col"><div>
        <form class="form-card" data-form="profile"><h3 style="margin-bottom:1rem">Profile</h3>
          <div class="form-group"><label>Full name</label><input class="form-control" name="name" value="${esc(c.name)}" required></div>
          <div class="form-row"><div class="form-group"><label>Phone</label><input class="form-control" name="phone" value="${esc(c.phone)}"></div><div class="form-group"><label>Email</label><input class="form-control" type="email" name="email" value="${esc(c.email)}"></div></div>
          <button class="btn btn-primary">Save profile</button></form>
        <div class="card" style="margin-top:1.5rem"><h3>Demo data</h3><p style="margin:.5rem 0 1rem">Everything here is stored in this browser only. Reset to restore the sample contracts.</p><button class="btn btn-danger" data-act="reset">Reset demo data</button></div>
      </div><div>
        ${acctCard(pf.collection, "Escrow collection account", "BANK DETAILS (EDITABLE)", "editplat")}
        <div class="card" style="margin-top:1.5rem"><h3>Billing</h3><table style="margin-top:.8rem"><tr><td>Payment method</td><td style="text-align:right">Bank transfer to escrow account</td></tr><tr><td>Currency</td><td style="text-align:right">Nigerian Naira (₦)</td></tr><tr><td>Service charge</td><td style="text-align:right;font-weight:700">20% of contract sum</td></tr><tr><td>Settlement account</td><td style="text-align:right">${esc(pf.settlement.bank)} ••••${esc(pf.settlement.accountNumber.slice(-4))}</td></tr></table></div>
      </div></div>`;
  }

  /* ======================================================================
     PROFESSIONAL VIEWS
     ====================================================================== */
  function proTotals() {
    const cs = proContracts();
    return {
      active: cs.filter((c) => c.status !== "completed").length,
      gross: cs.reduce((a, c) => a + c.total, 0),
      net: cs.reduce((a, c) => a + HS.netTotal(c), 0),
      paid: cs.reduce((a, c) => a + c.releasedNet, 0),
    };
  }

  function pOverview() {
    const p = myPro(), rk = HS.roleKey(p.role), R = HS.ROLES[rk], t = proTotals(), cs = proContracts();
    const todo = [];
    cs.forEach((c) => c.milestones.forEach((m, i) => {
      const prevOk = i === 0 || c.milestones[i - 1].status === "approved";
      if (m.status === "disputed") todo.push([c, m, i, "Client raised an issue — revise & resubmit", "submitms"]);
      else if (m.status === "in_progress") todo.push([c, m, i, "In progress — submit when complete", "submitms"]);
      else if (m.status === "pending" && prevOk && c.funded > 0) todo.push([c, m, i, "Escrow funded — ready to start", "start"]);
    }));
    return `<div class="profile-card"><div class="pro-avatar" style="width:104px;height:104px;font-size:2rem;border-radius:50%;background:var(--gradient-brand);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800">${esc(p.name.replace(/^(\w+\.\s*)/, "").split(" ").map((x) => x[0]).slice(0, 2).join(""))}</div>
      <div><div class="profile-name">${esc(p.name)} <span class="role-badge">${R.icon} ${esc(p.role)}</span></div><div class="profile-sc">${esc(R.body)} No. ${esc(p.bodyNumber)} · ${p.verified ? "✓ Verified" : "Pending verification"}</div></div>
      <div class="profile-meta"><div><p>Contact</p><p>📞 ${esc(p.mobile || "—")}</p></div><div><p>Email</p><p>✉️ ${esc(p.email || "—")}</p></div><div><p>Experience</p><p>${p.years || "—"} yrs</p></div></div></div>
    ${p.payout ? "" : `<div class="acct-empty" style="margin-bottom:1.5rem"><h3>⚠ Add your payout account</h3><p style="margin:.4rem 0 1rem">Escrow can't release your earnings until it knows where to remit them.</p><button class="btn btn-orange" data-act="editpayout">Add payout account</button></div>`}
    <div class="kpis"><div class="kpi"><p>Active jobs</p><h3>${t.active}</h3></div><div class="kpi"><p>Gross contract value</p><h3>${money(t.gross)}</h3></div><div class="kpi"><p>Net earnings (80%)</p><h3>${money(t.net)}</h3><small>After 20% service charge</small></div><div class="kpi orange"><p>Paid to your account</p><h3>${money(t.paid)}</h3><small>${money(t.net - t.paid)} still to be released</small></div></div>
    <div class="two-col"><div>
      <div class="card"><h3>Action needed</h3>${todo.length ? `<div style="margin-top:.8rem">${todo.map(([c, m, i, txt, act]) => `<div class="milestone"><div class="milestone-dot ${m.status}">${i + 1}</div><div class="milestone-body"><strong>${esc(m.name)}</strong><p class="hint">${esc(c.id)} · ${txt}</p></div><button class="btn btn-primary btn-sm" data-act="${act}" data-cid="${esc(c.id)}" data-mid="${m.id}">${act === "start" ? "Start" : "Submit"}</button></div>`).join("")}</div>` : '<p class="hint" style="margin-top:.6rem">Nothing waiting on you right now. ✅</p>'}</div>
      <div class="card" style="margin-top:1.5rem"><h3>${R.icon} ${esc(p.role)} workbench</h3><p class="hint" style="margin:.3rem 0 .6rem">Typical deliverables for your discipline — tick them off as you go.</p>
        <ul class="workbench">${R.deliverables.map((d, i) => `<li><input type="checkbox" id="wb${i}" ${localStorage.getItem("hs_wb_" + p.id + i) ? "checked" : ""} data-wb="${p.id}${i}"><label for="wb${i}">${esc(d)}</label></li>`).join("")}</ul>
        <div class="tool-links">${R.tools.map(([l, h]) => `<a class="btn btn-ghost btn-sm" href="${h}">${l} →</a>`).join("")}</div></div>
    </div><div>${p.payout ? acctCard(p.payout, "Escrow remits your earnings to", "PAYOUT ACCOUNT", "editpayout") : ""}
      <div class="card" style="margin-top:1.5rem"><h3>How you get paid</h3><ol style="margin-top:.6rem;padding-left:1.1rem;font-size:.85rem;color:var(--text-muted);line-height:1.8"><li>Client funds escrow (in portions if they wish).</li><li>You submit each milestone for approval.</li><li>On approval, that milestone's share of the <strong>net 80%</strong> is remitted to your payout account.</li><li>Habitat's 20% service charge is held until the contract completes.</li></ol></div></div></div>`;
  }

  function pJobs() {
    const cs = proContracts();
    if (!cs.length) return '<div class="card empty">No jobs yet — once a client orders your service it appears here.</div>';
    return `<div class="view-title"><div><h2>My Jobs</h2><p>Start milestones, submit work and track payment release.</p></div></div>` +
      cs.map((c) => `<div class="card" style="margin-bottom:1.5rem"><div style="display:flex;justify-content:space-between;gap:1rem;flex-wrap:wrap;align-items:flex-start"><div><h3>${esc(c.title)}</h3><p class="hint">${esc(c.id)} · ${esc(c.location || "—")} · Client: ${esc(S().client.name)}</p></div>${pill(cstatus(c.status))}</div>
        <div class="grid grid-3" style="margin:1rem 0;gap:1rem"><div class="kpi"><p>Contract sum</p><h3>${money(c.total)}</h3></div><div class="kpi"><p>Your net (80%)</p><h3>${money(HS.netTotal(c))}</h3></div><div class="kpi orange"><p>Escrow funded</p><h3>${money(c.funded)}</h3></div></div>
        ${milestoneList(c, "pro")}</div>`).join("");
  }

  function pEarnings() {
    const p = myPro(), cs = proContracts(), t = proTotals();
    const rows = cs.map((c) => `<tr><td>${esc(c.id)}<br><span class="hint">${esc(c.title)}</span></td><td style="text-align:right">${money(c.total)}</td><td style="text-align:right;color:var(--accent-dark)">− ${money(HS.sc(c))}</td><td style="text-align:right;font-weight:700">${money(HS.netTotal(c))}</td><td style="text-align:right">${money(c.releasedNet)}</td><td style="text-align:right">${money(HS.netTotal(c) - c.releasedNet)}</td></tr>`).join("");
    const chg = cs.reduce((a, c) => a + HS.sc(c), 0);
    return `<div class="view-title no-print"><div><h2>Earnings &amp; Statement</h2><p>Gross, 20% service charge and net, per contract.</p></div><button class="btn btn-orange" data-act="print">🖨 Print / save statement</button></div>
      <div class="card" id="printArea"><div class="statement-head"><div><h3 style="font-size:1.2rem">HABITAT SYSTEMS</h3><p class="hint">Earnings statement</p></div><div style="text-align:right"><strong>${esc(p.name)}</strong><p class="hint">${esc(p.role)} · ${esc(p.bodyNumber)}<br>Generated ${date(Date.now())}</p></div></div>
        <div class="table-wrap"><table><thead><tr><th>Contract</th><th style="text-align:right">Contract sum</th><th style="text-align:right">Service charge (20%)</th><th style="text-align:right">Net (80%)</th><th style="text-align:right">Released</th><th style="text-align:right">Outstanding</th></tr></thead><tbody>${rows || '<tr><td colspan="6" class="hint">No contracts yet.</td></tr>'}</tbody>
        <tfoot><tr><th>Total</th><th style="text-align:right">${money(t.gross)}</th><th style="text-align:right">− ${money(chg)}</th><th style="text-align:right">${money(t.net)}</th><th style="text-align:right">${money(t.paid)}</th><th style="text-align:right">${money(t.net - t.paid)}</th></tr></tfoot></table></div>
        <p class="hint" style="margin-top:1rem">Payout account: ${esc(p.payout ? `${p.payout.accountName} · ${p.payout.bank} ••••${p.payout.accountNumber.slice(-4)}` : "not set")}. The 20% service charge is deducted from the contract sum and held in escrow until contract completion. All amounts in Nigerian Naira (₦).</p></div>`;
  }

  function pPayout() {
    const p = myPro();
    return `<div class="view-title"><div><h2>Payout Account</h2><p>Tell escrow where to remit your released milestone payments.</p></div></div>
      <div class="two-col"><div>${p.payout ? acctCard(p.payout, "Escrow remits your earnings to", "PAYOUT ACCOUNT", "editpayout") : `<div class="acct-empty"><h3>No payout account yet</h3><p style="margin:.4rem 0 1rem">Add your bank details so approved milestones can be paid out.</p><button class="btn btn-orange" data-act="editpayout">Add payout account</button></div>`}</div>
      <div class="card"><h3>Good to know</h3><ul style="margin-top:.6rem"><li>Use an account in your own name or your registered business name.</li><li>Changes apply to future releases only.</li><li>Every change is written to the change log for security.</li></ul>
      <h4 style="margin:1rem 0 .4rem;font-size:.85rem">Recent changes</h4><ul class="audit">${S().audit.length ? S().audit.slice(0, 5).map((a) => `<li>${date(a.ts)} — ${esc(a.what)}</li>`).join("") : "<li>No changes yet.</li>"}</ul></div></div>`;
  }

  /* ======================================================================
     MODALS: fund, approve, dispute, submit, bank edit
     ====================================================================== */
  function openFund(cid, prefill, reason) {
    const c = HS.contract(cid), out = HS.toFund(c);
    const chips = [["25%", Math.round(c.total * 0.25)], ["50%", Math.round(c.total * 0.5)], ["Full balance", out]].filter(([, v]) => v > 0 && v <= out);
    openModal(`${mHead("Fund Escrow", esc(c.id) + " — " + esc(c.title))}<div class="modal-body">
      ${reason ? `<div class="alert alert-warn">${esc(reason)}</div>` : ""}
      <div class="bank-box"><div class="bank-row"><span>Contract sum</span><span>${money(c.total)}</span></div><div class="bank-row"><span>Already funded</span><span>${money(c.funded)}</span></div><div class="bank-row"><span>Outstanding</span><span>${money(out)}</span></div></div>
      <div class="form-group"><label>Amount to fund (₦)</label><div class="amount-input"><span>₦</span><input class="form-control" id="fundAmt" inputmode="decimal" placeholder="0.00" value="${prefill ? (prefill / 100).toFixed(2) : ""}" autocomplete="off"></div>
        <div class="quick">${chips.map(([l, v]) => `<button type="button" class="chip" data-quick="${(v / 100).toFixed(2)}">${l} · ${HS.fmtShort(v)}</button>`).join("")}</div><div class="err" id="fundErr"></div></div>
      <div class="alert alert-info">Funds are held in escrow. 20% of each amount you fund is the Habitat service charge — held until completion — and 80% is released to the professional as you approve milestones.</div>
      <button class="btn btn-primary btn-block" data-act="fundnext" data-cid="${esc(cid)}">Continue</button></div>`);
    setTimeout(() => { const i = $("#fundAmt"); if (i) i.focus(); }, 50);
  }

  function fundStep2(cid, amt) {
    const c = HS.contract(cid), a = S().platform.collection, ref = "HS-FUND-" + Math.floor(100000 + Math.random() * 900000);
    openModal(`${mHead("Transfer to Escrow", "Pay " + money(amt) + " to the account below")}<div class="modal-body">
      <ul class="progress-steps"><li class="done" data-n="1">Amount</li><li class="active" data-n="2">Transfer</li><li data-n="3">Confirm</li><li data-n="4">Funded</li></ul>
      <div class="bank-box"><div class="bank-row"><span>Bank</span><span>${esc(a.bank)}</span></div><div class="bank-row"><span>Account name</span><span>${esc(a.accountName)}</span></div><div class="bank-row"><span>Account number</span><span id="cpAcct">${esc(a.accountNumber)}</span></div><div class="bank-row"><span>Amount</span><span>${money(amt)}</span></div></div>
      <button class="copy-btn" data-copy="${esc(a.accountNumber)}" style="margin-bottom:1rem">Copy account number</button>
      <label style="font-size:.8rem;font-weight:700;display:block;margin-bottom:.4rem">Transfer reference — quote this on your transfer</label>
      <div class="copy-field"><span id="cpRef">${ref}</span><button class="copy-btn" data-copy="${ref}">Copy</button></div>
      <div class="alert alert-warn">Demo: confirmation is simulated. In production, funding is confirmed by your payment gateway's webhook — see ESCROW-INTEGRATION.md.</div>
      <button class="btn btn-primary btn-block" data-act="fundconfirm" data-cid="${esc(cid)}" data-amt="${amt}" data-ref="${ref}">I've Made the Transfer</button></div>`);
  }

  function fundConfirm(cid, amt, ref) {
    openModal(`${mHead("Confirming payment…")}<div class="modal-body" style="text-align:center;padding:2.2rem 1rem"><div class="spinner"></div><p style="margin-top:1rem;font-weight:700">Checking transfer reference ${esc(ref)}</p><p class="hint">Waiting for bank confirmation</p></div>`);
    setTimeout(() => {
      const r = HS.fund(cid, amt, ref);
      if (!r.ok) { closeModal(); toast(r.msg, true); return; }
      const c = HS.contract(cid);
      openModal(`${mHead("Escrow funded ✓")}<div class="modal-body"><div class="alert alert-success">✅ ${money(amt)} received and now held in escrow.</div>
        <div class="bank-box"><div class="bank-row"><span>Funded so far</span><span>${money(c.funded)}</span></div><div class="bank-row"><span>Releasable to professional (80%)</span><span>${money(HS.releasable(c))}</span></div><div class="bank-row"><span>Service charge held (20%)</span><span>${money(HS.chargeHeld(c))}</span></div><div class="bank-row"><span>Still to fund</span><span>${money(HS.toFund(c))}</span></div></div>
        <button class="btn btn-primary btn-block" data-act="close">Done</button></div>`);
      render();
    }, 1700);
  }

  function openApprove(cid, mid) {
    const c = HS.contract(cid), m = c.milestones.find((x) => x.id === mid), p = HS.pro(c.proId);
    const isLast = c.milestones.filter((x) => x.status !== "approved").length === 1;
    openModal(`${mHead("Approve & release payment", esc(m.name))}<div class="modal-body">
      <div class="bank-box"><div class="bank-row"><span>Released to professional</span><span>${money(m.net)}</span></div><div class="bank-row"><span>Remitted to</span><span>${esc(HS.mask(p.payout))}</span></div>${isLast ? `<div class="bank-row"><span>Service charge settled (20%)</span><span>${money(HS.sc(c))}</span></div><div class="bank-row"><span>Remitted to</span><span>${esc(S().platform.settlement.bank)} ••••${esc(S().platform.settlement.accountNumber.slice(-4))}</span></div>` : ""}</div>
      <div class="alert alert-${isLast ? "success" : "info"}">${isLast ? "This is the final milestone. Approving completes the contract, and the held 20% service charge is paid to Habitat Systems Planning Consultants." : "Only approve if the work meets the agreed scope. Approval can't be undone."}</div>
      <div class="chk"><input type="checkbox" id="apChk"><label for="apChk">I confirm this milestone has been delivered to my satisfaction.</label></div>
      <button class="btn btn-primary btn-block" data-act="approveyes" data-cid="${esc(cid)}" data-mid="${mid}">✓ Approve &amp; Release ${money(m.net)}</button></div>`);
  }

  function doApprove(cid, mid) {
    if (!$("#apChk").checked) { toast("Please tick the confirmation box first.", true); return; }
    const r = HS.approveMilestone(cid, mid);
    if (r.ok) {
      closeModal(); render();
      toast(r.completed ? `Contract completed 🎉 ${money(r.released)} released; ${money(r.charge)} service charge settled.` : `${money(r.released)} released to the professional.`);
    } else if (r.code === "short") {
      openFund(cid, r.need, r.msg);
    } else { closeModal(); toast(r.msg, true); }
  }

  function openDispute(cid, mid) {
    openModal(`${mHead("Raise an issue", "The professional will be asked to revise and resubmit")}<div class="modal-body">
      <div class="form-group"><label>What's not satisfactory?</label><textarea class="form-control" id="dispReason" rows="3" placeholder="Describe the issue…"></textarea></div>
      <button class="btn btn-danger btn-block" data-act="disputeyes" data-cid="${esc(cid)}" data-mid="${mid}">Send to professional</button>
      <a class="btn btn-ghost btn-block" style="margin-top:.6rem" href="mediation.html">⚖️ Go straight to mediation</a></div>`);
  }

  function openSubmit(cid, mid) {
    const c = HS.contract(cid), m = c.milestones.find((x) => x.id === mid);
    openModal(`${mHead("Submit milestone", esc(m.name))}<div class="modal-body">
      <div class="alert alert-info">On client approval, ${money(m.net)} is remitted to ${esc(HS.mask(myPro().payout))}.</div>
      <div class="form-group"><label>Delivery note</label><textarea class="form-control" id="subNote" rows="3" placeholder="What was completed? Reference attached drawings, photos, reports…"></textarea></div>
      <div class="form-group"><label>Attach evidence (optional)</label><input class="form-control" type="file" multiple><p class="hint">Demo: files aren't uploaded in this prototype.</p></div>
      <button class="btn btn-primary btn-block" data-act="submityes" data-cid="${esc(cid)}" data-mid="${mid}">📤 Submit for approval</button></div>`);
  }

  function acctFields(a, p) {
    return `<div class="form-group"><label>Bank</label><select class="form-control" id="${p}Bank">${HS.BANKS.map((b) => `<option ${a && a.bank === b ? "selected" : ""}>${esc(b)}</option>`).join("")}</select></div>
      <div class="form-row"><div class="form-group"><label>Account number (10 digits)</label><input class="form-control" id="${p}Num" inputmode="numeric" maxlength="10" value="${esc(a ? a.accountNumber : "")}"></div>
      <div class="form-group"><label>Account name</label><input class="form-control" id="${p}Name" value="${esc(a ? a.accountName : "")}"></div></div>`;
  }
  const readAcct = (p) => ({ bank: $("#" + p + "Bank").value, accountNumber: $("#" + p + "Num").value.replace(/\s/g, ""), accountName: $("#" + p + "Name").value.trim() });
  function checkAcct(a) {
    if (!HS.validAcct(a.accountNumber)) return "Account number must be exactly 10 digits.";
    if (a.accountName.length < 3) return "Enter the account name.";
    return "";
  }

  function openPayout() {
    const p = myPro();
    openModal(`${mHead("Payout account", "Where escrow remits your released funds")}<div class="modal-body">${acctFields(p.payout, "po")}<div class="err" id="poErr"></div>
      <div class="chk"><input type="checkbox" id="poChk"><label for="poChk">I confirm these details are correct and belong to me or my registered business.</label></div>
      <button class="btn btn-primary btn-block" data-act="savepayout">Save payout account</button></div>`);
  }

  function openPlatform() {
    const pf = S().platform;
    openModal(`${mHead("Edit bank details", "Habitat Systems escrow & settlement accounts")}<div class="modal-body">
      <h4 style="margin-bottom:.6rem">Settlement account <span class="hint">— receives the 20% service charge on completion</span></h4>${acctFields(pf.settlement, "st")}
      <div class="chk"><input type="checkbox" id="cSame" ${pf.collectionSame ? "checked" : ""}><label for="cSame">Clients also fund escrow into this same account</label></div>
      <div id="colBox" style="${pf.collectionSame ? "display:none" : ""}"><h4 style="margin-bottom:.6rem">Escrow collection account <span class="hint">— where clients send funding</span></h4>${acctFields(pf.collection, "cl")}</div>
      <div class="err" id="plErr"></div>
      <div class="alert alert-warn">In production only authorised admins should change these details, with re-authentication. Changes are logged.</div>
      <div class="chk"><input type="checkbox" id="plChk"><label for="plChk">I confirm these account details are correct.</label></div>
      <button class="btn btn-primary btn-block" data-act="saveplat">Save bank details</button></div>`, true);
    $("#cSame").addEventListener("change", (e) => { $("#colBox").style.display = e.target.checked ? "none" : "block"; });
  }

  /* ======================================================================
     EVENTS
     ====================================================================== */
  function go(r, v, cid) {
    S().session.role = r; if (v) ui[r].view = v; if (cid) ui[r].cid = cid; HS.save(); render(); window.scrollTo({ top: 0 });
  }

  document.addEventListener("click", async (e) => {
    const q = e.target.closest("[data-quick]"); if (q) { $("#fundAmt").value = q.dataset.quick; return; }
    const cp = e.target.closest("[data-copy]");
    if (cp) {
      try { await navigator.clipboard.writeText(cp.dataset.copy); } catch (x) { const t = document.createElement("textarea"); t.value = cp.dataset.copy; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
      const o = cp.textContent; cp.textContent = "Copied ✓"; cp.classList.add("copied"); setTimeout(() => { cp.textContent = o; cp.classList.remove("copied"); }, 1500); return;
    }
    const a = e.target.closest("[data-act]"); if (!a) return;
    const d = a.dataset, r = role();
    switch (d.act) {
      case "role": go(d.role); break;
      case "nav": go(r, d.view, d.cid); break;
      case "selc": if (a.tagName === "SELECT") return; ui.client.cid = d.cid; render(); break;
      case "dark": S().session.dark = !S().session.dark; HS.save(); render(); break;
      case "close": closeModal(); break;
      case "tab": ui.tab = d.tab; render(); break;
      case "car": { const t = $("#track"); if (t) t.scrollBy({ left: d.dir * 300, behavior: "smooth" }); break; }
      case "fund": openFund(d.cid); break;
      case "fundnext": {
        const amt = HS.toKobo(parseFloat(($("#fundAmt").value || "").replace(/,/g, "")));
        const c = HS.contract(d.cid), er = $("#fundErr");
        if (!amt || amt <= 0) { er.textContent = "Enter an amount greater than ₦0."; er.classList.add("show"); return; }
        if (amt > HS.toFund(c)) { er.textContent = `Maximum you can fund is ${money(HS.toFund(c))}.`; er.classList.add("show"); return; }
        fundStep2(d.cid, amt); break;
      }
      case "fundconfirm": fundConfirm(d.cid, Number(d.amt), d.ref); break;
      case "approve": if (d.mid) openApprove(d.cid, d.mid); break;
      case "approveyes": doApprove(d.cid, d.mid); break;
      case "dispute": openDispute(d.cid, d.mid); break;
      case "disputeyes": HS.disputeMilestone(d.cid, d.mid, $("#dispReason").value.trim()); closeModal(); render(); toast("Issue sent. The professional will revise and resubmit."); break;
      case "start": { const x = HS.startMilestone(d.cid, d.mid); toast(x.ok ? "Milestone started." : x.msg, !x.ok); render(); break; }
      case "submitms": openSubmit(d.cid, d.mid); break;
      case "submityes": HS.submitMilestone(d.cid, d.mid, $("#subNote").value.trim()); closeModal(); render(); toast("Submitted — the client has been asked to approve."); break;
      case "editpayout": openPayout(); break;
      case "savepayout": {
        const acct = readAcct("po"), er = checkAcct(acct), box = $("#poErr");
        if (er || !$("#poChk").checked) { box.textContent = er || "Please confirm the details are correct."; box.classList.add("show"); return; }
        HS.setPayout(myPro().id, acct); closeModal(); render(); toast("Payout account saved. Escrow will remit released funds here."); break;
      }
      case "editplat": openPlatform(); break;
      case "saveplat": {
        const st = readAcct("st"), same = $("#cSame").checked, cl = same ? st : readAcct("cl"), box = $("#plErr");
        const er = checkAcct(st) || (!same && checkAcct(cl));
        if (er || !$("#plChk").checked) { box.textContent = er || "Please confirm the details are correct."; box.classList.add("show"); return; }
        HS.setPlatform({ settlement: st, collection: cl, collectionSame: same }); closeModal(); render(); toast("Bank details updated."); break;
      }
      case "print": window.print(); break;
      case "reset": if (confirm("Reset all demo data (contracts, ledger, accounts)?")) { HS.reset(); ui.client.cid = ui.pro.cid = null; render(); toast("Demo data reset."); } break;
    }
  });

  document.addEventListener("change", (e) => {
    if (e.target.dataset.act === "selc") { ui.client.cid = e.target.value; render(); }
    if (e.target.id === "proPick") { S().session.proId = e.target.value; HS.save(); render(); }
    if (e.target.dataset.wb) { const k = "hs_wb_" + e.target.dataset.wb; e.target.checked ? localStorage.setItem(k, "1") : localStorage.removeItem(k); }
  });
  document.addEventListener("submit", (e) => {
    const f = e.target.closest("[data-form=profile]"); if (!f) return;
    e.preventDefault(); const fd = new FormData(f);
    Object.assign(S().client, { name: fd.get("name").trim(), phone: fd.get("phone").trim(), email: fd.get("email").trim() }); HS.save(); render(); toast("Profile saved.");
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  function afterRender() { /* hook for future per-view setup */ }

  /* ---------- boot ---------- */
  const h = location.hash.replace("#", "").split("/");
  h.forEach((t) => {
    if (t === "client" || t === "pro") S().session.role = t;
    else if (["overview", "contracts", "escrow", "settings", "jobs", "earnings", "payout"].includes(t)) { ui[S().session.role].view = t; }
  });
  render();
  const pending = sessionStorage.getItem("hs_open_fund");
  if (pending) {
    sessionStorage.removeItem("hs_open_fund");
    const [cid, amt] = pending.split("|"); const c = HS.contract(cid);
    if (c && HS.toFund(c) > 0) { ui.client.cid = cid; S().session.role = "client"; render(); openFund(cid, Number(amt) || 0); }
  }
})();
