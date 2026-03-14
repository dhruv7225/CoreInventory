import { useState } from 'react';
import api from '../../api/axiosClient';
import useFetch from '../../hooks/useFetch';
import DataTable from '../../components/DataTable';
import StatusBadge from '../../components/StatusBadge';
import FormModal from '../../components/FormModal';
import DrawerDetail from '../../components/DrawerDetail';
import { useAuth } from '../../store/AuthContext';
import { useManagerWarehouse } from '../../hooks/useManagerWarehouse';
import toast from 'react-hot-toast';
import { HiOutlinePlus, HiOutlineCheckCircle } from 'react-icons/hi2';

export default function TransfersPage() {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const { hasRole, user } = useAuth();
  const { managerWarehouseId } = useManagerWarehouse();

  const { data: transfersRaw, loading, refetch } = useFetch('/transfers/');
  const { data: warehouses } = useFetch('/warehouses/');
  const { data: products } = useFetch('/products/');
  const { data: uoms } = useFetch('/products/uom/');

  const transfers = Array.isArray(transfersRaw) ? transfersRaw : [];

  const [form, setForm] = useState({
    source_warehouse_id: '', dest_warehouse_id: '', scheduled_date: '', notes: '',
    lines: [{ product_id: '', from_location_id: '', to_location_id: '', quantity: '', uom_id: '' }],
  });
  const [sourceLocations, setSourceLocations] = useState([]);
  const [destLocations, setDestLocations] = useState([]);

  const loadLocations = async (warehouseId, setter) => {
    if (!warehouseId) { setter([]); return; }
    try { const { data } = await api.get(`/warehouses/${warehouseId}/locations`); setter(data); } catch { setter([]); }
  };

  const addLine = () => setForm({ ...form, lines: [...form.lines, { product_id: '', from_location_id: '', to_location_id: '', quantity: '', uom_id: '' }] });
  const removeLine = (i) => setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
  const updateLine = (i, field, value) => { const lines = [...form.lines]; lines[i] = { ...lines[i], [field]: value }; setForm({ ...form, lines }); };

  const handleOpenModal = () => {
    if (user?.role === 'manager' && managerWarehouseId) {
       setForm({ ...form, source_warehouse_id: managerWarehouseId, dest_warehouse_id: managerWarehouseId });
       loadLocations(managerWarehouseId, setSourceLocations);
       loadLocations(managerWarehouseId, setDestLocations);
    }
    setModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.source_warehouse_id || !form.dest_warehouse_id || form.lines.some((l) => !l.product_id || !l.quantity || !l.uom_id || !l.from_location_id || !l.to_location_id)) {
      toast.error('Fill all required fields'); return;
    }
    setSubmitting(true);
    try {
      await api.post('/transfers/', {
        source_warehouse_id: form.source_warehouse_id,
        dest_warehouse_id: form.dest_warehouse_id,
        scheduled_date: form.scheduled_date || null,
        notes: form.notes || null,
        lines: form.lines.map((l) => ({
          product_id: l.product_id, from_location_id: l.from_location_id,
          to_location_id: l.to_location_id, quantity: parseFloat(l.quantity), uom_id: l.uom_id,
        })),
      });
      toast.success('Transfer created');
      setModalOpen(false);
      refetch();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    finally { setSubmitting(false); }
  };

  const handleValidate = async (id) => {
    try { await api.post(`/transfers/${id}/validate`); toast.success('Transfer validated — stock moved'); refetch(); }
    catch (err) { toast.error(err.response?.data?.detail || 'Validation failed'); }
  };

  const filtered = transfers.filter((t) =>
    !search || t.reference?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    { key: 'reference', label: 'Reference', render: (v) => <span className="font-mono text-xs font-semibold text-cyan-600">{v}</span> },
    { key: 'status', label: 'Status', render: (v) => <StatusBadge status={v} />, sortable: false },
    { key: 'created_at', label: 'Created', render: (v) => new Date(v).toLocaleDateString() },
  ];

  const inputCls = "w-full px-3 py-2.5 text-sm rounded-lg border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Internal Transfers</h1>
          <p className="text-sm text-slate-500 mt-1">Move stock between warehouses or locations</p>
        </div>
        {hasRole(['admin', 'manager']) && (
          <button onClick={handleOpenModal} className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors">
            <HiOutlinePlus className="w-4 h-4" /> New Transfer
          </button>
        )}
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search transfers..." emptyMessage="No transfers yet"
        actions={(row) => row.status === 'draft' && hasRole(['admin', 'manager']) && (
          <button onClick={(e) => { e.stopPropagation(); handleValidate(row.id); }} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-100 transition-colors">
            <HiOutlineCheckCircle className="w-3.5 h-3.5" /> Validate
          </button>
        )}
        onRowClick={(row) => setSelectedRecord(row)}
      />

      <DrawerDetail 
        isOpen={!!selectedRecord} 
        onClose={() => setSelectedRecord(null)}
        title={selectedRecord ? `Transfer: ${selectedRecord.reference}` : ''}
      >
        {selectedRecord && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <StatusBadge status={selectedRecord.status} />
              <span className="text-sm text-slate-500">{new Date(selectedRecord.created_at).toLocaleString()}</span>
            </div>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Source</p>
                  <p className="text-sm font-medium text-slate-800">{selectedRecord.source_warehouse?.name || `ID: ${selectedRecord.source_warehouse_id}`}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Destination</p>
                  <p className="text-sm font-medium text-slate-800">{selectedRecord.dest_warehouse?.name || `ID: ${selectedRecord.dest_warehouse_id}`}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Scheduled Date</p>
                <p className="text-sm font-medium text-slate-800">{selectedRecord.scheduled_date ? new Date(selectedRecord.scheduled_date).toLocaleDateString() : '—'}</p>
              </div>
              {selectedRecord.notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{selectedRecord.notes}</p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">Line Items</h3>
              <div className="space-y-3">
                {selectedRecord.lines?.map((line) => (
                  <div key={line.id} className="p-3 border border-slate-100 rounded-lg bg-white">
                    <div className="flex items-start justify-between mb-2">
                       <p className="text-sm font-semibold text-slate-800">{line.product?.name || `Product: ${line.product_id}`}</p>
                       <p className="text-sm font-bold text-primary-700">{line.quantity} <span className="text-xs font-normal text-slate-500">{line.uom?.name || 'unit'}</span></p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                      <span className="bg-red-50 text-red-700 font-medium px-2 py-0.5 rounded border border-red-100">{line.from_location?.name || 'Src Loc'}</span>
                      →
                      <span className="bg-emerald-50 text-emerald-700 font-medium px-2 py-0.5 rounded border border-emerald-100">{line.to_location?.name || 'Dest Loc'}</span>
                    </div>
                  </div>
                ))}
                {(!selectedRecord.lines || selectedRecord.lines.length === 0) && (
                   <p className="text-sm text-slate-400 italic text-center py-4">No line items found.</p>
                )}
              </div>
            </div>

            {selectedRecord.status === 'draft' && hasRole(['admin', 'manager']) && (
              <div className="pt-4 border-t border-slate-100">
                <button 
                  onClick={() => { handleValidate(selectedRecord.id); setSelectedRecord(null); }}
                  className="w-full flex justify-center items-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow-sm transition-all"
                >
                  <HiOutlineCheckCircle className="w-5 h-5" /> Validate Transfer
                </button>
              </div>
            )}
          </div>
        )}
      </DrawerDetail>

      <FormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Internal Transfer" size="lg">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Source Warehouse *</label>
              <select disabled={!!managerWarehouseId} value={form.source_warehouse_id} onChange={(e) => { setForm({ ...form, source_warehouse_id: e.target.value }); loadLocations(e.target.value, setSourceLocations); }} className={inputCls}>
                <option value="">Select</option>
                {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Destination Warehouse *</label>
              <select disabled={!!managerWarehouseId} value={form.dest_warehouse_id} onChange={(e) => { setForm({ ...form, dest_warehouse_id: e.target.value }); loadLocations(e.target.value, setDestLocations); }} className={inputCls}>
                <option value="">Select</option>
                {(warehouses || []).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div><label className="block text-sm font-medium text-slate-700 mb-1">Scheduled Date</label><input type="date" value={form.scheduled_date} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} className={inputCls} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700">Transfer Lines</label>
              <button type="button" onClick={addLine} className="text-xs text-primary-600 hover:text-primary-700 font-medium">+ Add Line</button>
            </div>
            <div className="space-y-2">
              {form.lines.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end bg-slate-50 p-3 rounded-lg">
                  <div className="col-span-2"><label className="block text-xs text-slate-500 mb-1">Product *</label><select value={line.product_id} onChange={(e) => updateLine(i, 'product_id', e.target.value)} className={inputCls}><option value="">Select</option>{(products || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                  <div className="col-span-3"><label className="block text-xs text-slate-500 mb-1">From Location *</label><select value={line.from_location_id} onChange={(e) => updateLine(i, 'from_location_id', e.target.value)} className={inputCls}><option value="">Select</option>{sourceLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                  <div className="col-span-3"><label className="block text-xs text-slate-500 mb-1">To Location *</label><select value={line.to_location_id} onChange={(e) => updateLine(i, 'to_location_id', e.target.value)} className={inputCls}><option value="">Select</option>{destLocations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></div>
                  <div className="col-span-2"><label className="block text-xs text-slate-500 mb-1">Qty *</label><input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => updateLine(i, 'quantity', e.target.value)} className={inputCls} /></div>
                  <div className="col-span-1"><label className="block text-xs text-slate-500 mb-1">UOM</label><select value={line.uom_id} onChange={(e) => updateLine(i, 'uom_id', e.target.value)} className={inputCls}><option value="">-</option>{(uoms || []).map((u) => <option key={u.id} value={u.id}>{u.symbol}</option>)}</select></div>
                  <div className="col-span-1">{form.lines.length > 1 && <button type="button" onClick={() => removeLine(i)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">✕</button>}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors">{submitting ? 'Creating...' : 'Create Transfer'}</button>
          </div>
        </form>
      </FormModal>
    </div>
  );
}
