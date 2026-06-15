// src/features/review-credit/rate-limiter.js
// Channel-rename rate limiter — Discord caps channel renames at 2 per 10 minutes.
// In-memory, per channel id: tracks recent rename timestamps and only runs the
// rename when within the window. State resets on restart, which is safe — the next
// message re-syncs the name. Ported from the legacy Aka Shop bot.

class ChannelRenameLimiter {
  constructor(limit = 2, windowMs = 600000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.timestamps = new Map(); // channelId -> number[]
  }

  canExecute(key) {
    const now = Date.now();
    const valid = (this.timestamps.get(key) || []).filter((t) => now - t < this.windowMs);
    this.timestamps.set(key, valid);
    return valid.length < this.limit;
  }

  record(key) {
    const valid = this.timestamps.get(key) || [];
    valid.push(Date.now());
    this.timestamps.set(key, valid);
  }

  // Run fn() only if within the rename budget. Returns { executed }.
  async executeIfAllowed(key, fn) {
    if (!this.canExecute(key)) return { executed: false, reason: 'rate_limited' };
    try {
      await fn();
      this.record(key);
      return { executed: true };
    } catch (err) {
      return { executed: false, reason: 'error', error: err };
    }
  }
}

module.exports = { ChannelRenameLimiter };
