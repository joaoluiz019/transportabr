import React, { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useCompany } from '../components/hooks/useCompany';
import { usePageData } from '../components/hooks/usePageData';
import PullToRefresh from '../components/layout/PullToRefresh';
import {
  Truck, Users, Receipt, Fuel, FileText, BarChart3,
  Database, AlertTriangle, Loader2, ArrowRight,
  HandCoins
} from 'lucide-react';
import NotificationBell from '../components/dashboard/NotificationBell';

const shortcuts = [
  { name: 'Veículos', page: 'Vehicles', icon: Truck, color: 'bg-blue-500', desc: 'Gerenciar frota' },
  { name: 'Motoristas', page: 'Drivers', icon: Users, color: 'bg-purple-500', desc: 'Equipe de condutores' },
  { name: 'Despesas', page: 'Expenses', icon: Receipt, color: 'bg-rose-500', desc: 'Controlar gastos' },
  { name: 'Abastecimento', page: 'Fueling', icon: Fuel, color: 'bg-amber-500', desc: 'Registro de combustível' },
  { name: 'Faturamento', page: 'Billing', icon: FileText, color: 'bg-emerald-500', desc: 'Receitas e serviços' },
  { name: 'Adiantamentos', page: 'Advances', icon: HandCoins, color: 'bg-orange-500', desc: 'Acertos com motoristas' },
  { name: 'Relatórios', page: 'Reports', icon: BarChart3, color: 'bg-indigo-500', desc: 'Análises e KPIs' },
  { name: 'Backup', page: 'Backup', icon: Database, color: 'bg-slate-500', desc: 'Exportar e importar' },
];

export default function Dashboard() {
  const { company, loading } = useCompany();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !company) {
      navigate(createPageUrl('CompanySetup'));
    }
  }, [loading, company, navigate]);

  const { data: stats = {
    vehicles: 0, drivers: 0, totalExpenses: 0,
    totalBilling: 0, totalFueling: 0, alerts: []
  }, refetch: loadStats } = usePageData('dashboard-stats', company, async () => {
    const [vehicles, drivers, expenses, billings, fuelings] = await Promise.all([
      base44.entities.Vehicle.filter({ company_id: company.id }),
      base44.entities.Driver.filter({ company_id: company.id }),
      base44.entities.Expense.filter({ company_id: company.id }),
      base44.entities.Billing.filter({ company_id: company.id }),
      base44.entities.Fueling.filter({ company_id: company.id }),
    ]);

    const totalExpenses = expenses.reduce((s, e) => s + (e.amount || 0), 0);
    const totalBilling = billings.reduce((s, b) => s + (b.amount || 0), 0);
    const totalFueling = fuelings.reduce((s, f) => s + (f.total_cost || 0), 0);

    // Build alerts
    const alerts = [];
    expenses.forEach(exp => {
      if (exp.next_service_date) {
        const diff = Math.ceil((new Date(exp.next_service_date) - new Date()) / (1000 * 60 * 60 * 24));
        if (diff <= 30 && diff > 0) {
          alerts.push({ type: 'service', plate: exp.vehicle_plate, days: diff });
        }
      }
    });

    return {
      vehicles: vehicles.length,
      drivers: drivers.length,
      totalExpenses,
      totalBilling,
      totalFueling,
      alerts,
    };
  });

  if (loading || !company) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadStats}>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-800">
              Bem-vindo, {company.name}
            </h1>
            <p className="text-slate-500 mt-1">Gerencie sua frota de forma inteligente</p>
          </div>
          <NotificationBell company={company} />
        </div>

        {/* Alerts */}
        {stats.alerts.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <h3 className="font-semibold text-amber-800">Alertas de Revisão</h3>
            </div>
            <div className="space-y-1">
              {stats.alerts.map((alert, i) => (
                <p key={i} className="text-sm text-amber-700">
                  Veículo <span className="font-semibold">{alert.plate}</span> — revisão em {alert.days} dias
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Shortcuts */}
        <div>
          <h2 className="text-lg font-semibold text-slate-700 mb-4">Acesso Rápido</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {shortcuts.map(item => (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className="group bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-slate-300 transition-all duration-200"
              >
                <div className={`w-10 h-10 rounded-lg ${item.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-semibold text-slate-800 text-sm">{item.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{item.desc}</p>
                <ArrowRight className="w-4 h-4 text-slate-300 mt-3 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PullToRefresh>
  );
}