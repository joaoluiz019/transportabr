import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '../components/hooks/useCompany';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import DatePlateFilter from '../components/shared/DatePlateFilter';
import EmptyState from '../components/shared/EmptyState';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Receipt, Plus, Pencil, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import PullToRefresh from '../components/layout/PullToRefresh';

const typeLabels = {
  maintenance: 'Revisão/Manutenção',
  oil_change: 'Troca de Óleo',
  tire: 'Pneu',
  insurance: 'Seguro',
  tax: 'Imposto/Taxa',
  fine: 'Multa',
  payroll: 'Folha de Pagamento',
  commission: 'Comissão',
  travel_bonus: 'Bônus de Viagem',
  overnight: 'Pernoite',
  toll: 'Pedágio',
  bonus: 'Bonificação',
  body: 'Carroceria/Carreta',
  financiamento: 'Financiamento',
  other: 'Outros'
};

const typeColors = {
  maintenance: 'bg-blue-100 text-blue-700',
  oil_change: 'bg-amber-100 text-amber-700',
  tire: 'bg-slate-100 text-slate-700',
  insurance: 'bg-purple-100 text-purple-700',
  tax: 'bg-rose-100 text-rose-700',
  fine: 'bg-red-100 text-red-700',
  payroll: 'bg-green-100 text-green-700',
  commission: 'bg-cyan-100 text-cyan-700',
  travel_bonus: 'bg-teal-100 text-teal-700',
  overnight: 'bg-indigo-100 text-indigo-700',
  toll: 'bg-orange-100 text-orange-700',
  bonus: 'bg-lime-100 text-lime-700',
  body: 'bg-yellow-100 text-yellow-700',
  financiamento: 'bg-violet-100 text-violet-700',
  other: 'bg-gray-100 text-gray-700'
};

