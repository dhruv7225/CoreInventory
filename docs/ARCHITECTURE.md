# CoreInventory — Architecture Documentation

## 1. Entity Relationship Diagram (Text)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AUTHENTICATION MODULE                              │
│                                                                             │
│  ┌──────────┐       ┌──────────────────┐       ┌───────────────┐           │
│  │  users    │──1:N──│ otp_verifications│       │ user_sessions │           │
│  │          │──1:N──│                  │       │               │           │
│  │  id (PK) │       │ user_id (FK)     │       │ user_id (FK)  │           │
│  │  email   │       │ otp_code         │       │ access_token  │           │
│  │  role    │       │ expires_at       │       │ refresh_token │           │
│  └──────────┘       └──────────────────┘       └───────────────┘           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                        PRODUCT MANAGEMENT MODULE                            │
│                                                                             │
│  ┌──────────────────┐    ┌────────────┐    ┌─────────────────┐             │
│  │ product_categories│    │  products   │    │ units_of_measure│             │
│  │                  │◄──│            │──►│                 │             │
│  │ id (PK)         │    │ id (PK)    │    │ id (PK)        │             │
│  │ parent_id (FK)  │    │ sku        │    │ name / symbol  │             │
│  │ (self-ref tree) │    │ name       │    └─────────────────┘             │
│  └──────────────────┘    │ category_id│                                    │
│                          │ uom_id     │    ┌─────────────────┐             │
│                          │ (NO stock) │    │  reorder_rules  │             │
│                          │            │──►│                 │             │
│                          └────────────┘    │ product_id (FK) │             │
│                                            │ warehouse_id(FK)│             │
│                                            │ min/max/reorder │             │
│                                            └─────────────────┘             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                       WAREHOUSE MANAGEMENT MODULE                           │
│                                                                             │
│  ┌────────────┐         ┌────────────┐                                     │
│  │ warehouses  │──1:N───│ locations   │                                     │
│  │            │         │            │                                     │
│  │ id (PK)   │         │ id (PK)    │                                     │
│  │ name/code │         │ warehouse_id│                                     │
│  └────────────┘         │ code       │                                     │
│                         │ type (enum)│                                     │
│                         │ parent_id  │ ◄── (self-ref hierarchy)            │
│                         └────────────┘                                     │
│                                                                             │
│  Location Types: warehouse | rack | production | vendor | customer |        │
│                  adjustment                                                 │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                      INVENTORY OPERATIONS MODULE                            │
│                                                                             │
│  Each document follows: Document (header) → Lines (detail rows)             │
│  Validating a document generates StockMovement records.                     │
│                                                                             │
│  ┌────────────┐   ┌───────────────┐   ┌───────────┐   ┌────────────────┐  │
│  │  receipts   │   │delivery_orders│   │ transfers  │   │stock_adjustments│  │
│  │  (goods IN) │   │  (goods OUT)  │   │ (internal) │   │  (corrections) │  │
│  └──────┬─────┘   └──────┬────────┘   └─────┬─────┘   └───────┬────────┘  │
│         │                │                   │                  │           │
│  ┌──────┴──────┐  ┌──────┴────────┐  ┌──────┴──────┐  ┌───────┴────────┐  │
│  │receipt_lines │  │delivery_order_│  │transfer_    │  │adjustment_     │  │
│  │             │  │lines          │  │lines        │  │lines           │  │
│  └─────────────┘  └───────────────┘  └─────────────┘  └────────────────┘  │
│         │                │                   │                  │           │
│         └────────────────┴───────────────────┴──────────────────┘           │
│                                    │                                        │
│                                    ▼                                        │
│                          ┌─────────────────┐                                │
│                          │ stock_movements  │  ◄── IMMUTABLE LEDGER         │
│                          │                 │                                │
│                          │ product_id      │                                │
│                          │ from_location_id│  (NULL = goods entering)       │
│                          │ to_location_id  │  (NULL = goods leaving)        │
│                          │ quantity (> 0)  │                                │
│                          │ movement_type   │                                │
│                          │ reference_type  │                                │
│                          │ reference_id    │                                │
│                          └─────────────────┘                                │
│                                    │                                        │
│                                    ▼                                        │
│                          ┌─────────────────┐                                │
│                          │ stock_snapshots  │  ◄── PERFORMANCE CACHE        │
│                          │ (product+loc=UQ) │                                │
│                          └─────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                           DERIVED VIEWS                                     │
│                                                                             │
│  v_current_stock     → on_hand per product per location                     │
│  v_warehouse_stock   → aggregated per product per warehouse                 │
│  v_global_stock      → total per product across all warehouses              │
│  v_low_stock_alerts  → products below reorder threshold                     │
└─────────────────────────────────────────────────────────────────────────────┘
```


## 2. Entity Relationships Explanation

### Authentication → All Modules
- `users.id` is the `created_by` FK on every document and stock movement.
- `user_sessions` and `otp_verifications` are 1:N from User.

### Product → Category (N:1)
- A product belongs to one category. Categories form a tree via `parent_id`.

### Product → UnitOfMeasure (N:1)
- Every product has a base UOM. Document lines also carry a UOM for unit conversion.

### Product → ReorderRule (1:N, scoped per warehouse)
- Each product can have a reorder rule per warehouse (UNIQUE product_id + warehouse_id).
- Drives low-stock alerts via `v_low_stock_alerts`.

### Warehouse → Locations (1:N)
- Locations are hierarchical (parent_id). Types: warehouse zone, rack, vendor (virtual), customer (virtual), adjustment (virtual).

### Documents → Lines (1:N)
- Receipt, DeliveryOrder, Transfer, StockAdjustment each have a Lines child table.
- Lines hold the per-product, per-location detail.

### Lines → StockMovements (via validation)
- When a document is validated (status: draft → done), the service creates StockMovement rows.
- The `reference_type` + `reference_id` on the movement link back to the originating document.

### StockMovement → Derived Stock
- `from_location_id = NULL` means goods enter the system (receipt, positive adjustment).
- `to_location_id = NULL` means goods leave the system (delivery, negative adjustment).
- Internal transfers have BOTH from and to.
- Current stock = SUM(to_qty) - SUM(from_qty) per product per location.

### StockSnapshot (cache)
- Denormalized table refreshed periodically from movements.
- Avoids full aggregation on every stock query.


## 3. Complete API Endpoint Reference

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register a new user |
| POST | `/api/v1/auth/login` | Login, returns JWT tokens |
| GET | `/api/v1/auth/me` | Get current user profile |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/products/` | List products (paginated, searchable) |
| POST | `/api/v1/products/` | Create a product |
| GET | `/api/v1/products/{id}` | Get product by ID |
| PATCH | `/api/v1/products/{id}` | Update product fields |
| DELETE | `/api/v1/products/{id}` | Soft-delete a product |
| GET | `/api/v1/products/categories/` | List all categories |
| POST | `/api/v1/products/categories/` | Create a category |
| GET | `/api/v1/products/uom/` | List units of measure |
| GET | `/api/v1/products/reorder-rules/` | List reorder rules |
| POST | `/api/v1/products/reorder-rules/` | Create a reorder rule |

