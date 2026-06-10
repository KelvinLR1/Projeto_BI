import React from 'react';
import { LayoutDashboard, BarChart3, Users, Settings, Search, Bell } from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', active: true },
    { icon: BarChart3, label: 'Analítico', active: false },
    { icon: Users, label: 'Equipe', active: false },
    { icon: Settings, label: 'Configurações', active: false },
  ];

  return (
    <aside className="w-72 h-screen bg-[#0d1117] border-r border-[#ff2d55]/10 flex flex-col p-6 fixed left-0 top-0 z-50">
      {/* Branding */}
      <div className="sidebar-gradient p-8 rounded-3xl mb-10 flex flex-col items-center justify-center shadow-[0_10px_30px_rgba(255,45,85,0.2)]">
        <div className="w-12 h-12 border-4 border-white rounded-lg flex items-center justify-center font-bold text-2xl mb-2">
          A
        </div>
        <h2 className="text-xl font-bold tracking-widest uppercase">HUB BI</h2>
        <span className="text-[10px] tracking-[4px] opacity-70">ANALYTICS</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-4">
        {menuItems.map((item) => (
          <button
            key={item.label}
            className={`w-full flex items-center space-x-4 px-4 py-3 rounded-xl transition-all ${
              item.active 
                ? 'bg-[#ff2d55]/10 text-[#ff2d55] border border-[#ff2d55]/20' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <item.icon size={20} />
            <span className="font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* Bottom Profile Placeholder */}
      <div className="mt-auto pt-6 border-t border-white/5 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-red-600" />
        <div className="flex-1">
          <p className="text-sm font-bold">Jane Doe</p>
          <p className="text-xs text-gray-500">Admin</p>
        </div>
        <Bell size={18} className="text-gray-400 hover:text-[#ff2d55] cursor-pointer" />
      </div>
    </aside>
  );
};

export default Sidebar;
