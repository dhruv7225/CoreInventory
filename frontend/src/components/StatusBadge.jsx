const variants = {
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  confirmed: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-amber-50 text-amber-700 border-amber-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-600 border-red-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-500 border-slate-200',
  low: 'bg-red-50 text-red-600 border-red-200',
  receipt: 'bg-blue-50 text-blue-700 border-blue-200',
  delivery: 'bg-purple-50 text-purple-700 border-purple-200',
  internal_transfer: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  adjustment: 'bg-amber-50 text-amber-700 border-amber-200',
};

const labels = {
  draft: 'Draft',
  confirmed: 'Confirmed',
  in_progress: 'In Progress',
  done: 'Done',
  cancelled: 'Cancelled',
  active: 'Active',
  inactive: 'Inactive',
  low: 'Low Stock',
  receipt: 'Receipt',
  delivery: 'Delivery',
  internal_transfer: 'Transfer',
  adjustment: 'Adjustment',
};

export default function StatusBadge({ status, className = '' }) {
  const key = (status || '').toLowerCase().replace(/ /g, '_');
  const variant = variants[key] || variants.draft;
  const label = labels[key] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variant} ${className}`}>
      {label}
    </span>
  );
}
