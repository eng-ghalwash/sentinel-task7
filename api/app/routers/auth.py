import base64
import io

import qrcode
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.deps import get_current_user
from app.auth.security import (
    authenticate_user,
    begin_totp_setup,
    create_access_token,
    disable_totp,
    enable_totp,
    get_user_public,
    is_totp_enabled,
    verify_totp,
)
from app.models.schemas import (
    LoginRequest,
    TokenResponse,
    TotpCodeRequest,
    TotpSetupResponse,
    TotpStatus,
    UserPublic,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _qr_base64(otpauth_url: str) -> str:
    img = qrcode.make(otpauth_url)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("ascii")


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest) -> TokenResponse:
    user = authenticate_user(body.username, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if is_totp_enabled(user["username"]):
        if not body.totp_code:
            return TokenResponse(requires_totp=True)
        if not verify_totp(user["username"], body.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authenticator code",
            )

    token = create_access_token(user["username"], user["role"])
    public = get_user_public(user["username"])
    assert public is not None
    return TokenResponse(access_token=token, user=UserPublic(**public))


@router.get("/me", response_model=UserPublic)
def me(user: dict = Depends(get_current_user)) -> UserPublic:
    public = get_user_public(user["username"])
    assert public is not None
    return UserPublic(**public)


@router.get("/totp/status", response_model=TotpStatus)
def totp_status(user: dict = Depends(get_current_user)) -> TotpStatus:
    return TotpStatus(enabled=is_totp_enabled(user["username"]))


@router.post("/totp/setup", response_model=TotpSetupResponse)
def totp_setup(user: dict = Depends(get_current_user)) -> TotpSetupResponse:
    data = begin_totp_setup(user["username"])
    return TotpSetupResponse(
        secret=data["secret"],
        otpauth_url=data["otpauth_url"],
        qr_base64=_qr_base64(data["otpauth_url"]),
    )


@router.post("/totp/enable", response_model=TotpStatus)
def totp_enable(
    body: TotpCodeRequest,
    user: dict = Depends(get_current_user),
) -> TotpStatus:
    if not enable_totp(user["username"], body.code):
        raise HTTPException(status_code=400, detail="Invalid authenticator code")
    return TotpStatus(enabled=True)


@router.post("/totp/disable", response_model=TotpStatus)
def totp_disable(
    body: TotpCodeRequest,
    user: dict = Depends(get_current_user),
) -> TotpStatus:
    if is_totp_enabled(user["username"]) and not verify_totp(user["username"], body.code):
        raise HTTPException(status_code=400, detail="Invalid authenticator code")
    disable_totp(user["username"])
    return TotpStatus(enabled=False)
