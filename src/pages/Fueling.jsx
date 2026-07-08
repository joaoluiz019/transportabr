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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Fuel, Plus, Pencil, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import PullToRefresh from '../components/layout/PullToRefresh';

const fuelLabels = { gasoline: 'Gasolina', ethanol: 'Etanol', diesel: 'Diesel', gnv: 'GNV' };

export default function FuelingPage() {
  const { company, loading: compLoading } = useCompany();
  const navigate = useNavigate();
  const { data, isPending, refetch, makeSetter } = usePageData('fuelings', company, async () => {
    const [f, v] = await Promise.all([
      base44.entities.Fueling.filter({ company_id: company.id }),
      base44.entities.Vehicle.filter({ company_id: company.id }),
    ]);
    return { fuelings: f, vehicles: v };
  });
  const fuelings = data?.fuelings ?? [];
  const vehicles = data?.vehicles ?? [];
  const setFuelings = makeSetter('fuelings');
  const loadData = refetch;
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [selectedPlate, setSelectedPlate] = useState('all');
  const [form, setForm] = useState({
    vehicle_id: '', date: '', mileage: '', liters: '', price_per_liter: '', fuel_type: 'diesel', station: ''
  });

  useEffect(() => {
    if (!compLoading && !company) navigate(createPageUrl('CompanySetup'));
  }, [compLoading, company, navigate]);

  const calcTotal = () => {
    const l = parseFloat(form.liters) || 0;
    const p = parseFloat(form.price_per_liter) || 0;
    return (l * p).toFixed(2);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ vehicle_id: '', date: '', mileage: '', liters: '', price_per_liter: '', fuel_type: 'diesel', station: '' });
    setDialogOpen(true);
  };

  const openEdit = (f) => {
    setEditing(f);
    setForm({
      vehicle_id: f.vehicle_id || '',
      date: f.date || '',
      mileage: f.mileage || '',
      liters: f.liters || '',
      price_per_liter: f.price_per_liter || '',
      fuel_type: f.fuel_type || 'diesel',
      station: f.station || ''
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const vehicle = vehicles.find(v => v.id === form.vehicle_id);
    const totalCost = parseFloat(calcTotal());

    let kmPerLiter = null;
    if (form.mileage && form.vehicle_id) {
      // Busca TODOS os abastecimentos do veículo diretamente do banco para garantir dados atualizados
      const allVehicleFuelings = await base44.entities.Fueling.filter({ vehicle_id: form.vehicle_id, company_id: company.id });
      const currentMileage = Number(form.mileage);
      // Encontra o abastecimento imediatamente anterior (maior km menor que o atual)
      const prevFuelings = allVehicleFuelings
        .filter(f => f.id !== editing?.id && f.mileage && f.mileage < currentMileage)
        .sort((a, b) => (b.mileage || 0) - (a.mileage || 0));
      if (prevFuelings.length > 0) {
        const kmDiff = currentMileage - prevFuelings[0].mileage;
        if (kmDiff > 0 && Number(form.liters) > 0) {
          kmPerLiter = Math.round((kmDiff / Number(form.liters)) * 100) / 100;
        }
      }
    }

    const data = {
      ...form,
      company_id: company.id,
      vehicle_plate: vehicle?.plate || '',
      mileage: Number(form.mileage),
      liters: Number(form.liters),
      price_per_liter: Number(form.price_per_liter),
      total_cost: totalCost,
      km_per_liter: kmPerLiter,
    };

    setDialogOpen(false);
    if (editing) {
      setFuelings(prev => prev.map(f => f.id === editing.id ? { ...f, ...data } : f));
      await base44.entities.Fueling.update(editing.id, data);
    } else {
      const created = await base44.entities.Fueling.create(data);
      setFuelings(prev => [...prev, created]);
    }

    if (vehicle && form.mileage && Number(form.mileage) > (vehicle.mileage || 0)) {
      await base44.entities.Vehicle.update(vehicle.id, { mileage: Number(form.mileage) });
    }
  };

  const handleDelete = async (id) => {
    setFuelings(prev => prev.filter(f => f.id !== id));
    await base44.entities.Fueling.delete(id);
  };

  const filtered = fuelings
    .filter(f => {
      if (selectedPlate && selectedPlate !== 'all' && f.vehicle_plate !== selectedPlate) return false;
      if (startDate && f.date < startDate) return false;
      if (endDate && f.date > endDate) return false;
      return true;
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const totalCost = filtered.reduce((s, f) => s + (f.total_cost || 0), 0);
  const fmt = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (compLoading || isPending) {
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
            <h1 className="text-2xl font-bold text-slate-800">Abastecimento</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              Total: <span className="font-semibold text-amber-600">{fmt(totalCost)}</span>
            </p>
          </div>
        </div>
        <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="w-4 h-4 mr-2" /> Novo Abastecimento
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
          icon={Fuel}
          title="Nenhum abastecimento"
          description="Registre os abastecimentos para acompanhar consumo e custos."
          actionLabel="Novo Abastecimento"
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
                  <TableHead>Combustivel</TableHead>
                  <TableHead>Litros</TableHead>
                  <TableHead>R$/L</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>KM</TableHead>
                  <TableHead>Km/L</TableHead>
                  <TableHead>Posto</TableHead>
                  <TableHead className="w-20">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(f => (
                  <TableRow key={f.id} className="hover:bg-slate-50">
                    <TableCell>{f.date}</TableCell>
                    <TableCell className="font-semibold">{f.vehicle_plate}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{fuelLabels[f.fuel_type] || f.fuel_type}</Badge>
                    </TableCell>
                    <TableCell>{f.liters?.toFixed(1)}</TableCell>
                    <TableCell>{fmt(f.price_per_liter || 0)}</TableCell>
                    <TableCell className="font-semibold text-amber-600">{fmt(f.total_cost || 0)}</TableCell>
                    <TableCell>{f.mileage?.toLocaleString('pt-BR')}</TableCell>
                    <TableCell>
                     {f.km_per_liter ? (
                       <Badge className={f.km_per_liter >= 3 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}>
                         {f.km_per_liter} km/l
                       </Badge>
                     ) : '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">{f.station || '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(f)}>
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(f.id)}>
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
            <DialogTitle>{editing ? 'Editar Abastecimento' : 'Novo Abastecimento'}</DialogTitle>
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
                <Label>Tipo Combustivel</Label>
                <Select value={form.fuel_type} onValueChange={v => setForm({...form, fuel_type: v})}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(fuelLabels).map(([k, l]) => (
                      <SelectItem key={k} value={k}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Quilometragem</Label>
              <Input className="h-11" type="number" inputMode="numeric" value={form.mileage} onChange={e => setForm({...form, mileage: e.target.value})} placeholder="KM atual" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Litros *</Label>
                <Input className="h-11" type="number" inputMode="decimal" step="0.01" value={form.liters} onChange={e => setForm({...form, liters: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>R$/Litro *</Label>
                <Input className="h-11" type="number" inputMode="decimal" step="0.01" value={form.price_per_liter} onChange={e => setForm({...form, price_per_liter: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Total</Label>
                <div className="h-11 flex items-center px-3 bg-slate-100 rounded-md font-semibold text-emerald-700 text-sm">
                  R$ {calcTotal()}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Posto</Label>
              <Input className="h-11" value={form.station} onChange={e => setForm({...form, station: e.target.value})} placeholder="Nome do posto" />
            </div>
            <Button onClick={handleSave} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base">
              {editing ? 'Salvar' : 'Registrar Abastecimento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PullToRefresh>
  );
}