import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Truck, Building2, ArrowRight, Loader2 } from 'lucide-react';

export default function CompanySetup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', cnpj: '', address: '', phone: ''
  });

  useEffect(() => {
    async function check() {
      try {
        const me = await base44.auth.me();
        const drivers = await base44.entities.Driver.filter({ email: me.email });
        if (drivers.length > 0) {
          navigate(createPageUrl('DriverPortal'));
          return;
        }
        const companies = await base44.entities.Company.filter({ owner_email: me.email });
        if (companies.length > 0) {
          navigate(createPageUrl('Dashboard'));
          return;
        }
      } catch (e) {
        // not logged in - Base44 handles redirect
      }
      setLoading(false);
    }
    check();
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const me = await base44.auth.me();
    const company = await base44.entities.Company.create({
      ...form,
      owner_email: me.email
    });
    
    navigate(createPageUrl('Dashboard'));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">TransportaBR</h1>
          <p className="text-slate-400">Configure sua empresa para começar</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-semibold text-slate-800">Dados da Empresa</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-700">Nome da Empresa *</Label>
              <Input
                required
                placeholder="Ex: Transportes ABC Ltda"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">CNPJ *</Label>
              <Input
                required
                placeholder="00.000.000/0000-00"
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Endereço</Label>
              <Input
                placeholder="Rua, número, cidade, estado"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Telefone</Label>
              <Input
                placeholder="(00) 00000-0000"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="h-11"
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold mt-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Criar Empresa e Continuar
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}