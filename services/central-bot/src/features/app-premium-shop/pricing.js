// src/features/app-premium-shop/pricing.js
// Sale-price + category helpers shared by the panel and the buy flow.
//
// Cost   = upstream price (or pricevip when APP_PREMIUM_USE_VIP_PRICE) in baht.
// Sale   = cost + margin. Margin is a flat baht amount: APP_PREMIUM_MARGINS entries
//          override per product ("<type_id>=15" or "<type_menu>=15", ':' also accepted),
//          anything unmatched uses APP_PREMIUM_MARGIN_DEFAULT.

function costBaht(ctx, product) {
  const useVip = ctx.config.bool('APP_PREMIUM_USE_VIP_PRICE', false);
  const vip = Number(product.priceVip);
  return useVip && Number.isFinite(vip) && vip > 0 ? vip : product.price;
}

// APP_PREMIUM_MARGINS (STRING_LIST → JSON array in env) → { key(lowercase) -> baht }
function marginTable(ctx) {
  const raw = ctx.config.json('APP_PREMIUM_MARGINS', null);
  const entries = Array.isArray(raw) ? raw : [];
  const table = new Map();
  for (const entry of entries) {
    const m = String(entry).match(/^\s*(.+?)\s*[=:]\s*(\d+(?:\.\d+)?)\s*$/);
    if (m) table.set(m[1].toLowerCase(), Number(m[2]));
  }
  return table;
}

function marginBaht(ctx, product, table = marginTable(ctx)) {
  const byId = table.get(product.typeId.toLowerCase());
  if (byId != null) return byId;
  const byMenu = table.get(product.typeMenu.toLowerCase());
  if (byMenu != null) return byMenu;
  return Math.max(0, ctx.config.number('APP_PREMIUM_MARGIN_DEFAULT', 10));
}

function salePriceBaht(ctx, product, table) {
  return costBaht(ctx, product) + marginBaht(ctx, product, table);
}

// ─── Categories (the 3 panel dropdowns) ──────────────────────────────────────
// APP_PREMIUM_CATEGORY_1..3 list the type_menu names for each dropdown. When none
// is configured the products are auto-chunked across the dropdowns so the panel
// works out of the box; when at least one is configured, only listed menus show.
function categorize(ctx, products) {
  const configured = [1, 2, 3].map((n) => {
    const raw = ctx.config.json(`APP_PREMIUM_CATEGORY_${n}`, null);
    return Array.isArray(raw) ? raw.map((s) => String(s).trim().toLowerCase()).filter(Boolean) : [];
  });

  if (configured.every((menus) => menus.length === 0)) {
    // Auto mode: keep the upstream order, ≤25 options per dropdown (Discord limit).
    const chunks = [[], [], []];
    const perChunk = Math.min(25, Math.ceil(products.length / 3)) || 1;
    products.forEach((p, i) => {
      const slot = Math.min(2, Math.floor(i / perChunk));
      if (chunks[slot].length < 25) chunks[slot].push(p);
    });
    return chunks;
  }

  return configured.map((menus) => (menus.length === 0 ? [] : products
    .filter((p) => menus.includes(p.typeMenu.toLowerCase()))
    .slice(0, 25)));
}

module.exports = { costBaht, marginTable, marginBaht, salePriceBaht, categorize };
