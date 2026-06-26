import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { LayoutDashboard, Truck, Users, Receipt, BarChart3 } from 'lucide-react';

const tabs = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Veículos', page: 'Vehicles', icon: Truck },
  { name: 'Motoristas', page: 'Drivers', icon: Users },
  { name: 'Despesas', page: 'Expenses', icon: Receipt },
  { name: 'Relatórios', page: 'Reports', icon: BarChart3 },
];

export default function BottomNav({ currentPageName }) {
  const navigate = useNavigate();

  const handleTabClick = (e, tab) => {
    if (currentPageName === tab.page) {
      e.preventDefault();
      navigate(createPageUrl(tab.page), { replace: true });
    }
  };

  return (
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 flex"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map(tab => {
        const isActive = currentPageName === tab.page;
        return (
          <Link
            key={tab.page}
            to={createPageUrl(tab.page)}
            onClick={(e) => handleTabClick(e, tab)}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 select-none"
          >
            <tab.icon
              className={`w-5 h-5 ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}
              strokeWidth={isActive ? 2.5 : 1.8}
            />
            <span className={`text-[10px] font-medium ${isActive ? 'text-emerald-500' : 'text-slate-400'}`}>
              {tab.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}