import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Exclusão de conta — disponível para todos os usuários (web e mobile).
// `company` (opcional) só ajusta a mensagem para o caso de dono de empresa.
// `className` (opcional) estiliza o botão para o contexto (claro/escuro).
export default function DeleteAccountDialog({ company, className }) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await base44.auth.deleteAccount();
      localStorage.removeItem('driver_portal_context');
      toast.success('Conta excluída.');
      window.location.href = '/login';
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
        className={
          className ||
          'flex items-center gap-2 px-3 py-2 w-full text-left text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors select-none'
        }
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
              {company ? (
                <>
                  Sua conta e todos os dados da empresa{' '}
                  <span className="font-semibold">{company.name}</span> (veículos, motoristas e
                  lançamentos) serão permanentemente excluídos.
                </>
              ) : (
                <>Sua conta será permanentemente excluída.</>
              )}{' '}
              Esta ação não pode ser desfeita.
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
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir Conta'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
