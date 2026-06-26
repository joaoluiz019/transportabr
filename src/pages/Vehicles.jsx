import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '../components/hooks/useCompany';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import EmptyState from '../components/shared/EmptyState';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Truck, Plus, Search, Pencil, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import PullToRefresh from '../components/layout/PullToRefresh';

export default function Vehicles() {
  const { company, loading: compLoading } = useCompany();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({
    plate: '', model: '', year: '', brand: '', mileage: '', driver_id: '', driver_name: '', status: 'active',
    registration_expiry: '', desired_km_per_liter: ''
  });

  useEffect(() => {
    if (!compLoading && !company) navigate(createPageUrl('CompanySetup'));
  }, [compLoading, company, navigate]);

  useEffect(() => {
    if (!company) return;
    loadData();
  }, [company]);

  const loadData = async () => {
    const [v, d] = await Promise.all([
      base44.entities.Vehicle.filter({ company_id: company.id }),
      base44.entities.Driver.filter({ company_id: company.id }),
    ]);
    setVehicles(v);
    setDrivers(d);
    setLoading(false);
  };

  const openNew = () => {
    setEditingVehicle(null);
    setForm({ plate: '', model: '', year: '', brand: '', mileage: '', driver_id: '', driver_name: '', status: 'active' });
    setDialogOpen(true);
  };

  const openEdit = (v) => {
    setEditingVehicle(v);
    setForm({
      plate: v.plate || '',
      model: v.model || '',
      year: v.year || '',
      brand: v.brand || '',
      mileage: v.mileage || '',
      driver_id: v.driver_id || '',
      driver_name: v.driver_name || '',
      status: v.status || 'active',
      registration_expiry: v.registration_expiry || '',
      desired_km_per_liter: v.desired_km_per_liter || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = {
      ...form,
      company_id: company.id,
      year: form.year ? Number(form.year) : undefined,
      mileage: form.mileage ? Number(form.mileage) : undefined,
      desired_km_per_liter: form.desired_km_per_liter ? Number(form.desired_km_per_liter) : undefined,
    };
    setDialogOpen(false);
    if (editingVehicle) {
      setVehicles(prev => prev.map(v => v.id === editingVehicle.id ? { ...v, ...data } : v));
      await base44.entities.Vehicle.update(editingVehicle.id, data);
    } else {
      const created = await base44.entities.Vehicle.create(data);
      setVehicles(prev => [...prev, created]);
    }
  };

  const handleDelete = async (id) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
    await base44.entities.Vehicle.delete(id);
  };

  const handleDriverChange = (driverId) => {
    const driver = drivers.find(d => d.id === driverId);
    setForm({ ...form, driver_id: driverId, driver_name: driver?.name || '' });
  };

  const filtered = vehicles.filter(v =>
    v.plate?.toLowerCase().includes(search.toLowerCase()) ||
    v.model?.toLowerCase().includes(search.toLowerCase()) ||
    v.brand?.toLowerCase().includes(search.toLowerCase())
  );

  const statusLabels = { active: 'Ativo', maintenance: 'Manutencao', inactive: 'Inativo' };
  const statusColors = {
    active: 'bg-emerald-100 text-emerald-700',
    maintenance: 'bg-amber-100 text-amber-700',
    inactive: 'bg-slate-100 text-slate-600'
  };

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
            <h1 className="text-2xl font-bold text-slate-800">Veiculos</h1>
            <p className="text-slate-500 text-sm mt-0.5">{vehicles.length} veiculos cadastrados</p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Veiculo
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por placa, modelo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Nenhum veiculo"
          description="Cadastre seu primeiro veiculo para comecar a gerenciar sua frota."
          actionLabel="Cadastrar Veiculo"
          onAction={openNew}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Placa</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Motorista</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(v => (
                  <TableRow key={v.id} className="hover:bg-slate-50">
                    <TableCell className="font-semibold text-slate-800">{v.plate}</TableCell>
                    <TableCell>{v.model}</TableCell>
                    <TableCell>{v.brand}</TableCell>
                    <TableCell>{v.year}</TableCell>
                    <TableCell>{v.mileage?.toLocaleString('pt-BR')} km</TableCell>
                    <TableCell>{v.driver_name || '-'}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[v.status]}>{statusLabels[v.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(v)}>
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(v.id)}>
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
            <DialogTitle>{editingVehicle ? 'Editar Veiculo' : 'Novo Veiculo'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Placa *</Label>
                <Input placeholder="ABC-1234" value={form.plate} onChange={e => setForm({...form, plate: e.target.value.toUpperCase()})} />
              </div>
              <div className="space-y-2">
                <Label>Marca *</Label>
                <Input placeholder="Ex: Volvo" value={form.brand} onChange={e => setForm({...form, brand: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modelo *</Label>
                <Input placeholder="Ex: FH 540" value={form.model} onChange={e => setForm({...form, model: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Ano</Label>
                <Input type="number" placeholder="2024" value={form.year} onChange={e => setForm({...form, year: e.target.value})} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quilometragem</Label>
                <Input type="number" placeholder="0" value={form.mileage} onChange={e => setForm({...form, mileage: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setForm({...form, status: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="maintenance">Manutencao</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vencimento Emplacamento</Label>
                <Input type="date" value={form.registration_expiry} onChange={e => setForm({...form, registration_expiry: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Consumo Desejado (km/L)</Label>
                <Input type="number" step="0.1" placeholder="Ex: 3.5" value={form.desired_km_per_liter} onChange={e => setForm({...form, desired_km_per_liter: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motorista Vinculado</Label>
              <Select value={form.driver_id || "none"} onValueChange={v => handleDriverChange(v === "none" ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {drivers.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {editingVehicle ? 'Salvar Alteracoes' : 'Cadastrar Veiculo'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PullToRefresh>
  );
}