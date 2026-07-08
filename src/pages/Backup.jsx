import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { useCompany } from '../components/hooks/useCompany';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Database, Download, Upload, Loader2, CheckCircle2, AlertTriangle, FileDown, FileUp, ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { toast } from "sonner";

export default function Backup() {
  const { company, loading: compLoading } = useCompany();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const today = new Date().toISOString().slice(0, 10);
  const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [consultStartDate, setConsultStartDate] = useState(firstOfMonth);
  const [consultEndDate, setConsultEndDate] = useState(today);
  const [consultExporting, setConsultExporting] = useState(null); // entityType string or null

  const handleConsultantExport = async (entityType) => {
    if (!consultStartDate || !consultEndDate) {
      toast.error('Selecione o período para exportação');
      return;
    }
    setConsultExporting(entityType);
    const response = await base44.functions.invoke('exportConsultantData', {
      entityType,
      startDate: consultStartDate,
      endDate: consultEndDate,
    });
    setConsultExporting(null);

    const csv = response.data;
    if (!csv || typeof csv !== 'string') {
      toast.error('Nenhum dado encontrado para o período selecionado');
      return;
    }

    const labelMap = { Fueling: 'abastecimentos', Expense: 'despesas', Billing: 'faturamento' };
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${labelMap[entityType]}_${consultStartDate}_${consultEndDate}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`${labelMap[entityType]} exportado com sucesso!`);
  };

  useEffect(() => {
    if (!compLoading && !company) navigate(createPageUrl('CompanySetup'));
  }, [compLoading, company, navigate]);

  const handleExport = async () => {
    setExporting(true);
    const [vehicles, drivers, expenses, fuelings, billings] = await Promise.all([
      base44.entities.Vehicle.filter({ company_id: company.id }),
      base44.entities.Driver.filter({ company_id: company.id }),
      base44.entities.Expense.filter({ company_id: company.id }),
      base44.entities.Fueling.filter({ company_id: company.id }),
      base44.entities.Billing.filter({ company_id: company.id }),
    ]);

    const backupData = {
      version: '1.0',
      company: { name: company.name, cnpj: company.cnpj },
      exported_at: new Date().toISOString(),
      data: { vehicles, drivers, expenses, fuelings, billings }
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fleetpro_backup_${company.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setExporting(false);
    toast.success('Backup exportado com sucesso!');
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const text = await file.text();
    const backupData = JSON.parse(text);

    if (!backupData.data) {
      toast.error('Arquivo de backup inválido');
      setImporting(false);
      return;
    }

    // Delete existing data
    const [vehicles, drivers, expenses, fuelings, billings] = await Promise.all([
      base44.entities.Vehicle.filter({ company_id: company.id }),
      base44.entities.Driver.filter({ company_id: company.id }),
      base44.entities.Expense.filter({ company_id: company.id }),
      base44.entities.Fueling.filter({ company_id: company.id }),
      base44.entities.Billing.filter({ company_id: company.id }),
    ]);

    // Delete all existing records
    await Promise.all([
      ...vehicles.map(v => base44.entities.Vehicle.delete(v.id)),
      ...drivers.map(d => base44.entities.Driver.delete(d.id)),
      ...expenses.map(e => base44.entities.Expense.delete(e.id)),
      ...fuelings.map(f => base44.entities.Fueling.delete(f.id)),
      ...billings.map(b => base44.entities.Billing.delete(b.id)),
    ]);

    // Import new data
    const { data } = backupData;
    const cleanRecord = (record) => {
      const { id, created_date, updated_date, created_by, ...rest } = record;
      return { ...rest, company_id: company.id };
    };

    if (data.vehicles?.length) await base44.entities.Vehicle.bulkCreate(data.vehicles.map(cleanRecord));
    if (data.drivers?.length) await base44.entities.Driver.bulkCreate(data.drivers.map(cleanRecord));
    if (data.expenses?.length) await base44.entities.Expense.bulkCreate(data.expenses.map(cleanRecord));
    if (data.fuelings?.length) await base44.entities.Fueling.bulkCreate(data.fuelings.map(cleanRecord));
    if (data.billings?.length) await base44.entities.Billing.bulkCreate(data.billings.map(cleanRecord));

    // Backup substitui todos os dados — invalida os caches das páginas para que
    // Dashboard/Veículos/etc. recarreguem em vez de mostrar o cache antigo.
    queryClient.invalidateQueries();

    setImporting(false);
    toast.success('Dados importados com sucesso!');
    fileInputRef.current.value = '';
  };

  if (compLoading) return <div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('Dashboard'))} className="text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Backup & Restauração</h1>
          <p className="text-slate-500 text-sm mt-0.5">Exporte e importe seus dados de forma segura</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                <FileDown className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Exportar Dados</CardTitle>
                <p className="text-sm text-slate-500 mt-0.5">Baixe um backup completo</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4 text-sm text-slate-600 space-y-1">
              <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Veículos e Motoristas</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Despesas e Abastecimentos</p>
              <p className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Faturamentos</p>
            </div>
            <p className="text-xs text-slate-500">
              O arquivo será salvo no formato JSON. Você pode armazená-lo em pendrive, HD externo ou computador.
            </p>
            <Button onClick={handleExport} disabled={exporting} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
              {exporting ? 'Exportando...' : 'Exportar Backup'}
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                <FileUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Importar Dados</CardTitle>
                <p className="text-sm text-slate-500 mt-0.5">Restaure a partir de um backup</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 space-y-1">
              <p className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="w-4 h-4" /> Atenção
              </p>
              <p>A importação irá substituir todos os dados atuais da empresa pelos dados do backup.</p>
            </div>
            <p className="text-xs text-slate-500">
              Selecione um arquivo JSON de backup previamente exportado pelo FleetPro.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              variant="outline"
              className="w-full border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Upload className="w-4 h-4 mr-2" />}
              {importing ? 'Importando...' : 'Selecionar Arquivo de Backup'}
            </Button>
          </CardContent>
        </Card>
      </div>
      {/* Backup Consultor */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center">
              <FileSpreadsheet className="w-6 h-6 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Backup Consultor</CardTitle>
              <p className="text-sm text-slate-500 mt-0.5">Exporte relatórios por período para análise externa</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Data Início</Label>
              <Input type="date" value={consultStartDate} onChange={e => setConsultStartDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-600">Data Fim</Label>
              <Input type="date" value={consultEndDate} onChange={e => setConsultEndDate(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            {[
              { type: 'Expense', label: 'Despesas', color: 'border-rose-200 text-rose-700 hover:bg-rose-50' },
              { type: 'Fueling', label: 'Abastecimentos', color: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' },
              { type: 'Billing', label: 'Faturamento', color: 'border-blue-200 text-blue-700 hover:bg-blue-50' },
            ].map(({ type, label, color }) => (
              <Button
                key={type}
                variant="outline"
                disabled={!!consultExporting}
                onClick={() => handleConsultantExport(type)}
                className={`w-full ${color}`}
              >
                {consultExporting === type
                  ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  : <Download className="w-4 h-4 mr-2" />}
                {consultExporting === type ? 'Exportando...' : label}
              </Button>
            ))}
          </div>
          <p className="text-xs text-slate-400">Os arquivos serão exportados no formato CSV, filtrados pelo período selecionado.</p>
        </CardContent>
      </Card>
    </div>
  );
}