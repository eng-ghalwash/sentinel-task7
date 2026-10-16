from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.deps import get_current_user, require_roles
from app.mocks.seed import get_state
from app.models.schemas import Case

router = APIRouter(prefix="/cases", tags=["cases"])


class CaseUpdate(BaseModel):
    status: str | None = None
    note: str | None = None
    root_cause: str | None = None
    lessons_learned: str | None = None
    close: bool = False


@router.get("", response_model=list[Case])
def list_cases(_user: dict = Depends(get_current_user)) -> list[Case]:
    return [Case(**_normalize_case(c)) for c in get_state()["cases"]]


@router.get("/{case_id}", response_model=Case)
def get_case(case_id: str, _user: dict = Depends(get_current_user)) -> Case:
    for case in get_state()["cases"]:
        if case["id"] == case_id:
            return Case(**_normalize_case(case))
    raise HTTPException(status_code=404, detail="Case not found")


@router.patch("/{case_id}", response_model=Case)
def update_case(
    case_id: str,
    body: CaseUpdate,
    _user: dict = Depends(require_roles("Admin", "Analyst")),
) -> Case:
    for case in get_state()["cases"]:
        if case["id"] == case_id:
            if body.status is not None:
                case["status"] = body.status
            if body.note:
                case.setdefault("notes", []).append(body.note)
            if body.root_cause is not None:
                case["root_cause"] = body.root_cause
            if body.lessons_learned is not None:
                case["lessons_learned"] = body.lessons_learned
            if body.close:
                case["status"] = "Resolved"
                case["closed_at"] = datetime.now(timezone.utc)
                if body.root_cause:
                    case["root_cause"] = body.root_cause
                if body.lessons_learned:
                    case["lessons_learned"] = body.lessons_learned
            return Case(**_normalize_case(case))
    raise HTTPException(status_code=404, detail="Case not found")


def _normalize_case(case: dict) -> dict:
    return {
        **case,
        "root_cause": case.get("root_cause"),
        "lessons_learned": case.get("lessons_learned"),
        "closed_at": case.get("closed_at"),
        "notes": case.get("notes", []),
    }
