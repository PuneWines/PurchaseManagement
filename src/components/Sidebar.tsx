import React from 'react';
import {
  LayoutDashboard,
  FileText,
  CheckCircle,
  Send,
  Truck,
  Package,
  LogOut,
  User
} from 'lucide-react';
import { storageUtils } from '../utils/storage';
import { User as UserType } from '../types';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
  currentUser?: UserType | null;
}

// Helper function to check page access
const hasPageAccess = (user: UserType | null, page: string): boolean => {
  if (!user || !user.pageAccess) return false;

  if (user.pageAccess === "all") return true;

  const normalize = (p: string) => {
    const s = p.trim().toLowerCase();
    if (s === "all") return "all";
    if (s.includes("purchase") || s.includes("po")) return "purchase-order";
    if (s.includes("get") && s.includes("lifting")) return "get-lifting";
    if (s === "lifting") return "get-lifting";
    if (s.includes("cross") && (s.includes("check") || s.includes("receive"))) return "cross-check";
    return s.replace(/\s+/g, "-");
  };

  const allowedPages = user.pageAccess
    .split(',')
    .map(normalize);

  const target = normalize(page);
  return allowedPages.includes(target);
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onPageChange,
  onLogout,
  isOpen = false,
  onClose,
  currentUser
}) => {
  const user = storageUtils.getCurrentUser();

  const allMenuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'indent', label: 'Indent', icon: FileText },
    { id: 'approval', label: 'Approval', icon: CheckCircle },
    { id: 'purchase-order', label: 'Generate & Send PO', icon: Send },
    { id: 'get-lifting', label: 'Get Lifting', icon: Truck },
    { id: 'cross-check', label: 'Cross Check & Receive', icon: Package },
  ];

  // Filter menu items based on user permissions
  const menuItems = allMenuItems.filter(item => hasPageAccess(currentUser || null, item.id));

  const handleMenuClick = (page: string) => {
    onPageChange(page);
    if (onClose) {
      onClose();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white text-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">Purchase App</h1>
              <p className="text-sm text-slate-500">Management System</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="p-4 h-[calc(100%-180px)] overflow-y-auto">
          <div className="flex items-center space-x-3 bg-slate-100 p-3 rounded-lg mb-6 border border-slate-200">
            <div className="bg-green-500 p-2 rounded-full">
              <User className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-slate-800">{user?.username}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item.id)}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-600'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Logout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 bg-white">
          <button
            onClick={onLogout}
            className="w-full flex items-center space-x-3 p-3 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors duration-200"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};
