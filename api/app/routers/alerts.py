from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.deps import get_current_user, require_roles
from app.mocks.seed import get_state
from app.models.schemas import Alert, AlertBulkRequest, AlertBulkResult, PaginatedAlerts

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("", response_model=PaginatedAlerts)
def list_alerts(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    severity: str | None = None,
    engine: str | None = None,
    status: str | None = None,
    attack_type: str | None = None,
    src_ip: str | None = None,
    _user: dict = Depends(get_current_user),
) -> PaginatedAlerts:
    items = get_state()["alerts"]
    if severity:
        items = [a for a in items if a["severity"] == severity]
    if engine:
        items = [a for a in items if a["engine"] == engine]
    if status:
        items = [a for a in items if a["status"] == status]
    if attack_type:
        items = [a for a in items if a["attack_type"] == attack_type]
    if src_ip:
        items = [a for a in items if src_ip in a["src_ip"]]

    total = len(items)
    start = (page - 1) * page_size
    page_items = items[start : start + page_size]
    return PaginatedAlerts(
        items=[Alert(**a) for a in page_items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("/bulk", response_model=AlertBulkResult)
def bulk_alerts(
    body: AlertBulkRequest,
    _user: dict = Depends(require_roles("Admin", "Analyst")),
) -> AlertBulkResult:
    if not body.ids:
        raise HTTPException(status_code=400, detail="No alert ids provided")

    state = get_state()
    alerts = {a["id"]: a for a in state["alerts"]}
    updated = 0
    incident_id = body.incident_id

    if body.action == "mark_false_positive":
        for alert_id in body.ids:
            alert = alerts.get(alert_id)
            if not alert:
                continue
            alert["status"] = "false_positive"
            updated += 1
        return AlertBulkResult(updated=updated)

    if body.action == "merge_into_incident":
        if not incident_id:
            # create a new incident from first alert
            first = next((alerts.get(i) for i in body.ids if alerts.get(i)), None)
            if not first:
                raise HTTPException(status_code=404, detail="No matching alerts")
            incident_id = f"INC-M{len(state['incidents']) + 1000}"
            state["incidents"].insert(
                0,
                {
                    "id": incident_id,
                    "title": f"Merged {first['attack_type']} alerts",
                    "opened_at": first["ts"],
                    "src_ip": first["src_ip"],
                    "attack_family": first["attack_type"],
                    "severity": first["severity"],
                    "status": "Open",
                    "score": {
                        "base": 8.0,
                        "asset_criticality": 3.0,
                        "reputation": 2.0,
                        "recurrence": 1.0,
                        "total": 14.0,
                    },
                    "alert_ids": [],
                    "technique_ids": first.get("technique_ids", []),
                    "evidence": {"merged": True},
                    "reasoning": "Created by bulk merge from Alerts Explorer",
                    "owner": "analyst",
                    "sla_due": None,
                    "notes": ["Merged from bulk action"],
                },
            )

        incident = next((i for i in state["incidents"] if i["id"] == incident_id), None)
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")

        for alert_id in body.ids:
            alert = alerts.get(alert_id)
            if not alert:
                continue
            alert["status"] = "linked"
            alert["incident_id"] = incident_id
            if alert_id not in incident["alert_ids"]:
                incident["alert_ids"].append(alert_id)
            updated += 1
        return AlertBulkResult(updated=updated, incident_id=incident_id)

    raise HTTPException(status_code=400, detail="Unknown bulk action")


@router.get("/{alert_id}", response_model=Alert)
def get_alert(alert_id: str, _user: dict = Depends(get_current_user)) -> Alert:
    for alert in get_state()["alerts"]:
        if alert["id"] == alert_id:
            return Alert(**alert)
    raise HTTPException(status_code=404, detail="Alert not found")