### Warehouses & Locations
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/warehouses/` | List warehouses |
| POST | `/api/v1/warehouses/` | Create a warehouse |
| GET | `/api/v1/warehouses/{id}` | Get warehouse by ID |
| DELETE | `/api/v1/warehouses/{id}` | Soft-delete warehouse |
| GET | `/api/v1/warehouses/{id}/locations` | List locations in warehouse |
| POST | `/api/v1/warehouses/{id}/locations` | Create location in warehouse |

### Receipts (Goods IN)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/receipts/` | List receipts (filterable by status/warehouse) |
| POST | `/api/v1/receipts/` | Create receipt with lines |
| POST | `/api/v1/receipts/{id}/validate` | Confirm receipt → generates RECEIPT movements |

### Delivery Orders (Goods OUT)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/deliveries/` | List delivery orders |
| POST | `/api/v1/deliveries/` | Create delivery order with lines |
| POST | `/api/v1/deliveries/{id}/validate` | Confirm delivery → generates DELIVERY movements (checks stock) |

### Internal Transfers
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/transfers/` | List transfers |
| POST | `/api/v1/transfers/` | Create transfer with lines |
| POST | `/api/v1/transfers/{id}/validate` | Confirm transfer → generates INTERNAL_TRANSFER movements |

### Stock Adjustments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/adjustments/` | List adjustments |
| POST | `/api/v1/adjustments/` | Create adjustment with lines |
| POST | `/api/v1/adjustments/{id}/validate` | Confirm adjustment → generates ADJUSTMENT movements |

### Inventory Engine
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/inventory/stock` | Current stock levels (filter by product/warehouse/location) |
| GET | `/api/v1/inventory/movements` | Stock movement history (paginated, filterable) |
| POST | `/api/v1/inventory/snapshots/refresh` | Rebuild snapshot cache from movements |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/dashboard/kpis` | Aggregated KPIs (counts, stock value, alerts) |
| GET | `/api/v1/dashboard/low-stock-alerts` | Products below reorder threshold |


