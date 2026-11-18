/* ==========================================================================
   HABITAT SYSTEMS — Marketplace: browse, cart, checkout -> escrow contract
   Checkout creates one escrow contract per cart item. The 20% service charge
   is DEDUCTED from each contract sum (not added on top).
   ========================================================================== */
(function () {
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = HS.fmt;
  const st = { role: "All", q: "", maxP: 0, sort: "rel" };

  function toast(msg, err) {
    const t = document.createElement("div"); t.className = "toast" + (err ? " err" : ""); t.textContent = msg;
    $("#toasts").appendChild(t); setTimeout(() => t.remove(), 3200);
  }

  const stars = (r, n) => r ? `<span class="stars">${"★".repeat(Math.round(r))}${"☆".repeat(5 - Math.round(r))} <small>${r.toFixed(1)} (${n})</small></span>` : `<span class="stars"><small>New on Habitat</small></span>`;

  function list() {
    let a = HS.state.services.map((s) => ({ s, p: HS.pro(s.proId) })).filter((x) => x.p);
    if (st.role !== "All") a = a.filter((x) => HS.roleKey(x.p.role) === st.role || x.p.role === st.role);
    if (st.q) { const q = st.q.toLowerCase(); a = a.filter((x) => (x.s.title + " " + x.s.desc + " " + x.p.name + " " + x.p.role + " " + x.p.city).toLowerCase().includes(q)); }
    if (st.maxP) a = a.filter((x) => x.s.price <= HS.toKobo(st.maxP));
    const by = { pl: (x, y) => x.s.price - y.s.price, ph: (x, y) => y.s.price - x.s.price, rt: (x, y) => y.p.rating - x.p.rating };
    if (by[st.sort]) a.sort(by[st.sort]);
    return a;
  }

  function renderChips() {
    const roles = ["All", ...Object.keys(HS.ROLES)];
    $("#chips").innerHTML = roles.map((r) => `<button class="chip ${st.role === r ? "active" : ""}" data-role="${esc(r)}">${r === "All" ? "All services" : HS.ROLES[r].icon + " " + esc(r)}</button>`).join("");
  }

  function renderGrid() {
    const a = list(), inCart = HS.cart.get();
    $("#count").textContent = `${a.length} service${a.length === 1 ? "" : "s"} found · all prices in Nigerian Naira (₦)`;
    $("#grid").innerHTML = a.length ? a.map(({ s, p }) => `<article class="product">
      <div class="product-thumb">${s.icon}<span class="badge">${s.ms.length} milestones</span>${p.verified ? '<span class="badge green">✓ Verified</span>' : ""}</div>
      <div class="product-body">
        <h3>${esc(s.title)}</h3>
        <div class="product-by">by <strong>${esc(p.name)}</strong> · ${esc(p.role)} · ${esc(p.city || "Nigeria")}</div>
        ${stars(p.rating, p.jobs)}
        <div class="product-meta"><span>⏱ ${s.days} days</span><span>🔐 Escrow-protected</span></div>
        <div class="product-foot"><div class="price"><small>Contract sum</small>${money(s.price)}</div>
          <div style="display:flex;gap:.4rem;flex-direction:column">
            <button class="btn btn-ghost btn-sm" data-view="${s.id}">Details</button>
            <button class="btn ${inCart.includes(s.id) ? "btn-primary" : "btn-orange"} btn-sm" data-add="${s.id}">${inCart.includes(s.id) ? "✓ In cart" : "🛒 Add to cart"}</button></div></div>
      </div></article>`).join("") : '<div class="empty" style="grid-column:1/-1"><h3>No services match</h3><p>Try a different search or clear the filters.</p></div>';
  }

  /* ---------- details modal ---------- */
  function openDetails(id) {
    const s = HS.service(id), p = HS.pro(s.proId), net = s.price - HS.charge(s.price);
    let used = 0;
    const rows = s.ms.map(([n, pct], i) => { const last = i === s.ms.length - 1; const amt = last ? net - used : Math.round((net * pct) / 100); used += amt; return `<tr><td>${i + 1}. ${esc(n)}</td><td style="text-align:right">${pct}%</td><td style="text-align:right;font-weight:700">${money(amt)}</td></tr>`; }).join("");
    $("#modalRoot").innerHTML = `<div class="modal-overlay open" id="mo"><div class="modal wide">
      <div class="modal-head"><div><h3>${s.icon} ${esc(s.title)}</h3><p>${esc(p.name)} · ${esc(p.role)} · ${esc(p.bodyNumber)}</p></div><button class="modal-close" data-close>✕</button></div>
      <div class="modal-body"><p style="font-size:.9rem;margin-bottom:1rem">${esc(s.desc)}</p>
        <h4 style="margin-bottom:.4rem">How your ${money(s.price)} is paid out</h4>
        <table><thead><tr><th>Milestone</th><th style="text-align:right">Share</th><th style="text-align:right">Released to professional</th></tr></thead><tbody>${rows}</tbody>
        <tfoot><tr><td>Habitat service charge <span class="hint">(20%, held until completion)</span></td><td style="text-align:right">20%</td><td style="text-align:right;color:var(--accent-dark);font-weight:700">${money(HS.charge(s.price))}</td></tr></tfoot></table>
        <div class="alert alert-info" style="margin-top:1rem">The 20% service charge is deducted from the contract sum — you never pay it on top.</div>
        <div style="display:flex;gap:.6rem"><button class="btn btn-orange" style="flex:1;justify-content:center" data-add="${s.id}" data-open="1">🛒 Add to cart</button><button class="btn btn-primary" style="flex:1;justify-content:center" data-buy="${s.id}">Buy now</button></div></div></div></div>`;
  }
  const closeModal = () => ($("#modalRoot").innerHTML = "");

  /* ---------- cart ---------- */
  function cartItems() { return HS.cart.get().map((id) => HS.service(id)).filter(Boolean); }
  function renderCart() {
    const items = cartItems(), total = items.reduce((a, s) => a + s.price, 0), chg = HS.charge(total) , sc = items.reduce((a, s) => a + HS.charge(s.price), 0);
    document.querySelectorAll("[data-cart-count]").forEach((b) => { b.textContent = items.length; b.classList.toggle("has", items.length > 0); });
    $("#cartBody").innerHTML = items.length ? items.map((s) => `<div class="cart-item"><div class="ico">${s.icon}</div><div style="flex:1"><h4>${esc(s.title)}</h4><p>${esc(HS.pro(s.proId).name)} · ${s.days} days</p><button class="linkbtn" data-rm="${s.id}">Remove</button></div><strong style="font-size:.88rem">${money(s.price)}</strong></div>`).join("")
      : '<div class="empty"><div style="font-size:2.5rem">🛒</div><p>Your cart is empty.</p></div>';
    $("#cartFoot").innerHTML = items.length ? `
      <div class="sum-row"><span class="muted">Contract sum (${items.length} item${items.length > 1 ? "s" : ""})</span><span>${money(total)}</span></div>
      <div class="sum-row"><span class="muted">of which: Habitat service charge (20%)</span><span class="orange">${money(sc)}</span></div>
      <div class="sum-row"><span class="muted">of which: net to professionals (80%)</span><span>${money(total - sc)}</span></div>
      <div class="sum-row total"><span>You pay (into escrow)</span><span>${money(total)}</span></div>
      <p class="hint" style="margin:.5rem 0 .8rem">The service charge is deducted from the contract sum and held in escrow until the contract is completed.</p>
      <button class="btn btn-orange btn-block btn-lg" data-checkout>Checkout securely →</button>` : "";
    renderGrid();
  }
  const openCart = () => { $("#drawer").classList.add("open"); $("#ov").classList.add("open"); };
  const closeCart = () => { $("#drawer").classList.remove("open"); $("#ov").classList.remove("open"); };

  /* ---------- checkout ---------- */
  function openCheckout(single) {
    const items = single ? [HS.service(single)] : cartItems();
    if (!items.length) return;
    const total = items.reduce((a, s) => a + s.price, 0);
    const c = HS.state.client;
    $("#modalRoot").innerHTML = `<div class="modal-overlay open" id="mo"><div class="modal wide">
      <div class="modal-head"><div><h3>Secure checkout</h3><p>Creates an escrow contract for each service</p></div><button class="modal-close" data-close>✕</button></div>
      <div class="modal-body">
        <div class="bank-box">${items.map((s) => `<div class="bank-row"><span>${esc(s.title)}</span><span>${money(s.price)}</span></div>`).join("")}<div class="bank-row"><span><strong>Contract sum</strong></span><span>${money(total)}</span></div></div>
        <div class="form-group"><label>Project name / site location *</label><input class="form-control" id="ckLoc" placeholder="e.g. 4-bed duplex, Lekki Phase 1, Lagos"></div>
        <div class="form-row"><div class="form-group"><label>Your name</label><input class="form-control" value="${esc(c.name)}" disabled></div><div class="form-group"><label>Phone</label><input class="form-control" value="${esc(c.phone)}" disabled></div></div>
        <div class="form-group"><label>Fund escrow</label>
          <select class="form-control" id="ckFund"><option value="full">Fund the full contract sum now</option><option value="half">Fund 50% now, the rest later</option><option value="later">I'll fund later from my dashboard</option></select>
          <p class="hint">You can fund in portions at any time. The professional can only start once escrow holds funds.</p></div>
        <div class="alert alert-info">Escrow releases the net 80% to the professional milestone by milestone as you approve. The 20% Habitat service charge is held until completion.</div>
        <div class="chk"><input type="checkbox" id="ckTerms"><label for="ckTerms">I agree to the Terms of Service and the milestone-based escrow release rules.</label></div>
        <div class="err" id="ckErr"></div>
        <button class="btn btn-orange btn-block btn-lg" data-place="${single || ""}">Place order · ${money(total)}</button></div></div></div>`;
  }

  function placeOrder(single) {
    const loc = $("#ckLoc").value.trim(), er = $("#ckErr");
    if (loc.length < 3) { er.textContent = "Please enter the project name or site location."; er.classList.add("show"); return; }
    if (!$("#ckTerms").checked) { er.textContent = "Please accept the terms to continue."; er.classList.add("show"); return; }
    const items = single ? [HS.service(single)] : cartItems(), mode = $("#ckFund").value, made = [];
    items.forEach((s) => made.push(HS.createContract({ title: `${s.title} — ${loc}`, location: loc, proId: s.proId, total: s.price, milestones: s.ms })));
    if (!single) HS.cart.clear(); else HS.cart.set(HS.cart.get().filter((x) => x !== single));
    const first = made[0];
    if (mode !== "later") {
      const amt = mode === "half" ? Math.round(first.total / 2) : first.total;
      sessionStorage.setItem("hs_open_fund", first.id + "|" + amt);
    }
    HS.state.session.role = "client"; HS.save();
    location.href = "dashboard.html#client/contracts";
  }

  /* ---------- events ---------- */
  document.addEventListener("click", (e) => {
    const t = e.target.closest("[data-role],[data-add],[data-view],[data-rm],[data-checkout],[data-buy],[data-place],[data-close],#closeCart,#ov,.cart-link");
    if (!t) return;
    if (t.matches(".cart-link")) { e.preventDefault(); openCart(); return; }
    if (t.dataset.role) { st.role = t.dataset.role; renderChips(); renderGrid(); }
    else if (t.dataset.add) { HS.cart.add(t.dataset.add); renderCart(); toast("Added to cart 🛒"); if (t.dataset.open) { closeModal(); openCart(); } }
    else if (t.dataset.view) openDetails(t.dataset.view);
    else if (t.dataset.rm) { HS.cart.remove(t.dataset.rm); renderCart(); }
    else if (t.hasAttribute("data-checkout")) { closeCart(); openCheckout(); }
    else if (t.dataset.buy) openCheckout(t.dataset.buy);
    else if (t.hasAttribute("data-place")) placeOrder(t.dataset.place);
    else if (t.hasAttribute("data-close")) closeModal();
    else if (t.id === "closeCart" || t.id === "ov") closeCart();
  });
  document.addEventListener("mousedown", (e) => { if (e.target.id === "mo") closeModal(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); closeCart(); } });
  $("#searchForm").addEventListener("submit", (e) => { e.preventDefault(); st.q = $("#q").value.trim(); renderGrid(); });
  $("#q").addEventListener("input", (e) => { st.q = e.target.value.trim(); renderGrid(); });
  $("#sortSel").addEventListener("change", (e) => { st.sort = e.target.value; renderGrid(); });
  $("#priceSel").addEventListener("change", (e) => { st.maxP = Number(e.target.value); renderGrid(); });

  renderChips(); renderCart();
  if (location.hash === "#cart") openCart();
})();
