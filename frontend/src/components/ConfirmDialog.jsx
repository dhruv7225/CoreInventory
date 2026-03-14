import { HiExclamationTriangle } from 'react-icons/hi2';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', danger = true }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-full ${danger ? 'bg-red-100' : 'bg-amber-100'}`}>
            <HiExclamationTriangle className={`w-6 h-6 ${danger ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{message}</p>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
