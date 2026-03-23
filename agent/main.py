from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal, Optional

from dateutil.parser import isoparse
from fastapi import FastAPI
from pydantic import BaseModel


class Deal(BaseModel):
    id: str
    name: str
    amount: Optional[float] = None
    stage: Optional[str] = None
    last_activity: Optional[str] = None


RiskLevel = Literal["high", "medium", "low"]


class DealRisk(BaseModel):
    deal_id: str
    deal_name: str
    amount: Optional[float] = None
    stage: Optional[str] = None
    last_activity: Optional[str] = None
    risk_level: RiskLevel
    signals: list[str]


class AnalysisSummary(BaseModel):
    total_deals: int
    high_risk_count: int


class PipelineAnalysisReport(BaseModel):
    summary: AnalysisSummary
    high_risk_deals: list[DealRisk]
    all_deals: list[DealRisk]


app = FastAPI(title="CRM Agent", version="0.1.0")


def _parse_last_activity(last_activity: Optional[str]) -> Optional[datetime]:
    if not last_activity:
        return None
    try:
        dt = isoparse(last_activity)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _risk_signals(deal: Deal, now: datetime) -> DealRisk:
    signals: list[str] = []

    last_dt = _parse_last_activity(deal.last_activity)
    if last_dt is None:
        signals.append("No recorded last activity")
    else:
        days = (now - last_dt).days
        if days >= 21:
            signals.append(f"No activity for {days} days")
        elif days >= 14:
            signals.append(f"Low activity: last touched {days} days ago")

    stage = (deal.stage or "").lower()
    if stage in {"proposal", "negotiation", "contract", "legal"}:
        if last_dt is None or (now - last_dt) >= timedelta(days=14):
            signals.append("Late-stage deal with low activity")

    if deal.amount is not None and deal.amount <= 0:
        signals.append("Non-positive amount")

    # Placeholder for LLM:
    # Here you would call an LLM (e.g., OpenAI) with the deals context and return
    # structured signals. This deterministic logic keeps the API stable for now.

    if any(s.startswith("No activity for") for s in signals) or "Late-stage deal with low activity" in signals:
        risk_level: RiskLevel = "high"
    elif len(signals) >= 1:
        risk_level = "medium"
    else:
        risk_level = "low"

    return DealRisk(
        deal_id=deal.id,
        deal_name=deal.name,
        amount=deal.amount,
        stage=deal.stage,
        last_activity=deal.last_activity,
        risk_level=risk_level,
        signals=signals,
    )


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/agent/analyze", response_model=PipelineAnalysisReport)
def analyze_pipeline(deals: list[Deal]):
    now = datetime.now(timezone.utc)

    risks = [_risk_signals(d, now) for d in deals]
    high = [r for r in risks if r.risk_level == "high"]

    return PipelineAnalysisReport(
        summary=AnalysisSummary(total_deals=len(deals), high_risk_count=len(high)),
        high_risk_deals=high,
        all_deals=risks,
    )
