import { useMemo, useState } from "react";
import { AlertTriangle, Gauge, RefreshCw, Sparkles, TrendingUp, Activity, Badge } from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { api } from "../../api";
import type { DealIntelligenceReport, DealRiskSignal, RiskLevel } from "../../contracts/dealIntelligence";
import { MetricsGridSkeleton } from "../LoadingSkeleton";

type RiskFilter = "all" | RiskLevel;

function riskTone(level: RiskLevel): string {
  if (level === "high") return "bg-rose-50 border-rose-200 text-rose-700";
  if (level === "medium") return "bg-amber-50 border-amber-200 text-amber-700";
  return "bg-emerald-50 border-emerald-200 text-emerald-700";
}

export function DealIntelligencePage() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<DealIntelligenceReport | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>("all");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  async function refreshReport() {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<DealIntelligenceReport>("/api/deal-intelligence/health-report", {});
      setReport(response.data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? err?.message ?? "Unable to load report");
    } finally {
      setLoading(false);
    }
  }

  const filteredSignals = useMemo(() => {
    if (!report) return [];
    return report.risk_signals.filter((signal) => {
      const riskOk = riskFilter === "all" || signal.risk_level === riskFilter;
      const stageOk = stageFilter === "all" || (signal.stage ?? "Unknown") === stageFilter;
      return riskOk && stageOk;
    });
  }, [report, riskFilter, stageFilter]);

  const availableStages = useMemo(() => {
    if (!report) return [];
    return Array.from(new Set(report.risk_signals.map((signal) => signal.stage ?? "Unknown")));
  }, [report]);

  const stageBreakdownData = useMemo(() => {
    if (!report) return [];
    return [
      { name: "Won", value: report.stage_breakdown.closed_won, color: "#10b981" },
      { name: "Lost", value: report.stage_breakdown.closed_lost, color: "#ef4444" },
      { name: "Late Stage", value: report.stage_breakdown.late_stage, color: "#f59e0b" },
      { name: "Mid Stage", value: report.stage_breakdown.mid_stage, color: "#3b82f6" },
      { name: "Early Stage", value: report.stage_breakdown.early_stage, color: "#8b5cf6" },
    ].filter((item) => item.value > 0);
  }, [report]);

  const riskSignalsData = useMemo(() => {
    if (!report) return [];
    const grouped = report.risk_signals.reduce((acc: Record<string, number>, signal) => {
      const key = signal.signal_type;
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([name, count]) => ({
      name,
      count,
      color:
        name === "closed_lost"
          ? "#ef4444"
          : name === "stalled"
            ? "#f59e0b"
            : name === "late_stage_friction"
              ? "#f97316"
              : "#9ca3af",
    }));
  }, [report]);

  const improvementPotential = useMemo(
    () => [
      { metric: "Conversion", current: report?.impact_metrics.win_rate_percent ?? 0, potential: (report?.impact_metrics.win_rate_percent ?? 0) + (report?.impact_metrics.conversion_improvement_potential_percent ?? 0) },
      { metric: "Cycle Time", current: 100, potential: 100 - (report?.impact_metrics.cycle_time_reduction_potential_percent ?? 0) },
    ],
    [report]
  );

  const score = report?.summary.health_score ?? 0;

  return (
    <div className="space-y-6">
      <section className="ds-panel-strong motion-rise p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="ds-kicker">New Agent</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 md:text-3xl">Deal Intelligence Agent</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Real-time pipeline health monitoring with stage-based risk detection and recovery plays tailored to CRM deal status.
            </p>
          </div>
          <button
            type="button"
            className="ds-btn ds-btn-dark"
            onClick={() => void refreshReport()}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Refresh Health Report
          </button>
        </div>

        {!report && !loading && (
          <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm text-cyan-800">
            Click Refresh Health Report to pull deal stages from CRM and generate a live health assessment.
          </div>
        )}

        {loading && (
          <div className="mt-5 space-y-4">
            <div className="animate-pulse space-y-2">
              <div className="h-3 w-32 rounded-full bg-slate-200" />
              <div className="h-8 w-40 rounded-lg bg-slate-200" />
            </div>
            <MetricsGridSkeleton />
          </div>
        )}

        {error && (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div>
        )}

        {report && (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Health Score</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{score}/100</p>
              <p className="mt-1 text-xs text-slate-500">Weighted by risk and stage balance</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Win Rate</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{report.impact_metrics.win_rate_percent}%</p>
              <p className="mt-1 text-xs text-slate-500">Closed Won / (Won + Lost)</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Conversion Potential</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{report.impact_metrics.conversion_improvement_potential_percent}%</p>
              <p className="mt-1 text-xs text-slate-500">Estimated upside from suggested plays</p>
            </article>
            <article className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Cycle Time Reduction</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{report.impact_metrics.cycle_time_reduction_potential_percent}%</p>
              <p className="mt-1 text-xs text-slate-500">Estimated acceleration from de-bottlenecking</p>
            </article>
          </div>
        )}
      </section>

      {report && (
        <>
          <section className="grid gap-5 xl:grid-cols-2">
            <article className="ds-panel motion-rise p-4 md:p-5" style={{ animationDelay: "80ms" }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Stage Distribution</h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  <Gauge size={13} />
                  {report.summary.total_deals} deals
                </span>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={stageBreakdownData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name} (${value})`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {stageBreakdownData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </article>

            <article className="ds-panel motion-rise p-4 md:p-5" style={{ animationDelay: "120ms" }}>
              <h2 className="text-lg font-semibold text-slate-900">Risk Signal Distribution</h2>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={riskSignalsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0891b2" radius={[8, 8, 0, 0]}>
                      {riskSignalsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </article>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
            <article className="ds-panel motion-rise p-4 md:p-5" style={{ animationDelay: "80ms" }}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-900">Improvement Potential</h2>
              </div>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={improvementPotential}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="metric" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="current" fill="#94a3b8" name="Current" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="potential" fill="#10b981" name="With Recovery Plays" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </article>

            <article className="ds-panel motion-rise p-4 md:p-5" style={{ animationDelay: "120ms" }}>
              <h2 className="text-lg font-semibold text-slate-900">Recovery Playbook</h2>
              <div className="mt-3 space-y-3">
                {(report.recovery_plays ?? []).slice(0, 3).map((play) => (
                  <div key={play.play_id} className="rounded-xl border border-slate-200 bg-gradient-to-r from-cyan-50 to-white p-3 hover:shadow-md transition-shadow">
                    <p className="text-sm font-semibold text-slate-900">{play.title}</p>
                    <p className="mt-1 text-xs text-slate-500">{play.goal}</p>
                    <div className="mt-2 flex gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-emerald-700">
                        <TrendingUp size={12} />
                        +{play.expected_pipeline_impact.conversion_improvement_percent}% conversion
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-blue-700">
                        <Activity size={12} />
                        -{play.expected_pipeline_impact.cycle_time_reduction_percent}% cycle
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="ds-panel motion-rise p-4 md:p-5" style={{ animationDelay: "160ms" }}>
            <div className="mb-3 flex flex-wrap items-center gap-2 md:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Risk Signals & Deals</h2>
              <div className="flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs">
                  <Badge size={13} className="text-rose-600" />
                  <span className="font-medium">{report.summary.high_risk_count} High Risk</span>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs">
                  <Badge size={13} className="text-amber-600" />
                  <span className="font-medium">{report.summary.medium_risk_count} Medium Risk</span>
                </div>
                <select
                  value={riskFilter}
                  onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 transition-colors"
                >
                  <option value="all">All Risks</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={stageFilter}
                  onChange={(event) => setStageFilter(event.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:border-slate-300 transition-colors"
                >
                  <option value="all">All Stages</option>
                  {availableStages.map((stage) => (
                    <option key={stage} value={stage}>
                      {stage}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {filteredSignals.slice(0, 12).map((signal: DealRiskSignal) => (
                <article key={`${signal.deal_id}-${signal.signal_type}`} className={`rounded-xl border p-3 transition-all hover:shadow-md ${riskTone(signal.risk_level)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{signal.deal_name || signal.deal_id}</p>
                      <p className="text-xs opacity-75 mt-1">{signal.stage || "Unknown"}</p>
                    </div>
                    {signal.risk_level === "high" ? <AlertTriangle size={16} /> : <TrendingUp size={16} />}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed">{signal.detail}</p>
                  <div className="mt-2 inline-block rounded-full bg-white bg-opacity-60 px-2 py-1 text-xs font-medium">
                    {signal.signal_type.replace(/_/g, " ")}
                  </div>
                </article>
              ))}
            </div>

            {filteredSignals.length === 0 && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center text-sm text-emerald-700">
                ✓ No signals matching the selected filters. Pipeline looks healthy!
              </div>
            )}

            {report.llm_narrative && (
              <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                  <Sparkles size={14} />
                  Agent Narrative
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-cyan-900">{report.llm_narrative}</p>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
