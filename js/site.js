/* RUNAWAY redesign — shared site chrome: loader, header, aura, parallax,
   marquee, reveals, cart drawer, toast, newsletter. Null-safe: load on any page. */
"use strict";

/* ── tiny cart store (localStorage) ── */
const Cart = {
  KEY: "runaway-cart",
  items: [],
  load() {
    try {
      const v = JSON.parse(localStorage.getItem(this.KEY) || "[]");
      this.items = Array.isArray(v) ? v.filter((i) => i && i.key && i.qty > 0) : [];
    } catch { this.items = []; }
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.items)); } catch {} },
  add(item, qty = 1) {
    const key = `${item.slug}__${item.size}__${item.color}`;
    const found = this.items.find((i) => i.key === key);
    if (found) found.qty = Math.min(99, found.qty + qty);
    else this.items.push({ ...item, key, qty: Math.max(1, Math.min(99, qty)) });
    this.save();
  },
  count() { return this.items.reduce((n, i) => n + i.qty, 0); },
  total() { return this.items.reduce((n, i) => n + i.price * i.qty, 0); },
  clear() { this.items = []; this.save(); },
};
Cart.load();

const $ = (id) => document.getElementById(id);

/* ── loader ── */
window.addEventListener("load", () => setTimeout(() => $("loader")?.classList.add("done"), 400));
setTimeout(() => $("loader")?.classList.add("done"), 2600);