## 4. React Frontend Integration Notes

### Axios API Client Setup

```javascript
// src/api/client.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
```

### Suggested React Route Structure

```
/                        → Dashboard (KPIs, charts, low-stock alerts)
/login                   → Login page
/products                → Product list with search/filter
/products/:id            → Product detail + stock levels + movement history
/warehouses              → Warehouse list
/warehouses/:id          → Warehouse detail + locations tree
/receipts                → Receipts list (filterable by status)
/receipts/new            → Create receipt form
/receipts/:id            → Receipt detail + validate button
/deliveries              → Delivery orders list
/deliveries/new          → Create delivery order form
/deliveries/:id          → Delivery detail + validate button
/transfers               → Internal transfers list
/transfers/new           → Create transfer form
/transfers/:id           → Transfer detail + validate button
/adjustments             → Stock adjustments list
/adjustments/new         → Create adjustment form
/adjustments/:id         → Adjustment detail + validate button
/inventory/stock         → Stock levels (global/per-warehouse/per-location)
/inventory/movements     → Movement history with filters
```

### API Consumption Patterns

#### Dashboard KPIs
```javascript
// Fetch all KPIs in one call
const { data } = await api.get('/dashboard/kpis');
// data: { total_products, total_warehouses, total_stock_value,
//         low_stock_count, pending_receipts, pending_deliveries,
//         pending_transfers, movements_today }
```

#### Product Listing with Pagination
```javascript
const { data } = await api.get('/products/', {
  params: { skip: page * pageSize, limit: pageSize, search, category_id }
});
```

#### Stock Movement History for a Product
```javascript
const { data } = await api.get('/inventory/movements', {
  params: { product_id: productId, skip: 0, limit: 50 }
});
```

#### Create & Validate a Receipt (two-step flow)
```javascript
// Step 1: Create as draft
const { data: receipt } = await api.post('/receipts/', {
  vendor_name: 'Supplier ABC',
  warehouse_id: warehouseId,
  lines: [
    { product_id: pid, location_id: lid, quantity: 100, uom_id: uomId }
  ]
});

// Step 2: Validate (generates stock movements)
await api.post(`/receipts/${receipt.id}/validate`);
```

#### Real-time Stock Check
```javascript
const { data } = await api.get('/inventory/stock', {
  params: { product_id: productId, warehouse_id: warehouseId }
});
// data: [{ product_id, product_name, sku, location_id, location_name,
//          warehouse_id, warehouse_name, on_hand_qty }]
```

### Key Frontend Components

| Component | API Calls | Notes |
|-----------|-----------|-------|
| `<DashboardPage>` | `GET /dashboard/kpis`, `GET /dashboard/low-stock-alerts` | Show KPI cards, alert table |
| `<ProductListPage>` | `GET /products/` | DataGrid with search, category filter |
| `<ProductDetailPage>` | `GET /products/{id}`, `GET /inventory/stock?product_id=`, `GET /inventory/movements?product_id=` | Tabs: Info, Stock, Movements |
| `<ReceiptFormPage>` | `POST /receipts/`, `GET /products/`, `GET /warehouses/{id}/locations` | Dynamic line items |
| `<DocumentDetailPage>` | `GET /receipts/{id}`, `POST /receipts/{id}/validate` | Status badge, validate button |
| `<StockOverviewPage>` | `GET /inventory/stock` | Grouped by warehouse, expandable rows |
| `<MovementHistoryPage>` | `GET /inventory/movements` | Filterable table with pagination |


## 5. Stock Derivation Flow

```
   Receipt created (draft)
        │
        ▼
   POST /receipts/{id}/validate
        │
        ▼
   InventoryService.record_receipt()
        │
        ▼
   INSERT INTO stock_movements (
       product_id, from_location_id=NULL, to_location_id, quantity,
       movement_type='RECEIPT', reference_type='receipt', reference_id
   )
        │
        ▼
   Stock query:  SUM(to_qty) - SUM(from_qty)  per product per location
        │
        ▼
   v_current_stock view  →  used by GET /inventory/stock
```

The same pattern applies to deliveries (from=location, to=NULL),
transfers (from=source, to=dest), and adjustments (direction depends on sign).


## 6. Running the Application

```bash
# 1. Create PostgreSQL database
createdb core_inventory

# 2. Apply schema
psql -d core_inventory -f database/001_schema.sql

# 3. Install Python dependencies
cd backend
pip install -r requirements.txt
cp .env.example .env  # edit DATABASE_URL

# 4. Start FastAPI
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# 5. Open API docs
# http://localhost:8000/docs  (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```
