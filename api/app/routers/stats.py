from collections import Counter
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user
from app.mocks.seed import get_state
from app.models.schemas import StatsOverview

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/overview", response_model=StatsOverview)
def overview(_user: dict = Depends(get_current_user)) -> StatsOverview:
    state = get_state()
    now = datetime.now(timezone.utc)
    alerts = state["alerts"]
    incidents = state["incidents"]
    actions = state["actions"]

    open_by_sev = Counter(
        i["severity"] for i in incidents if i["status"] in ("Open", "Investigating")
    )
    alerts_24h = sum(1 for a in alerts if a["ts"] >= now - timedelta(hours=24))

    # Alerts per hour for last 24h
    buckets: dict[str, Counter] = {}
    for hour_offset in range(24):
        key = (now - timedelta(hours=23 - hour_offset)).strftime("%H:00")
        buckets[key] = Counter()
    for alert in alerts:
        if alert["ts"] >= now - timedelta(hours=24):
            key = alert["ts"].strftime("%H:00")
            if key in buckets:
                buckets[key][alert["severity"]] += 1

    alerts_per_hour = [
        {
            "hour": hour,
            "Critical": counts["Critical"],
            "High": counts["High"],
            "Medium": counts["Medium"],
            "Low": counts["Low"],
            "total": sum(counts.values()),
        }
        for hour, counts in buckets.items()
    ]

    attack_counts = Counter(a["attack_type"] for a in alerts[:200])
    ip_counts = Counter(a["src_ip"] for a in alerts[:200])
    endpoint_counts = Counter(
        a["raw_event"].get("url", "/") for a in alerts[:200]
    )
    engine_counts = Counter(a["engine"] for a in alerts[:200])

    sla_at_risk = []
    for incident in incidents:
        due = incident.get("sla_due")
        if due and due < now + timedelta(hours=1) and incident["status"] not in (
            "Resolved",
            "Contained",
        ):
            sla_at_risk.append(
                {
                    "id": incident["id"],
                    "title": incident["title"],
                    "severity": incident["severity"],
                    "sla_due": due.isoformat(),
                }
            )

    return StatsOverview(
        open_incidents_by_severity={
            "Critical": open_by_sev["Critical"],
            "High": open_by_sev["High"],
            "Medium": open_by_sev["Medium"],
            "Low": open_by_sev["Low"],
        },
        alerts_24h=alerts_24h,
        autonomous_percent=78.5,
        mttd_seconds=8.2,
        mttr_seconds=42.0,
        active_blocks=len(actions),
        agent_accuracy=0.91,
        platform_health="healthy",
        alerts_per_hour=alerts_per_hour,
        attack_type_distribution=[
            {"name": k, "value": v} for k, v in attack_counts.most_common(8)
        ],
        top_ips=[{"ip": k, "count": v} for k, v in ip_counts.most_common(10)],
        top_endpoints=[
            {"endpoint": k, "count": v} for k, v in endpoint_counts.most_common(8)
        ],
        engine_contribution=[
            {"engine": k, "count": v} for k, v in engine_counts.most_common()
        ],
        sla_at_risk=sla_at_risk[:8],
        autonomy_mode=state["autonomy_mode"],
    )
