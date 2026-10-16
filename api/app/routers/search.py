from fastapi import APIRouter, Depends, Query

from app.auth.deps import get_current_user
from app.mocks.seed import get_state
from app.models.schemas import SearchResult

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=list[SearchResult])
def search(
    q: str = Query(..., min_length=1),
    _user: dict = Depends(get_current_user),
) -> list[SearchResult]:
    query = q.strip().lower()
    state = get_state()
    results: list[SearchResult] = []

    for alert in state["alerts"]:
        techniques = " ".join(alert.get("technique_ids", [])).lower()
        if (
            query in alert["id"].lower()
            or query in alert["src_ip"].lower()
            or query in techniques
        ):
            results.append(
                SearchResult(
                    type="alert",
                    id=alert["id"],
                    title=f"{alert['attack_type']} — {alert['src_ip']}",
                    href=f"/alerts?focus={alert['id']}",
                )
            )
        if len(results) >= 12:
            break

    for incident in state["incidents"]:
        techniques = " ".join(incident.get("technique_ids", [])).lower()
        if (
            query in incident["id"].lower()
            or query in incident["src_ip"].lower()
            or query in incident["title"].lower()
            or query in techniques
            or query in "skyline"
            or query.startswith("cve")
        ):
            title = incident["title"]
            if query.startswith("cve"):
                title = f"{incident['title']} (CVE search mapped to incident)"
            results.append(
                SearchResult(
                    type="incident",
                    id=incident["id"],
                    title=title,
                    href=f"/incidents/{incident['id']}",
                )
            )

    for case in state["cases"]:
        if query in case["id"].lower() or query in case["title"].lower():
            results.append(
                SearchResult(
                    type="case",
                    id=case["id"],
                    title=case["title"],
                    href="/cases",
                )
            )

    if "skyline" in query or "asset" in query:
        results.insert(
            0,
            SearchResult(
                type="asset",
                id="asset-skyline-web",
                title="skyline-web (customer application)",
                href="/portal",
            ),
        )

    if query.startswith("t1") or query.startswith("t"):
        for incident in state["incidents"][:5]:
            for tech in incident.get("technique_ids", []):
                if query in tech.lower():
                    results.append(
                        SearchResult(
                            type="technique",
                            id=tech,
                            title=f"{tech} via {incident['id']}",
                            href=f"/incidents/{incident['id']}",
                        )
                    )

    # dedupe by type+id
    seen: set[str] = set()
    unique: list[SearchResult] = []
    for item in results:
        key = f"{item.type}:{item.id}"
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique[:25]
