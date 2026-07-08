import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '../components/hooks/useCompany';
import { usePageData } from '../components/hooks/usePageData';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DatePlateFilter from '../components/shared/DatePlateFilter';
import EmptyState from '../components/shared/EmptyState';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Pencil, Trash2, Loader2, ArrowLeft } from 'lucide-react';

export default function BillingPage() {
  const { company, loading: compLoading } = useCompany();
  const navigate = useNavigate();
  const { data, isPending, makeSetter } = usePageData('billings', company, async () => {
    const [b, v] = await Promise.all([
      base44.entities.Billing.filter({ company_id: company.id }),
      base44.entities.Vehicle.filter({ company_id: company.id }),
    ]);
    return { billings: b, vehicles: v };
  });
  const billings = data?.billings ?? [];
  const vehicles = data?.vehicles ?? [];
  const setBillings = makeSetter('billings');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [selectedPlate, setSelectedPlate] = useState('all');
  const [form, setForm] = useState({
    vehicle_id: '', client_name: '', amount: '', date: '', destination: '', notes: ''
  });

  useEffect(() => {
    if (!compLoading && !company) navigate(createPageUrl('CompanySetup'));
  }, [compLoading, company, navigate]);

  const openNew = () => {
    setEditing(null);
    setForm({ vehicle_id: '', client_name: '', amount: '', date: '', destination: '', notes: '' });
    setDialogOpen(true);
  };

  const openEdit = (b) => {
    setEditing(b);
    setForm({
      vehicle_id: b.vehicle_id || '',
      client_name: b.client_name || '',
      amount: b.amount || '',
      date: b.date || '',
      destination: b.destination || '',
      notes: b.notes || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const vehicle = vehicles.find(v => v.id === form.vehicle_id);
    const data = {
      ...form,
      company_id: company.id,
      vehicle_plate: vehicle?.plate || '',
      amount: Number(form.amount),
    };
    setDialogOpen(false);
    if (editing) {
      setBillings(prev => prev.map(b => b.id === editing.id ? { ...b, ...data } : b));
      await base44.entities.Billing.update(editing.id, data);
    } else {
      const created = await base44.entities.Billing.create(data);
      setBillings(prev => [...prev, created]);
    }
  };

  const handleDelete = async (id) => {
    setBillings(prev => prev.filter(b => b.id !== id));
    await base44.entities.Billing.delete(id);
  };

  const filtered = billings.filter(b => {
    if (selectedPlate && selectedPlate !== 'all' && b.vehicle_plate !== selectedPlate) return false;
    if (startDate && b.date < startDate) return false;
    if (endDate && b.date > endDate) return false;
    return true;
  });

  const total = filtered.reduce((s, b) => s + (b.amount || 0), 0);
  const fmt = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (compLoading || isPending) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))} className="text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Faturamento</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Total: <span className="font-semibold text-emerald-600">{fmt(total)}</span>
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Faturamento
        </Button>
      </div>

      <DatePlateFilter
        startDate={startDate}
        endDate={endDate}
        selectedPlate={selectedPlate}
        vehicles={vehicles}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        onPlateChange={setSelectedPlate}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum faturamento"
          description="Registre os servicos prestados e receitas dos veiculos."
          actionLabel="Novo Faturamento"
          onAction={openNew}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Data</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Obs</TableHead>
                  <TableHead className="w-20">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(b => (
                  <TableRow key={b.id} className="hover:bg-slate-50">
                    <TableCell>{b.date}</TableCell>
                    <TableCell className="font-semibold">{b.vehicle_plate}</TableCell>
                    <TableCell>{b.client_name}</TableCell>
                    <TableCell>{b.destination || '-'}</TableCell>
                    <TableCell className="font-semibold text-emerald-600">{fmt(b.amount)}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-slate-500 text-sm">{b.notes || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(b)}>
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)}>
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Faturamento' : 'Novo Faturamento'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-5 mt-2">
            <div className="space-y-2">
              <Label>Veiculo *</Label>
              <Select value={form.vehicle_id || "none"} onValueChange={v => setForm({...form, vehicle_id: v === "none" ? "" : v})}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Selecione</SelectItem>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.plate} - {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input className="h-11" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input className="h-11" type="number" inputMode="decimal" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0,00" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Input className="h-11" value={form.client_name} onChange={e => setForm({...form, client_name: e.target.value})} placeholder="Nome do cliente" />
            </div>
            <div className="space-y-2">
              <Label>Destino</Label>
              <Input className="h-11" value={form.destination} onChange={e => setForm({...form, destination: e.target.value})} placeholder="Cidade/Local de destino" />
            </div>
            <div className="space-y-2">
              <Label>Observacoes</Label>
              <Textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Notas adicionais" rows={3} />
            </div>
            <Button onClick={handleSave} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base">
              {editing ? 'Salvar' : 'Registrar Faturamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}