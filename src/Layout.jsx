import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import {
  LayoutDashboard, Truck, Users, Receipt, Fuel, FileText,
  BarChart3, Database, Menu, X, LogOut, Building2, ChevronRight, ArrowLeft, HandCoins
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import BottomNav from './components/layout/BottomNav';
import DeleteAccountDialog from './components/layout/DeleteAccountDialog';

const navItems = [
  { name: 'Dashboard', page: 'Dashboard', icon: LayoutDashboard },
  { name: 'Veículos', page: 'Vehicles', icon: Truck },
  { name: 'Motoristas', page: 'Drivers', icon: Users },
  { name: 'Despesas', page: 'Expenses', icon: Receipt },
  { name: 'Abastecimento', page: 'Fueling', icon: Fuel },
  { name: 'Faturamento', page: 'Billing', icon: FileText },
  { name: 'Adiantamentos', page: 'Advances', icon: HandCoins },
  { name: 'Relatórios', page: 'Reports', icon: BarChart3 },
  { name: 'Backup', page: 'Backup', icon: Database },
];

const BOTTOM_NAV_PAGES = ['Dashboard', 'Vehicles', 'Drivers', 'Expenses', 'Reports'];
const NO_LAYOUT_PAGES = ['CompanySetup', 'DriverInviteAccept', 'DriverPortal'];

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [company, setCompany] = useState(null);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const me = await base44.auth.me();
        setUser(me);
        // Redireciona para o DriverPortal se o usuário tiver um Driver cadastrado com seu email
        const drivers = await base44.entities.Driver.filter({ email: me.email });
        if (drivers.length > 0) {
          if (currentPageName !== 'DriverPortal' && currentPageName !== 'DriverInviteAccept') {
            navigate(createPageUrl('DriverPortal'));
          }
          return;
        }
        const companies = await base44.entities.Company.filter({ owner_email: me.email });
        if (companies.length > 0) setCompany(companies[0]);
      } catch (e) { /* not logged in */ }
    }
    load();
  }, [currentPageName]);

  if (NO_LAYOUT_PAGES.includes(currentPageName)) {
    return <>{children}</>;
  }

  const isDashboard = currentPageName === 'Dashboard';
  const isBottomTab = BOTTOM_NAV_PAGES.includes(currentPageName);

  return (
    <div
      className="flex h-screen bg-slate-50 overflow-hidden"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — desktop only */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 
        transform transition-transform duration-200 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col select-none
      `}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b border-slate-800">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-lg tracking-tight">TransportaBR</span>
          <button className="lg:hidden ml-auto text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Company info */}
        {company && (
          <div className="px-5 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="text-sm text-slate-400 truncate">{company.name}</span>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = currentPageName === item.page;
            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 select-none
                  ${isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }
                `}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.name}</span>
                {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        <div
          className="px-3 py-4 border-t border-slate-800"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
        >
          <div className="flex items-center gap-3 px-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-300">
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-300 truncate">{user?.full_name || 'Usuário'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => base44.auth.logout()}
              className="text-slate-500 hover:text-slate-300 transition-colors select-none"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          {company && <DeleteAccountDialog company={company} />}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header
          className="lg:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 select-none"
        >
          {isDashboard ? (
            <button onClick={() => setSidebarOpen(true)}>
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
          ) : (
            <button onClick={() => navigate(-1)} className="p-1 -ml-1 rounded-lg hover:bg-slate-100">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-emerald-500 rounded-md flex items-center justify-center">
              <Truck className="w-3 h-3 text-white" />
            </div>
            <span className="font-bold text-slate-800">TransportaBR</span>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto"
          style={{
            overscrollBehavior: 'none',
            paddingBottom: isBottomTab ? 'calc(env(safe-area-inset-bottom) + 60px)' : 'env(safe-area-inset-bottom)',
          }}
        >
          {children}
        </main>
      </div>

      {/* Bottom Tab Nav — mobile only. Escondida quando o menu lateral está aberto,
          senão as tabs cobrem o rodapé da barra (incluindo "Excluir Conta"). */}
      {!sidebarOpen && <BottomNav currentPageName={currentPageName} />}
    </div>
  );
}