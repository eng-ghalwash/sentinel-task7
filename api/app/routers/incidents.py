from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.deps import get_current_user
from app.mocks.seed import get_state
from app.models.schemas import Incident, PaginatedIncidents

router = APIRouter(prefix="/incidents", tags=["incidents"])


@router.get("", response_model=PaginatedIncidents)
def list_incidents(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=200),
    severity: str | None = None,
    status: str | None = None,
    _user: dict = Depends(get_current_user),
) -> PaginatedIncidents:
    items = get_state()["incidents"]
    if severity:
        items = [i for i in items if i["severity"] == severity]
    if status:
        items = [i for i in items if i["status"] == status]

    total = len(items)
    start = (page - 1) * page_size
    page_items = items[start : start + page_size]
    return PaginatedIncidents(
        items=[Incident(**i) for i in page_items],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{incident_id}", response_model=Incident)
def get_incident(incident_id: str, _user: dict = Depends(get_current_user)) -> Incident:
    for incident in get_state()["incidents"]:
        if incident["id"] == incident_id:
            return Incident(**incident)
    raise HTTPException(status_code=404, detail="Incident not found")
