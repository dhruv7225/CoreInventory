import React, { useState } from 'react';
import api from '../../api/axiosClient';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import FormModal from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineTrash, HiOutlineMapPin, HiOutlineChevronRight, HiOutlineChevronDown } from 'react-icons/hi2';

export default function WarehousesPage() {
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [locationModalOpen, setLocationModalOpen] = useState(false);
    const [selectedWarehouse, setSelectedWarehouse] = useState(null);
    const [expandedRows, setExpandedRows] = useState({});
    const [locations, setLocations] = useState({});
    const [form, setForm] = useState({ name: '', code: '', address: '', city: '', state: '', country: '' });
    const [locationForm, setLocationForm] = useState({ name: '', code: '', location_type: 'rack', parent_id: '' });
    const [submitting, setSubmitting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const { data: warehousesRaw, loading, refetch } = useFetch('/warehouses/');
    const warehouses = Array.isArray(warehousesRaw) ? warehousesRaw : [];

    const filtered = warehouses.filter((w) =>
        !search || w.name?.toLowerCase().includes(search.toLowerCase()) || w.code?.toLowerCase().includes(search.toLowerCase())
    );

    const toggleExpand = async (id) => {
        if (expandedRows[id]) {
            setExpandedRows((prev) => ({ ...prev, [id]: false }));
            return;
        }
        try {
            const { data } = await api.get(`/warehouses/${id}/locations`);
            setLocations((prev) => ({ ...prev, [id]: data }));
            setExpandedRows((prev) => ({ ...prev, [id]: true }));
        } catch {
            toast.error('Failed to load locations');
        }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!form.name || !form.code) { toast.error('Name and code are required'); return; }
        setSubmitting(true);
        try {
            await api.post('/warehouses/', form);
            toast.success('Warehouse created');
            setModalOpen(false);
            setForm({ name: '', code: '', address: '', city: '', state: '', country: '' });
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        } finally { setSubmitting(false); }
    };

    const handleCreateLocation = async (e) => {
        e.preventDefault();
        if (!locationForm.name || !locationForm.code) { toast.error('Name and code are required'); return; }
        setSubmitting(true);
        try {
            await api.post(`/warehouses/${selectedWarehouse.id}/locations`, {
                warehouse_id: selectedWarehouse.id,
                ...locationForm,
                parent_id: locationForm.parent_id || null,
            });
            toast.success('Location created');
            setLocationModalOpen(false);
            // Refresh locations
            const { data } = await api.get(`/warehouses/${selectedWarehouse.id}/locations`);
            setLocations((prev) => ({ ...prev, [selectedWarehouse.id]: data }));
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        } finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/warehouses/${deleteTarget.id}`);
            toast.success('Warehouse deleted');
            refetch();
        } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    };

    const buildTree = (items, parentId = null) => {
        return (items || [])
            .filter((l) => l.parent_id === parentId)
            .map((l) => ({ ...l, children: buildTree(items, l.id) }));
    };

    const LocationTree = ({ items, depth = 0 }) => (
        <div className={depth > 0 ? 'ml-6 border-l border-slate-200 pl-3' : ''}>
            {items.map((loc) => (
                <div key={loc.id}>
                    <div className="flex items-center gap-2 py-1.5 text-sm">
                        <HiOutlineMapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        <span className="font-medium text-slate-700">{loc.name}</span>
                        <span className="text-xs text-slate-400 font-mono">({loc.code})</span>
                        <span className="text-xs text-slate-400 capitalize">— {loc.location_type}</span>
                    </div>
                    {loc.children?.length > 0 && <LocationTree items={loc.children} depth={depth + 1} />}
                </div>
            ))}
        </div>
    );

    const columns = [
        {
            key: 'expand', label: '', width: '40px', sortable: false,
            render: (_, row) => (
                <button onClick={(e) => { e.stopPropagation(); toggleExpand(row.id); }} className="p-1 rounded hover:bg-slate-100 transition-colors">
                    {expandedRows[row.id] ? <HiOutlineChevronDown className="w-4 h-4 text-slate-500" /> : <HiOutlineChevronRight className="w-4 h-4 text-slate-400" />}
                </button>
            ),
        },
        { key: 'name', label: 'Name', render: (v) => <span className="font-medium text-slate-800">{v}</span> },
        { key: 'code', label: 'Code', render: (v) => <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{v}</span> },
        { key: 'city', label: 'City' },
        { key: 'is_active', label: 'Status', render: (v) => <span className={`text-xs font-semibold ${v ? 'text-emerald-600' : 'text-slate-400'}`}>{v ? 'Active' : 'Inactive'}</span> },
    ];

    const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all";

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Warehouses</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage warehouses and storage locations</p>
                </div>
                <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
                    <HiOutlinePlus className="w-4 h-4" /> Add Warehouse
                </button>
            </div>

            {/* Custom table with expandable rows */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Search */}
                <div className="p-4 border-b border-slate-100">
                    <div className="relative max-w-sm">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search warehouses..." className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all" />
                    </div>
                </div>

                {loading ? (
                    <div className="p-8 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-lg" />)}</div>
                ) : (
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50/80 border-b border-slate-200">
                                <th className="w-10" />
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Code</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">City</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan={6} className="px-4 py-16 text-center text-sm text-slate-400">No warehouses found</td></tr>
                            ) : filtered.map((w) => (
                                <React.Fragment key={w.id}>
                                    <tr className="table-row-hover transition-colors">
                                        <td className="px-2 py-3 text-center">
                                            <button onClick={() => toggleExpand(w.id)} className="p-1 rounded hover:bg-slate-100 transition-colors">
                                                {expandedRows[w.id] ? <HiOutlineChevronDown className="w-4 h-4 text-slate-500" /> : <HiOutlineChevronRight className="w-4 h-4 text-slate-400" />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-slate-800">{w.name}</td>
                                        <td className="px-4 py-3"><span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{w.code}</span></td>
                                        <td className="px-4 py-3 text-sm text-slate-600">{w.city || '—'}</td>
                                        <td className="px-4 py-3"><span className={`text-xs font-semibold ${w.is_active ? 'text-emerald-600' : 'text-slate-400'}`}>{w.is_active ? 'Active' : 'Inactive'}</span></td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => { setSelectedWarehouse(w); setLocationForm({ name: '', code: '', location_type: 'rack', parent_id: '' }); setLocationModalOpen(true); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors" title="Add Location">
                                                    <HiOutlinePlus className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => setDeleteTarget(w)} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                                                    <HiOutlineTrash className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    {expandedRows[w.id] && (
                                        <tr>
                                            <td colSpan={6} className="bg-slate-50/50 px-6 py-4">
                                                {(locations[w.id] || []).length === 0 ? (
                                                    <p className="text-sm text-slate-400 italic">No locations defined</p>
                                                ) : (
                                                    <LocationTree items={buildTree(locations[w.id])} />
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Create Warehouse Modal */}
            <FormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New Warehouse">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label><input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Code *</label><input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className={inputCls} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">City</label><input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputCls} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">State</label><input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputCls} /></div>
                        <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Country</label><input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputCls} /></div>
                        <div className="col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Address</label><textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={`${inputCls} h-16 resize-none`} /></div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                        <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">{submitting ? 'Creating...' : 'Create'}</button>
                    </div>
                </form>
            </FormModal>

            {/* Add Location Modal */}
            <FormModal isOpen={locationModalOpen} onClose={() => setLocationModalOpen(false)} title={`Add Location to ${selectedWarehouse?.name}`}>
                <form onSubmit={handleCreateLocation} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Name *</label><input type="text" value={locationForm.name} onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })} className={inputCls} /></div>
                        <div><label className="block text-sm font-medium text-slate-700 mb-1">Code *</label><input type="text" value={locationForm.code} onChange={(e) => setLocationForm({ ...locationForm, code: e.target.value })} className={inputCls} /></div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                            <select value={locationForm.location_type} onChange={(e) => setLocationForm({ ...locationForm, location_type: e.target.value })} className={inputCls}>
                                <option value="warehouse">Warehouse</option>
                                <option value="rack">Rack</option>
                                <option value="production">Production</option>
                                <option value="vendor">Vendor</option>
                                <option value="customer">Customer</option>
                                <option value="adjustment">Adjustment</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Parent Location</label>
                            <select value={locationForm.parent_id} onChange={(e) => setLocationForm({ ...locationForm, parent_id: e.target.value })} className={inputCls}>
                                <option value="">None (Root)</option>
                                {(locations[selectedWarehouse?.id] || []).map((l) => <option key={l.id} value={l.id}>{l.name} ({l.code})</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={() => setLocationModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
                        <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">{submitting ? 'Creating...' : 'Create'}</button>
                    </div>
                </form>
            </FormModal>

            <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title="Delete Warehouse" message={`Delete "${deleteTarget?.name}"? All locations will also be removed.`} />
        </div>
    );
}