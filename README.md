# RUNAWAY — Luxury Athleticism Storefront & Owner Console

A high-performance luxury storefront and administrative operations console crafted in **pure vanilla HTML5, CSS3, and modern JavaScript (ES6+)** with zero runtime dependencies.

---

## 📁 Architecture & Clean Directory Structure

```
runaway/
├── index.html                      # Storefront Home (hero, lookbook, quickview, bag)
├── collection.html                 # Full Catalogue (interactive filters, quick-add)
├── about.html                      # Brand heritage, philosophy, animated metrics
│
├── css/
│   └── styles.css                  # Unified luxury design system, CSS variables & animations
│
├── js/
│   ├── data.js                     # Central product catalogue & dynamic relative path resolver
│   ├── site.js                     # Core UI engine, cart drawer, checkout & localStorage persistence
│   ├── app.js                      # Homepage quick-view modal & catalogue bindings
│   └── product.js                  # Modular product-detail page renderer & cross-sell logic
│
├── products/                       # Dedicated Product Detail Pages (PDP)
│   ├── aether-compression-tee.html # Raglan compression tee
│   ├── apex-training-shorts.html   # 4-way stretch training shorts
│   └── velocity-skull-cap.html     # Second-skin cap (4 colorways)
│
├── admin/                          # Owner Operations & House Management Console
│   ├── login.html                  # Secure owner login portal (Passcode: runaway2026)
│   ├── dashboard.html              # Real-time revenue metrics, order table & inventory overview
│   ├── admin.css                   # Refined dark-luxury administrative styling
│   └── admin.js                    # Status transitions (Pending/Fulfilled/Cancelled), demo data seeder
│
├── public/                         # Static Assets & Photography
│   ├── favicon.svg                 # Gold dual-runner SVG icon
│   └── images/                     # 13 high-resolution studio & editorial images
│
└── README.md
```

---

## 🏛️ Features & Architecture Highlights

### 1. Storefront Experience
- **Zero Runtime Frameworks**: Lightweight, instant loads, resilient without build steps.
- **Luxury Aesthetic**: Grounded in `#070707` midnight black, elevated `#101010`, warm gold accents (`#c9a84c`), with *Cinzel* display typography and *Outfit* body type.
- **Interactive Catalogue**: Live search filter (`#collectionSearch`), sorting by Price (Low/High) or Name, and dynamic category chips.
- **Dynamic Cart Drawer**: Direct manipulation side bag drawer with fluid physics, size/color selectors, instant subtotal calculation, and Nigerian courier checkout.
- **Nigerian Courier Checkout**: Captures full delivery coordinates (Phone, Street Address, City, State dropdown) with instant order ID generation (`RW-XXXX`).
- **Universal Order Tracking**: Customers can check live fulfillment status (*"Processing at Lagos Atelier"* vs. *"Dispatched via RUNAWAY Courier"*) by Order ID, Email, or Phone.

### 2. Owner Operations Portal (`admin/`)
- **Authentication Guard**: Session-based authentication (`sessionStorage.runaway_owner_session`) protecting the console.
- **Default Owner Passcode**: `runaway2026` (or `admin`).
- **Live KPI Counters**: Instant tracking of Total Revenue, Total Orders, Average Order Value (AOV), and Pending Orders in Nigerian Naira (`₦`).
- **Order Management & Packing Slips**: Real-time filtering by status (`All`, `Pending`, `Fulfilled`, `Cancelled`), printable dispatch slips with full customer address & phone coordinates, and 12-column CSV export.
- **Catalogue CRUD & Preview**: In-dashboard modal previewing, custom piece uploading, full specifications/pricing editing, deletion with confirmation, and **"Restore Core Kit ↺"** recovery tool.
- **Announcement Control**: Update storefront marquee banner live from the dashboard.

---

## 🚀 Running the Project

You can open the project directly in your browser or run a simple local static server:

```bash
# Option A: Open directly via file protocol
# Double click index.html or open admin/login.html

# Option B: Run via any static HTTP server
npx serve .
# or
python -m http.server 8080
```

- **Customer Storefront**: `http://localhost:8080/index.html`
- **Owner Operations**: `http://localhost:8080/admin/login.html` (Passcode: `runaway2026`)
