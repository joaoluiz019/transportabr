import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '../components/hooks/useCompany';
import { usePageData } from '../components/hooks/usePageData';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import EmptyState from '../components/shared/EmptyState';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { HandCoins, Plus, Pencil, Trash2, Loader2, ArrowLeft, Printer } from 'lucide-react';
import PullToRefresh from '../components/layout/PullToRefresh';

export default function AdvancesPage() {
  const { company, loading: compLoading } = useCompany();
  const navigate = useNavigate();
  const { data, isPending, refetch, makeSetter } = usePageData('advances', company, async () => {
    const [a, d, b] = await Promise.all([
      base44.entities.Advance.filter({ company_id: company.id }),
      base44.entities.Driver.filter({ company_id: company.id }),
      base44.entities.Billing.filter({ company_id: company.id }),
    ]);
    return { advances: a, drivers: d, billings: b };
  });
  const advances = data?.advances ?? [];
  const drivers = data?.drivers ?? [];
  const billings = data?.billings ?? [];
  const setAdvances = makeSetter('advances');
  const loadData = refetch;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [selectedDriver, setSelectedDriver] = useState('all');

  const [form, setForm] = useState({
    driver_id: '', date: '', amount: '', description: ''
  });

  useEffect(() => {
    if (!compLoading && !company) navigate(createPageUrl('CompanySetup'));
  }, [compLoading, company, navigate]);

  const openNew = () => {
    setEditing(null);
    setForm({ driver_id: '', date: '', amount: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      driver_id: a.driver_id || '',
      date: a.date || '',
      amount: a.amount || '',
      description: a.description || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const driver = drivers.find(d => d.id === form.driver_id);
    const data = {
      ...form,
      company_id: company.id,
      driver_name: driver?.name || '',
      amount: Number(form.amount),
    };

    setDialogOpen(false);
    if (editing) {
      setAdvances(prev => prev.map(a => a.id === editing.id ? { ...a, ...data } : a));
      await base44.entities.Advance.update(editing.id, data);
    } else {
      const created = await base44.entities.Advance.create(data);
      setAdvances(prev => [...prev, created]);
    }
  };

  const handleDelete = async (id) => {
    setAdvances(prev => prev.filter(a => a.id !== id));
    await base44.entities.Advance.delete(id);
  };

  const filtered = advances.filter(a => {
    if (selectedDriver && selectedDriver !== 'all' && a.driver_id !== selectedDriver) return false;
    if (startDate && a.date < startDate) return false;
    if (endDate && a.date > endDate) return false;
    return true;
  });

  const totalAdvances = filtered.reduce((s, a) => s + (a.amount || 0), 0);

  // Determine relevant driver IDs based on filter
  const relevantDriverIds = selectedDriver !== 'all'
    ? [selectedDriver]
    : drivers.map(d => d.id);

  const relevantDrivers = drivers.filter(d => relevantDriverIds.includes(d.id));
  const driverVehicleIds = relevantDrivers.map(d => d.vehicle_id).filter(Boolean);

  // Filter billing by date range and driver vehicles
  const relevantBillings = billings.filter(b => {
    if (!driverVehicleIds.includes(b.vehicle_id)) return false;
    if (startDate && b.date < startDate) return false;
    if (endDate && b.date > endDate) return false;
    return true;
  });

  // Calculate commission: sum billing amount * driver commission_percent
  const commissionTotal = relevantBillings.reduce((sum, b) => {
    const driver = relevantDrivers.find(d => d.vehicle_id === b.vehicle_id);
    const percent = driver?.commission_percent || 0;
    return sum + ((b.amount || 0) * percent / 100);
  }, 0);

  const saldo = commissionTotal - totalAdvances;

  const fmt = (n) => (n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (compLoading || isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadData}>
    <style>{`
      @media print {
        .no-print { display: none !important; }
        body { background: white !important; }
        .sidebar, nav, header, footer { display: none !important; }
      }
    `}</style>
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))} className="text-slate-500 hover:text-slate-800 no-print">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Adiantamentos</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Total: <span className="font-semibold text-rose-600">{fmt(totalAdvances)}</span>
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()} className="no-print">
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700 no-print">
            <Plus className="w-4 h-4 mr-2" /> Novo Adiantamento
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap gap-4 items-end no-print">
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Data inicio</Label>
          <Input className="h-10 w-36" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-slate-500">Data fim</Label>
          <Input className="h-10 w-36" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
        <div className="space-y-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs text-slate-500">Motorista</Label>
          <Select value={selectedDriver} onValueChange={setSelectedDriver}>
            <SelectTrigger className="h-10"><SelectValue placeholder="Todos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {drivers.map(d => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500 mb-1">Adiantamentos</p>
          <p className="text-2xl font-bold text-rose-600">{fmt(totalAdvances)}</p>
          <p className="text-xs text-slate-400 mt-1">Total adiantado no período</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500 mb-1">Comissão</p>
          <p className="text-2xl font-bold text-emerald-600">{fmt(commissionTotal)}</p>
          <p className="text-xs text-slate-400 mt-1">Baseado no faturamento</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <p className="text-sm text-slate-500 mb-1">Saldo</p>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{fmt(saldo)}</p>
          <p className="text-xs text-slate-400 mt-1">{saldo >= 0 ? 'A receber' : 'A pagar'}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={HandCoins}
          title="Nenhum adiantamento"
          description="Registre os adiantamentos feitos aos motoristas."
          actionLabel="Novo Adiantamento"
          onAction={openNew}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Data</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Descricao</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead className="w-20 no-print">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(a => (
                  <TableRow key={a.id} className="hover:bg-slate-50">
                    <TableCell>{a.date}</TableCell>
                    <TableCell className="font-semibold">{a.driver_name}</TableCell>
                    <TableCell className="text-slate-600">{a.description || '-'}</TableCell>
                    <TableCell className="text-right font-semibold text-rose-600">{fmt(a.amount)}</TableCell>
                    <TableCell className="no-print">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(a)}>
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(a.id)}>
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Adiantamento' : 'Novo Adiantamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label>Motorista *</Label>
              <Select value={form.driver_id || "none"} onValueChange={v => setForm({...form, driver_id: v === "none" ? "" : v})}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione</SelectItem>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input className="h-11" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input className="h-11" type="number" inputMode="decimal" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0,00" />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Input className="h-11" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ex: Vale alimentacao" />
            </div>
            <Button onClick={handleSave} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base">
              {editing ? 'Salvar' : 'Registrar Adiantamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PullToRefresh>
  );
}