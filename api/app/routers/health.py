from fastapi import APIRouter, Depends

from app.auth.deps import get_current_user
from app.models.schemas import HealthStatus

router = APIRouter(prefix="/health", tags=["health"])


@router.get("", response_model=HealthStatus)
def platform_health(_user: dict = Depends(get_current_user)) -> HealthStatus:
    return HealthStatus(
        status="healthy",
        services=[
            {"name": "api", "status": "up", "latency_ms": 12},
            {"name": "redis (mock)", "status": "up", "latency_ms": 3},
            {"name": "mongo (mock)", "status": "up", "latency_ms": 8},
            {"name": "ml-service (mock)", "status": "up", "latency_ms": 45},
            {"name": "agent (mock)", "status": "up", "latency_ms": 120},
            {"name": "executor (mock)", "status": "up", "latency_ms": 30},
        ],
        quotas=[
            {"name": "VirusTotal", "used": 42, "limit": 500, "unit": "day"},
            {"name": "AbuseIPDB", "used": 18, "limit": 1000, "unit": "day"},
        ],
    )


@router.get("/live")
def live() -> dict:
    """Unauthenticated liveness probe for Docker."""
    return {"status": "ok"}
