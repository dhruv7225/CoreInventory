import { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import { Link } from 'react-router-dom';
import { HiOutlineChartBarSquare } from 'react-icons/hi2';

export default function MovementsPage() {
  const [search, setSearch] = useState('');
  const { data: movementsRaw, loading } = useFetch('/inventory/movements');
  const movements = Array.isArray(movementsRaw) ? movementsRaw : [];

  const filtered = movements.filter((m) =>
    !search || m.movement_type?.toLowerCase().includes(search.toLowerCase()) || m.reference_type?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'created_at', label: 'Date', render: (v) => new Date(v).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) },
    { key: 'product_id', label: 'Product ID', render: (v) => <span className="font-mono text-xs">{v?.slice(0, 8)}...</span> },
    { key: 'from_location_id', label: 'From', render: (v) => v ? <span className="font-mono text-xs">{v.slice(0, 8)}...</span> : <span className="text-slate-400">—</span> },
    { key: 'to_location_id', label: 'To', render: (v) => v ? <span className="font-mono text-xs">{v.slice(0, 8)}...</span> : <span className="text-slate-400">—</span> },
    { key: 'movement_type', label: 'Type', render: (v) => <StatusBadge status={v} />, sortable: false },
    { key: 'quantity', label: 'Quantity', render: (v) => <span className="font-semibold">{v}</span> },
    { key: 'reference_type', label: 'Reference', render: (v) => <span className="capitalize text-sm">{v}</span> },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Stock Movements</h1>
          <p className="text-sm text-slate-500 mt-1">Complete ledger of all stock movements</p>
        </div>
        <Link to="/inventory/stock" className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors">
          <HiOutlineChartBarSquare className="w-4 h-4" /> View Stock
        </Link>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by movement type..."
        emptyMessage="No movements recorded yet"
        pageSize={15}
      />
    </div>
  );
}
