import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import {
  HiBars3,
  HiBell,
  HiMagnifyingGlass,
  HiOutlineUser,
  HiOutlineArrowRightOnRectangle,
} from 'react-icons/hi2';

export default function Topbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
        >
          <HiBars3 className="w-5 h-5" />
        </button>
        {/* Search */}
        <div className="hidden sm:flex items-center relative">
          <HiMagnifyingGlass className="absolute left-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search anything..."
            className="pl-9 pr-4 py-2 w-72 text-sm rounded-lg bg-slate-50 border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <HiBell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-sm">
              <span className="text-white text-xs font-bold">
                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="hidden md:block text-left">
              <p className="text-sm font-semibold text-slate-700 leading-tight">{user?.full_name || 'User'}</p>
              <p className="text-[11px] text-slate-400 capitalize">{user?.role || 'viewer'}</p>
            </div>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
              <div className="px-4 py-2.5 border-b border-slate-100">
                <p className="text-sm font-semibold text-slate-800">{user?.full_name}</p>
                <p className="text-xs text-slate-400">{user?.email}</p>
              </div>
              <button
                onClick={() => { setDropdownOpen(false); navigate('/profile'); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <HiOutlineUser className="w-4 h-4" />
                My Profile
              </button>
              <div className="border-t border-slate-100 my-1" />
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <HiOutlineArrowRightOnRectangle className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
