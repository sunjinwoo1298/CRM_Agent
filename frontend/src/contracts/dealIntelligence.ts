import type { Deal } from "./deal";

export type RiskLevel = "high" | "medium" | "low";

export interface DealRiskSignal {
  deal_id: string;
  deal_name: string;
  stage: string | null;
  risk_level: RiskLevel;
  signal_type: "stalled" | "late_stage_friction" | "closed_lost" | "no_activity" | "healthy";
  detail: string;
}

export interface DealStageBreakdown {
  closed_won: number;
  closed_lost: number;
  late_stage: number;
  mid_stage: number;
  early_stage: number;
}

export interface DealImpactMetrics {
  win_rate_percent: number;
  loss_rate_percent: number;
  conversion_improvement_potential_percent: number;
  cycle_time_reduction_potential_percent: number;
}

export interface RecoveryPlay {
  play_id: string;
  title: string;
  goal: string;
  trigger: string;
  actions: string[];
  talking_points: string[];
  expected_pipeline_impact: {
    conversion_improvement_percent: number;
    cycle_time_reduction_percent: number;
  };
}

export interface DealIntelligenceReport {
  summary: {
    total_deals: number;
    open_deals: number;
    health_score: number;
    high_risk_count: number;
    medium_risk_count: number;
  };
  stage_breakdown: DealStageBreakdown;
  impact_metrics: DealImpactMetrics;
  risk_signals: DealRiskSignal[];
  recovery_plays: RecoveryPlay[];
  llm_narrative?: string | null;
  generated_at: string;
  source?: string;
  deals_evaluated?: number;
}

export interface DealIntelligenceRequest {
  end_user_origin_id?: string;
  external_account_id?: string;
  deals?: Deal[];
}
