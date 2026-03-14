"""
Stock Adjustment endpoints: create, list, validate.
Role protection:
  - GET → any authenticated user
  - POST → warehouse_staff, manager, admin
  - validate → admin or manager only (adjustments directly affect ledger)
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin_manager, require_staff_plus
from app.models.adjustment import AdjustmentLine, StockAdjustment
from app.models.auth import User
from app.models.receipt import DocumentStatus
from app.schemas.schemas import AdjustmentCreate, DocumentOut, AdjustmentOut
from app.services.inventory_service import InventoryService

router = APIRouter()


@router.get("/", response_model=list[AdjustmentOut])
async def list_adjustments(
    status: str | None = None,
    warehouse_id: UUID | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = (select(StockAdjustment).where(StockAdjustment.is_deleted.is_(False))
         .options(
             selectinload(StockAdjustment.warehouse),
             selectinload(StockAdjustment.lines).selectinload(AdjustmentLine.product),
             selectinload(StockAdjustment.lines).selectinload(AdjustmentLine.location),
             selectinload(StockAdjustment.lines).selectinload(AdjustmentLine.uom)
         ))
    if status:
        q = q.where(StockAdjustment.status == status)
    if warehouse_id:
        q = q.where(StockAdjustment.warehouse_id == warehouse_id)
    q = q.offset(skip).limit(limit).order_by(StockAdjustment.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=DocumentOut, status_code=201)
async def create_adjustment(
    payload: AdjustmentCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff_plus),
):
    ref_result = await db.execute(text("SELECT fn_next_reference('ADJ')"))
    reference = ref_result.scalar_one()

    adj = StockAdjustment(
        reference=reference,
        warehouse_id=payload.warehouse_id,
        reason=payload.reason,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(adj)
    await db.flush()

    for line_data in payload.lines:
        db.add(AdjustmentLine(adjustment_id=adj.id, **line_data.model_dump()))

    await db.flush()
    await db.refresh(adj)
    res = await db.execute(
        select(StockAdjustment).where(StockAdjustment.id == adj.id)
        .options(
             selectinload(StockAdjustment.warehouse),
             selectinload(StockAdjustment.lines).selectinload(AdjustmentLine.product),
             selectinload(StockAdjustment.lines).selectinload(AdjustmentLine.location),
             selectinload(StockAdjustment.lines).selectinload(AdjustmentLine.uom)
         )
    )
    return res.scalar_one()

@router.post("/{adjustment_id}/validate", response_model=AdjustmentOut)
async def validate_adjustment(
    adjustment_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_admin_manager),  # stricter: managers only
):
    """
    Confirm adjustment → generate +/- ADJUSTMENT movements (draft → done).
    Restricted to admin/manager since it directly corrects the stock ledger.
    """
    result = await db.execute(
        select(StockAdjustment)
        .where(StockAdjustment.id == adjustment_id)
        .options(selectinload(StockAdjustment.lines))
    )
    adj = result.scalar_one_or_none()
    if not adj:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    if adj.status != DocumentStatus.draft:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot validate an adjustment with status '{adj.status.value}'",
        )

    inv = InventoryService(db)
    for line in adj.lines:
        diff = float(line.counted_qty) - float(line.system_qty)
        if diff == 0:
            continue
        await inv.record_adjustment(
            product_id=line.product_id,
            location_id=line.location_id,
            difference_qty=diff,
            adjustment_id=adj.id,
            created_by=current_user.id,
        )

    adj.status = DocumentStatus.done
    await db.flush()
    await db.refresh(adj)
    res = await db.execute(
        select(StockAdjustment).where(StockAdjustment.id == adj.id)
        .options(
             selectinload(StockAdjustment.warehouse),
             selectinload(StockAdjustment.lines).selectinload(AdjustmentLine.product),
             selectinload(StockAdjustment.lines).selectinload(AdjustmentLine.location),
             selectinload(StockAdjustment.lines).selectinload(AdjustmentLine.uom)
         )
    )
    return res.scalar_one()
