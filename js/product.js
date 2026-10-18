/* RUNAWAY redesign — product detail renderer. Reads body[data-product-slug]. */
"use strict";
(function () {
  const params = new URLSearchParams(window.location.search);
  const slug = document.body.dataset.productSlug || params.get("slug") || params.get("id");
  const p = typeof getProduct === "function" ? getProduct(slug) : null;
  if (!p) { document.getElementById("pdpRoot").innerHTML = "<p class='muted'>Product not found. <a href='collection.html' style='color:var(--gold)'>Back to collection</a></p>"; return; }

  const resolveImg = (src) => {
    if (!src) return "public/images/logo-runners.png";
    if (src.startsWith("data:") || src.startsWith("http") || src.startsWith("/") || src.startsWith(".")) return src;
    return (typeof IMG !== "undefined" ? IMG : "public/images/") + src;
  };

  document.title = `${p.name} — RUNAWAY`;
  let imgIdx = 0;
  const colors = Array.isArray(p.colors) && p.colors.length ? p.colors : [{ id: "core", name: "Core", hex: "#0c0c0c", swatch: "#0c0c0c" }];
  let color = colors[0];
  const sizes = Array.isArray(p.sizes) && p.sizes.length ? p.sizes : ["S", "M", "L"];
  let size = sizes.length === 1 ? sizes[0] : null;

  const allPieces = typeof getAllProducts === "function" ? getAllProducts() : (typeof PRODUCTS !== "undefined" ? PRODUCTS : []);
  const others = allPieces.filter((x) => x.slug !== p.slug).slice(0, 4);

  const images = Array.isArray(p.images) && p.images.length ? p.images : [p.image || "logo-runners.png"];
  const features = Array.isArray(p.features) ? p.features : [];

  document.getElementById("pdpRoot").innerHTML = `
    <div>
      <div class="pdp-gallery"><img id="pdpImg" src="${resolveImg(images[0])}" alt="${p.name}" /></div>
      <div class="pdp-thumbs" id="pdpThumbs">
        ${images.map((s, i) => `<button class="${i === 0 ? "active" : ""}" data-thumb="${i}" aria-label="View image ${i + 1}"><img src="${resolveImg(s)}" alt="" loading="lazy" /></button>`).join("")}
      </div>
    </div>
    <div class="pdp-info">
      <p class="eyebrow gold">${p.category}</p>
      <h1>${p.name}</h1>
      <p class="muted small">${p.tagline || ""}</p>
      <p class="pdp-price">${typeof money === "function" ? money(p.price) : "₦" + p.price}</p>
      <p class="muted small" style="margin-top:1rem">${p.description || ""}</p>
      <p class="opt-label">Color — <span id="pdpColorName">${color.name}</span></p>
      <div class="swatches" id="pdpColors">
        ${colors.map((c) => `<button class="${(c.id || c.name) === (color.id || color.name) ? "active" : ""}" data-color="${c.id || c.name}" aria-label="${c.name}" title="${c.name}"><i style="background:${c.swatch || c.hex || "#0c0c0c"}"></i></button>`).join("")}
      </div>
      <p class="opt-label">Size</p>
      <div class="sizes" id="pdpSizes">
        ${sizes.map((s) => `<button class="${s === size ? "active" : ""}" data-size="${s}">${s}</button>`).join("")}
      </div>
      <p class="qv-hint" id="pdpHint"></p>
      <button class="btn btn-gold block" id="pdpAdd" style="margin-top:.6rem"><span>Add to bag</span></button>
      <p class="muted small pdp-story">${p.story || ""}</p>
      ${features.length ? `
      <dl class="feat-grid">
        ${features.map((f) => `<div><dt>${f.label}</dt><dd>${f.detail}</dd></div>`).join("")}
      </dl>` : ''}
      <div class="pdp-meta">
        <p><b>Fabric. </b>${p.fabric || p.specs?.fabric || "Technical stretch performance fabric"}</p>
        <p><b>Fit. </b>${p.fit || p.specs?.fit || "Athletic tailored fit"}</p>
      </div>
    </div>`;

  const getProductDetailUrl = (o) => {
    if (o.file) return o.file;
    const basePrefix = (typeof BASE !== "undefined" ? BASE : (typeof isSubdir !== "undefined" && isSubdir ? "../" : "./"));
    return `${basePrefix}products/product.html?slug=${encodeURIComponent(o.slug)}`;
  };

  const xsell = document.getElementById("xsellGrid");
  if (xsell) {
    xsell.innerHTML = others.map((o) => `
      <a href="${getProductDetailUrl(o)}">
        <img src="${resolveImg(o.images ? o.images[0] : o.image)}" alt="" loading="lazy" />
        <div><p class="n">${o.name}</p><p class="p">${typeof money === "function" ? money(o.price) : "₦" + o.price}</p></div>
      </a>`).join("");
  }

  const crumb = document.getElementById("crumbName");
  if (crumb) crumb.textContent = p.name;

  const heroBg = document.getElementById("heroBgImg");
  if (heroBg && images[0]) heroBg.src = resolveImg(images[0]);

  const root = document.getElementById("pdpRoot");
  root.addEventListener("click", (e) => {
    const th = e.target.closest("[data-thumb]");
    if (th) {
      imgIdx = +th.dataset.thumb;
      document.getElementById("pdpImg").src = resolveImg(images[imgIdx]);
      root.querySelectorAll("[data-thumb]").forEach((b, i) => b.classList.toggle("active", i === imgIdx));
      return;
    }
    const sw = e.target.closest("[data-color]");
    if (sw) {
      const match = colors.find((c) => (c.id || c.name) === sw.dataset.color);
      if (match) {
        color = match;
        document.getElementById("pdpColorName").textContent = color.name;
        root.querySelectorAll("[data-color]").forEach((b) => b.classList.toggle("active", (b.dataset.color === (color.id || color.name))));
      }
      return;
    }
    const sz = e.target.closest("[data-size]");
    if (sz) {
      size = sz.dataset.size;
      document.getElementById("pdpHint").textContent = "";
      root.querySelectorAll("[data-size]").forEach((b) => b.classList.toggle("active", b.dataset.size === size));
      return;
    }
    if (e.target.closest("#pdpAdd")) {
      if (!size) { document.getElementById("pdpHint").textContent = "Choose a size."; return; }
      Cart.add({ slug: p.slug, name: p.name, price: p.price, size, color: color.id || color.name, colorName: color.name, image: resolveImg(images[0]) });
      paintBag(); toast(`${p.name} — added to bag`); openDrawer();
    }
  });
})();
