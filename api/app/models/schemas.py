from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field

Role = Literal["Admin", "Analyst", "Auditor", "Client"]
Severity = Literal["Critical", "High", "Medium", "Low"]
AutonomyMode = Literal["Autonomous", "Shadow", "Paused"]


class LoginRequest(BaseModel):
    username: str
    password: str
    totp_code: str | None = None


class TokenResponse(BaseModel):
    access_token: str | None = None
    token_type: str = "bearer"
    user: "UserPublic | None" = None
    requires_totp: bool = False


class UserPublic(BaseModel):
    id: str
    username: str
    full_name: str
    role: Role
    totp_enabled: bool = False


class TotpSetupResponse(BaseModel):
    secret: str
    otpauth_url: str
    qr_base64: str


class TotpCodeRequest(BaseModel):
    code: str


class TotpStatus(BaseModel):
    enabled: bool


class ApiKeyRecord(BaseModel):
    id: str
    name: str
    prefix: str
    created_at: datetime
    last_used_at: datetime | None = None
    revoked: bool = False


class ApiKeyCreated(BaseModel):
    id: str
    name: str
    prefix: str
    key: str
    created_at: datetime


class NotificationRoute(BaseModel):
    id: str
    name: str
    channel: Literal["telegram", "email", "webhook"]
    target: str
    min_severity: Severity
    enabled: bool = True


class ConfigHistoryItem(BaseModel):
    id: str
    ts: datetime
    actor: str
    action: str
    snapshot: dict[str, Any]


class Alert(BaseModel):
    id: str
    ts: datetime
    source: str
    engine: str
    src_ip: str
    attack_type: str
    severity: Severity
    confidence: float
    status: str
    incident_id: str | None = None
    technique_ids: list[str] = Field(default_factory=list)
    raw_event: dict[str, Any] = Field(default_factory=dict)
    model_probabilities: dict[str, float] = Field(default_factory=dict)
    top_features: list[str] = Field(default_factory=list)


class ScoreBreakdown(BaseModel):
    base: float
    asset_criticality: float
    reputation: float
    recurrence: float
    total: float


class Incident(BaseModel):
    id: str
    title: str
    opened_at: datetime
    src_ip: str
    attack_family: str
    severity: Severity
    status: str
    score: ScoreBreakdown
    alert_ids: list[str] = Field(default_factory=list)
    technique_ids: list[str] = Field(default_factory=list)
    evidence: dict[str, Any] = Field(default_factory=dict)
    reasoning: str = ""
    owner: str = "agent"
    sla_due: datetime | None = None
    notes: list[str] = Field(default_factory=list)


class Case(BaseModel):
    id: str
    title: str
    severity: Severity
    status: str
    owner: str
    incident_ids: list[str] = Field(default_factory=list)
    created_at: datetime
    sla_due: datetime | None = None
    notes: list[str] = Field(default_factory=list)
    root_cause: str | None = None
    lessons_learned: str | None = None
    closed_at: datetime | None = None


class AlertBulkRequest(BaseModel):
    ids: list[str]
    action: Literal["mark_false_positive", "merge_into_incident"]
    incident_id: str | None = None


class AlertBulkResult(BaseModel):
    updated: int
    incident_id: str | None = None


class Decision(BaseModel):
    id: str
    incident_id: str
    verdict: str
    confidence: float
    gate: str
    reasoning: str
    tools_used: list[str] = Field(default_factory=list)
    ts: datetime


class ActionRecord(BaseModel):
    id: str
    incident_id: str
    tool: str
    target: str
    result: str
    verification: str
    expires_at: datetime | None = None
    ts: datetime


class PaginatedAlerts(BaseModel):
    items: list[Alert]
    total: int
    page: int
    page_size: int


class PaginatedIncidents(BaseModel):
    items: list[Incident]
    total: int
    page: int
    page_size: int


class StatsOverview(BaseModel):
    open_incidents_by_severity: dict[str, int]
    alerts_24h: int
    autonomous_percent: float
    mttd_seconds: float
    mttr_seconds: float
    active_blocks: int
    agent_accuracy: float
    platform_health: str
    alerts_per_hour: list[dict[str, Any]]
    attack_type_distribution: list[dict[str, Any]]
    top_ips: list[dict[str, Any]]
    top_endpoints: list[dict[str, Any]]
    engine_contribution: list[dict[str, Any]]
    sla_at_risk: list[dict[str, Any]]
    autonomy_mode: AutonomyMode


class HealthStatus(BaseModel):
    status: str
    services: list[dict[str, Any]]
    quotas: list[dict[str, Any]]


class SearchResult(BaseModel):
    type: str
    id: str
    title: str
    href: str


class PlatformConfig(BaseModel):
    autonomy_mode: AutonomyMode
    thresholds: dict[str, float]
    users: list[UserPublic]
    api_keys: list[ApiKeyRecord] = Field(default_factory=list)
    notification_routes: list[NotificationRoute] = Field(default_factory=list)
    config_history: list[ConfigHistoryItem] = Field(default_factory=list)
