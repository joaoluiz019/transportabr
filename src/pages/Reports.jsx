import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '../components/hooks/useCompany';
import { usePageData } from '../components/hooks/usePageData';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { createPageUrl } from '@/utils';
import DatePlateFilter from '../components/shared/DatePlateFilter';
import StatCard from '../components/shared/StatCard';
import { Loader2, TrendingUp, TrendingDown, Fuel, Truck, BarChart3, DollarSign, ArrowLeft, Printer, Users, Droplets } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#64748b'];

const printStyles = `
  @media print {
    body * { visibility: hidden; }
    #print-area, #print-area * { visibility: visible; }
    #print-area { position: absolute; left: 0; top: 0; width: 100%; }
    .no-print { display: none !important; }
  }
`;

export default function Reports() {
  const { company, loading: compLoading } = useCompany();
  const navigate = useNavigate();
  const { data, isPending } = usePageData('reports', company, async () => {
    const [v, d, e, f, b] = await Promise.all([
      base44.entities.Vehicle.filter({ company_id: company.id }),
      base44.entities.Driver.filter({ company_id: company.id }),
      base44.entities.Expense.filter({ company_id: company.id }),
      base44.entities.Fueling.filter({ company_id: company.id }),
      base44.entities.Billing.filter({ company_id: company.id }),
    ]);
    return { vehicles: v, drivers: d, expenses: e, fuelings: f, billings: b };
  });
  const vehicles = data?.vehicles ?? [];
  const drivers = data?.drivers ?? [];
  const expenses = data?.expenses ?? [];
  const fuelings = data?.fuelings ?? [];
  const billings = data?.billings ?? [];
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [selectedPlate, setSelectedPlate] = useState('all');

  useEffect(() => {
    if (!compLoading && !company) navigate(createPageUrl('CompanySetup'));
  }, [compLoading, company, navigate]);

  const applyFilter = (items) => items.filter(item => {
    if (selectedPlate && selectedPlate !== 'all' && item.vehicle_plate !== selectedPlate) return false;
    if (startDate && item.date < startDate) return false;
    if (endDate && item.date > endDate) return false;
    return true;
  });

  const filteredExpenses = applyFilter(expenses);
  const filteredFuelings = applyFilter(fuelings);
  const filteredBillings = applyFilter(billings);

  const totalExpenses = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalFueling = filteredFuelings.reduce((s, f) => s + (f.total_cost || 0), 0);
  const totalLiters = filteredFuelings.reduce((s, f) => s + (f.liters || 0), 0);
  const totalBilling = filteredBillings.reduce((s, b) => s + (b.amount || 0), 0);
  const totalCosts = totalExpenses + totalFueling;

  const displayKm = Math.round(
    vehicles.reduce((total, v) => {
      const vehicleFuelings = filteredFuelings
        .filter(f => f.vehicle_id === v.id && f.mileage)
        .sort((a, b) => a.mileage - b.mileage);
      if (vehicleFuelings.length < 2) return total;
      const first = vehicleFuelings[0].mileage;
      const last = vehicleFuelings[vehicleFuelings.length - 1].mileage;
      return total + Math.max(0, last - first);
    }, 0)
  );

  const costPerKm = displayKm > 0 ? (totalCosts / displayKm) : 0;

  const avgKmPerLiter = totalLiters > 0 && displayKm > 0 ? (displayKm / totalLiters) : 0;

  const fmt = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const expenseByType = {};
  const typeLabels = {
    maintenance: 'Revisao', oil_change: 'Oleo', tire: 'Pneu',
    insurance: 'Seguro', tax: 'Imposto', fine: 'Multa',
    payroll: 'Folha', commission: 'Comissao', travel_bonus: 'Bonus Viagem',
    overnight: 'Pernoite', toll: 'Pedagio', bonus: 'Bonificacao',
    body: 'Carroceria', other: 'Outros'
  };
  filteredExpenses.forEach(e => {
    const label = typeLabels[e.type] || e.type;
    expenseByType[label] = (expenseByType[label] || 0) + (e.amount || 0);
  });
  if (totalFueling > 0) {
    expenseByType['Combustivel'] = totalFueling;
  }
  const pieData = Object.entries(expenseByType).map(([name, value]) => ({ name, value }));

  const monthlyData = {};
  filteredBillings.forEach(b => {
    const month = b.date?.substring(0, 7);
    if (!month) return;
    if (!monthlyData[month]) monthlyData[month] = { month, faturamento: 0, despesas: 0 };
    monthlyData[month].faturamento += b.amount || 0;
  });
  filteredExpenses.forEach(e => {
    const month = e.date?.substring(0, 7);
    if (!month) return;
    if (!monthlyData[month]) monthlyData[month] = { month, faturamento: 0, despesas: 0 };
    monthlyData[month].despesas += e.amount || 0;
  });
  filteredFuelings.forEach(f => {
    const month = f.date?.substring(0, 7);
    if (!month) return;
    if (!monthlyData[month]) monthlyData[month] = { month, faturamento: 0, despesas: 0 };
    monthlyData[month].despesas += f.total_cost || 0;
  });
  const barData = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

  if (compLoading || isPending) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  );

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <style>{printStyles}</style>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))} className="text-slate-500 hover:text-slate-800 no-print">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
            <p className="text-slate-500 text-sm mt-0.5">Indicadores de desempenho da frota</p>
          </div>
        </div>
        <Button onClick={() => window.print()} variant="outline" className="no-print gap-2">
          <Printer className="w-4 h-4" /> Imprimir / PDF
        </Button>
      </div>

      <div className="no-print">
        <DatePlateFilter startDate={startDate} endDate={endDate} selectedPlate={selectedPlate}
          vehicles={vehicles} onStartDateChange={setStartDate} onEndDateChange={setEndDate} onPlateChange={setSelectedPlate} />
      </div>

      <div id="print-area" className="space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard title="Faturamento" value={fmt(totalBilling)} icon={TrendingUp} color="emerald" />
          <StatCard title="Despesas" value={fmt(totalExpenses)} icon={TrendingDown} color="rose" />
          <StatCard title="Combustivel" value={fmt(totalFueling)} icon={Fuel} color="amber" />
          <StatCard title="KM Rodados" value={displayKm.toLocaleString('pt-BR')} icon={Truck} color="blue" />
          <StatCard title="Litragem Total" value={`${totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L`} icon={Droplets} color="blue" />
          <StatCard title="Custo/KM" value={costPerKm > 0 ? `R$ ${costPerKm.toFixed(2)}` : '--'} icon={DollarSign} color="purple" />
          <StatCard title="Media Km/L" value={avgKmPerLiter > 0 ? `${avgKmPerLiter.toFixed(1)} km/l` : '--'} icon={BarChart3} color="slate" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-semibold text-slate-700 mb-4">Faturamento vs Despesas (Mensal)</h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Bar dataKey="faturamento" fill="#10b981" name="Faturamento" radius={[4,4,0,0]} />
                  <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">Sem dados para o periodo selecionado</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-base font-semibold text-slate-700 mb-4">Despesas por Categoria</h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({name, percent}) => `${name} ${(percent*100).toFixed(0)}%`}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-400 text-center py-12">Sem dados para o periodo selecionado</p>
            )}
          </div>
        </div>

        {/* Profit summary */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-slate-700 mb-3">Resumo Financeiro</h3>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-sm text-slate-500">Receita Total</p>
              <p className="text-xl font-bold text-emerald-600">{fmt(totalBilling)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Custo Total</p>
              <p className="text-xl font-bold text-rose-600">{fmt(totalCosts)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-500">Lucro</p>
              <p className={`text-xl font-bold ${totalBilling - totalCosts >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {fmt(totalBilling - totalCosts)}
              </p>
            </div>
          </div>
        </div>

        {/* Driver Commissions */}
        {(() => {
          // Map vehicle_id -> driver (only drivers with commission_percent)
          const vehicleDriverMap = {};
          vehicles.forEach(v => {
            if (v.driver_id) vehicleDriverMap[v.id] = v.driver_id;
          });
          const driversWithCommission = drivers.filter(d => d.commission_percent > 0);
          if (driversWithCommission.length === 0) return null;

          const commissionRows = driversWithCommission.map(driver => {
            // Find vehicle(s) allocated to this driver
            const driverVehicles = vehicles.filter(v => v.driver_id === driver.id);
            const driverVehicleIds = new Set(driverVehicles.map(v => v.id));

            const billingForDriver = filteredBillings.filter(b => driverVehicleIds.has(b.vehicle_id));
            const totalBillingDriver = billingForDriver.reduce((s, b) => s + (b.amount || 0), 0);
            const commission = totalBillingDriver * (driver.commission_percent / 100);

            return {
              name: driver.name,
              plate: driverVehicles.map(v => v.plate).join(', ') || '-',
              percent: driver.commission_percent,
              billing: totalBillingDriver,
              commission,
            };
          });

          const totalCommission = commissionRows.reduce((s, r) => s + r.commission, 0);

          return (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-violet-600" />
                <h3 className="text-base font-semibold text-slate-700">Comissões dos Motoristas</h3>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Motorista</TableHead>
                      <TableHead>Placa</TableHead>
                      <TableHead className="text-right">% Comissão</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Comissão</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {commissionRows.map((row, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell>{row.plate}</TableCell>
                        <TableCell className="text-right">{row.percent}%</TableCell>
                        <TableCell className="text-right">{fmt(row.billing)}</TableCell>
                        <TableCell className="text-right font-semibold text-violet-600">{fmt(row.commission)}</TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-slate-50 font-bold">
                      <TableCell colSpan={4} className="text-right text-slate-700">Total Comissões</TableCell>
                      <TableCell className="text-right text-violet-700">{fmt(totalCommission)}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}