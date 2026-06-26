import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useCompany } from '../components/hooks/useCompany';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import EmptyState from '../components/shared/EmptyState';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Plus, Search, Pencil, Trash2, Loader2, Mail, Send, ArrowLeft, Link2 } from 'lucide-react';
import PullToRefresh from '../components/layout/PullToRefresh';
import { toast } from "sonner";
import InviteLinkDialog from '../components/drivers/InviteLinkDialog';

export default function Drivers() {
  const { company, loading: compLoading } = useCompany();
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [search, setSearch] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [inviteLinkDriver, setInviteLinkDriver] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState({
    name: '', email: '', phone: '', cnh: '', cnh_expiry: '', toxicological_expiry: '', commission_percent: '', vehicle_id: '', status: 'active'
  });

  useEffect(() => {
    if (!compLoading && !company) navigate(createPageUrl('CompanySetup'));
  }, [compLoading, company, navigate]);

  useEffect(() => {
    if (!company) return;
    loadData();
  }, [company]);

  const loadData = async () => {
    const [d, v] = await Promise.all([
      base44.entities.Driver.filter({ company_id: company.id }),
      base44.entities.Vehicle.filter({ company_id: company.id }),
    ]);
    setDrivers(d);
    setVehicles(v);
    setLoading(false);
  };

  const openNew = () => {
    setEditingDriver(null);
    setForm({ name: '', email: '', phone: '', cnh: '', cnh_expiry: '', toxicological_expiry: '', commission_percent: '', vehicle_id: '', status: 'active' });
    setDialogOpen(true);
  };

  const openEdit = (d) => {
    setEditingDriver(d);
    setForm({
      name: d.name || '',
      email: d.email || '',
      phone: d.phone || '',
      cnh: d.cnh || '',
      cnh_expiry: d.cnh_expiry || '',
      toxicological_expiry: d.toxicological_expiry || '',
      commission_percent: d.commission_percent ?? '',
      vehicle_id: d.vehicle_id || '',
      status: d.status || 'active'
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const data = { ...form, company_id: company.id };
    setDialogOpen(false);
    if (editingDriver) {
      setDrivers(prev => prev.map(d => d.id === editingDriver.id ? { ...d, ...data } : d));
      await base44.entities.Driver.update(editingDriver.id, data);
      // Se tiver email, tenta re-associar o usuário caso tenha mudado o veículo
      if (form.email) {
        await base44.functions.invoke('associateDriver', {
          email: form.email,
          company_id: company.id,
          driver_id: editingDriver.id,
          vehicle_id: form.vehicle_id || null,
        });
      }
    } else {
      const created = await base44.entities.Driver.create(data);
      setDrivers(prev => [...prev, created]);
      // Associa o usuário ao driver pelo email automaticamente
      if (form.email) {
        await base44.functions.invoke('associateDriver', {
          email: form.email,
          company_id: company.id,
          driver_id: created.id,
          vehicle_id: form.vehicle_id || null,
        });
      }
    }
  };

  const handleDelete = async (id) => {
    const driver = drivers.find(d => d.id === id);
    setDrivers(prev => prev.filter(d => d.id !== id));
    await base44.entities.Driver.delete(id);

    // Limpa o veículo associado
    if (driver?.vehicle_id) {
      await base44.entities.Vehicle.update(driver.vehicle_id, { driver_id: '', driver_name: '' });
    }

    // Limpa o perfil do usuário associado ao motorista
    if (driver?.email) {
      const users = await base44.asServiceRole?.entities?.User?.filter({ email: driver.email }) || [];
      if (users.length > 0) {
        await base44.functions.invoke('associateDriver', {
          email: driver.email,
          company_id: company.id,
          driver_id: '',
          vehicle_id: null,
          clear: true,
        });
      }
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: inviteEmail,
      subject: `Convite - ${company.name} | FleetPro`,
      body: `Ola! Voce foi convidado para fazer parte da frota da empresa ${company.name} no FleetPro.`
    });
    setSending(false);
    setInviteOpen(false);
    setInviteEmail('');
    toast.success('Convite enviado com sucesso!');
  };

  const filtered = drivers.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.email?.toLowerCase().includes(search.toLowerCase())
  );

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
            <h1 className="text-2xl font-bold text-slate-800">Motoristas</h1>
            <p className="text-slate-500 text-sm mt-0.5">{drivers.length} motoristas cadastrados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setInviteOpen(true)}>
            <Mail className="w-4 h-4 mr-2" /> Convidar
          </Button>
          <Button onClick={openNew} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="w-4 h-4 mr-2" /> Novo Motorista
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input placeholder="Buscar por nome, email..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum motorista"
          description="Cadastre ou convide seus motoristas para vincular a frota."
          actionLabel="Cadastrar Motorista"
          onAction={openNew}
        />
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>CNH</TableHead>
                  <TableHead>Validade CNH</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20">Acoes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(d => (
                  <TableRow key={d.id} className="hover:bg-slate-50">
                    <TableCell className="font-semibold text-slate-800">{d.name}</TableCell>
                    <TableCell>{d.email || '-'}</TableCell>
                    <TableCell>{d.phone || '-'}</TableCell>
                    <TableCell>{d.cnh || '-'}</TableCell>
                    <TableCell>{d.cnh_expiry || '-'}</TableCell>
                    <TableCell>
                      <Badge className={d.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}>
                        {d.status === 'active' ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => setInviteLinkDriver(d)} title="Gerar link de convite">
                        <Link2 className="w-4 h-4 text-emerald-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                        <Pencil className="w-4 h-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
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
            <DialogTitle>{editingDriver ? 'Editar Motorista' : 'Novo Motorista'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nome completo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="email@exemplo.com" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} placeholder="(00) 00000-0000" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>CNH</Label>
                <Input value={form.cnh} onChange={e => setForm({...form, cnh: e.target.value})} placeholder="Numero da CNH" />
              </div>
              <div className="space-y-2">
                <Label>Validade CNH</Label>
                <Input type="date" value={form.cnh_expiry} onChange={e => setForm({...form, cnh_expiry: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Vencimento Exame Toxicologico</Label>
              <Input type="date" value={form.toxicological_expiry} onChange={e => setForm({...form, toxicological_expiry: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Comissão sobre Faturamento (%)</Label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.commission_percent}
                onChange={e => setForm({...form, commission_percent: e.target.value === '' ? '' : parseFloat(e.target.value)})}
                placeholder="Ex: 10 (para 10%)"
              />
            </div>
            <div className="space-y-2">
              <Label>Veículo Associado</Label>
              <Select value={form.vehicle_id} onValueChange={v => setForm({...form, vehicle_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar veículo (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {vehicles.map(v => (
                    <SelectItem key={v.id} value={v.id}>{v.plate} — {v.model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleSave} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {editingDriver ? 'Salvar Alteracoes' : 'Cadastrar Motorista'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <InviteLinkDialog
        open={!!inviteLinkDriver}
        onClose={() => setInviteLinkDriver(null)}
        driver={inviteLinkDriver}
        company={company}
      />

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Convidar Motorista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Email do Motorista</Label>
              <Input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <Button onClick={handleInvite} disabled={sending} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> Enviar Convite
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
    </PullToRefresh>
  );
}