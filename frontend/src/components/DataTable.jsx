import { useState, useMemo } from 'react';
import { HiChevronUp, HiChevronDown, HiChevronLeft, HiChevronRight } from 'react-icons/hi2';

export default function DataTable({
  columns,
  data = [],
  loading = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  pageSize = 10,
  emptyMessage = 'No data found',
  emptyIcon,
  actions,
  onRowClick,
  serverPagination,
  totalCount,
  currentPage: externalPage,
  onPageChange: externalPageChange,
}) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [internalPage, setInternalPage] = useState(1);

  const isServerPaginated = !!serverPagination;
  const currentPage = isServerPaginated ? externalPage : internalPage;
  const setCurrentPage = isServerPaginated ? externalPageChange : setInternalPage;

  const handleSort = (key) => {
    if (!key) return;
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (isServerPaginated || !sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'string' ? aVal.localeCompare(bVal) : aVal - bVal;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir, isServerPaginated]);

  const total = isServerPaginated ? totalCount : sortedData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paginatedData = isServerPaginated
    ? sortedData
    : sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Skeleton rows
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        {onSearchChange && (
          <div className="p-4 border-b border-slate-100">
            <div className="skeleton h-10 w-72 rounded-lg" />
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {columns.map((col, i) => (
                  <th key={i} className="px-4 py-3 text-left">
                    <div className="skeleton h-4 w-20 rounded" />
                  </th>
                ))}
                {actions && (
                  <th className="px-4 py-3 text-right">
                    <div className="skeleton h-4 w-16 rounded ml-auto" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {columns.map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="skeleton h-4 w-full max-w-[120px] rounded" />
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right">
                      <div className="skeleton h-8 w-20 rounded ml-auto" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {onSearchChange && (
        <div className="p-4 border-b border-slate-100 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchValue}
              onChange={(e) => { onSearchChange(e.target.value); setCurrentPage(1); }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all"
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${col.sortable !== false ? 'cursor-pointer select-none hover:text-slate-700' : ''}`}
                  style={col.width ? { width: col.width } : undefined}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key && (
                      sortDir === 'asc' ? <HiChevronUp className="w-3.5 h-3.5" /> : <HiChevronDown className="w-3.5 h-3.5" />
                    )}
                  </div>
                </th>
              ))}
              {actions && (
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="px-4 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    {emptyIcon || (
                      <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    )}
                    <p className="text-sm text-slate-400 font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, i) => (
                <tr
                  key={row.id || i}
                  className={`table-row-hover transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-sm text-slate-700 whitespace-nowrap">
                      {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {actions(row)}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize && (
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Showing <span className="font-medium text-slate-700">{((currentPage - 1) * pageSize) + 1}</span> to{' '}
            <span className="font-medium text-slate-700">{Math.min(currentPage * pageSize, total)}</span> of{' '}
            <span className="font-medium text-slate-700">{total}</span>
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HiChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page;
              if (totalPages <= 5) page = i + 1;
              else if (currentPage <= 3) page = i + 1;
              else if (currentPage >= totalPages - 2) page = totalPages - 4 + i;
              else page = currentPage - 2 + i;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                    page === currentPage
                      ? 'bg-primary-600 text-white'
                      : 'hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {page}
                </button>
              );
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <HiChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
