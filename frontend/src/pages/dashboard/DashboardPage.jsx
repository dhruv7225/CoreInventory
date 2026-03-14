import { useState } from 'react';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import {
  HiOutlineCube,
  HiOutlineExclamationTriangle,
  HiOutlineArrowDownTray,
  HiOutlineTruck,
  HiOutlineArrowsRightLeft,
  HiOutlineCurrencyDollar,
  HiOutlineBolt,
} from 'react-icons/hi2';

const KpiCard = ({ icon: Icon, label, value, color, loading }) => {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
        <div className="flex items-start justify-between">
          <div className="skeleton w-10 h-10 rounded-xl" />
          <div className="skeleton w-16 h-8 rounded-lg" />
        </div>
        <div className="skeleton w-24 h-4 rounded mt-3" />
      </div>
    );
  }

  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
    cyan: 'bg-cyan-50 text-cyan-600',
    indigo: 'bg-indigo-50 text-indigo-600',
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${colors[color] || colors.blue}`}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-2xl font-bold text-slate-800">{value ?? 0}</span>
      </div>
      <p className="text-sm text-slate-500 font-medium mt-3">{label}</p>
    </div>
  );
};

export default function DashboardPage() {
  const { data: kpis, loading: kpisLoading } = useFetch('/dashboard/kpis');
  const { data: alerts, loading: alertsLoading } = useFetch('/dashboard/low-stock-alerts');
  const [search, setSearch] = useState('');

  const kpiCards = [
    { icon: HiOutlineCube, label: 'Total Products', key: 'total_products', color: 'blue' },
    { icon: HiOutlineExclamationTriangle, label: 'Low Stock Items', key: 'low_stock_count', color: 'red' },
    { icon: HiOutlineArrowDownTray, label: 'Pending Receipts', key: 'pending_receipts', color: 'green' },
    { icon: HiOutlineTruck, label: 'Pending Deliveries', key: 'pending_deliveries', color: 'purple' },
    { icon: HiOutlineArrowsRightLeft, label: 'Pending Transfers', key: 'pending_transfers', color: 'amber' },
    { icon: HiOutlineCurrencyDollar, label: 'Stock Value', key: 'total_stock_value', color: 'indigo', format: (v) => `$${(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` },
    { icon: HiOutlineBolt, label: 'Movements Today', key: 'movements_today', color: 'cyan' },
  ];

  const alertColumns = [
    { key: 'product_name', label: 'Product' },
    { key: 'sku', label: 'SKU' },
    { key: 'warehouse_name', label: 'Warehouse' },
    { key: 'on_hand_qty', label: 'Current Stock', render: (v) => <span className="font-semibold text-red-600">{v}</span> },
    { key: 'min_stock', label: 'Min Stock' },
    { key: 'status', label: 'Status', render: () => <StatusBadge status="low" />, sortable: false },
  ];

  const filteredAlerts = (alerts || []).filter((a) =>
    !search || a.product_name?.toLowerCase().includes(search.toLowerCase()) || a.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your inventory operations</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4 mb-8">
        {kpiCards.map((kpi) => (
          <KpiCard
            key={kpi.key}
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.format ? kpi.format(kpis?.[kpi.key]) : kpis?.[kpi.key]}
            color={kpi.color}
            loading={kpisLoading}
          />
        ))}
      </div>

      {/* Low Stock Alerts */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <HiOutlineExclamationTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-lg font-semibold text-slate-800">Low Stock Alerts</h2>
          {alerts && <span className="text-sm text-slate-400">({alerts.length} items)</span>}
        </div>
        <DataTable
          columns={alertColumns}
          data={filteredAlerts}
          loading={alertsLoading}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by product or SKU..."
          emptyMessage="No low stock alerts — all products are well stocked!"
          pageSize={8}
        />
      </div>
    </div>
  );
}
