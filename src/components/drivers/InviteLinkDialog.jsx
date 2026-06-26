import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Copy, Link2, Loader2, CheckCheck, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function InviteLinkDialog({ open, onClose, driver, company }) {
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [storeUrl, setStoreUrl] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [existingInvite, setExistingInvite] = useState(null);

  useEffect(() => {
    if (!open || !company || !driver) return;
    setGeneratedLink('');
    setCopied(false);

    async function load() {
      const [veh, invites] = await Promise.all([
        base44.entities.Vehicle.filter({ company_id: company.id }),
        base44.entities.DriverInvite.filter({ driver_id: driver.id, company_id: company.id, is_active: true }),
      ]);
      setVehicles(veh);

      if (invites.length > 0) {
        const inv = invites[0];
        setExistingInvite(inv);
        setSelectedVehicle(inv.vehicle_id || '');
        setStoreUrl(inv.store_url || '');
        const link = buildLink(inv.token, company.id, driver.id);
        setGeneratedLink(link);
      } else {
        setExistingInvite(null);
        // Pre-select vehicle linked to driver
        const linked = veh.find(v => v.driver_id === driver.id);
        setSelectedVehicle(linked?.id || '');
        setStoreUrl('');
      }
    }
    load();
  }, [open, company, driver]);

  function buildLink(token, cid, did) {
    const base = window.location.origin;
    const page = createPageUrl('DriverInviteAccept');
    return `${base}${page}?token=${token}&cid=${cid}&did=${did}`;
  }

  const handleGenerate = async () => {
    setLoading(true);
    const token = generateToken();
    const vehicleId = selectedVehicle && selectedVehicle !== 'none' ? selectedVehicle : null;

    if (existingInvite) {
      await base44.entities.DriverInvite.update(existingInvite.id, {
        vehicle_id: vehicleId,
        store_url: storeUrl || null,
        token,
      });
    } else {
      await base44.entities.DriverInvite.create({
        company_id: company.id,
        driver_id: driver.id,
        vehicle_id: vehicleId,
        store_url: storeUrl || null,
        token,
        is_active: true,
      });
    }

    const link = buildLink(token, company.id, driver.id);
    setGeneratedLink(link);
    setLoading(false);
    toast.success('Link gerado com sucesso!');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateStoreUrl = async () => {
    if (!existingInvite) return;
    await base44.entities.DriverInvite.update(existingInvite.id, { store_url: storeUrl || null });
    toast.success('URL da loja atualizada!');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-emerald-600" />
            Link de Convite — {driver?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Vehicle selection */}
          <div className="space-y-2">
            <Label>Vincular Veículo</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar veículo (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem veículo vinculado</SelectItem>
                {vehicles.map(v => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.plate} — {v.brand} {v.model}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400">O motorista verá apenas os abastecimentos deste veículo.</p>
          </div>

          {/* Store URL */}
          <div className="space-y-2">
            <Label>URL da Loja (Play Store / App Store)</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://play.google.com/... (configurar após publicação)"
                value={storeUrl}
                onChange={e => setStoreUrl(e.target.value)}
                className="flex-1 text-sm"
              />
              {existingInvite && (
                <Button variant="outline" size="icon" onClick={handleUpdateStoreUrl} title="Salvar URL">
                  <CheckCheck className="w-4 h-4 text-emerald-600" />
                </Button>
              )}
            </div>
            <p className="text-xs text-slate-400">Se preenchida, o link redireciona para a loja ao invés do portal web.</p>
          </div>

          {/* Generate button */}
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : existingInvite ? (
              'Regenerar Link'
            ) : (
              'Gerar Link de Convite'
            )}
          </Button>

          {/* Generated link */}
          {generatedLink && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Link gerado</p>
              <p className="text-xs text-slate-600 break-all font-mono bg-white rounded-lg border border-slate-200 p-2">
                {generatedLink}
              </p>
              <div className="flex gap-2">
                <Button onClick={handleCopy} variant="outline" size="sm" className="flex-1">
                  {copied ? <CheckCheck className="w-4 h-4 text-emerald-500 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                  {copied ? 'Copiado!' : 'Copiar Link'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(generatedLink, '_blank')}
                >
                  <ExternalLink className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}