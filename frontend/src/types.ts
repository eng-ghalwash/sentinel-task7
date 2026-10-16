export type Role = 'Admin' | 'Analyst' | 'Auditor' | 'Client'
export type Severity = 'Critical' | 'High' | 'Medium' | 'Low'
export type AutonomyMode = 'Autonomous' | 'Shadow' | 'Paused'

export interface User {
  id: string
  username: string
  full_name: string
  role: Role
  totp_enabled?: boolean
}

export interface Alert {
  id: string
  ts: string
  source: string
  engine: string
  src_ip: string
  attack_type: string
  severity: Severity
  confidence: number
  status: string
  incident_id: string | null
  technique_ids: string[]
  raw_event: Record<string, unknown>
  model_probabilities: Record<string, number>
  top_features: string[]
}

export interface Incident {
  id: string
  title: string
  opened_at: string
  src_ip: string
  attack_family: string
  severity: Severity
  status: string
  score: {
    base: number
    asset_criticality: number
    reputation: number
    recurrence: number
    total: number
  }
  alert_ids: string[]
  technique_ids: string[]
  evidence: Record<string, unknown>
  reasoning: string
  owner: string
  sla_due: string | null
  notes: string[]
}

export interface CaseItem {
  id: string
  title: string
  severity: Severity
  status: string
  owner: string
  incident_ids: string[]
  created_at: string
  sla_due: string | null
  notes: string[]
  root_cause?: string | null
  lessons_learned?: string | null
  closed_at?: string | null
}

export interface StatsOverview {
  open_incidents_by_severity: Record<string, number>
  alerts_24h: number
  autonomous_percent: number
  mttd_seconds: number
  mttr_seconds: number
  active_blocks: number
  agent_accuracy: number
  platform_health: string
  alerts_per_hour: Array<Record<string, string | number>>
  attack_type_distribution: Array<{ name: string; value: number }>
  top_ips: Array<{ ip: string; count: number }>
  top_endpoints: Array<{ endpoint: string; count: number }>
  engine_contribution: Array<{ engine: string; count: number }>
  sla_at_risk: Array<{ id: string; title: string; severity: Severity; sla_due: string }>
  autonomy_mode: AutonomyMode
}

export interface LiveEvent {
  type: 'alert' | 'incident' | 'action'
  ts: string
  data: Record<string, string>
}

export interface SearchResult {
  type: string
  id: string
  title: string
  href: string
}

export interface HealthStatus {
  status: string
  services: Array<{ name: string; status: string; latency_ms: number }>
  quotas: Array<{ name: string; used: number; limit: number; unit: string }>
}

export interface ApiKeyRecord {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked: boolean
}

export interface NotificationRoute {
  id: string
  name: string
  channel: 'telegram' | 'email' | 'webhook'
  target: string
  min_severity: Severity
  enabled: boolean
}

export interface ConfigHistoryItem {
  id: string
  ts: string
  actor: string
  action: string
  snapshot: Record<string, unknown>
}

export interface PlatformConfig {
  autonomy_mode: AutonomyMode
  thresholds: Record<string, number>
  users: User[]
  api_keys: ApiKeyRecord[]
  notification_routes: NotificationRoute[]
  config_history: ConfigHistoryItem[]
}