export default function Expenses() {
  const { company, loading: compLoading } = useCompany();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [selectedPlate, setSelectedPlate] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [form, setForm] = useState({
    vehicle_id: '', type: 'maintenance', amount: '', date: '', supplier: '',
    description: '', mileage_at_service: '', next_service_mileage: '', next_service_date: '',
    tire_brand: '', tire_model: '', tire_position: ''
  });

  useEffect(() => {
    if (!compLoading && !company) navigate(createPageUrl('CompanySetup'));
  }, [compLoading, company, navigate]);

  useEffect(() => {
    if (!company) return;
    loadData();
  }, [company]);

  const loadData = async () => {
    const [e, v] = await Promise.all([
      base44.entities.Expense.filter({ company_id: company.id }),
      base44.entities.Vehicle.filter({ company_id: company.id }),
    ]);
    setExpenses(e);
    setVehicles(v);
    setLoading(false);
  };

  const openNew = () => {
    setEditing(null);
    setForm({
      vehicle_id: '', type: 'maintenance', amount: '', date: '', supplier: '',
      description: '', mileage_at_service: '', next_service_mileage: '', next_service_date: '',
      tire_brand: '', tire_model: '', tire_position: ''
    });
    setDialogOpen(true);
  };

  const openEdit = (exp) => {
    setEditing(exp);
    setForm({
      vehicle_id: exp.vehicle_id || '',
      type: exp.type || 'maintenance',
      amount: exp.amount || '',
      date: exp.date || '',
      supplier: exp.supplier || '',
      description: exp.description || '',
      mileage_at_service: exp.mileage_at_service || '',
      next_service_mileage: exp.next_service_mileage || '',
      next_service_date: exp.next_service_date || '',
      tire_brand: exp.tire_brand || '',
      tire_model: exp.tire_model || '',
      tire_position: exp.tire_position || ''
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
      mileage_at_service: form.mileage_at_service ? Number(form.mileage_at_service) : undefined,
      next_service_mileage: form.next_service_mileage ? Number(form.next_service_mileage) : undefined,
    };
    setDialogOpen(false);
    if (editing) {
      setExpenses(prev => prev.map(e => e.id === editing.id ? { ...e, ...data } : e));
      await base44.entities.Expense.update(editing.id, data);
    } else {
      const created = await base44.entities.Expense.create(data);
      setExpenses(prev => [...prev, created]);
    }
  };

  const handleDelete = async (id) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    await base44.entities.Expense.delete(id);
  };

  const showServiceFields = form.type === 'maintenance' || form.type === 'oil_change';
  const showTireFields = form.type === 'tire';

  const filtered = expenses.filter(e => {
    if (selectedPlate && selectedPlate !== 'all' && e.vehicle_plate !== selectedPlate) return false;
    if (selectedType !== 'all' && e.type !== selectedType) return false;
    if (startDate && e.date < startDate) return false;
    if (endDate && e.date > endDate) return false;
    return true;
  });

  const total = filtered.reduce((s, e) => s + (e.amount || 0), 0);
  const fmt = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (compLoading || loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={loadData}>
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))} className="text-slate-500 hover:text-slate-800">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Despesas</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Total: <span className="font-semibold text-rose-600">{fmt(total)}</span>
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Nova Despesa
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
      <div className="flex items-center gap-2">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(typeLabels).map(([k, l]) => (
              <SelectItem key={k} value={k}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma despesa"
          description="Registre suas despesas para acompanhar os custos da frota."
          actionLabel="Nova Despesa"
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
                  <TableHead>Tipo</TableHead>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="w-20">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => (
                  <TableRow key={e.id} className="hover:bg-slate-50">
                    <TableCell>{e.date}</TableCell>
                    <TableCell className="font-semibold">{e.vehicle_plate}</TableCell>
                    <TableCell>
                      <Badge className={typeColors[e.type]}>{typeLabels[e.type]}</Badge>
                    </TableCell>
                    <TableCell>{e.supplier || '-'}</TableCell>
                    <TableCell className="font-semibold text-rose-600">{fmt(e.amount)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(e)}>
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Despesa' : 'Nova Despesa'}</DialogTitle>
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
            <div className="space-y-2">
              <Label>Tipo *</Label>
              <Select value={form.type} onValueChange={v => setForm({...form, type: v})}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, l]) => (
                    <SelectItem key={k} value={k}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Valor *</Label>
                <Input className="h-11" type="number" inputMode="decimal" step="0.01" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0,00" />
              </div>
              <div className="space-y-2">
                <Label>Data *</Label>
                <Input className="h-11" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Input className="h-11" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} placeholder="Nome do fornecedor" />
            </div>
            <div className="space-y-2">
              <Label>Descricao</Label>
              <Input className="h-11" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Detalhes adicionais" />
            </div>
            {showServiceFields && (
              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-semibold text-slate-600">Dados da Revisao / Troca de Oleo</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>KM no servico</Label>
                    <Input className="h-11" type="number" inputMode="numeric" value={form.mileage_at_service} onChange={e => setForm({...form, mileage_at_service: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Proxima revisao (KM)</Label>
                    <Input className="h-11" type="number" inputMode="numeric" value={form.next_service_mileage} onChange={e => setForm({...form, next_service_mileage: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Proxima revisao (data)</Label>
                  <Input className="h-11" type="date" value={form.next_service_date} onChange={e => setForm({...form, next_service_date: e.target.value})} />
                </div>
              </div>
            )}
            {showTireFields && (
              <div className="border-t pt-4 space-y-4">
                <p className="text-sm font-semibold text-slate-600">Dados do Pneu</p>
                <div className="space-y-2">
                  <Label>Quilometragem</Label>
                  <Input className="h-11" type="number" inputMode="numeric" value={form.mileage_at_service} onChange={e => setForm({...form, mileage_at_service: e.target.value})} placeholder="KM atual" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Marca</Label>
                    <Input className="h-11" value={form.tire_brand} onChange={e => setForm({...form, tire_brand: e.target.value})} placeholder="Ex: Michelin" />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input className="h-11" value={form.tire_model} onChange={e => setForm({...form, tire_model: e.target.value})} placeholder="Ex: XZE2" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Local Instalado</Label>
                  <Select value={form.tire_position || 'none'} onValueChange={v => setForm({...form, tire_position: v === 'none' ? '' : v})}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Selecione a posicao" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione</SelectItem>
                      <SelectItem value="Dianteiro Esquerdo">Dianteiro Esquerdo</SelectItem>
                      <SelectItem value="Dianteiro Direito">Dianteiro Direito</SelectItem>
                      <SelectItem value="Traseiro Esquerdo Externo">Traseiro Esquerdo Externo</SelectItem>
                      <SelectItem value="Traseiro Esquerdo Interno">Traseiro Esquerdo Interno</SelectItem>
                      <SelectItem value="Traseiro Direito Externo">Traseiro Direito Externo</SelectItem>
                      <SelectItem value="Traseiro Direito Interno">Traseiro Direito Interno</SelectItem>
                      <SelectItem value="Estepe">Estepe</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <Button onClick={handleSave} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base">
              {editing ? 'Salvar' : 'Cadastrar Despesa'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PullToRefresh>
  );
}