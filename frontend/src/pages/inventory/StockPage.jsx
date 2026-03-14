import { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { HiOutlineArrowsRightLeft } from 'react-icons/hi2';
import { Link, useSearchParams } from 'react-router-dom';

export default function StockPage() {
  const [search, setSearch] = useState('');
  const { data: stockRaw, loading } = useFetch('/inventory/stock');
  const stock = Array.isArray(stockRaw) ? stockRaw : [];

  const filtered = stock.filter((s) =>
    !search || s.product_name?.toLowerCase().includes(search.toLowerCase()) || s.sku?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'product_name', label: 'Product', render: (v) => <span className="font-medium text-slate-800">{v}</span> },
    { key: 'sku', label: 'SKU', render: (v) => <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{v}</span> },
    { key: 'warehouse_name', label: 'Warehouse' },
    { key: 'location_name', label: 'Location' },
    {
      key: 'on_hand_qty', label: 'Quantity',
      render: (v) => <span className={`font-semibold ${v <= 0 ? 'text-red-600' : 'text-slate-800'}`}>{v}</span>,
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Current Stock</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time stock levels across all warehouses and locations</p>
        </div>
        <Link to="/inventory/movements" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
          <HiOutlineArrowsRightLeft className="w-4 h-4" /> View Movements
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by product or SKU..."
        emptyMessage="No stock records found"
        pageSize={15}
      />
    </div>
  );
}