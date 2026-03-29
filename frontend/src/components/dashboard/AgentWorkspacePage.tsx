import { useMemo, useState } from "react";
import { Activity, Bolt, ChevronRight, Database, Play, TrendingUp, Zap, AlertCircle, CheckCircle } from "lucide-react";
import { Navigate, useParams } from "react-router-dom";
import {
  Area,
  AreaChart,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useAgentWorkspace, type AgentType } from "../../context/AgentWorkspaceContext";
import { api } from "../../api";

function eventTint(severity: "info" | "warning" | "success"): string {
  if (severity === "warning") return "border-amber-200 bg-amber-50";
  if (severity === "success") return "border-emerald-200 bg-emerald-50";
  return "border-cyan-200 bg-cyan-50";
}

export function AgentWorkspacePage() {
  const { agentId } = useParams<{ agentId: AgentType }>();
  const { agents, addTimelineEvent } = useAgentWorkspace();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const agent = useMemo(() => agents.find((item) => item.id === agentId), [agentId, agents]);

  if (!agent) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const actionLabel =
    agent.id === "retention"
      ? "Run intervention check"
      : agent.id === "deal_intelligence"
        ? "Generate health and recovery report"
      : agent.id === "prospecting"
        ? "Generate outbound batch"
        : "Analyze pipeline movement";

  async function handlePrimaryAction() {
    setLoading(true);
    setError(null);
    try {
      if (agent!.id === "deal_intelligence") {
        await api.post("/api/deal-intelligence/health-report", {});
        addTimelineEvent(agent!.id, {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          title: "Health report generated",
          detail: "Deal pipeline health assessment completed successfully.",
          severity: "success",
        });
      } else if (agent!.id === "prospecting") {
        await api.post("/api/prospecting/run", {
          action: "queue_prospecting_job",
          context: {},
        });
        addTimelineEvent(agent!.id, {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          title: "Prospecting batch queued",
          detail: "Outbound prospecting batch submitted successfully.",
          severity: "success",
        });
      } else {
        // For retention and other agents, just log the event
        addTimelineEvent(agent!.id, {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          title: "Manual action triggered",
          detail: `${actionLabel} executed from workspace controls.`,
          severity: "info",
        });
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error ?? err?.message ?? "Action failed";
      setError(errorMsg);
      addTimelineEvent(agent!.id, {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        title: "Action failed",
        detail: errorMsg,
        severity: "warning",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleRecommendationSync() {
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/prospecting/run", {
        action: "sync_recommendations",
        context: { sync_type: "full_refresh" },
      });
      addTimelineEvent(agent!.id, {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        title: "Recommendation sync triggered",
        detail: "Prospecting recommendations synchronized successfully.",
        severity: "success",
      });
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error ?? err?.message ?? "Sync failed";
      setError(errorMsg);
      addTimelineEvent(agent!.id, {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        title: "Recommendation sync failed",
        detail: errorMsg,
        severity: "warning",
      });
    } finally {
      setLoading(false);
    }
  }

  // Computed data for additional visualizations
  const cumulativeData = useMemo(() => {
    let sum = 0;
    return agent.chart.map((item) => ({
      ...item,
      cumulative: (sum += item.value),
    }));
  }, [agent.chart]);

  const eventDistribution = useMemo(() => {
    const distribution = agent.events.reduce(
      (acc: Record<string, number>, event) => {
        acc[event.severity] = (acc[event.severity] ?? 0) + 1;
        return acc;
      },
      {}
    );
    return [
      { name: "Success", value: distribution.success ?? 0, color: "#10b981" },
      { name: "Warning", value: distribution.warning ?? 0, color: "#f59e0b" },
      { name: "Info", value: distribution.info ?? 0, color: "#3b82f6" },
    ].filter((item) => item.value > 0);
  }, [agent.events]);

  return (
    <div className="space-y-6">
      <section className="ds-panel-strong motion-rise p-5 md:p-6">
        <p className="ds-kicker">Agent Workspace</p>
        <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 md:text-3xl">{agent.name}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">{agent.role}</p>
            <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
              <Activity size={14} />
              Status: {agent.status}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="ds-btn ds-btn-primary"
              onClick={() => void handlePrimaryAction()}
              disabled={loading}
            >
              <Play size={16} />
              {actionLabel}
            </button>
            <button
              type="button"
              className="ds-btn ds-btn-secondary"
              onClick={() => void handleRecommendationSync()}
              disabled={loading}
            >
              <Bolt size={16} />
              Trigger Recommendation Sync
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agent.metrics.map((metric, index) => (
            <article
              key={metric.label}
              className="rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow"
              style={{
                animation: `slideUp 0.5s ease-out ${index * 50}ms both`,
              }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{metric.label}</p>
                <TrendingUp size={14} className="text-cyan-600" />
              </div>
              <p className="mt-3 text-3xl font-bold text-slate-900">{metric.value}</p>
              <p className="mt-2 text-xs text-slate-500">{metric.trend}</p>
            </article>
          ))}
        </div>

        <style>{`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </section>

      <section className="motion-rise grid gap-5 xl:grid-cols-3" style={{ animationDelay: "80ms" }}>
        <article className="ds-panel p-4 md:p-5 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Performance Trend</h2>
            <span className="text-xs text-slate-500">Last 5 intervals</span>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={agent.chart}>
                <defs>
                  <linearGradient id="agent-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0891b2" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#0891b2" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="#dbeafe" />
                <XAxis dataKey="label" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                  }}
                />
                <Area type="monotone" dataKey="value" stroke="#0e7490" fill="url(#agent-gradient)" strokeWidth={2.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="ds-panel p-4 md:p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Activity Distribution</h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={eventDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {eventDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-3 space-y-2 text-sm">
            {eventDistribution.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  {item.name}
                </span>
                <span className="font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="motion-rise grid gap-5 xl:grid-cols-2" style={{ animationDelay: "120ms" }}>
        <article className="ds-panel p-4 md:p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Cumulative Performance</h2>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={cumulativeData}>
              <defs>
                <linearGradient id="cumulative-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="cumulative"
                stroke="#7c3aed"
                strokeWidth={2.5}
                dot={{ fill: "#7c3aed", r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="ds-panel p-4 md:p-5">
          <h2 className="text-lg font-semibold text-slate-900">Integrations Status</h2>
          <ul className="mt-4 space-y-3">
            {agent.integrations.map((integration) => (
              <li
                key={integration}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-3 hover:shadow-sm transition-shadow"
              >
                <span className="flex items-center gap-3">
                  <div className="relative">
                    <Database size={16} className="text-slate-600" />
                    <CheckCircle size={12} className="absolute -bottom-1 -right-1 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{integration}</p>
                    <p className="text-xs text-slate-500">Connected</p>
                  </div>
                </span>
                <Zap size={14} className="text-amber-500" />
              </li>
            ))}
          </ul>
        </article>
      </section>

      <section className="ds-panel motion-rise p-4 md:p-5" style={{ animationDelay: "140ms" }}>
        <h2 className="text-lg font-semibold text-slate-900">Recent Activity Timeline</h2>
        <div className="mt-4 space-y-2">
          {agent.events.length === 0 ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-500">
              No events yet. Run an action to see activity here.
            </div>
          ) : (
            agent.events.map((eventItem, index) => (
              <article
                key={eventItem.id}
                className={`rounded-xl border p-3 transition-all hover:shadow-md ${eventTint(eventItem.severity)}`}
                style={{
                  animation: `slideDown 0.4s ease-out ${index * 30}ms both`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-1 items-start gap-3">
                    <div className="mt-0.5">
                      {eventItem.severity === "success" ? (
                        <CheckCircle size={16} className="text-emerald-600" />
                      ) : eventItem.severity === "warning" ? (
                        <AlertCircle size={16} className="text-amber-600" />
                      ) : (
                        <Activity size={16} className="text-cyan-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-800">{eventItem.title}</p>
                      <p className="mt-0.5 text-sm text-slate-600">{eventItem.detail}</p>
                    </div>
                  </div>
                  <span className="whitespace-nowrap text-xs font-medium text-slate-500">{eventItem.time}</span>
                </div>
              </article>
            ))
          )}
        </div>
        <button type="button" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-700 hover:text-cyan-900">
          View complete log
          <ChevronRight size={16} />
        </button>

        <style>{`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}</style>
      </section>
    </div>
  );
}
