import axios from "axios";
import type { Request, Response } from "express";
import { Router } from "express";
import type { Deal } from "../contracts/deal";
import { CrmManager } from "../crm/CrmManager";
import { MergeProvider } from "../crm/providers/MergeProvider";
import { getAccountToken } from "../store/accountTokens";
import { requireAuth } from "./auth";

export const dealIntelligenceRouter = Router();

type RiskLevel = "high" | "medium" | "low";

type DealRiskSignal = {
  deal_id: string;
  deal_name: string;
  stage: string | null;
  risk_level: RiskLevel;
  signal_type: "stalled" | "late_stage_friction" | "closed_lost" | "no_activity" | "healthy";
  detail: string;
};

type StageBreakdown = {
  closed_won: number;
  closed_lost: number;
  late_stage: number;
  mid_stage: number;
  early_stage: number;
};

type PipelineImpact = {
  win_rate_percent: number;
  loss_rate_percent: number;
  conversion_improvement_potential_percent: number;
  cycle_time_reduction_potential_percent: number;
};

type PipelineHealthReport = {
  summary: {
    total_deals: number;
    open_deals: number;
    health_score: number;
    high_risk_count: number;
    medium_risk_count: number;
  };
  stage_breakdown: StageBreakdown;
  impact_metrics: PipelineImpact;
  risk_signals: DealRiskSignal[];
  generated_at: string;
};

function extractUpstreamError(responseData: unknown): string {
  if (typeof responseData === "string") {
    return responseData.trim();
  }

  if (responseData && typeof responseData === "object") {
    const data = responseData as {
      error?: unknown;
      detail?: unknown;
      message?: unknown;
      non_field_errors?: unknown;
    };

    if (typeof data.error === "string" && data.error.trim()) {
      return data.error.trim();
    }
    if (typeof data.detail === "string" && data.detail.trim()) {
      return data.detail.trim();
    }
    if (typeof data.message === "string" && data.message.trim()) {
      return data.message.trim();
    }
    if (Array.isArray(data.non_field_errors)) {
      const merged = data.non_field_errors
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
        .join("; ");
      if (merged) {
        return merged;
      }
    }
  }

  return "";
}

function buildCrmManager() {
  const mergeApiKey = process.env.MERGE_API_KEY;
  if (!mergeApiKey) {
    throw new Error("MERGE_API_KEY not set");
  }

  return new CrmManager({
    merge: new MergeProvider({ apiKey: mergeApiKey }),
  });
}

function normalizeStage(stage: string | null): string {
  return String(stage ?? "").trim().toLowerCase();
}

