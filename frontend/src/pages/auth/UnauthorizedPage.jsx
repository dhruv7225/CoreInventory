import { Link } from 'react-router-dom';
import { HiOutlineLockClosed, HiOutlineArrowLeft } from 'react-icons/hi2';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-[var(--color-surface-bg)] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center shadow-lg border border-slate-200">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <HiOutlineLockClosed className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">
          You do not have permission to access this page. Your current role restricts you from viewing this content or performing this action.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--color-primary-600)] hover:bg-[var(--color-primary-700)] text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
        >
          <HiOutlineArrowLeft className="w-4 h-4" />
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
