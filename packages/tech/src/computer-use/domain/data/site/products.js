// The committed product list — the single source of truth for the fixture site's
// catalog, search results, and cart labels. Declaration order is the rendering
// order everywhere, so "the first result" is deterministic across runs.
window.PRODUCTS = [
  {
    id: "notebook",
    name: "Notebook",
    category: "Stationery",
    priceUsd: 12,
    href: "./product/notebook.html",
  },
  {
    id: "widget",
    name: "Widget",
    category: "Hardware",
    priceUsd: 25,
    href: "./product/widget.html",
  },
  {
    id: "pencil",
    name: "Pencil",
    category: "Stationery",
    priceUsd: 3,
    href: "./product/pencil.html",
  },
];
