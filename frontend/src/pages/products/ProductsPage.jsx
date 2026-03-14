import { useState, useEffect } from 'react';
import api from '../../api/axiosClient';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import FormModal from '../../components/FormModal';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useAuth } from '../../store/AuthContext';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlinePencilSquare, HiOutlineTrash } from 'react-icons/hi2';

const emptyProduct = { sku: '', name: '', description: '', category_id: '', uom_id: '', barcode: '', weight: '', cost_price: '', sale_price: '', image_url: '' };

export default function ProductsPage() {
    const [search, setSearch] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyProduct);
    const [submitting, setSubmitting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const { hasRole } = useAuth();

    const { data: productsRaw, loading, refetch } = useFetch('/products/');
    const { data: categories } = useFetch('/products/categories/');
    const { data: uoms } = useFetch('/products/uom/');

    const products = Array.isArray(productsRaw) ? productsRaw : [];

    const filteredProducts = products.filter((p) =>
        !search || p.name?.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase())
    );

    const openCreate = () => { setEditing(null); setForm(emptyProduct); setModalOpen(true); };
    const openEdit = (p) => {
        setEditing(p);
        setForm({
            sku: p.sku || '', name: p.name || '', description: p.description || '',
            category_id: p.category_id || '', uom_id: p.uom_id || '', barcode: p.barcode || '',
            weight: p.weight ?? '', cost_price: p.cost_price ?? '', sale_price: p.sale_price ?? '',
            image_url: p.image_url || '',
        });
        setModalOpen(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name || !form.sku || !form.uom_id) {
            toast.error('Name, SKU, and UOM are required');
            return;
        }
        setSubmitting(true);
        try {
            const payload = {
                ...form,
                category_id: form.category_id || null,
                uom_id: form.uom_id,
                weight: form.weight ? parseFloat(form.weight) : null,
                cost_price: parseFloat(form.cost_price) || 0,
                sale_price: parseFloat(form.sale_price) || 0,
                image_url: form.image_url || null,
                barcode: form.barcode || null,
            };
            if (editing) {
                await api.patch(`/products/${editing.id}`, payload);
                toast.success('Product updated');
            } else {
                await api.post('/products/', payload);
                toast.success('Product created');
            }
            setModalOpen(false);
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Operation failed');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/products/${deleteTarget.id}`);
            toast.success('Product deleted');
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Delete failed');
        }
    };

    const getCategoryName = (id) => categories?.find((c) => c.id === id)?.name || '—';
    const getUomName = (id) => uoms?.find((u) => u.id === id)?.symbol || '—';

    const columns = [
        { key: 'sku', label: 'SKU', render: (v) => <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{v}</span> },
        { key: 'name', label: 'Product Name', render: (v) => <span className="font-medium text-slate-800">{v}</span> },
        { key: 'category_id', label: 'Category', render: (v) => getCategoryName(v) },
        { key: 'uom_id', label: 'UOM', render: (v) => getUomName(v) },
        { key: 'cost_price', label: 'Cost', render: (v) => `$${(v || 0).toFixed(2)}` },
        { key: 'sale_price', label: 'Sale', render: (v) => `$${(v || 0).toFixed(2)}` },
        { key: 'is_active', label: 'Status', render: (v) => <StatusBadge status={v ? 'active' : 'inactive'} />, sortable: false },
    ];

    const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all";

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Products</h1>
                    <p className="text-sm text-slate-500 mt-1">Manage your product catalog</p>
                </div>
                {hasRole(['admin', 'manager']) && (
                    <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
                        <HiOutlinePlus className="w-4 h-4" /> Add Product
                    </button>
                )}
            </div>

            <DataTable
                columns={columns}
                data={filteredProducts}
                loading={loading}
                searchValue={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search by name or SKU..."
                emptyMessage="No products yet. Create your first product."
                actions={(row) => hasRole(['admin', 'manager']) && (
                    <>
                        <button onClick={(e) => { e.stopPropagation(); openEdit(row); }} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors">
                            <HiOutlinePencilSquare className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }} className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 transition-colors">
                            <HiOutlineTrash className="w-4 h-4" />
                        </button>
                    </>
                )}
            />

            {/* Create/Edit Modal */}
            <FormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Product' : 'New Product'} size="lg">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} placeholder="Product name" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">SKU *</label>
                            <input type="text" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputCls} placeholder="SKU-001" disabled={!!editing} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                            <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={inputCls}>
                                <option value="">None</option>
                                {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Unit of Measure *</label>
                            <select value={form.uom_id} onChange={(e) => setForm({ ...form, uom_id: e.target.value })} className={inputCls}>
                                <option value="">Select UOM</option>
                                {(uoms || []).map((u) => <option key={u.id} value={u.id}>{u.name} ({u.symbol})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cost Price</label>
                            <input type="number" step="0.01" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} className={inputCls} placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Sale Price</label>
                            <input type="number" step="0.01" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className={inputCls} placeholder="0.00" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Barcode</label>
                            <input type="text" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} className={inputCls} placeholder="Barcode" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Weight</label>
                            <input type="number" step="0.01" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} className={inputCls} placeholder="kg" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} h-20 resize-none`} placeholder="Product description..." />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Image URL</label>
                        <input type="text" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={inputCls} placeholder="https://..." />
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
                        <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">
                            {submitting ? 'Saving...' : editing ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </FormModal>

            <ConfirmDialog
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Delete Product"
                message={`Are you sure you want to delete "${deleteTarget?.name}"? This action cannot be undone.`}
            />
        </div>
    );
}