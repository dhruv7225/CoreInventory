import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import {
  HiOutlineHome,
  HiOutlineCube,
  HiOutlineBuildingStorefront,
  HiOutlineArrowDownTray,
  HiOutlineTruck,
  HiOutlineArrowsRightLeft,
  HiOutlineAdjustmentsHorizontal,
  HiOutlineChartBarSquare,
  HiOutlineCog6Tooth,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineArrowRightOnRectangle,
  HiOutlineClipboardDocumentList,
  HiOutlineUser,
} from 'react-icons/hi2';

const navItems = [
  { label: 'Dashboard', path: '/', icon: HiOutlineHome },
  { label: 'Products', path: '/products', icon: HiOutlineCube },
  {
    label: 'Operations',
    icon: HiOutlineClipboardDocumentList,
    children: [
      { label: 'Receipts', path: '/receipts', icon: HiOutlineArrowDownTray },
      { label: 'Deliveries', path: '/deliveries', icon: HiOutlineTruck },
      { label: 'Transfers', path: '/transfers', icon: HiOutlineArrowsRightLeft },
      { label: 'Adjustments', path: '/adjustments', icon: HiOutlineAdjustmentsHorizontal },
    ],
  },
  { label: 'Inventory', path: '/inventory/stock', icon: HiOutlineChartBarSquare },
  {
    label: 'Settings',
    icon: HiOutlineCog6Tooth,
    children: [
      { label: 'Warehouses', path: '/warehouses', icon: HiOutlineBuildingStorefront },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openMenus, setOpenMenus] = useState({ Operations: true, Settings: false });

  const toggleMenu = (label) => {
    setOpenMenus((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const linkClasses = (isActive) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
      isActive
        ? 'bg-primary-600/20 text-primary-300 border-l-2 border-primary-400'
        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
    }`;

  return (
    <aside
      className={`fixed top-0 left-0 h-full bg-sidebar z-40 flex flex-col sidebar-transition ${
        collapsed ? 'w-0 -translate-x-full md:w-[70px] md:translate-x-0' : 'w-64'
      }`}
    >
      {/* Logo */}
      <div className="h-16 flex items-center px-4 border-b border-white/5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
            <span className="text-white font-bold text-sm">CI</span>
          </div>
          {!collapsed && (
            <div className="whitespace-nowrap">
              <h1 className="text-white font-bold text-sm leading-tight">CoreInventory</h1>
              <p className="text-slate-500 text-[10px] font-medium">ERP System</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          if (item.children) {
            const isOpen = openMenus[item.label];
            if (collapsed) {
              return item.children.map((child) => (
                <NavLink
                  key={child.path}
                  to={child.path}
                  title={child.label}
                  className={({ isActive }) => linkClasses(isActive)}
                >
                  <child.icon className="w-5 h-5 flex-shrink-0" />
                </NavLink>
              ));
            }
            return (
              <div key={item.label}>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-slate-200 transition-all duration-200 w-full"
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.label}</span>
                  {isOpen ? (
                    <HiOutlineChevronDown className="w-4 h-4" />
                  ) : (
                    <HiOutlineChevronRight className="w-4 h-4" />
                  )}
                </button>
                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/5 pl-3">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) => linkClasses(isActive)}
                      >
                        <child.icon className="w-4 h-4 flex-shrink-0" />
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={item.label}
              end={item.path === '/'}
              className={({ isActive }) => linkClasses(isActive)}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      {!collapsed && (
        <div className="p-3 border-t border-white/5 space-y-1">
          <NavLink
            to="/profile"
            className={({ isActive }) => linkClasses(isActive)}
          >
            <HiOutlineUser className="w-5 h-5 flex-shrink-0" />
            <span>Profile</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 w-full"
          >
            <HiOutlineArrowRightOnRectangle className="w-5 h-5 flex-shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      )}
    </aside>
  );
}