/* ── header scroll + mobile menu ── */
const header = $("siteHeader");
if (header) {
  const onScroll = () => header.classList.toggle("scrolled", scrollY > 24);
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
const menuBtn = $("menuBtn"), mobileNav = $("mobileNav");
menuBtn?.addEventListener("click", () => {
  const open = mobileNav.classList.toggle("open");
  menuBtn.classList.toggle("open", open);
  menuBtn.setAttribute("aria-expanded", open);
  document.body.style.overflow = open ? "hidden" : "";
});
document.querySelectorAll("[data-scroll]").forEach((a) =>
  a.addEventListener("click", () => {
    mobileNav?.classList.remove("open");
    menuBtn?.classList.remove("open");
    if (!document.querySelector(".drawer-root.open")) document.body.style.overflow = "";
  })
);

/* ── cursor aura ── */
const aura = $("aura");
if (aura && matchMedia("(hover:hover)").matches) {
  let ax = -500, ay = -500, tx = ax, ty = ay;
  addEventListener("pointermove", (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
  (function loop() {
    ax += (tx - ax) * 0.08; ay += (ty - ay) * 0.08;
    aura.style.left = ax + "px"; aura.style.top = ay + "px";
    requestAnimationFrame(loop);
  })();
}

/* ── parallax (hero + craft), skipped on reduced motion ── */
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (!reduceMotion) {
  const heroImg = document.querySelector("#heroBg img");
  const craftBg = $("craftBg");
  if (heroImg || craftBg) {
    addEventListener("scroll", () => {
      if (heroImg && scrollY < innerHeight * 1.2)
        heroImg.style.transform = `translateY(${scrollY * 0.22}px) scale(1.05)`;
      if (craftBg) {
        const r = $("craft")?.getBoundingClientRect();
        if (r && r.top < innerHeight && r.bottom > 0)
          craftBg.style.transform = `translateY(${r.top * -0.08}px)`;
      }
    }, { passive: true });
  }
  /* tilt */
  if (matchMedia("(hover:hover)").matches) {
    document.querySelectorAll(".tilt").forEach((el) => {
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg)`;
      });
      el.addEventListener("pointerleave", () => (el.style.transform = ""));
    });
  }
}

/* ── marquee seamless loop ── */
const track = $("marqueeTrack");
if (track) track.innerHTML += track.innerHTML + track.innerHTML;

/* ── reveal on scroll ── */
const io = new IntersectionObserver((entries) => {
  entries.forEach((en) => {
    if (!en.isIntersecting) return;
    en.target.classList.add("in");
    en.target.querySelectorAll("[data-count]").forEach(runCounter);
    if (en.target.hasAttribute("data-count")) runCounter(en.target);
    io.unobserve(en.target);
  });
}, { threshold: 0.15 });
document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
function runCounter(el) {
  if (el.dataset.done) return;
  el.dataset.done = "1";
  const end = +el.dataset.count, t0 = performance.now(), dur = 1200;
  (function tick(t) {
    const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(end * e);
    if (p < 1) requestAnimationFrame(tick);
  })(t0);
}

/* ── toast ── */
let toastT;
function toast(msg) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove("show"), 2400);
}

/* ── cart drawer (Apple fluid direct manipulation: bag → checkout → done) ── */
const drawerRoot = $("drawerRoot");
const drawerEl = drawerRoot ? drawerRoot.querySelector(".drawer") : null;
let step = "bag", coName = "", coEmail = "", coPhone = "", coAddress = "", coCity = "", coState = "Lagos", lastOrderId = "";

function openDrawer() {
  if (!drawerRoot) return;
  step = "bag";
  paintBag();
  drawerRoot.classList.add("open");
  drawerRoot.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  document.body.classList.add("staged");
}
function closeDrawer() {
  if (!drawerRoot) return;
  drawerRoot.classList.remove("open");
  drawerRoot.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  document.body.classList.remove("staged");
  if (drawerEl) {
    drawerEl.style.transform = "";
    drawerEl.classList.remove("animating", "has-drag-transform", "is-dragging");
  }
  const veil = $("drawerVeil");
  if (veil) veil.style.opacity = "";
}

$("bagBtn")?.addEventListener("click", openDrawer);
$("drawerClose")?.addEventListener("click", closeDrawer);
$("drawerVeil")?.addEventListener("click", closeDrawer);
addEventListener("keydown", (e) => { if (e.key === "Escape") closeDrawer(); });

/* ── Apple fluid gesture physics: direct manipulation, momentum & rubber-banding ── */
if (drawerEl) {
  let isDragging = false;
  let startX = 0, startY = 0;
  let currentTx = 0;
  let pointerHistory = [];
  let isHorizontalIntent = null;

  // Apple rubber-band boundary resistance
  const rubberband = (overshoot, dimension = 280, constant = 0.55) =>
    (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));

  // Apple exponential momentum projection (WWDC 2018)
  const projectMomentum = (velocity, decelerationRate = 0.998) =>
    (velocity / 1000) * decelerationRate / (1 - decelerationRate);

  drawerEl.addEventListener("pointerdown", (e) => {
    // Avoid hijacking clicks on form inputs, buttons or interactive links
    if (e.target.closest("button, input, select, textarea, a, .qty, .ci-remove")) return;
    isDragging = true;
    isHorizontalIntent = null;
    startX = e.clientX;
    startY = e.clientY;
    currentTx = 0;
    pointerHistory = [{ t: performance.now(), x: e.clientX }];
    drawerEl.setPointerCapture(e.pointerId);
    drawerEl.classList.remove("animating");
    drawerEl.classList.add("is-dragging");
  });

  drawerEl.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    // Detect direction intent with small hysteresis threshold (~8px)
    if (isHorizontalIntent === null) {
      if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
        isHorizontalIntent = Math.abs(dx) > Math.abs(dy);
        if (!isHorizontalIntent) {
          isDragging = false;
          drawerEl.classList.remove("is-dragging");
          return;
        }
      } else {
        return;
      }
    }
    if (!isHorizontalIntent) return;

    e.preventDefault();
    const now = performance.now();
    pointerHistory.push({ t: now, x: e.clientX });
    pointerHistory = pointerHistory.filter((p) => now - p.t < 110);

    // If dragged right (closing), follow 1:1; if dragged left (past boundary), rubber-band
    currentTx = dx > 0 ? dx : rubberband(dx, 320, 0.55);
    drawerEl.classList.add("has-drag-transform");
    drawerEl.style.transform = `translateX(${currentTx}px)`;

    const drawerWidth = drawerEl.offsetWidth || 400;
    const veil = $("drawerVeil");
    if (veil && currentTx > 0) {
      const p = Math.max(0, Math.min(1, 1 - (currentTx / drawerWidth)));
      veil.style.opacity = p;
    }
  });

  const finishGesture = (e) => {
    if (!isDragging) return;
    isDragging = false;
    drawerEl.classList.remove("is-dragging");
    drawerEl.classList.add("animating");

    // Compute release velocity (px/sec)
    let velocity = 0;
    if (pointerHistory.length >= 2) {
      const first = pointerHistory[0];
      const last = pointerHistory[pointerHistory.length - 1];
      const dt = (last.t - first.t) / 1000;
      if (dt > 0.008) velocity = (last.x - first.x) / dt;
    }

    const drawerWidth = drawerEl.offsetWidth || 400;
    const projected = currentTx + projectMomentum(velocity, 0.998);
    // Dismiss if fast flick right (velocity > 380px/s) or projected past 40%
    const shouldClose = velocity > 380 || projected > drawerWidth * 0.4 || currentTx > drawerWidth * 0.45;

    if (shouldClose) {
      drawerEl.style.transform = "translateX(100%)";
      const veil = $("drawerVeil");
      if (veil) veil.style.opacity = "0";
      setTimeout(() => {
        closeDrawer();
      }, 360);
    } else {
      drawerEl.style.transform = "translateX(0)";
      const veil = $("drawerVeil");
      if (veil) veil.style.opacity = "";
      setTimeout(() => {
        drawerEl.style.transform = "";
        drawerEl.classList.remove("animating", "has-drag-transform");
      }, 360);
    }
  };

  drawerEl.addEventListener("pointerup", finishGesture);
  drawerEl.addEventListener("pointercancel", finishGesture);
}

/* ── Instant tactile pointer-down response (kills tap latency) ── */
document.addEventListener("pointerdown", (e) => {
  const target = e.target.closest(".btn, .icon-btn, .chip, .card-quick, .swatches button, .sizes button, .modal-thumbs button, .pdp-thumbs button, .qty button, .ci-remove, .linklike");
  if (target) {
    target.classList.add("is-pressed");
    const clean = () => {
      target.classList.remove("is-pressed");
      window.removeEventListener("pointerup", clean);
      window.removeEventListener("pointercancel", clean);
    };
    window.addEventListener("pointerup", clean, { once: true });
    window.addEventListener("pointercancel", clean, { once: true });
  }
}, { passive: true });

function paintBag() {
  if (!drawerRoot) return;
  const body = $("drawerBody"), foot = $("drawerFoot"), title = $("drawerTitle");
  const n = Cart.count();
  const badge = $("bagCount");
  if (badge) { badge.hidden = n === 0; badge.textContent = n; }
  $("bagBtn")?.setAttribute("aria-label", n ? `Open bag, ${n} items` : "Open bag");
  if (title) title.textContent = step === "done" ? "Confirmed" : step === "checkout" ? "Checkout" : `Bag (${n})`;

  if (step === "done") {
    const esc = (s) => (s || "").replace(/"/g, "&quot;");
    body.innerHTML = `
      <div class="done-box">
        <h3 class="gold-foil">Order Dispatched</h3>
        <p class="gold tabular" style="font-size:1.15rem;letter-spacing:.08em;margin-top:.4rem;font-weight:600;">#${lastOrderId}</p>
        <p class="muted small" style="margin-top:.6rem;line-height:1.5;">
          Thank you, <b>${esc(coName)}</b>. Your order has been placed into our atelier dispatch queue.
        </p>
        <div style="margin-top:1rem;padding:.9rem;background:var(--surface);border:1px solid var(--line);border-radius:2px;text-align:left;font-size:.82rem;">
          <div style="display:flex;justify-content:space-between;margin-bottom:.4rem;">
            <span class="subtle">Destination</span>
            <span class="gold">${esc(coCity)}, ${esc(coState)}</span>
          </div>
          <div class="subtle" style="font-size:.75rem;line-height:1.4;">${esc(coAddress)}</div>
          <div class="subtle" style="font-size:.75rem;margin-top:.3rem;">Contact: <b>${esc(coPhone)}</b></div>
        </div>
        <div style="margin-top:.8rem;padding:.8rem;background:var(--elev);border:1px solid var(--gold-line);border-radius:2px;text-align:left;">
          <span class="subtle" style="font-size:.65rem;text-transform:uppercase;letter-spacing:.12em;">Storefront Tracking</span>
          <p class="small" style="margin-top:.2rem;">Track your delivery anytime using Order ID <b class="gold">${lastOrderId}</b> via <b>Track Order</b> in our footer.</p>
        </div>
      </div>`;
    foot.innerHTML = `<button class="btn btn-gold block" id="doneBtn"><span>Continue Shopping</span></button>`;
    $("doneBtn").onclick = closeDrawer;
    return;
  }
  if (step === "checkout") {
    const esc = (s) => (s || "").replace(/"/g, "&quot;");
    body.innerHTML = `
      <form class="checkout-form" id="coForm" style="display:flex;flex-direction:column;gap:.75rem;">
        <div>
          <p class="muted small" style="margin-bottom:.2rem;">Lagos Atelier & Nationwide Express Courier</p>
          <span class="subtle" style="font-size:.7rem;">All orders packaged in RUNAWAY luxury protective cases.</span>
        </div>
        <label>Full Name *<input id="coName" value="${esc(coName)}" autocomplete="name" placeholder="e.g. Adebayo Adeleke" required /></label>
        <label>Email Address *<input id="coEmail" type="email" value="${esc(coEmail)}" autocomplete="email" placeholder="e.g. adebayo@runners.ng" required /></label>
        <label>Phone Number (Rider & WhatsApp updates) *<input id="coPhone" type="tel" value="${esc(coPhone)}" autocomplete="tel" placeholder="e.g. 0802 345 6789" required /></label>
        <label>Delivery Address *<input id="coAddress" value="${esc(coAddress)}" autocomplete="street-address" placeholder="e.g. 14 Admiralty Way, Lekki Phase 1" required /></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:.6rem;">
          <label>City / Area *<input id="coCity" value="${esc(coCity)}" placeholder="e.g. Lekki / Ikeja" required /></label>
          <label>State *
            <select id="coState" style="width:100%;background:var(--elev);color:var(--fg);border:1px solid var(--line);padding:.55rem .6rem;border-radius:2px;font-family:inherit;font-size:.85rem;">
              <option value="Lagos" ${coState === "Lagos" ? "selected" : ""}>Lagos</option>
              <option value="Abuja FCT" ${coState === "Abuja FCT" ? "selected" : ""}>Abuja FCT</option>
              <option value="Rivers" ${coState === "Rivers" ? "selected" : ""}>Rivers (Port Harcourt)</option>
              <option value="Oyo" ${coState === "Oyo" ? "selected" : ""}>Oyo (Ibadan)</option>
              <option value="Ogun" ${coState === "Ogun" ? "selected" : ""}>Ogun</option>
              <option value="Edo" ${coState === "Edo" ? "selected" : ""}>Edo (Benin)</option>
              <option value="Enugu" ${coState === "Enugu" ? "selected" : ""}>Enugu</option>
              <option value="Delta" ${coState === "Delta" ? "selected" : ""}>Delta</option>
              <option value="Kano" ${coState === "Kano" ? "selected" : ""}>Kano</option>
              <option value="Kaduna" ${coState === "Kaduna" ? "selected" : ""}>Kaduna</option>
              <option value="Other State" ${coState === "Other State" ? "selected" : ""}>Other State</option>
            </select>
          </label>
        </div>
        <p class="form-err" id="coErr" style="color:#ef4444;font-size:.75rem;min-height:1rem;"></p>
        <div style="padding:.7rem .8rem;background:var(--surface);border:1px solid var(--line);display:flex;justify-content:space-between;align-items:center;">
          <span class="small subtle">Nationwide Courier:</span>
          <span class="small gold"><b>FREE (₦0)</b></span>
        </div>
        <p class="small" style="display:flex;justify-content:space-between;align-items:baseline;padding-top:.4rem;">
          <span>Total Dispatched Value:</span>
          <b class="gold tabular" style="font-size:1.15rem;">${money(Cart.total())}</b>
        </p>
      </form>`;
    foot.innerHTML = `
      <button class="btn btn-gold block" id="placeBtn"><span>Complete Order & Reserve Pieces ↗</span></button>
      <button class="btn btn-ghost block" id="backBtn" style="margin-top:.6rem"><span>Back to bag</span></button>`;
    $("backBtn").onclick = () => { step = "bag"; paintBag(); };
    $("placeBtn").onclick = () => {
      coName = $("coName")?.value?.trim() || "";
      coEmail = $("coEmail")?.value?.trim() || "";
      coPhone = $("coPhone")?.value?.trim() || "";
      coAddress = $("coAddress")?.value?.trim() || "";
      coCity = $("coCity")?.value?.trim() || "";
      coState = $("coState")?.value || "Lagos";

      if (!coName) { $("coErr").textContent = "Please enter your full name."; return; }
      if (!coEmail.includes("@")) { $("coErr").textContent = "Please enter a valid email address."; return; }
      if (!coPhone || coPhone.length < 7) { $("coErr").textContent = "Please enter your phone number for courier delivery."; return; }
      if (!coAddress) { $("coErr").textContent = "Please enter your delivery street address."; return; }

      const generatedId = "RW-" + Math.floor(1000 + Math.random() * 9000);
      lastOrderId = generatedId;

      try {
        const order = {
          id: generatedId,
          date: new Date().toISOString(),
          customer: {
            name: coName,
            email: coEmail,
            phone: coPhone,
            address: coAddress,
            city: coCity,
            state: coState
          },
          items: Cart.items.map((it) => ({
            key: it.key,
            name: it.name,
            price: it.price,
            qty: it.qty,
            size: it.size,
            colorName: it.colorName,
            image: it.image
          })),
          total: Cart.total(),
          status: "Pending"
        };
        const orders = JSON.parse(localStorage.getItem("runaway_orders") || "[]");
        orders.unshift(order);
        localStorage.setItem("runaway_orders", JSON.stringify(orders));
      } catch (err) {
        console.error("Order persistence error:", err);
      }
      Cart.clear();
      step = "done";
      paintBag();
    };
    return;
  }
  const basePrefix = typeof BASE !== "undefined" ? BASE : "./";

  const resolveCartImg = (imgSrc) => {
    if (!imgSrc) return basePrefix + "public/images/logo-runners.png";
    if (imgSrc.startsWith("data:") || imgSrc.startsWith("http")) return imgSrc;
    // Strip any leading ./ or ../ or public/images/
    const filename = imgSrc.replace(/^(\.\.\/|\.\/)+/, "").replace(/^public\/images\//, "");
    return basePrefix + "public/images/" + filename;
  };

  if (!Cart.items.length) {
    body.innerHTML = `<div class="drawer-empty"><p>Your bag is empty.</p><a class="btn btn-ghost" href="${basePrefix}collection.html"><span>Shop the collection</span></a></div>`;
    foot.innerHTML = "";
    return;
  }
  body.innerHTML = Cart.items.map((i) => `
    <div class="cart-item">
      <img src="${resolveCartImg(i.image)}" alt="${i.name}" />
      <div style="flex:1;min-width:0">
        <p class="ci-name">${i.name}</p>
        <p class="ci-sub">${i.colorName} · ${i.size}</p>
        <p class="ci-price">${money(i.price)}</p>
        <div class="qty">
          <button data-dec="${i.key}" aria-label="Decrease quantity">−</button>
          <b>${i.qty}</b>
          <button data-inc="${i.key}" aria-label="Increase quantity">+</button>
          <button class="ci-remove" data-rem="${i.key}">Remove</button>
        </div>
      </div>
    </div>`).join("");
  foot.innerHTML = `<div class="subtotal"><span class="muted">Subtotal</span><b>${money(Cart.total())}</b></div>
    <button class="btn btn-gold block" id="coBtn"><span>Checkout</span></button>`;
  $("coBtn").onclick = () => { step = "checkout"; paintBag(); };
}
$("drawerBody")?.addEventListener("click", (e) => {
  const dec = e.target.closest("[data-dec]"), inc = e.target.closest("[data-inc]"), rem = e.target.closest("[data-rem]");
  if (dec) { const it = Cart.items.find((i) => i.key === dec.dataset.dec); if (it) { it.qty--; if (it.qty <= 0) Cart.items = Cart.items.filter((i) => i.key !== it.key); Cart.save(); paintBag(); } }
  if (inc) { const it = Cart.items.find((i) => i.key === inc.dataset.inc); if (it) { it.qty = Math.min(99, it.qty + 1); Cart.save(); paintBag(); } }
  if (rem) { Cart.items = Cart.items.filter((i) => i.key !== rem.dataset.rem); Cart.save(); paintBag(); }
});
if (drawerRoot) paintBag();

/* ── newsletter + year ── */
$("joinForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const v = $("joinEmail").value.trim();
  const msg = $("joinMsg");
  if (!v.includes("@") || v.length < 5) { msg.textContent = "Enter a valid email."; return; }
  e.target.style.display = "none";
  msg.textContent = "You're on the list. Watch the dark hours.";
  toast("Joined the list");
});
const yr = $("year");
if (yr) yr.textContent = new Date().getFullYear();

/* ── Universal Customer Order Tracker (Modal + Live RW-XXXX Lookup) ── */
function ensureTrackOrderModal() {
  let modal = $("trackOrderModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.className = "track-modal";
    modal.id = "trackOrderModal";
    modal.setAttribute("aria-hidden", "true");
    modal.innerHTML = `
      <div class="track-modal-backdrop" id="closeTrackBackdrop"></div>
      <div class="track-modal-card" role="dialog" aria-modal="true" aria-label="Track Your Order">
        <div class="track-modal-head">
          <div>
            <h3 class="gold" style="font-size:1.3rem;">Track Order Dispatch</h3>
            <p class="subtle" style="font-size:.75rem;margin-top:.2rem;">Check live fulfillment and courier delivery status across Nigeria.</p>
          </div>
          <button class="icon-btn" id="closeTrackBtn" aria-label="Close modal">✕</button>
        </div>
        <div style="margin-top:1.2rem;">
          <form id="trackOrderForm" style="display:flex;gap:.5rem;flex-wrap:wrap;">
            <input type="text" id="trackQueryInput" placeholder="Order ID (e.g. RW-1048) or Email" style="flex:1;min-width:14rem;padding:.65rem .8rem;background:var(--surface);border:1px solid var(--line);color:var(--fg);font-family:inherit;font-size:.85rem;border-radius:2px;" required />
            <button type="submit" class="btn btn-gold"><span>Look Up ↗</span></button>
          </form>
          <div id="trackOrderResult" style="margin-top:1.2rem;"></div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    $("closeTrackBtn")?.addEventListener("click", closeTrackOrderModal);
    $("closeTrackBackdrop")?.addEventListener("click", closeTrackOrderModal);

    $("trackOrderForm")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = $("trackQueryInput")?.value?.trim().toLowerCase();
      const out = $("trackOrderResult");
      if (!q || !out) return;

      let orders = [];
      try {
        orders = JSON.parse(localStorage.getItem("runaway_orders") || "[]");
      } catch (_) {}

      const found = orders.find((o) => 
        (o.id || "").toLowerCase() === q || 
        (o.customer?.email || "").toLowerCase() === q ||
        (o.customer?.phone || "").replace(/\s+/g, "") === q.replace(/\s+/g, "")
      );

      if (!found) {
        out.innerHTML = `
          <div style="padding:1rem;background:var(--surface);border:1px solid var(--line);border-radius:2px;">
            <p class="small muted">No active order found matching "<b>${q}</b>".</p>
            <p class="subtle" style="font-size:.75rem;margin-top:.3rem;">Please double-check your Order ID (format: RW-XXXX) or the email entered during checkout.</p>
          </div>`;
        return;
      }

      const isFulfilled = found.status === "Fulfilled";
      const statusText = isFulfilled ? "Dispatched via RUNAWAY Courier" : "Processing at Lagos Atelier";
      const badgeClass = isFulfilled ? "badge-fulfilled" : "badge-pending";

      const itemsList = (found.items || []).map((it) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:.4rem 0;border-bottom:1px solid var(--line);font-size:.82rem;">
          <div>
            <b>${it.qty || 1}x ${it.name}</b>
            <div class="subtle" style="font-size:.72rem;">${it.colorName ? it.colorName + " · " : ""}Size: ${it.size || "M"}</div>
          </div>
          <span class="gold tabular">${money((it.price || 0) * (it.qty || 1))}</span>
        </div>
      `).join("");

      out.innerHTML = `
        <div style="padding:1.2rem;background:var(--surface);border:1px solid var(--gold-line);border-radius:2px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:.5rem;margin-bottom:.8rem;">
            <div>
              <span class="gold tabular" style="font-size:1.1rem;font-weight:600;">${found.id}</span>
              <div class="subtle" style="font-size:.72rem;">Placed: ${new Date(found.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
            </div>
            <span class="${badgeClass}">${statusText}</span>
          </div>

          <div style="margin-bottom:.8rem;padding:.7rem;background:var(--elev);border:1px solid var(--line);border-radius:2px;font-size:.78rem;">
            <div style="font-weight:500;color:var(--fg);">${found.customer?.name || "Runner"} · ${found.customer?.phone || ""}</div>
            <div class="subtle" style="margin-top:.15rem;">${found.customer?.address || "Address on file"}, ${found.customer?.city || ""}, ${found.customer?.state || "Lagos"}</div>
          </div>

          <div style="margin-bottom:.8rem;">
            <span class="subtle" style="font-size:.68rem;text-transform:uppercase;letter-spacing:.12em;">Kit Pieces Dispatched</span>
            <div style="margin-top:.3rem;">${itemsList}</div>
          </div>

          <div style="display:flex;justify-content:space-between;align-items:baseline;padding-top:.4rem;">
            <span class="subtle" style="font-size:.8rem;">Order Total Paid:</span>
            <b class="gold tabular" style="font-size:1.1rem;">${money(found.total)}</b>
          </div>
        </div>
      `;
    });
  }
  return modal;
}

function openTrackOrderModal(initialQuery = "") {
  const modal = ensureTrackOrderModal();
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  const input = $("trackQueryInput");
  if (input) {
    if (initialQuery) {
      input.value = initialQuery;
      $("trackOrderForm")?.dispatchEvent(new Event("submit"));
    }
    setTimeout(() => input.focus(), 80);
  }
}

function closeTrackOrderModal() {
  const modal = $("trackOrderModal");
  if (!modal) return;
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  if (!document.querySelector(".drawer-root.open")) {
    document.body.style.overflow = "";
  }
}

// Global click delegation for Track Order triggers
document.addEventListener("click", (e) => {
  const trigger = e.target.closest('[data-action="track-order"], a[href="#track-order"]');
  if (trigger) {
    e.preventDefault();
    openTrackOrderModal();
  }
});

