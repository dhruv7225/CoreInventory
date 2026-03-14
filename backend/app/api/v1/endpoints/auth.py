"""
Authentication endpoints: register, login, refresh, logout, me.
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.core.config import settings
from app.models.auth import User, UserRole, UserSession
from app.schemas.schemas import (
    LoginRequest,
    RefreshTokenRequest,
    TokenRefreshResponse,
    TokenResponse,
    UserCreate,
    UserOut,
)

router = APIRouter()


# ─────────────────────────────────────────
# POST /auth/register
# ─────────────────────────────────────────

@router.post("/register", response_model=UserOut, status_code=201)
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Register a new user.
    Password is bcrypt-hashed before storage.
    """
    existing = await db.execute(
        select(User).where(
            (User.email == payload.email) | (User.username == payload.username)
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email or username already exists",
        )

    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=UserRole(payload.role),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


# ─────────────────────────────────────────
# POST /auth/login
# ─────────────────────────────────────────

@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """
    Authenticate with username + password.
    Returns access token (30 min) and refresh token (7 days).
    Session is persisted in user_sessions for audit and revocation.
    """
    result = await db.execute(
        select(User).where(
            User.username == payload.username,
            User.is_active.is_(True),
            User.is_deleted.is_(False),
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    access_token  = create_access_token(str(user.id), user.username, user.role.value)
    refresh_token = create_refresh_token(str(user.id))

    session = UserSession(
        user_id=user.id,
        access_token=access_token,
        refresh_token=refresh_token,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        expires_at=datetime.now(timezone.utc)
            + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    await db.flush()

    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


# ─────────────────────────────────────────
# POST /auth/refresh
# ─────────────────────────────────────────

@router.post("/refresh", response_model=TokenRefreshResponse)
async def refresh_access_token(
    payload: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange a valid refresh token for a new access token.
    Refresh token must exist in user_sessions and be active.
    """
    bad_token = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired refresh token",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        token_data = decode_token(payload.refresh_token)
    except JWTError:
        raise bad_token

    if token_data.get("type") != "refresh":
        raise bad_token

    user_id = token_data.get("sub")
    if not user_id:
        raise bad_token

    session_result = await db.execute(
        select(UserSession).where(
            UserSession.refresh_token == payload.refresh_token,
            UserSession.is_active.is_(True),
        )
    )
    session = session_result.scalar_one_or_none()
    if not session:
        raise bad_token

    user_result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.is_active.is_(True),
            User.is_deleted.is_(False),
        )
    )
    user = user_result.scalar_one_or_none()
    if not user:
        raise bad_token

    new_access_token = create_access_token(str(user.id), user.username, user.role.value)
    session.access_token = new_access_token
    await db.flush()

    return TokenRefreshResponse(access_token=new_access_token)


# ─────────────────────────────────────────
# POST /auth/logout
# ─────────────────────────────────────────

@router.post("/logout", status_code=204)
async def logout(
    payload: RefreshTokenRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Invalidate the session. Requires a valid access token in Authorization header.
    """
    session_result = await db.execute(
        select(UserSession).where(
            UserSession.refresh_token == payload.refresh_token,
            UserSession.user_id == current_user.id,
            UserSession.is_active.is_(True),
        )
    )
    session = session_result.scalar_one_or_none()
    if session:
        session.is_active = False
        await db.flush()


# ─────────────────────────────────────────
# GET /auth/me
# ─────────────────────────────────────────

@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return current_user
