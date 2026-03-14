"""
Product CRUD endpoints.
Role protection:
  - GET (list/detail) → any authenticated user
  - POST / PATCH / DELETE → admin or manager only
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_admin_manager
from app.models.auth import User
from app.models.product import Product, ProductCategory, UnitOfMeasure, ReorderRule
from app.schemas.schemas import (
    CategoryCreate,
    CategoryOut,
    ProductCreate,
    ProductOut,
    ProductUpdate,
    ReorderRuleCreate,
    ReorderRuleOut,
    UomCreate,
    UomOut,
)

router = APIRouter()


# ─────────────────────────────────────────
# Products
# ─────────────────────────────────────────

@router.get("/", response_model=list[ProductOut])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    search: str | None = None,
    category_id: UUID | None = None,
    is_active: bool = True,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),       # any authenticated user
):
    q = select(Product).where(Product.is_deleted.is_(False), Product.is_active == is_active)
    if search:
        q = q.where(Product.name.ilike(f"%{search}%") | Product.sku.ilike(f"%{search}%"))
    if category_id:
        q = q.where(Product.category_id == category_id)
    q = q.offset(skip).limit(limit).order_by(Product.name)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/", response_model=ProductOut, status_code=201)
async def create_product(
    payload: ProductCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin_manager),  # admin or manager
):
    product = Product(**payload.model_dump())
    db.add(product)
    await db.flush()
    await db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_deleted.is_(False))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: UUID,
    payload: ProductUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin_manager),
):
    result = await db.execute(
        select(Product).where(Product.id == product_id, Product.is_deleted.is_(False))
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)
    await db.flush()
    await db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
async def delete_product(
    product_id: UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin_manager),
):
    result = await db.execute(select(Product).where(Product.id == product_id))
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_deleted = True
    await db.flush()


# ─────────────────────────────────────────
# Categories
# ─────────────────────────────────────────

@router.get("/categories/", response_model=list[CategoryOut])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProductCategory).where(ProductCategory.is_deleted.is_(False))
    )
    return result.scalars().all()


@router.post("/categories/", response_model=CategoryOut, status_code=201)
async def create_category(
    payload: CategoryCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin_manager),
):
    cat = ProductCategory(**payload.model_dump())
    db.add(cat)
    await db.flush()
    await db.refresh(cat)
    return cat


# ─────────────────────────────────────────
# Units of Measure
# ─────────────────────────────────────────

@router.get("/uom/", response_model=list[UomOut])
async def list_uoms(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(
        select(UnitOfMeasure).where(UnitOfMeasure.is_deleted.is_(False))
    )
    return result.scalars().all()


@router.post("/uom/", response_model=UomOut, status_code=201)
async def create_uom(
    payload: UomCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin_manager),
):
    uom = UnitOfMeasure(**payload.model_dump())
    db.add(uom)
    await db.flush()
    await db.refresh(uom)
    return uom


# ─────────────────────────────────────────
# Reorder Rules
# ─────────────────────────────────────────

@router.get("/reorder-rules/", response_model=list[ReorderRuleOut])
async def list_reorder_rules(
    product_id: UUID | None = None,
    warehouse_id: UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    q = select(ReorderRule).where(ReorderRule.is_active.is_(True))
    if product_id:
        q = q.where(ReorderRule.product_id == product_id)
    if warehouse_id:
        q = q.where(ReorderRule.warehouse_id == warehouse_id)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/reorder-rules/", response_model=ReorderRuleOut, status_code=201)
async def create_reorder_rule(
    payload: ReorderRuleCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(require_admin_manager),
):
    rule = ReorderRule(**payload.model_dump())
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return rule
