/* ==========================================================================
   HABITAT SYSTEMS — shared site behaviour (every page loads this file)
   ========================================================================== */

(function () {
  // ---- 1. Force HTTPS in any real deployment ------------------------------
  // A static HTML file cannot create a TLS certificate itself — that has to
  // be issued by the host (see /SECURITY.md). What the page itself CAN do is
  // refuse to run over an insecure connection once it IS hosted on a domain,
  // so a stray http:// link never leaves a visitor unprotected.
  if (
    location.protocol === "http:" &&
    !["localhost", "127.0.0.1"].includes(location.hostname)
  ) {
    location.replace("https://" + location.host + location.pathname + location.search);
  }

  // ---- 1b. E-commerce chrome (injected so every page gets it) ---------------
  const header = document.querySelector(".site-header");
  if (header && !document.querySelector(".topbar")) {
    const bar = document.createElement("div");
    bar.className = "topbar";
    bar.innerHTML = '<div class="topbar-in"><span>🔐 Escrow-protected payments · Milestone-based release · All prices in ₦ Naira</span><span><a href="marketplace.html">Shop verified professionals →</a></span></div>';
    header.insertBefore(bar, header.firstChild);
  }
  const navLinks = document.querySelector(".nav-links");
  if (navLinks && !navLinks.querySelector('[href="marketplace.html"]')) {
    const m = document.createElement("a");
    m.href = "marketplace.html"; m.textContent = "Marketplace";
    const home = navLinks.querySelector('a[href="index.html"]');
    home ? home.after(m) : navLinks.prepend(m);
    const d = document.createElement("a");
    d.href = "dashboard.html"; d.textContent = "Dashboard";
    navLinks.appendChild(d);
  }
  const navCta = document.querySelector(".nav-cta");
  if (navCta && !navCta.querySelector(".cart-link")) {
    const cart = document.createElement("a");
    cart.href = "marketplace.html#cart"; cart.className = "cart-link"; cart.title = "Cart";
    cart.setAttribute("aria-label", "Cart");
    cart.innerHTML = '🛒<b data-cart-count></b>';
    navCta.prepend(cart);
    const tg = document.querySelector(".nav-toggle");
    if (tg) { const c2 = cart.cloneNode(true); c2.classList.add("cart-mobile"); tg.before(c2); }
    try {
      const n = (JSON.parse(localStorage.getItem("hs_cart_v1")) || []).length;
      document.querySelectorAll("[data-cart-count]").forEach((b) => { b.textContent = n; b.classList.toggle("has", n > 0); });
    } catch (e) { /* ignore */ }
  }

  // ---- 2. Mobile nav toggle -------------------------------------------------
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  const cta = document.querySelector(".nav-cta");
  if (toggle) {
    toggle.addEventListener("click", () => {
      const open = links.style.display === "flex";
      links.style.display = open ? "none" : "flex";
      if (cta) cta.style.display = open ? "none" : "flex";
      links.style.cssText += "flex-direction:column;position:absolute;top:64px;left:0;right:0;background:#0c2b1e;padding:1rem 2rem;";
    });
  }

  // ---- 3. Footer year --------------------------------------------------------
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = new Date().getFullYear();
  });

  // ---- 4. Highlight active nav link ------------------------------------------
  const file = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a, .dash-nav a").forEach((a) => {
    if (a.getAttribute("href") === file) a.classList.add("active");
  });
})();
