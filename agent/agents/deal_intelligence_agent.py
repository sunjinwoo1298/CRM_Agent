from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from common.groq_client import GroqClient


def _safe_pct(value: Any) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def _build_recovery_plays(health_report: dict[str, Any]) -> list[dict[str, Any]]:
    summary = health_report.get("summary") or {}
    impact = health_report.get("impact_metrics") or {}
    risk_signals = health_report.get("risk_signals") or []

    high_risk = int(summary.get("high_risk_count") or 0)
    medium_risk = int(summary.get("medium_risk_count") or 0)
    win_rate = _safe_pct(impact.get("win_rate_percent"))
    conversion_uplift = _safe_pct(impact.get("conversion_improvement_potential_percent"))

    plays: list[dict[str, Any]] = []

    if high_risk > 0:
      plays.append(
          {
              "play_id": "recover-high-risk-late-stage",
              "title": "Late-Stage Recovery Sprint",
              "goal": "Pull stalled late-stage deals back into active negotiation this week.",
              "trigger": f"{high_risk} high-risk deals flagged",
              "actions": [
                  "Run 24-hour stakeholder map refresh for each high-risk deal.",
                  "Send value recap with quantified ROI and implementation timeline.",
                  "Schedule executive-to-executive checkpoint for blocked deals.",
              ],
              "talking_points": [
                  "We can de-risk rollout by agreeing on a phased launch with clear ownership.",
                  "The quickest path to value is starting with your top revenue workflow first.",
                  "Let's align success criteria now so legal and procurement reviews move faster.",
              ],
              "expected_pipeline_impact": {
                  "conversion_improvement_percent": max(6, min(18, int(conversion_uplift))),
                  "cycle_time_reduction_percent": 8,
              },
          }
      )

    if medium_risk > 0:
      plays.append(
          {
              "play_id": "mid-stage-velocity",
              "title": "Mid-Stage Velocity Boost",
              "goal": "Reduce stage dwell time for qualification and presentation stages.",
              "trigger": f"{medium_risk} medium-risk deals detected",
              "actions": [
                  "Inject a next-step CTA into every open thread with a 3-business-day deadline.",
                  "Standardize discovery gap checklist before demos.",
                  "Auto-create follow-up tasks when no engagement in 5+ days.",
              ],
              "talking_points": [
                  "To keep momentum, can we lock the decision timeline before Friday?",
                  "Which blocker would stop this from reaching legal this month?",
                  "Would it help if we map your technical and business approval in one call?",
              ],
              "expected_pipeline_impact": {
                  "conversion_improvement_percent": max(4, min(12, int(conversion_uplift * 0.7))),
                  "cycle_time_reduction_percent": 12,
              },
          }
      )

    if not plays:
      plays.append(
          {
              "play_id": "maintain-healthy-pipeline",
              "title": "Healthy Pipeline Maintenance",
              "goal": "Protect current win momentum and prevent regression.",
              "trigger": "Low aggregate risk profile",
              "actions": [
                  "Continue weekly deal inspection for top opportunities.",
                  "Track no-activity signals and trigger reminders.",
                  "Capture objections in CRM notes to improve coaching loops.",
              ],
              "talking_points": [
                  "What would make this decision easier for your team this week?",
                  "Can we confirm commercial and technical sign-off steps now?",
              ],
              "expected_pipeline_impact": {
                  "conversion_improvement_percent": 3,
                  "cycle_time_reduction_percent": 4,
              },
          }
      )

    if win_rate < 35:
        plays.append(
            {
                "play_id": "closed-lost-feedback-loop",
                "title": "Closed-Lost Feedback Loop",
                "goal": "Improve quality of actions by converting loss reasons into playbook updates.",
                "trigger": f"Win rate at {win_rate:.1f}%",
                "actions": [
                    "Tag top 3 loss reasons in CRM and enforce mandatory reason field.",
                    "Run objection handling coaching on pricing, timeline, and migration concerns.",
                    "Refresh qualification rubric with disqualification criteria.",
                ],
                "talking_points": [
                    "What outcome did the selected option make easier for your team?",
                    "Which evaluation criterion did we miss in your buying process?",
                ],
                "expected_pipeline_impact": {
                    "conversion_improvement_percent": 7,
                    "cycle_time_reduction_percent": 5,
                },
            }
        )

    # Include a compact adaptive summary from most severe signals.
    severe_signals = [s for s in risk_signals if (s or {}).get("risk_level") in {"high", "medium"}]
    top_signals = severe_signals[:5]
    if top_signals:
        plays.append(
            {
                "play_id": "signal-adaptation",
                "title": "Engagement Signal Adaptation",
                "goal": "Adapt next actions to current engagement posture.",
                "trigger": "Behavioral risk signals detected",
                "actions": [
                    "Prioritize high-risk deals in daily standup until status changes.",
                    "Switch messaging to objection-resolution mode for stalled opportunities.",
                    "Escalate to leadership sponsor when late-stage inactivity exceeds 7 days.",
                ],
                "talking_points": [
                    "I noticed momentum slowed after the last step; what changed internally?",
                    "If timing is the blocker, we can structure a phased commercial model.",
                ],
                "signal_examples": top_signals,
                "expected_pipeline_impact": {
                    "conversion_improvement_percent": 5,
                    "cycle_time_reduction_percent": 6,
                },
            }
        )

    return plays


def _llm_summary(health_report: dict[str, Any], plays: list[dict[str, Any]]) -> str | None:
    try:
        client = GroqClient()
        prompt = (
            "Create a concise CRM pipeline health narrative in 5-7 bullet lines. "
            "Cover: risk hotspots, conversion impact, cycle time actions, and sales talking points. "
            f"Health report: {health_report}. Recovery plays: {plays[:3]}"
        )
        result = client.call_fast(
            [
                {
                    "role": "system",
                    "content": "You are a revenue operations analyst. Be precise, actionable, and CRM-grounded.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        return result.strip()
    except Exception:
        return None


def build_deal_intelligence_report(*, deals: list[dict[str, Any]], health_report: dict[str, Any]) -> dict[str, Any]:
    plays = _build_recovery_plays(health_report)
    llm_narrative = _llm_summary(health_report, plays)

    return {
        **health_report,
        "recovery_plays": plays,
        "adaptation_summary": {
            "high_risk_deals": int((health_report.get("summary") or {}).get("high_risk_count") or 0),
            "medium_risk_deals": int((health_report.get("summary") or {}).get("medium_risk_count") or 0),
            "recommended_motion": "daily_triage" if plays and plays[0].get("play_id") != "maintain-healthy-pipeline" else "weekly_maintenance",
        },
        "llm_narrative": llm_narrative,
        "source": "deal_intelligence_agent",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "deals_evaluated": len(deals),
    }
