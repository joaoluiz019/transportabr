import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Truck, Fuel, Loader2, Plus, TrendingUp, Droplets, DollarSign, Activity, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import DeleteAccountDialog from '@/components/layout/DeleteAccountDialog';

export default function DriverPortal() {
  const [ctx, setCtx] = useState(null);
  const [driver, setDriver] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [fuelings, setFuelings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const now = new Date();
  const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    mileage: '',
    liters: '',
    price_per_liter: '',
    fuel_type: 'diesel',
    station: '',
  });

  useEffect(() => {
    async function init() {
      try {
        const me = await base44.auth.me();

        // Auto-associação por email: busca o motorista cadastrado com o email do usuário
        if (me?.email) {
          const drivers = await base44.entities.Driver.filter({ email: me.email });
          if (drivers.length > 0) {
            const driver = drivers[0];
            const context = {
              company_id: driver.company_id,
              driver_id: driver.id,
              vehicle_id: driver.vehicle_id || null,
            };
            localStorage.setItem('driver_portal_context', JSON.stringify(context));
            setCtx(context);
            loadData(context);
            return;
          }
        }
      } catch (e) {
        console.error('[DriverPortal] Erro no init:', e);
      }

      // Fallback: usa localStorage
      const raw = localStorage.getItem('driver_portal_context');
      if (raw) {
        const context = JSON.parse(raw);
        setCtx(context);
        loadData(context);
        return;
      }

      setLoading(false);
    }
    init();
  }, []);

  async function loadData(context) {
    try {
      const [driverData, fuelData] = await Promise.all([
        base44.entities.Driver.filter({ id: context.driver_id, company_id: context.company_id }),
        context.vehicle_id
          ? base44.entities.Fueling.filter({ vehicle_id: context.vehicle_id, company_id: context.company_id })
          : [],
      ]);
      if (driverData.length > 0) setDriver(driverData[0]);

      if (context.vehicle_id) {
        const vehicles = await base44.entities.Vehicle.filter({ id: context.vehicle_id, company_id: context.company_id });
        if (vehicles.length > 0) setVehicle(vehicles[0]);
      }

      // Recalcula km_per_liter para abastecimentos que estejam faltando o valor
      const sorted = fuelData
        .filter(f => f.mileage)
        .sort((a, b) => a.mileage - b.mileage);

      const updates = [];
      for (let i = 1; i < sorted.length; i++) {
        const curr = sorted[i];
        const prev = sorted[i - 1];
        if (!curr.km_per_liter && curr.liters > 0 && curr.mileage > prev.mileage) {
          const kmL = parseFloat(((curr.mileage - prev.mileage) / curr.liters).toFixed(2));
          updates.push(base44.entities.Fueling.update(curr.id, { km_per_liter: kmL }));
          curr.km_per_liter = kmL; // atualiza localmente também
        }
      }
      if (updates.length > 0) await Promise.all(updates);

      setFuelings(fuelData.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } finally {
      setLoading(false);
    }
  }

  const filteredFuelings = fuelings.filter(f => {
    if (startDate && f.date < startDate) return false;
    if (endDate && f.date > endDate) return false;
    return true;
  });

  const totalCost = filteredFuelings.reduce((s, f) => s + (f.total_cost || 0), 0);
  const totalLiters = filteredFuelings.reduce((s, f) => s + (f.liters || 0), 0);
  const lastMileage = fuelings.length > 0 ? Math.max(...fuelings.map(f => f.mileage || 0)) : 0;

  const fueledWithMileage = filteredFuelings.filter(f => f.mileage).sort((a, b) => a.mileage - b.mileage);
  const drivenKm = fueledWithMileage.length >= 2
    ? Math.max(0, fueledWithMileage[fueledWithMileage.length - 1].mileage - fueledWithMileage[0].mileage)
    : 0;

  const avgKmL = totalLiters > 0 && drivenKm > 0 ? (drivenKm / totalLiters).toFixed(2) : '-';

  const openDialog = () => {
    setForm({
      date: new Date().toISOString().slice(0, 10),
      mileage: lastMileage ? String(lastMileage) : '',
      liters: '',
      price_per_liter: '',
      fuel_type: 'diesel',
      station: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.date || !form.liters || !form.price_per_liter) {
      toast.error('Preencha os campos obrigatórios.');
      return;
    }
    setSaving(true);
    const liters = parseFloat(form.liters);
    const ppl = parseFloat(form.price_per_liter);
    const totalCostVal = liters * ppl;
    const mileage = parseFloat(form.mileage) || 0;

    // Calculate km/l from last fueling
    let kmPerLiter = null;
    if (mileage && lastMileage && mileage > lastMileage) {
      kmPerLiter = parseFloat(((mileage - lastMileage) / liters).toFixed(2));
    }

    await base44.entities.Fueling.create({
      company_id: ctx.company_id,
      vehicle_id: ctx.vehicle_id,
      vehicle_plate: vehicle?.plate || '',
      date: form.date,
      mileage,
      liters,
      price_per_liter: ppl,
      total_cost: parseFloat(totalCostVal.toFixed(2)),
      fuel_type: form.fuel_type,
      station: form.station,
      km_per_liter: kmPerLiter,
    });

    // Update vehicle mileage
    if (ctx.vehicle_id && mileage > (vehicle?.mileage || 0)) {
      await base44.entities.Vehicle.update(ctx.vehicle_id, { mileage });
    }

    setSaving(false);
    setDialogOpen(false);
    toast.success('Abastecimento registrado!');
    loadData(ctx);
  };

  const handleLogout = () => {
    localStorage.removeItem('driver_portal_context');
    base44.auth.logout();
  };

  const fmt = (n) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const fuelLabels = { gasoline: 'Gasolina', ethanol: 'Etanol', diesel: 'Diesel', gnv: 'GNV' };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  if (!ctx) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 text-center max-w-sm">
          <Truck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold">Acesso não autorizado</p>
          <p className="text-slate-400 text-sm mt-1">Use o link de convite enviado pela sua empresa.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-900 text-white px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Truck className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-none">TransportaBR</p>
            {driver && <p className="text-slate-400 text-xs mt-0.5">{driver.name}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {vehicle && (
            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
              {vehicle.plate}
            </Badge>
          )}
          <button onClick={handleLogout} className="text-slate-400 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-5 pb-8">
        {/* KPIs */}
        {/* Filtros */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 flex gap-3">
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-slate-500">Data início</Label>
            <Input className="h-9 bg-slate-900 border-slate-700 text-white text-sm" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div className="flex-1 space-y-1">
            <Label className="text-xs text-slate-500">Data fim</Label>
            <Input className="h-9 bg-slate-900 border-slate-700 text-white text-sm" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 mt-2">

          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Droplets className="w-4 h-4 text-blue-400" />
              <p className="text-xs text-slate-400">Total Litros</p>
            </div>
            <p className="text-lg font-bold text-white">{totalLiters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L</p>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-indigo-400" />
              <p className="text-xs text-slate-400">Média km/L</p>
            </div>
            <p className="text-lg font-bold text-white">{avgKmL}</p>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-amber-400" />
              <p className="text-xs text-slate-400">Km Atual</p>
            </div>
            <p className="text-lg font-bold text-white">{lastMileage.toLocaleString('pt-BR')} km</p>
          </div>
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <p className="text-xs text-slate-400">Km Rodados</p>
            </div>
            <p className="text-lg font-bold text-white">{drivenKm.toLocaleString('pt-BR')} km</p>
          </div>
        </div>

        {/* Register button */}
        <Button
          onClick={openDialog}
          className="w-full bg-emerald-600 hover:bg-emerald-700 h-12 text-base font-semibold"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar Abastecimento
        </Button>

        {/* History */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 mb-3">Histórico de Abastecimentos</h2>
          {filteredFuelings.length === 0 ? (
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 text-center">
              <Fuel className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Nenhum abastecimento no período</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFuelings.map(f => (
                <div key={f.id} className="bg-slate-800 rounded-xl border border-slate-700 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {f.liters?.toFixed(1)} L — {fuelLabels[f.fuel_type] || f.fuel_type}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {f.date} {f.mileage ? `• ${f.mileage.toLocaleString('pt-BR')} km` : ''}
                      {f.km_per_liter ? ` • ${f.km_per_liter} km/L` : ''}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-emerald-400">{fmt(f.total_cost || 0)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Excluir conta */}
        <div className="pt-2 flex justify-center">
          <DeleteAccountDialog className="flex items-center gap-2 text-xs text-rose-400 hover:text-rose-300 transition-colors select-none" />
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Abastecimento</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Km Atual</Label>
                <Input type="number" placeholder="Ex: 45000" value={form.mileage} onChange={e => setForm({ ...form, mileage: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Litros *</Label>
                <Input type="number" step="0.01" placeholder="Ex: 50" value={form.liters} onChange={e => setForm({ ...form, liters: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>R$/Litro *</Label>
                <Input type="number" step="0.01" placeholder="Ex: 6.50" value={form.price_per_liter} onChange={e => setForm({ ...form, price_per_liter: e.target.value })} />
              </div>
            </div>
            {form.liters && form.price_per_liter && (
              <div className="bg-emerald-50 rounded-lg px-3 py-2 text-sm text-emerald-700 font-semibold">
                Total: {fmt(parseFloat(form.liters || 0) * parseFloat(form.price_per_liter || 0))}
              </div>
            )}
            <div className="space-y-1">
              <Label>Tipo de Combustível</Label>
              <Select value={form.fuel_type} onValueChange={v => setForm({ ...form, fuel_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="diesel">Diesel</SelectItem>
                  <SelectItem value="gasoline">Gasolina</SelectItem>
                  <SelectItem value="ethanol">Etanol</SelectItem>
                  <SelectItem value="gnv">GNV</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Posto (opcional)</Label>
              <Input placeholder="Nome do posto" value={form.station} onChange={e => setForm({ ...form, station: e.target.value })} />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Abastecimento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}