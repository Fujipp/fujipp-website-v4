// src/features/roblox-robux-payout/redeem.js
// "Spend wallet → get Robux" core behind /robux-redeem (the shop panel's package
// flow lives in buy.js). Eligibility check → debit → pay out → refund on failure.
// Flat ROBUX_RATE pricing; the panel uses package tables instead.
//
// ROBUX_RATE is "Robux per 1 baht" (e.g. 4 → ฿1 buys 4 Robux), so the THB cost of
// `robux` is robux / rate. Round up to the satang so the shop never undercharges.

const roblox = require('./roblox');

async function redeemRobux(ctx, { discordUserId, username, robux, groupKey = null }) {
  const wallet = ctx.services && ctx.services.wallet;
  if (!wallet) return { ok: false, message: 'ระบบกระเป๋าเงินยังไม่เปิด (ต้องเปิดฟีเจอร์ wallet-topup)' };

  const rate = ctx.config.number('ROBUX_RATE', 0);
  if (!rate || rate <= 0) return { ok: false, message: 'ร้านยังไม่ได้ตั้งเรท (ROBUX_RATE)' };
  if (!Number.isInteger(robux) || robux <= 0) return { ok: false, message: 'จำนวน Robux ไม่ถูกต้อง' };

  // Eligibility first (also resolves the userId) — a member who isn't in the
  // group yet gets a clear Thai message instead of debit → payout fail → refund.
  const elig = await roblox.checkRobloxEligibility(username, groupKey ? { groupKey } : null);
  if (!elig.ok || !elig.eligible) {
    return { ok: false, message: elig.message || 'ผู้ใช้นี้ยังไม่มีสิทธิ์รับ Robux' };
  }
  const user = { userId: elig.userId, username: elig.username };

  const costSatang = Math.ceil((robux / rate) * 100);

  // Debit first; refund if the payout fails.
  let balanceAfter;
  try {
    balanceAfter = await wallet.debit(discordUserId, costSatang, {
      type: 'ROBUX_REDEEM',
      note: `${robux} Robux → ${user.username}`,
    });
  } catch (err) {
    if (err.code === 'INSUFFICIENT_FUNDS') {
      return { ok: false, message: `ยอดเงินไม่พอ ต้องใช้ ฿${(costSatang / 100).toLocaleString('th-TH')}` };
    }
    throw err;
  }

  const payout = await roblox.makeOneTimePayout(user.userId, robux, groupKey ? { groupKey } : null);
  if (!payout.ok) {
    await wallet.credit(discordUserId, costSatang, { type: 'REFUND', note: 'payout failed' }).catch(() => {});
    return {
      ok: false,
      message: `จ่าย Robux ไม่สำเร็จ คืนเงินแล้ว: ${payout.error?.message || roblox.mapErrorCode(payout.error?.code)}`,
    };
  }

  const groupName = (roblox.getGroupConfigs().map[groupKey] || {}).name || '';
  return { ok: true, username: user.username, robux, balanceAfter, groupName };
}

module.exports = { redeemRobux };
