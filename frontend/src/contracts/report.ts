export type RiskLevel = "high" | "medium" | "low";

export interface DealRisk {
  deal_id: string;
  deal_name: string;
  amount: number | null;
  stage: string | null;
  last_activity: string | null;
  risk_level: RiskLevel;
  signals: string[];
}

export interface AnalysisSummary {
  total_deals: number;
  high_risk_count: number;
}

export interface PipelineAnalysisReport {
  summary: AnalysisSummary;
  high_risk_deals: DealRisk[];
  all_deals: DealRisk[];
}
