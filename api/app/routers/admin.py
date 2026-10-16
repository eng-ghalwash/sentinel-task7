import secrets
from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.auth.deps import require_roles
from app.auth.security import list_users_public
from app.mocks.seed import get_state
from app.models.schemas import (
    ApiKeyCreated,
    ApiKeyRecord,
    ConfigHistoryItem,
    NotificationRoute,
    PlatformConfig,
    UserPublic,
)

router = APIRouter(prefix="/admin", tags=["admin"])


class AutonomyUpdate(BaseModel):
    autonomy_mode: str


class ThresholdUpdate(BaseModel):
    thresholds: dict[str, float]


class ApiKeyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)


class NotificationRouteCreate(BaseModel):
    name: str
    channel: str
    target: str
    min_severity: str
    enabled: bool = True


class NotificationRouteUpdate(BaseModel):
    name: str | None = None
    channel: str | None = None
    target: str | None = None
    min_severity: str | None = None
    enabled: bool | None = None


def _snapshot(state: dict) -> dict:
    return {
        "autonomy_mode": state["autonomy_mode"],
        "thresholds": dict(state["thresholds"]),
        "notification_routes": list(state["notification_routes"]),
        "api_keys": [
            {k: v for k, v in item.items() if k != "key_hash"}
            for item in state["api_keys"]
        ],
    }


def _add_history(actor: str, action: str) -> None:
    state = get_state()
    state["config_history"].insert(
        0,
        {
            "id": f"cfg-{uuid4().hex[:8]}",
            "ts": datetime.now(timezone.utc),
            "actor": actor,
            "action": action,
            "snapshot": _snapshot(state),
        },
    )
    state["config_history"] = state["config_history"][:30]


def _platform_config() -> PlatformConfig:
    state = get_state()
    return PlatformConfig(
        autonomy_mode=state["autonomy_mode"],
        thresholds=state["thresholds"],
        users=[UserPublic(**u) for u in list_users_public()],
        api_keys=[
            ApiKeyRecord(
                id=item["id"],
                name=item["name"],
                prefix=item["prefix"],
                created_at=item["created_at"],
                last_used_at=item.get("last_used_at"),
                revoked=item.get("revoked", False),
            )
            for item in state["api_keys"]
        ],
        notification_routes=[NotificationRoute(**r) for r in state["notification_routes"]],
        config_history=[ConfigHistoryItem(**h) for h in state["config_history"]],
    )


@router.get("/config", response_model=PlatformConfig)
def get_config(_user: dict = Depends(require_roles("Admin"))) -> PlatformConfig:
    return _platform_config()


@router.patch("/autonomy", response_model=PlatformConfig)
def set_autonomy(
    body: AutonomyUpdate,
    user: dict = Depends(require_roles("Admin")),
) -> PlatformConfig:
    state = get_state()
    state["autonomy_mode"] = body.autonomy_mode
    _add_history(user["username"], f"Set autonomy mode to {body.autonomy_mode}")
    return _platform_config()


@router.patch("/thresholds", response_model=PlatformConfig)
def set_thresholds(
    body: ThresholdUpdate,
    user: dict = Depends(require_roles("Admin")),
) -> PlatformConfig:
    state = get_state()
    state["thresholds"].update(body.thresholds)
    _add_history(user["username"], "Updated confidence thresholds")
    return _platform_config()


@router.post("/api-keys", response_model=ApiKeyCreated)
def create_api_key(
    body: ApiKeyCreate,
    user: dict = Depends(require_roles("Admin")),
) -> ApiKeyCreated:
    state = get_state()
    raw = f"sen_{secrets.token_urlsafe(24)}"
    record = {
        "id": f"key-{uuid4().hex[:8]}",
        "name": body.name,
        "prefix": raw[:10],
        "key_hash": raw,  # demo only; real systems store a hash
        "created_at": datetime.now(timezone.utc),
        "last_used_at": None,
        "revoked": False,
    }
    state["api_keys"].insert(0, record)
    _add_history(user["username"], f"Created API key '{body.name}'")
    return ApiKeyCreated(
        id=record["id"],
        name=record["name"],
        prefix=record["prefix"],
        key=raw,
        created_at=record["created_at"],
    )


@router.delete("/api-keys/{key_id}", response_model=PlatformConfig)
def revoke_api_key(
    key_id: str,
    user: dict = Depends(require_roles("Admin")),
) -> PlatformConfig:
    state = get_state()
    for item in state["api_keys"]:
        if item["id"] == key_id:
            item["revoked"] = True
            _add_history(user["username"], f"Revoked API key {key_id}")
            return _platform_config()
    raise HTTPException(status_code=404, detail="API key not found")


@router.post("/notification-routes", response_model=PlatformConfig)
def create_notification_route(
    body: NotificationRouteCreate,
    user: dict = Depends(require_roles("Admin")),
) -> PlatformConfig:
    state = get_state()
    state["notification_routes"].append(
        {
            "id": f"nr-{uuid4().hex[:8]}",
            "name": body.name,
            "channel": body.channel,
            "target": body.target,
            "min_severity": body.min_severity,
            "enabled": body.enabled,
        }
    )
    _add_history(user["username"], f"Added notification route '{body.name}'")
    return _platform_config()


@router.patch("/notification-routes/{route_id}", response_model=PlatformConfig)
def update_notification_route(
    route_id: str,
    body: NotificationRouteUpdate,
    user: dict = Depends(require_roles("Admin")),
) -> PlatformConfig:
    state = get_state()
    for route in state["notification_routes"]:
        if route["id"] == route_id:
            updates = body.model_dump(exclude_none=True)
            route.update(updates)
            _add_history(user["username"], f"Updated notification route {route_id}")
            return _platform_config()
    raise HTTPException(status_code=404, detail="Notification route not found")


@router.delete("/notification-routes/{route_id}", response_model=PlatformConfig)
def delete_notification_route(
    route_id: str,
    user: dict = Depends(require_roles("Admin")),
) -> PlatformConfig:
    state = get_state()
    before = len(state["notification_routes"])
    state["notification_routes"] = [
        r for r in state["notification_routes"] if r["id"] != route_id
    ]
    if len(state["notification_routes"]) == before:
        raise HTTPException(status_code=404, detail="Notification route not found")
    _add_history(user["username"], f"Deleted notification route {route_id}")
    return _platform_config()


@router.post("/config-history/{history_id}/rollback", response_model=PlatformConfig)
def rollback_config(
    history_id: str,
    user: dict = Depends(require_roles("Admin")),
) -> PlatformConfig:
    state = get_state()
    for item in state["config_history"]:
        if item["id"] == history_id:
            snap = item["snapshot"]
            state["autonomy_mode"] = snap["autonomy_mode"]
            state["thresholds"] = dict(snap["thresholds"])
            state["notification_routes"] = list(snap.get("notification_routes", []))
            _add_history(user["username"], f"Rolled back to {history_id}")
            return _platform_config()
    raise HTTPException(status_code=404, detail="History item not found")
