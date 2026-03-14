# CoreInventory Setup & Troubleshooting Guide

## ✅ Backend Status

| Component | Status | Details |
|---|---|---|
| FastAPI Server | ✅ Running | `python -m uvicorn app.main:app --reload` |
| Database (Neon) | ✅ Connected | 19 tables, 4 views, all enums created |
| SQLAlchemy Engine | ✅ Async with SSL | Configured for Neon DB |
| Endpoints | ✅ All 30 routes | Products, Warehouses, Receipts, Deliveries, Transfers, Adjustments, Inventory, Dashboard |
| Health Check | ✅ Working | `GET /health` returns `{"status": "healthy"}` |

---

## 🚀 Start Backend Server

```bash
cd d:\OdooxIndus\backend

# Method 1: Development with hot-reload
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Method 2: Production
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Check it's working:**
```bash
curl http://localhost:8000/health
# Response: {"status":"healthy","app":"CoreInventory","version":"1.0.0"}
```

**API Docs:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

---

## 🔧 Configuration (.env)

File: `backend/.env`

```env
DATABASE_URL=postgresql+asyncpg://neondb_owner:npg_aXw0l7NJnQR@ep-hidden-snow-anzqdotm-pooler.c-6.us-east-1.aws.neon.tech/neondb?ssl=require
DEBUG=True
SECRET_KEY=your-secret-key-here-min-32-chars
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

> Database is already connected and schema already applied to Neon. No action needed there.

---

## 🧪 Test Endpoints (All Working)

### Health Check
```bash
curl http://localhost:8000/health
```

### Get All Products (seeded empty, ready for data)
```bash
curl http://localhost:8000/api/v1/products/
# Response: []
```

### Get Product Categories (seeded with 4 categories)
```bash
curl http://localhost:8000/api/v1/products/categories/
# Response: [
#   {"id": "...", "name": "Raw Materials", ...},
#   {"id": "...", "name": "Finished Goods", ...},
#   ...
# ]
```

### Get Units of Measure (seeded with 6)
```bash
curl http://localhost:8000/api/v1/products/uom/
# Response: 6 items (pcs, kg, L, m, box, plt)
```

---

## ❌ Troubleshooting "Failed to Fetch" Error

### 1. **Backend Not Running?**
```bash
ps aux | grep uvicorn
# If no results, start the server:
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 2. **Wrong API Port/URL?**
- Backend runs on: `http://localhost:8000/api/v1/*`
- Frontend should use this URL
- Check `.env` `CORS_ORIGINS` matches your frontend origin

### 3. **Database Connection Issue?**
```bash
# Test database directly:
python test_db_connection.py
# If fails, verify .env DATABASE_URL is correct
```

### 4. **CORS Error (Browser Console)?**
- Check `.env` `CORS_ORIGINS` includes your frontend:
  ```env
  CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
  ```
- Restart backend after changing

### 5. **Module Import Issues?**
```bash
# Test server startup:
python -c "from app.main import app; print('Import OK')"
```

### 6. **Check Server is Actually Listening**
```bash
netstat -an | findstr 8000
# Windows: should show LISTENING on port 8000

# Or directly:
curl -v http://localhost:8000/health
```

---

## 📋 All Available API Endpoints

### Endpoints by Category

| Category | Count | Base Path |
|---|---|---|
| **Products** | 5 | `/api/v1/products/` |
| **Warehouses** | 4 | `/api/v1/warehouses/` |
| **Receipts** | 3 | `/api/v1/receipts/` |
| **Deliveries** | 3 | `/api/v1/deliveries/` |
| **Transfers** | 3 | `/api/v1/transfers/` |
| **Adjustments** | 3 | `/api/v1/adjustments/` |
| **Inventory** | 3 | `/api/v1/inventory/` |
| **Dashboard** | 2 | `/api/v1/dashboard/` |
| **Auth** | 3 | `/api/v1/auth/` |

**Full list:** Open http://localhost:8000/docs when server is running

---

## 🌐 Frontend Integration (React)

### API Client Setup
```javascript
// frontend/src/api/client.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
```

### Example: Fetch Products
```javascript
import api from './api/client';

async function fetchProducts() {
  try {
    const { data } = await api.get('/products/');
    console.log(data); // Array of products
  } catch (error) {
    console.error('Failed to fetch products:', error);
  }
}
```

---

## 📁 Key File Paths

| File | Purpose |
|---|---|
| `backend/app/main.py` | FastAPI entrypoint |
| `backend/app/core/config.py` | Settings from `.env` |
| `backend/app/core/database.py` | SQLAlchemy engine + session |
| `backend/app/api/v1/router.py` | All route aggregation |
| `backend/app/api/v1/endpoints/*.py` | Endpoint implementations |
| `backend/app/models/*.py` | ORM models (match schema) |
| `backend/app/schemas/schemas.py` | Pydantic request/response |
| `database/001_schema.sql` | PostgreSQL schema (already applied) |

---

## 🔑 Database Tables & Views

### Tables (19 total)
- Auth: `users`, `otp_verifications`, `user_sessions`
- Products: `products`, `product_categories`, `units_of_measure`, `reorder_rules`
- Warehouse: `warehouses`, `locations`
- Operations: `receipts`, `receipt_lines`, `delivery_orders`, `delivery_order_lines`, `transfers`, `transfer_lines`, `stock_adjustments`, `adjustment_lines`
- Inventory: `stock_movements` (immutable ledger), `stock_snapshots` (cache)

### Views (4 total)
- `v_current_stock` — On-hand qty per product/location
- `v_warehouse_stock` — Aggregated per product/warehouse
- `v_global_stock` — Total qty per product
- `v_low_stock_alerts` — Below reorder threshold

---

## 💡 Common Issues & Solutions

| Issue | Solution |
|---|---|
| `ModuleNotFoundError: No module named 'app'` | Run from `backend/` directory |
| `SSL certificate verification failed` | Already handled in `database.py` for Neon |
| `Port 8000 already in use` | `lsof -i :8000` then kill or use `--port 8001` |
| `Access denied when connecting to DB` | Verify `.env` `DATABASE_URL` is correct |
| `CORS errors in browser` | Update `.env` `CORS_ORIGINS` and restart |
| `Empty response on `/api/v1/products/`** | Normal — no products created yet. POST to create. |

---

## 🎯 Next Steps

1. **Verify Backend is Running:**
   ```bash
   curl http://localhost:8000/health
   ```

2. **Create Test Data:**
   ```bash
   curl -X POST http://localhost:8000/api/v1/products/ \
     -H "Content-Type: application/json" \
     -d '{
       "sku": "SKU-001",
       "name": "Test Product",
       "uom_id": "6f8e5e8e-7e8e-8e8e-8e8e-8e8e8e8e8e8e",
       "cost_price": 100,
       "sale_price": 150
     }'
   ```

3. **Start React Frontend:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Check Swagger Docs:**
   - Open http://localhost:8000/docs
   - Try out endpoints interactively

---

## 📞 Support

If you're still seeing "Failed to fetch":

1. Share the **browser console error** (F12 → Console tab)
2. Share the **backend server log** output
3. Share the **exact URL** being called
4. Verify **backend is listening** on 8000:
   ```bash
   netstat -an | findstr 8000
   ```