function parseLastActivity(lastActivity: string | null): Date | null {
  if (!lastActivity) {
    return null;
  }
  const parsed = new Date(lastActivity);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

function classifyStage(stage: string | null): keyof StageBreakdown {
  const s = normalizeStage(stage);
  if (s === "closed won") {
    return "closed_won";
  }
  if (s === "closed lost") {
    return "closed_lost";
  }
  if (["contract sent", "decision maker bought-in", "negotiation", "proposal"].includes(s)) {
    return "late_stage";
  }
  if (["presentation scheduled", "qualified to buy", "appointment scheduled"].includes(s)) {
    return "mid_stage";
  }
  return "early_stage";
}

function analyzeDealRiskSignals(deals: Deal[]): DealRiskSignal[] {
  const now = Date.now();

  return deals.map((deal) => {
    const stage = normalizeStage(deal.stage);
    const activity = parseLastActivity(deal.last_activity);

    if (stage === "closed lost") {
      return {
        deal_id: deal.id,
        deal_name: deal.name,
        stage: deal.stage,
        risk_level: "high",
        signal_type: "closed_lost",
        detail: "Deal marked Closed Lost; review objection pattern and handoff timing.",
      };
    }

    if (!activity) {
      return {
        deal_id: deal.id,
        deal_name: deal.name,
        stage: deal.stage,
        risk_level: stage === "contract sent" || stage === "decision maker bought-in" ? "high" : "medium",
        signal_type: "no_activity",
        detail: "No recent activity recorded in CRM timeline.",
      };
    }

    const days = Math.floor((now - activity.getTime()) / (24 * 60 * 60 * 1000));

    if (["contract sent", "decision maker bought-in"].includes(stage) && days >= 7) {
      return {
        deal_id: deal.id,
        deal_name: deal.name,
        stage: deal.stage,
        risk_level: "high",
        signal_type: "late_stage_friction",
        detail: `Late-stage inactivity detected (${days} days since touchpoint).`,
      };
    }

    if (["presentation scheduled", "qualified to buy", "appointment scheduled"].includes(stage) && days >= 10) {
      return {
        deal_id: deal.id,
        deal_name: deal.name,
        stage: deal.stage,
        risk_level: "medium",
        signal_type: "stalled",
        detail: `Mid-stage stagnation (${days} days without update).`,
      };
    }

    return {
      deal_id: deal.id,
      deal_name: deal.name,
      stage: deal.stage,
      risk_level: "low",
      signal_type: "healthy",
      detail: "Deal progression appears healthy based on stage and activity.",
    };
  });
}

function computeHealthReport(deals: Deal[]): PipelineHealthReport {
  const stageBreakdown: StageBreakdown = {
    closed_won: 0,
    closed_lost: 0,
    late_stage: 0,
    mid_stage: 0,
    early_stage: 0,
  };

  for (const deal of deals) {
    const bucket = classifyStage(deal.stage);
    stageBreakdown[bucket] += 1;
  }

  const openDeals = Math.max(0, deals.length - stageBreakdown.closed_won - stageBreakdown.closed_lost);
  const closedDeals = stageBreakdown.closed_won + stageBreakdown.closed_lost;
  const winRate = closedDeals > 0 ? (stageBreakdown.closed_won / closedDeals) * 100 : 0;
  const lossRate = closedDeals > 0 ? (stageBreakdown.closed_lost / closedDeals) * 100 : 0;

  const riskSignals = analyzeDealRiskSignals(deals);
  const highRiskCount = riskSignals.filter((item) => item.risk_level === "high").length;
  const mediumRiskCount = riskSignals.filter((item) => item.risk_level === "medium").length;

  const highRiskRatio = deals.length ? highRiskCount / deals.length : 0;
  const mediumRiskRatio = deals.length ? mediumRiskCount / deals.length : 0;
  const lateStageRatio = openDeals > 0 ? stageBreakdown.late_stage / openDeals : 0;

  const healthScoreRaw =
    100 - lossRate * 0.55 - highRiskRatio * 45 - mediumRiskRatio * 18 + lateStageRatio * 8;
  const healthScore = Math.max(0, Math.min(100, Math.round(healthScoreRaw)));

  const conversionImprovementPotential = Math.max(0, Math.round(highRiskRatio * 22 + mediumRiskRatio * 12));
  const cycleReductionPotential = Math.max(0, Math.round((stageBreakdown.mid_stage / Math.max(openDeals, 1)) * 18));

  return {
    summary: {
      total_deals: deals.length,
      open_deals: openDeals,
      health_score: healthScore,
      high_risk_count: highRiskCount,
      medium_risk_count: mediumRiskCount,
    },
    stage_breakdown: stageBreakdown,
    impact_metrics: {
      win_rate_percent: Number(winRate.toFixed(1)),
      loss_rate_percent: Number(lossRate.toFixed(1)),
      conversion_improvement_potential_percent: conversionImprovementPotential,
      cycle_time_reduction_potential_percent: cycleReductionPotential,
    },
    risk_signals: riskSignals,
    generated_at: new Date().toISOString(),
  };
}

async function fetchDealsForUser(
  endUserOriginId: string,
  externalAccountId?: string
): Promise<Deal[]> {
  const accountToken = await getAccountToken(endUserOriginId, externalAccountId);
  if (!accountToken) {
    throw Object.assign(
      new Error(
        "No account_token stored for this end_user_origin_id. Connect CRM via Merge Link first."
      ),
      { status: 400 }
    );
  }

  const providerName = process.env.CRM_PROVIDER ?? "merge";
  const crm = buildCrmManager().getProvider(providerName);
  return crm.listDeals({ accountToken });
}

dealIntelligenceRouter.post("/health-report", requireAuth, async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const { end_user_origin_id, external_account_id, deals } = req.body ?? {};
    const resolvedOriginId = authUser?.userid ?? end_user_origin_id;

    let dealRows: Deal[] = [];
    if (Array.isArray(deals) && deals.length > 0) {
      dealRows = deals as Deal[];
    } else {
      if (!resolvedOriginId) {
        return res.status(400).json({ error: "end_user_origin_id is required" });
      }

      dealRows = await fetchDealsForUser(
        String(resolvedOriginId),
        typeof external_account_id === "string" && external_account_id.trim()
          ? external_account_id.trim()
          : undefined
      );
    }

    const localReport = computeHealthReport(dealRows);
    const agentBaseUrl = process.env.AGENT_BASE_URL ?? "http://localhost:8000";

    try {
      const agentRes = await axios.post(
        `${agentBaseUrl.replace(/\/+$/, "")}/agent/deal-intelligence/report`,
        {
          deals: dealRows,
          health_report: localReport,
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 15000,
        }
      );
      return res.json(agentRes.data);
    } catch {
      return res.json({
        ...localReport,
        recovery_plays: [],
        source: "local_fallback",
      });
    }
  } catch (err: any) {
    const status = err?.status ?? err?.response?.status ?? 500;
    const responseData = err?.response?.data;
    const message =
      extractUpstreamError(responseData) ||
      err?.message ||
      err?.response?.statusText ||
      `Upstream request failed (${status})`;
    return res.status(status).json({ error: message });
  }
});
