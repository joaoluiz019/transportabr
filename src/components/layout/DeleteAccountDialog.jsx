import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DeleteAccountDialog({ company }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete all company data
      const [vehicles, drivers, expenses, fuelings, billings] = await Promise.all([
        base44.entities.Vehicle.filter({ company_id: company.id }),
        base44.entities.Driver.filter({ company_id: company.id }),
        base44.entities.Expense.filter({ company_id: company.id }),
        base44.entities.Fueling.filter({ company_id: company.id }),
        base44.entities.Billing.filter({ company_id: company.id }),
      ]);
      await Promise.all([
        ...vehicles.map(v => base44.entities.Vehicle.delete(v.id)),
        ...drivers.map(d => base44.entities.Driver.delete(d.id)),
        ...expenses.map(e => base44.entities.Expense.delete(e.id)),
        ...fuelings.map(f => base44.entities.Fueling.delete(f.id)),
        ...billings.map(b => base44.entities.Billing.delete(b.id)),
        base44.entities.Company.delete(company.id),
      ]);
      toast.success('Conta excluída com sucesso.');
      base44.auth.logout();
    } catch (err) {
      toast.error('Erro ao excluir conta.');
      setDeleting(false);
      setOpen(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 w-full text-left text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors select-none"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Excluir Conta
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Excluir Conta</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <p className="text-sm text-slate-600">
              Todos os dados da empresa <span className="font-semibold">{company?.name}</span> serão permanentemente excluídos. Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir Tudo'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}