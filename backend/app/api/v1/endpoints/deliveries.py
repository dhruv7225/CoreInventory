"""
Delivery Order endpoints: create, list, validate (generates DELIVERY stock movements).
Role protection:
  - GET → any authenticated user
  - POST / validate → warehouse_staff, manager, admin
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_staff_plus
from app.models.auth import User
from app.models.delivery import DeliveryOrder, DeliveryOrderLine
from app.models.receipt import DocumentStatus
from app.schemas.schemas import DeliveryOrderCreate, DocumentOut
from app.services.inventory_service import InventoryService

router = APIRouter()


@router.get("/", response_model=list[DocumentOut])
async def list_deliveries(
    status: str | None = None,
    warehouse_id: UUID | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(DeliveryOrder).where(DeliveryOrder.is_deleted.is_(False))
    if status:
        q = q.where(DeliveryOrder.status == status)
    if warehouse_id:
        q = q.where(DeliveryOrder.warehouse_id == warehouse_id)
    q = q.offset(skip).limit(limit).order_by(DeliveryOrder.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=DocumentOut, status_code=201)
async def create_delivery(
    payload: DeliveryOrderCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff_plus),
):
    ref_result = await db.execute(text("SELECT fn_next_reference('DO')"))
    reference = ref_result.scalar_one()

    delivery = DeliveryOrder(
        reference=reference,
        customer_name=payload.customer_name,
        warehouse_id=payload.warehouse_id,
        scheduled_date=payload.scheduled_date,
        shipping_address=payload.shipping_address,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(delivery)
    await db.flush()

    for line_data in payload.lines:
        db.add(DeliveryOrderLine(delivery_order_id=delivery.id, **line_data.model_dump()))

    await db.flush()
    await db.refresh(delivery)
    return delivery


@router.post("/{delivery_id}/validate", response_model=DocumentOut)
async def validate_delivery(
    delivery_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_staff_plus),
):
    """Confirm delivery → check stock → generate DELIVERY movements (draft → done)."""
    result = await db.execute(
        select(DeliveryOrder)
        .where(DeliveryOrder.id == delivery_id)
        .options(selectinload(DeliveryOrder.lines))
    )
    delivery = result.scalar_one_or_none()
    if not delivery:
        raise HTTPException(status_code=404, detail="Delivery order not found")
    if delivery.status != DocumentStatus.draft:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot validate a delivery with status '{delivery.status.value}'",
        )

    inv = InventoryService(db)

    # Check stock before committing any movements
    for line in delivery.lines:
        available = await inv.get_stock_at_location(line.product_id, line.location_id)
        if available < float(line.quantity):
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for product {line.product_id}. "
                       f"Available: {available}, Requested: {line.quantity}",
            )

    for line in delivery.lines:
        await inv.record_delivery(
            product_id=line.product_id,
            from_location_id=line.location_id,
            quantity=float(line.quantity),
            delivery_order_id=delivery.id,
            created_by=current_user.id,
        )
        line.delivered_qty = line.quantity

    delivery.status = DocumentStatus.done
    await db.flush()
    await db.refresh(delivery)
    return delivery
