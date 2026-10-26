"use client";

import { useEffect, useState } from "react";
import {
  Lightning,
  ShieldCheck,
  Warning,
  XCircle,
  ArrowClockwise,
  CheckCircle,
  Key,
  X,
  ClockCounterClockwise,
  ArrowBendDownRight,
  Info,
} from "@phosphor-icons/react";

export default function ApiDashboardModal({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchStatus(showLoading = false) {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (e) {
      console.error("Failed to fetch API status", e);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    fetchStatus(true);

    // Auto-refresh every 4 seconds while modal is open
    const interval = setInterval(() => {
      fetchStatus(false);
    }, 4000);

    return () => clearInterval(interval);
  }, [isOpen]);

  async function handleResetCooldown() {
    setResetting(true);
    setMessage("");
    try {
      const res = await fetch("/api/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset_cooldown" }),
      });
      const resJson = await res.json();
      if (res.ok) {
        setData(resJson);
        setMessage("All key cooldowns have been reset to active!");
        setTimeout(() => setMessage(""), 4000);
      }
    } catch (e) {
      console.error("Failed to reset cooldowns", e);
      setMessage("Failed to reset cooldowns. Please try again.");
    } finally {
      setResetting(false);
    }
  }

  if (!isOpen) return null;

  const totalKeys = data?.configuredKeysCount ?? 0;
  const activeKeys = data?.activeKeysCount ?? 0;
  const cooldownKeys = data?.cooldownKeysCount ?? 0;
  const successRate = data?.successRate ?? 100;
  const failovers = data?.failoverEvents ?? 0;
  const totalReqs = data?.totalRequests ?? 0;
  const failedReqs = data?.failedRequests ?? 0;

  let healthColor = "var(--good)";
  let healthBg = "var(--good-bg)";
  let healthTitle = "All API Keys Operational";
  let healthDesc = `${activeKeys} of ${totalKeys} keys ready with automatic failover active.`;

  if (totalKeys === 0) {
    healthColor = "var(--rose)";
    healthBg = "var(--blush-soft)";
    healthTitle = "No API Keys Configured";
    healthDesc = "Add GEMINI_API_KEY or GEMINI_API_KEYS in your environment variables.";
  } else if (activeKeys === 0) {
    healthColor = "var(--rose)";
    healthBg = "var(--blush-soft)";
    healthTitle = "All Keys On Cooldown";
    healthDesc = "Every key has hit quota limits. Click 'Reset Cooldowns' or wait 60s.";
  } else if (cooldownKeys > 0) {
    healthColor = "var(--gold)";
    healthBg = "#fff8ed";
    healthTitle = "Failover Active (Degraded)";
    healthDesc = `${cooldownKeys} key(s) on temporary cooldown. Traffic is safely rerouting to remaining keys.`;
  }

  return (
    <div className="api-modal-overlay" onClick={onClose}>
      <div
        className="api-modal-container card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <span className="punch" />

        {/* Modal Header */}
        <div className="api-modal-header">
          <div className="api-modal-title-group">
            <div className="api-modal-icon-badge">
              <Lightning size={22} weight="fill" color="var(--rose)" />
            </div>
            <div>
              <h3 className="api-modal-title">API Keys & Failover Health</h3>
              <p className="api-modal-sub">
                Live monitoring of Gemini API keys, quota cooldowns & failover events
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="api-modal-close-btn"
            aria-label="Close API health dashboard"
            type="button"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Overall Status Banner */}
        <div
          className="api-health-banner"
          style={{
            borderColor: healthColor,
            backgroundColor: healthBg,
          }}
        >
          <div className="banner-left">
            <span
              className="health-pulse-dot"
              style={{ backgroundColor: healthColor }}
            />
            <div>
              <strong style={{ color: healthColor }}>{healthTitle}</strong>
              <p>{healthDesc}</p>
            </div>
          </div>
          <button
            onClick={() => fetchStatus(true)}
            className="api-refresh-mini-btn"
            title="Refresh status now"
            disabled={loading}
            type="button"
          >
            <ArrowClockwise
              size={14}
              weight="bold"
              className={loading ? "spin" : ""}
            />
            <span>Refresh</span>
          </button>
        </div>

        {message && <div className="api-alert-success">{message}</div>}

        {/* 4 Metric Stats */}
        <div className="api-metrics-grid">
          <div className="api-metric-card">
            <span className="metric-label">Active Keys</span>
            <div className="metric-value">
              {activeKeys} <span className="metric-denom">/ {totalKeys}</span>
            </div>
            <span className="metric-hint">
              {cooldownKeys > 0 ? `${cooldownKeys} on cooldown` : "Full capacity"}
            </span>
          </div>

          <div className="api-metric-card">
            <span className="metric-label">Success Rate</span>
            <div className="metric-value" style={{ color: "var(--good)" }}>
              {totalReqs > 0 ? `${successRate}%` : "100%"}
            </div>
            <span className="metric-hint">
              {totalReqs} total requests
            </span>
          </div>

          <div className="api-metric-card">
            <span className="metric-label">Failovers Saved</span>
            <div className="metric-value" style={{ color: "var(--gold)" }}>
              {failovers}
            </div>
            <span className="metric-hint">
              Auto-recovered from quota
            </span>
          </div>

          <div className="api-metric-card">
            <span className="metric-label">Hard Errors</span>
            <div
              className="metric-value"
              style={{ color: failedReqs > 0 ? "var(--rose)" : "var(--plum)" }}
            >
              {failedReqs}
            </div>
            <span className="metric-hint">
              {failedReqs === 0 ? "Zero downtime" : "All keys exhausted"}
            </span>
          </div>
        </div>

        {/* Keys Breakdown Table */}
        <div className="api-section">
          <div className="api-section-header">
            <h4>Configured API Keys</h4>
            <span className="api-section-meta">
              Model: <code>{data?.primaryModel || "gemini-3.8-flash"}</code>
            </span>
          </div>

          <div className="api-keys-list">
            {(!data?.keys || data.keys.length === 0) && (
              <div className="empty-keys-note">
                <Info size={18} weight="duotone" color="var(--rose)" />
                <span>
                  No keys found in <code>GEMINI_API_KEYS</code> or{" "}
                  <code>GEMINI_API_KEY</code>.
                </span>
              </div>
            )}

            {data?.keys?.map((k) => {
              const isOnCooldown = k.status === "cooldown";
              return (
                <div
                  key={k.id}
                  className={`api-key-item ${isOnCooldown ? "is-cooldown" : "is-active"}`}
                >
                  <div className="key-item-left">
                    <div className="key-icon-ring">
                      <Key size={16} weight="duotone" color={isOnCooldown ? "var(--gold)" : "var(--rose)"} />
                    </div>
                    <div>
                      <div className="key-name-row">
                        <span className="key-title">Key #{k.id}</span>
                        <code className="key-masked">{k.masked}</code>
                      </div>
                      <div className="key-subinfo">
                        <span>{k.attempts} attempts</span>
                        <span className="sub-dot">·</span>
                        <span>{k.successes} successful</span>
                        {k.lastUsed && (
                          <>
                            <span className="sub-dot">·</span>
                            <span>
                              Last used: {new Date(k.lastUsed).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                          </>
                        )}
                      </div>
                      {isOnCooldown && k.cooldownReason && (
                        <div className="cooldown-reason-text">
                          <Warning size={13} weight="fill" color="var(--gold)" style={{ marginRight: 4, verticalAlign: -1 }} />
                          {k.cooldownReason}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="key-item-right">
                    {isOnCooldown ? (
                      <span className="status-badge-cooldown">
                        <ClockCounterClockwise size={13} weight="bold" />
                        Cooldown ({k.cooldownSecondsLeft}s)
                      </span>
                    ) : (
                      <span className="status-badge-active">
                        <CheckCircle size={13} weight="fill" />
                        Ready & Active
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Failover Logic Guide */}
        <div className="api-how-it-works card">
          <div className="how-title-row">
            <ShieldCheck size={18} weight="fill" color="var(--good)" />
            <strong>How Failover Protection Works in Maia:</strong>
          </div>
          <ul className="how-list">
            <li>
              <strong>Load Balancing:</strong> Requests randomize their starting key to spread quota consumption evenly.
            </li>
            <li>
              <strong>Instant Failover:</strong> If a key hits a rate limit (<code>429</code>), it is automatically placed on a 60-second cooldown while Maia instantly routes your generation to the next available key.
            </li>
            <li>
              <strong>Model Resilience:</strong> If Google's servers experience a high-demand spike (<code>503</code>), Maia retries with exponential backoff and cascades to fallback models automatically.
            </li>
          </ul>
        </div>

        {/* Live Event Stream */}
        {data?.recentLogs && data.recentLogs.length > 0 && (
          <div className="api-section">
            <div className="api-section-header">
              <h4>Recent Activity Log</h4>
              <span className="api-section-meta">Last {data.recentLogs.length} events</span>
            </div>
            <div className="api-logs-scroll">
              {data.recentLogs.map((log) => {
                let icon = <CheckCircle size={14} weight="fill" color="var(--good)" />;
                if (log.type === "failover") {
                  icon = <ArrowBendDownRight size={14} weight="bold" color="var(--gold)" />;
                } else if (log.type === "cooldown") {
                  icon = <ClockCounterClockwise size={14} weight="bold" color="var(--gold)" />;
                } else if (log.type === "error") {
                  icon = <XCircle size={14} weight="fill" color="var(--rose)" />;
                }

                return (
                  <div key={log.id} className="api-log-entry">
                    <span className="log-icon">{icon}</span>
                    <span className="log-time">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span className="log-msg">{log.message}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Actions Footer */}
        <div className="api-modal-footer">
          <button
            onClick={handleResetCooldown}
            disabled={resetting || cooldownKeys === 0}
            className="btn btn-ghost api-reset-btn"
            type="button"
            title="Clear all temporary cooldown timers immediately"
          >
            <ClockCounterClockwise size={15} weight="bold" style={{ marginRight: 6 }} />
            {resetting ? "Resetting…" : "Reset All Cooldowns"}
          </button>

          <button onClick={onClose} className="btn btn-primary" type="button">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
