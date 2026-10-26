// In-memory API Key Status & Failover Tracker
// Tracks active keys, cooldowns, success/failure rates, and failover events.

function getRawKeys() {
  const raw = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
}

function maskKey(key) {
  if (!key) return "unknown";
  if (key.length <= 8) return "••••" + key.slice(-2);
  return "••••" + key.slice(-4);
}

class KeyManager {
  constructor() {
    this.keyStats = new Map(); // key -> { attempts, successes, errors, cooldownUntil, cooldownReason, lastUsed }
    this.totalRequests = 0;
    this.successfulRequests = 0;
    this.failedRequests = 0;
    this.failoverEvents = 0;
    this.recentLogs = [];
  }

  addLog(type, message, details = {}) {
    this.recentLogs.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      type, // "success" | "failover" | "cooldown" | "retry" | "error"
      message,
      details,
    });
    if (this.recentLogs.length > 25) {
      this.recentLogs.pop();
    }
  }

  ensureKeyInit(key) {
    if (!this.keyStats.has(key)) {
      this.keyStats.set(key, {
        attempts: 0,
        successes: 0,
        errors: 0,
        cooldownUntil: 0,
        cooldownReason: null,
        lastUsed: null,
      });
    }
    return this.keyStats.get(key);
  }

  isKeyOnCooldown(key) {
    const stat = this.keyStats.get(key);
    if (!stat || !stat.cooldownUntil) return false;
    if (Date.now() >= stat.cooldownUntil) {
      stat.cooldownUntil = 0;
      stat.cooldownReason = null;
      return false;
    }
    return true;
  }

  recordRequestStart() {
    this.totalRequests += 1;
  }

  recordAttempt(key) {
    const stat = this.ensureKeyInit(key);
    stat.attempts += 1;
    stat.lastUsed = new Date().toISOString();
  }

  recordSuccess(key, { isFailover = false, model = "gemini-3.8-flash" } = {}) {
    const stat = this.ensureKeyInit(key);
    stat.successes += 1;
    this.successfulRequests += 1;

    if (isFailover) {
      this.failoverEvents += 1;
      this.addLog(
        "failover",
        `Failover successful: ${maskKey(key)} completed generation on ${model}`,
        { key: maskKey(key), model }
      );
    } else {
      this.addLog(
        "success",
        `Deck generated successfully via ${maskKey(key)} (${model})`,
        { key: maskKey(key), model }
      );
    }
  }

  recordCooldown(key, reason = "Quota exceeded", durationMs = 60000) {
    const stat = this.ensureKeyInit(key);
    stat.errors += 1;
    stat.cooldownUntil = Date.now() + durationMs;
    stat.cooldownReason = reason;

    this.addLog(
      "cooldown",
      `Key ${maskKey(key)} placed on cooldown: ${reason}`,
      { key: maskKey(key), reason, durationMs }
    );
  }

  recordRequestFailure(error) {
    this.failedRequests += 1;
    this.addLog(
      "error",
      `Generation request failed: ${error?.message || "Unknown error"}`,
      { error: error?.message }
    );
  }

  resetAllCooldowns() {
    let clearedCount = 0;
    for (const [, stat] of this.keyStats.entries()) {
      if (stat.cooldownUntil > 0) {
        stat.cooldownUntil = 0;
        stat.cooldownReason = null;
        clearedCount += 1;
      }
    }
    this.addLog("info", `Manual reset: cleared cooldown for ${clearedCount} key(s)`);
    return clearedCount;
  }

  getStatus() {
    const keys = getRawKeys();
    const now = Date.now();

    const keyList = keys.map((key, index) => {
      const stat = this.ensureKeyInit(key);
      const onCooldown = stat.cooldownUntil > now;
      const secondsLeft = onCooldown ? Math.ceil((stat.cooldownUntil - now) / 1000) : 0;

      return {
        id: index + 1,
        masked: maskKey(key),
        status: onCooldown ? "cooldown" : "active",
        cooldownSecondsLeft: secondsLeft,
        cooldownReason: onCooldown ? stat.cooldownReason || "Quota exceeded" : null,
        attempts: stat.attempts,
        successes: stat.successes,
        errors: stat.errors,
        lastUsed: stat.lastUsed,
      };
    });

    const activeCount = keyList.filter((k) => k.status === "active").length;
    const cooldownCount = keyList.filter((k) => k.status === "cooldown").length;
    const totalReqs = this.totalRequests;
    const successRate =
      totalReqs > 0 ? Math.round((this.successfulRequests / totalReqs) * 100) : 100;

    let overallHealth = "healthy"; // "healthy" | "degraded" | "critical"
    if (keys.length === 0) {
      overallHealth = "unconfigured";
    } else if (activeCount === 0) {
      overallHealth = "critical";
    } else if (cooldownCount > 0) {
      overallHealth = "degraded";
    }

    return {
      overallHealth,
      configuredKeysCount: keys.length,
      activeKeysCount: activeCount,
      cooldownKeysCount: cooldownCount,
      totalRequests: this.totalRequests,
      successfulRequests: this.successfulRequests,
      failedRequests: this.failedRequests,
      failoverEvents: this.failoverEvents,
      successRate,
      primaryModel: process.env.GEMINI_MODEL || "gemini-3.8-flash",
      keys: keyList,
      recentLogs: this.recentLogs.slice(0, 15),
      timestamp: new Date().toISOString(),
    };
  }
}

// Global singleton instance preserved across route calls in the same server process
const globalForKeys = globalThis;
if (!globalForKeys.__keyManagerInstance) {
  globalForKeys.__keyManagerInstance = new KeyManager();
}

export const keyManager = globalForKeys.__keyManagerInstance;
export { getRawKeys, maskKey };
