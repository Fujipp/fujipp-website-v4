// src/features/app-premium-shop/gafiw.js
// Client for the gafiwshop.xyz premium-app reseller API (x-www-form-urlencoded).
// The shop owner funds an account on that site; api_buy debits it and returns the
// purchased account. Endpoints used in phase 1: api_product (public, GET),
// api_buy + api_money (need APP_PREMIUM_API_KEY).
//
// api_product item shape (observed live 2026-07-09):
//   { name, imageapi, details, price, pricevip, stock, type_menu, type_id }

const DEFAULT_BASE = 'https://gafiwshop.xyz/api';

function apiBase(ctx) {
  return String(ctx.config.get('APP_PREMIUM_API_BASE', DEFAULT_BASE)).replace(/\/+$/, '');
}

async function callApi(ctx, path, form = null) {
  const url = `${apiBase(ctx)}/${path}`;
  const options = { method: form ? 'POST' : 'GET' };
  if (form) {
    options.headers = { 'Content-Type': 'application/x-www-form-urlencoded' };
    options.body = new URLSearchParams(form).toString();
  }
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_e) { /* non-JSON error page */ }
  if (!res.ok) {
    const message = (json && (json.message || json.error)) || `HTTP ${res.status}`;
    return { ok: false, status: res.status, message, raw: json || text };
  }
  return { ok: true, status: res.status, json };
}

// Products come back for every panel render and buy re-check; a short cache keeps
// the panel snappy without ever showing stock more than a few seconds stale.
const PRODUCT_CACHE_TTL_MS = 5_000;
let productCache = null; // { at, list }

// Full live product list. { ok, products, message }
async function getProducts(ctx, { fresh = false } = {}) {
  if (!fresh && productCache && Date.now() - productCache.at < PRODUCT_CACHE_TTL_MS) {
    return { ok: true, products: productCache.list };
  }
  let res;
  try {
    res = await callApi(ctx, 'api_product');
  } catch (err) {
    return { ok: false, message: `เชื่อมต่อร้านค้าไม่ได้ (${err.message})` };
  }
  const data = res.ok && res.json && Array.isArray(res.json.data) ? res.json.data : null;
  if (!data) return { ok: false, message: res.message || 'รูปแบบข้อมูลสินค้าไม่ถูกต้อง' };
  const products = data
    .filter((p) => p && p.type_id && p.name)
    .map((p) => ({
      name: String(p.name).trim(),
      image: typeof p.imageapi === 'string' ? p.imageapi : '',
      price: Number(p.price),
      priceVip: Number(p.pricevip),
      stock: Number(p.stock) || 0,
      typeMenu: String(p.type_menu || '').trim(),
      typeId: String(p.type_id),
    }))
    .filter((p) => Number.isFinite(p.price));
  productCache = { at: Date.now(), list: products };
  return { ok: true, products };
}

function requireKey(ctx) {
  const key = ctx.config.get('APP_PREMIUM_API_KEY');
  return key ? String(key) : null;
}

// Buy one unit of type_id. The success payload shape is not formally documented,
// so this normalizes defensively: ok = HTTP 200 + no explicit failure flag, and
// `order` is the object most likely to carry the purchased account fields.
async function buyProduct(ctx, typeId) {
  const keyapi = requireKey(ctx);
  if (!keyapi) return { ok: false, message: 'ยังไม่ได้ตั้งค่า API Key ของร้าน (APP_PREMIUM_API_KEY)' };
  let res;
  try {
    res = await callApi(ctx, 'api_buy', { keyapi, type_id: typeId });
  } catch (err) {
    return { ok: false, message: `เชื่อมต่อร้านค้าไม่ได้ (${err.message})` };
  }
  const json = res.json;
  const failed = !res.ok || !json || json.ok === false || json.success === false
    || /^(error|fail)/i.test(String(json.status || ''));
  if (failed) {
    const message = (json && (json.message || json.error || json.msg)) || res.message || 'สั่งซื้อไม่สำเร็จ';
    return { ok: false, message, raw: json };
  }
  const order = (json.data && typeof json.data === 'object' && !Array.isArray(json.data) ? json.data : null)
    || (json.order && typeof json.order === 'object' ? json.order : null)
    || json;
  return { ok: true, order, raw: json };
}

// Upstream wallet balance of the shop owner's gafiwshop account.
async function getMoney(ctx) {
  const keyapi = requireKey(ctx);
  if (!keyapi) return { ok: false, message: 'ยังไม่ได้ตั้งค่า API Key ของร้าน (APP_PREMIUM_API_KEY)' };
  let res;
  try {
    res = await callApi(ctx, 'api_money', { keyapi });
  } catch (err) {
    return { ok: false, message: `เชื่อมต่อร้านค้าไม่ได้ (${err.message})` };
  }
  if (!res.ok || !res.json) return { ok: false, message: res.message || 'เช็คยอดเงินร้านไม่สำเร็จ' };
  const j = res.json;
  const candidates = [j.money, j.balance, j.credit, j.data && j.data.money, j.data && j.data.balance];
  const amount = candidates.map(Number).find((n) => Number.isFinite(n));
  return { ok: true, amount: amount != null ? amount : null, raw: j };
}

// Upstream order id for the notify/DM embeds — the field name is not documented,
// so probe the usual suspects before falling back to '-'.
function pickOrderId(order) {
  if (!order || typeof order !== 'object') return '-';
  for (const key of ['txd', 'TXD', 'order_id', 'orderid', 'id', 'code', 'ref', 'number']) {
    const v = order[key];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '-';
}

module.exports = { getProducts, buyProduct, getMoney, pickOrderId };
