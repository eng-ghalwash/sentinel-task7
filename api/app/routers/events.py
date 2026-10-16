import asyncio
import json
import random
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.auth.deps import get_current_user
from app.mocks.seed import get_state

router = APIRouter(prefix="/events", tags=["events"])


@router.get("/stream")
async def event_stream(_user: dict = Depends(get_current_user)) -> StreamingResponse:
    async def generate():
        rng = random.Random()
        while True:
            state = get_state()
            alert = rng.choice(state["alerts"][:50])
            incident = rng.choice(state["incidents"][:20])
            action = rng.choice(state["actions"]) if state["actions"] else None

            payloads = [
                {
                    "type": "alert",
                    "ts": datetime.now(timezone.utc).isoformat(),
                    "data": {
                        "id": alert["id"],
                        "severity": alert["severity"],
                        "attack_type": alert["attack_type"],
                        "src_ip": alert["src_ip"],
                    },
                },
                {
                    "type": "incident",
                    "ts": datetime.now(timezone.utc).isoformat(),
                    "data": {
                        "id": incident["id"],
                        "severity": incident["severity"],
                        "title": incident["title"],
                    },
                },
            ]
            if action:
                payloads.append(
                    {
                        "type": "action",
                        "ts": datetime.now(timezone.utc).isoformat(),
                        "data": {
                            "id": action["id"],
                            "tool": action["tool"],
                            "target": action["target"],
                            "result": action["result"],
                        },
                    }
                )

            event = rng.choice(payloads)
            yield f"data: {json.dumps(event)}\n\n"
            await asyncio.sleep(3)

    return StreamingResponse(generate(), media_type="text/event-stream")
