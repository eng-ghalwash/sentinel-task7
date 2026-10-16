"""Deterministic mock data so the dashboard works before other services exist."""

from __future__ import annotations

import hashlib
import random
from datetime import datetime, timedelta, timezone
from typing import Any

ATTACK_TYPES = [
    "BruteForce",
    "DDoS",
    "DoS",
    "WebAttack",
    "Infiltration",
    "Bot",
    "Scanning",
]
ENGINES = ["ml", "rate", "rules", "signature"]
SOURCES = ["network", "web", "haproxy", "auth"]
SEVERITIES = ["Critical", "High", "Medium", "Low"]
ENDPOINTS = [
    "/login",
    "/api/search",
    "/upload",
    "/admin",
    "/comments",
    "/api/users",
]
COUNTRIES = [
    ("US", 37.77, -122.42),
    ("RU", 55.75, 37.62),
    ("CN", 39.90, 116.40),
    ("DE", 52.52, 13.40),
    ("BR", -23.55, -46.63),
    ("EG", 30.04, 31.24),
    ("IN", 28.61, 77.20),
]

_state: dict[str, Any] = {
    "alerts": [],
    "incidents": [],
    "cases": [],
    "actions": [],
    "decisions": [],
    "autonomy_mode": "Autonomous",
    "thresholds": {
        "g1_confidence": 0.60,
        "g2_confidence": 0.80,
        "g3_confidence": 0.90,
    },
    "api_keys": [],
    "notification_routes": [
        {
            "id": "nr-1",
            "name": "Critical Telegram",
            "channel": "telegram",
            "target": "@sentinel_soc",
            "min_severity": "Critical",
            "enabled": True,
        },
        {
            "id": "nr-2",
            "name": "High Email",
            "channel": "email",
            "target": "soc@skyline.example",
            "min_severity": "High",
            "enabled": True,
        },
    ],
    "config_history": [],
}


def _rng(seed: str = "sentinel-task7") -> random.Random:
    digest = int(hashlib.sha256(seed.encode()).hexdigest()[:16], 16)
    return random.Random(digest)


def _ip(rng: random.Random) -> str:
    return f"{rng.randint(1, 223)}.{rng.randint(0, 255)}.{rng.randint(0, 255)}.{rng.randint(1, 254)}"


def build_seed(alert_count: int = 500) -> None:
    rng = _rng()
    now = datetime.now(timezone.utc)
    alerts: list[dict] = []
    incidents: list[dict] = []
    cases: list[dict] = []
    actions: list[dict] = []
    decisions: list[dict] = []

    # Build incidents first, then attach alerts
    for i in range(40):
        attack = rng.choice(ATTACK_TYPES)
        severity = SEVERITIES[min(i % 4, 3)] if i < 8 else rng.choice(SEVERITIES)
        opened = now - timedelta(hours=rng.randint(1, 72), minutes=rng.randint(0, 59))
        src_ip = _ip(rng)
        incident_id = f"INC-{1000 + i}"
        country = rng.choice(COUNTRIES)
        score_base = {"Critical": 18, "High": 12, "Medium": 7, "Low": 3}[severity]
        incident = {
            "id": incident_id,
            "title": f"{attack} from {src_ip}",
            "opened_at": opened,
            "src_ip": src_ip,
            "attack_family": attack,
            "severity": severity,
            "status": rng.choice(["Open", "Investigating", "Contained", "Resolved"]),
            "score": {
                "base": float(score_base),
                "asset_criticality": float(rng.randint(1, 5)),
                "reputation": float(rng.randint(0, 5)),
                "recurrence": float(rng.randint(0, 3)),
                "total": float(score_base + rng.randint(1, 8)),
            },
            "alert_ids": [],
            "technique_ids": [f"T{1000 + rng.randint(0, 99)}"],
            "evidence": {
                "geo": {
                    "country": country[0],
                    "lat": country[1],
                    "lon": country[2],
                },
                "reputation": rng.randint(0, 100),
                "vt_malicious": rng.randint(0, 12),
            },
            "reasoning": (
                f"Multiple {attack} signals from {src_ip}. "
                "Evidence supports true_positive with medium-high confidence."
            ),
            "owner": rng.choice(["agent", "analyst"]),
            "sla_due": opened + timedelta(hours=4),
            "notes": [],
        }
        incidents.append(incident)

        decision = {
            "id": f"DEC-{1000 + i}",
            "incident_id": incident_id,
            "verdict": rng.choice(["true_positive", "false_positive", "uncertain"]),
            "confidence": round(rng.uniform(0.55, 0.98), 2),
            "gate": rng.choice(["G0", "G1", "G2", "G3"]),
            "reasoning": incident["reasoning"],
            "tools_used": ["lookup_ip", "get_history"],
            "ts": opened + timedelta(minutes=2),
        }
        decisions.append(decision)

        if severity in ("Critical", "High", "Medium"):
            actions.append(
                {
                    "id": f"ACT-{1000 + i}",
                    "incident_id": incident_id,
                    "tool": "block_ip",
                    "target": src_ip,
                    "result": "success",
                    "verification": "confirmed",
                    "expires_at": now + timedelta(hours=rng.randint(1, 24)),
                    "ts": opened + timedelta(minutes=3),
                }
            )

        if severity != "Low":
            cases.append(
                {
                    "id": f"CASE-{1000 + i}",
                    "title": incident["title"],
                    "severity": severity,
                    "status": rng.choice(
                        ["New", "Triaged", "Contained", "Investigating", "Resolved"]
                    ),
                    "owner": incident["owner"],
                    "incident_ids": [incident_id],
                    "created_at": opened,
                    "sla_due": incident["sla_due"],
                    "notes": ["Opened automatically by correlator"],
                }
            )

    for i in range(alert_count):
        incident = incidents[i % len(incidents)]
        attack = incident["attack_family"]
        engine = rng.choice(ENGINES)
        ts = now - timedelta(minutes=rng.randint(1, 60 * 48))
        alert_id = f"ALT-{10000 + i}"
        probs = {a: round(rng.uniform(0.01, 0.2), 3) for a in ATTACK_TYPES}
        probs[attack] = round(rng.uniform(0.55, 0.95), 3)
        alert = {
            "id": alert_id,
            "ts": ts,
            "source": rng.choice(SOURCES),
            "engine": engine,
            "src_ip": incident["src_ip"] if i % 3 == 0 else _ip(rng),
            "attack_type": attack,
            "severity": incident["severity"] if i % 3 == 0 else rng.choice(SEVERITIES),
            "confidence": round(rng.uniform(0.5, 0.99), 2),
            "status": rng.choice(["new", "linked", "closed"]),
            "incident_id": incident["id"] if i % 3 == 0 else None,
            "technique_ids": incident["technique_ids"],
            "raw_event": {
                "url": rng.choice(ENDPOINTS),
                "method": rng.choice(["GET", "POST"]),
                "status": rng.choice([200, 401, 403, 404, 429, 500]),
            },
            "model_probabilities": probs,
            "top_features": ["flow_duration", "fwd_pkt_len", "bwd_pkt_len"],
        }
        alerts.append(alert)
        if alert["incident_id"]:
            incident["alert_ids"].append(alert_id)

    _state["alerts"] = sorted(alerts, key=lambda a: a["ts"], reverse=True)
    _state["incidents"] = sorted(incidents, key=lambda a: a["opened_at"], reverse=True)
    _state["cases"] = cases
    _state["actions"] = actions
    _state["decisions"] = decisions


def get_state() -> dict[str, Any]:
    if not _state["alerts"]:
        build_seed()
    return _state


# Build once on import
build_seed()
