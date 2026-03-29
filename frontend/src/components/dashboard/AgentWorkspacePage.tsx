import { useMemo, useState } from "react";
import { Activity, Bolt, ChevronRight, Database, Play } from "lucide-react";
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

function threatTint(level: "low" | "medium" | "high"): string {
  if (level === "high") return "text-rose-700 bg-rose-50 border-rose-200";
  if (level === "medium") return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-emerald-700 bg-emerald-50 border-emerald-200";
}

export function AgentWorkspacePage() {
  const { agentId } = useParams<{ agentId: AgentType }>();
  const { agents, addTimelineEvent } = useAgentWorkspace();
  const [ciOpportunityId, setCiOpportunityId] = useState("");
  const [ciLoading, setCiLoading] = useState(false);
  const [ciError, setCiError] = useState<string | null>(null);
  const [ciResult, setCiResult] = useState<CiDealStrategyResponse | null>(null);

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
        : agent.id === "ci"
          ? "Run CI analysis"
          : "Analyze pipeline movement";

  async function runCiAnalysis() {
    if (agentId !== "ci" || ciLoading) {
      return;
    }

    setCiLoading(true);
    setCiError(null);
    try {
      const response = await api.post<CiDealStrategyResponse>("/api/ci/deal-strategy", {
        opportunity_id: ciOpportunityId.trim() || undefined,
      });

      const payload = response.data;
      setCiResult(payload);

      addTimelineEvent("ci", {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        title: "CI analysis completed",
        detail: `Threat ${payload.threat_level.toUpperCase()} with ${payload.detected.length} competitor signal(s).`,
        severity: payload.threat_level === "high" ? "warning" : "success",
      });
    } catch (err: any) {
      const message = err?.response?.data?.error ?? err?.message ?? "CI analysis failed";
      setCiError(String(message));
      addTimelineEvent("ci", {
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        title: "CI analysis failed",
        detail: String(message),
        severity: "warning",
      });
    } finally {
      setCiLoading(false);
    }
  }

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
              onClick={() => {
                if (agent.id === "ci") {
                  void runCiAnalysis();
                  return;
                }

                addTimelineEvent(agent.id, {
                  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                  title: "Manual action triggered",
                  detail: `${actionLabel} executed from workspace controls.`,
                  severity: "info",
                });
              }}
            >
              <Play size={16} />
              {ciLoading && agent.id === "ci" ? "Running..." : actionLabel}
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

        {agent.id === "ci" && (
          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-end">
              <label className="w-full text-sm text-slate-600">
                Opportunity ID (optional)
                <input
                  value={ciOpportunityId}
                  onChange={(event) => setCiOpportunityId(event.target.value)}
                  placeholder="Leave empty to analyze highest amount deal"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 outline-none focus:border-cyan-500"
                />
              </label>
              <button
                type="button"
                onClick={() => void runCiAnalysis()}
                disabled={ciLoading}
                className="ds-btn ds-btn-secondary"
              >
                {ciLoading ? "Analyzing..." : "Run analysis now"}
              </button>
            </div>
            {ciError && <p className="mt-3 text-sm text-rose-700">{ciError}</p>}
          </div>
        )}
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

      {agent.id === "ci" && ciResult && (
        <section className="ds-panel motion-rise p-4 md:p-5" style={{ animationDelay: "180ms" }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Competitive Intelligence Output</h2>
              <p className="mt-1 text-sm text-slate-600">
                Opportunity: <span className="font-medium text-slate-800">{ciResult.opportunity_name || ciResult.opportunity_id}</span>
              </p>
            </div>
            <div className="text-right text-xs text-slate-500">
              <p>Generated: {new Date(ciResult.generated_at).toLocaleString()}</p>
              <p>
                LLM: {ciResult.llm?.status ?? "unknown"}
                {ciResult.llm?.model ? ` (${ciResult.llm.model})` : ""}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Threat</p>
              <p className={`mt-2 inline-flex rounded-full border px-2 py-1 text-sm font-semibold ${threatTint(ciResult.threat_level)}`}>
                {ciResult.threat_level.toUpperCase()}
              </p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Confidence</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{Math.round((ciResult.confidence_score ?? 0) * 100)}%</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Competitors</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{ciResult.detected.length}</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">LLM Status</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{ciResult.llm?.status ?? "unknown"}</p>
              {ciResult.llm?.error && <p className="mt-1 text-xs text-rose-700">{ciResult.llm.error}</p>}
            </article>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Deal Tip</h3>
              <p className="mt-2 text-sm text-slate-700">{ciResult.deal_tip}</p>

              <h3 className="mt-4 text-sm font-semibold text-slate-900">Primary Objections</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {(ciResult.primary_objections?.length ? ciResult.primary_objections : ["none detected"]).map((item) => (
                  <span key={item} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700">
                    {item}
                  </span>
                ))}
              </div>

              <h3 className="mt-4 text-sm font-semibold text-slate-900">Next Actions</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {(ciResult.next_actions?.length ? ciResult.next_actions : ["No next action generated"]).map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
            </article>

            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-900">Detected Competitors</h3>
              <div className="mt-2 space-y-3">
                {ciResult.detected.length === 0 && <p className="text-sm text-slate-600">No competitor mentions detected.</p>}
                {ciResult.detected.map((item) => (
                  <div key={item.competitor} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{item.competitor}</p>
                    <p className="mt-1 text-xs text-slate-500">Keywords: {item.matched_keywords.join(", ") || "none"}</p>
                    <p className="mt-1 text-xs text-slate-500">Evidence points: {item.evidence.length}</p>
                    {item.evidence.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {item.evidence.slice(0, 2).map((ev, index) => (
                          <div key={`${item.competitor}-${index}-${ev.source}`} className="rounded-md border border-slate-100 bg-slate-50 p-2">
                            <p className="text-xs font-medium text-slate-600">{ev.source}</p>
                            <p className="mt-1 line-clamp-3 text-sm text-slate-700">{ev.snippet}</p>
                            {(ev.occurred_at || ev.engagement_id) && (
                              <p className="mt-1 text-xs text-slate-500">
                                {ev.occurred_at ? `at ${new Date(ev.occurred_at).toLocaleString()}` : ""}
                                {ev.occurred_at && ev.engagement_id ? " • " : ""}
                                {ev.engagement_id ? `engagement ${ev.engagement_id}` : ""}
                              </p>
                            )}
                          </div>
                        ))}
                        {item.evidence.length > 2 && (
                          <p className="text-xs text-slate-500">+ {item.evidence.length - 2} more evidence point(s)</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </article>
          </div>

          <article className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Battlecards</h3>
            {ciResult.battlecards.length === 0 ? (
              <p className="mt-2 text-sm text-slate-600">No competitor-specific battlecards generated for this run.</p>
            ) : (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {ciResult.battlecards.map((card) => (
                  <div key={card.competitor} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-semibold text-slate-900">{card.competitor}</p>

                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Strengths to acknowledge</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {card.strengths.slice(0, 3).map((strength) => (
                        <li key={`${card.competitor}-s-${strength}`}>{strength}</li>
                      ))}
                    </ul>

                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Weaknesses to probe</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {card.weaknesses.slice(0, 3).map((weakness) => (
                        <li key={`${card.competitor}-w-${weakness}`}>{weakness}</li>
                      ))}
                    </ul>

                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Landmine questions</p>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-700">
                      {card.landmine_questions.slice(0, 2).map((question) => (
                        <li key={`${card.competitor}-q-${question}`}>{question}</li>
                      ))}
                    </ul>

                    <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Pricing objection handler</p>
                    <p className="mt-1 text-sm text-slate-700">{card.pricing_objection_handler}</p>
                  </div>
                ))}
              </div>
            )}
          </article>

          <article className="mt-4 rounded-xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Suggested CRM Note</h3>
            <pre className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{ciResult.suggested_hubspot_note}</pre>
          </article>
        </section>
      )}
    </div>
  );
}

type CiEvidence = {
  source: string;
  snippet: string;
  engagement_id?: string | null;
  occurred_at?: string | null;
};

type CiDetected = {
  competitor: string;
  matched_keywords: string[];
  evidence: CiEvidence[];
};

type CiDealStrategyResponse = {
  opportunity_id: string;
  opportunity_name: string;
  threat_level: "low" | "medium" | "high";
  confidence_score?: number;
  primary_objections?: string[];
  next_actions?: string[];
  deal_tip: string;
  suggested_hubspot_note: string;
  generated_at: string;
  detected: CiDetected[];
  battlecards: {
    competitor: string;
    strengths: string[];
    weaknesses: string[];
    landmine_questions: string[];
    pricing_objection_handler: string;
  }[];
  llm?: {
    used?: boolean;
    status?: string;
    model?: string | null;
    error?: string | null;
  };
};
