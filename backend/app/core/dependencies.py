"""
FastAPI dependency injection for authentication and role-based access control.

Usage:
    # Any logged-in user
    user: User = Depends(get_current_user)

    # Admin only
    user: User = Depends(require_admin)

    # Admin or Manager
    user: User = Depends(require_admin_manager)

    # Admin, Manager, or Warehouse Staff
    user: User = Depends(require_staff_plus)
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.auth import User, UserRole

bearer_scheme = HTTPBearer(auto_error=True)

_401 = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)

_403 = lambda required: HTTPException(
    status_code=status.HTTP_403_FORBIDDEN,
    detail=f"Permission denied. Required role(s): {[r.value for r in required]}",
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Decode Bearer JWT access token → return the active User.
    Raises HTTP 401 if token is missing, invalid, expired, or not an access token.
    """
    try:
        payload = decode_token(credentials.credentials)
    except JWTError:
        raise _401

    if payload.get("type") != "access":
        raise _401

    user_id: str | None = payload.get("sub")
    if not user_id:
        raise _401

    result = await db.execute(
        select(User).where(
            User.id == user_id,
            User.is_active.is_(True),
            User.is_deleted.is_(False),
        )
    )
    user = result.scalar_one_or_none()
    if not user:
        raise _401

    return user


def require_roles(*roles: UserRole):
    """
    Dependency factory — enforces that current_user has one of the given roles.
    Example: Depends(require_roles(UserRole.admin, UserRole.manager))
    """
    async def _guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise _403(roles)
        return current_user

    return _guard


# ─────────────────────────────────────────
# Pre-built role guards (import and use directly)
# ─────────────────────────────────────────

# Only admin
require_admin = require_roles(UserRole.admin)

# Admin or Manager
require_admin_manager = require_roles(UserRole.admin, UserRole.manager)

# Admin, Manager, or Warehouse Staff
require_staff_plus = require_roles(
    UserRole.admin, UserRole.manager, UserRole.warehouse_staff
)

# Any authenticated user (any role)
require_any = get_current_user
