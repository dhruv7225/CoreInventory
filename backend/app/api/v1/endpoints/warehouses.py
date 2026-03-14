"""
Warehouse & Location CRUD endpoints.
Role protection:
  - GET → any authenticated user
  - POST / DELETE → admin or manager only
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin_manager
from app.models.auth import User
from app.models.warehouse import Warehouse, Location
from app.schemas.schemas import LocationCreate, LocationOut, WarehouseCreate, WarehouseOut

router = APIRouter()


# ─────────────────────────────────────────
# Warehouses
# ─────────────────────────────────────────

@router.get("/", response_model=list[WarehouseOut])
async def list_warehouses(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Warehouse).where(Warehouse.is_deleted.is_(False)).order_by(Warehouse.name)
    )
    return result.scalars().all()


@router.post("/", response_model=WarehouseOut, status_code=201)
async def create_warehouse(
    payload: WarehouseCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin_manager),
):
    wh = Warehouse(**payload.model_dump())
    db.add(wh)
    await db.flush()
    await db.refresh(wh)
    return wh


@router.get("/{warehouse_id}", response_model=WarehouseOut)
async def get_warehouse(
    warehouse_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Warehouse).where(Warehouse.id == warehouse_id, Warehouse.is_deleted.is_(False))
    )
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return wh


@router.delete("/{warehouse_id}", status_code=204)
async def delete_warehouse(
    warehouse_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin_manager),
):
    result = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    wh = result.scalar_one_or_none()
    if not wh:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    wh.is_deleted = True
    await db.flush()


# ─────────────────────────────────────────
# Locations
# ─────────────────────────────────────────

@router.get("/{warehouse_id}/locations", response_model=list[LocationOut])
async def list_locations(
    warehouse_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Location).where(
            Location.warehouse_id == warehouse_id,
            Location.is_deleted.is_(False),
        ).order_by(Location.code)
    )
    return result.scalars().all()


@router.post("/{warehouse_id}/locations", response_model=LocationOut, status_code=201)
async def create_location(
    warehouse_id: UUID,
    payload: LocationCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin_manager),
):
    wh = await db.execute(select(Warehouse).where(Warehouse.id == warehouse_id))
    if not wh.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Warehouse not found")
    loc = Location(warehouse_id=warehouse_id, **payload.model_dump(exclude={"warehouse_id"}))
    db.add(loc)
    await db.flush()
    await db.refresh(loc)
    return loc
