import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Loader2, Truck, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DriverInviteAccept() {
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    async function process() {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      const companyId = params.get('cid');
      const driverId = params.get('did');

      if (!token || !companyId || !driverId) {
        setStatus('error');
        setMessage('Link de convite inválido ou incompleto.');
        return;
      }

      try {
        // Validate invite
        const invites = await base44.entities.DriverInvite.filter({
          token,
          company_id: companyId,
          driver_id: driverId,
          is_active: true,
        });

        if (invites.length === 0) {
          setStatus('error');
          setMessage('Link de convite inválido, expirado ou já utilizado.');
          return;
        }

        const invite = invites[0];

        // Se tem URL de loja configurada, redireciona
        if (invite.store_url) {
          window.location.href = invite.store_url;
          return;
        }

        // Resolve vehicle_id antes de usar
        const vehicleId = invite.vehicle_id && invite.vehicle_id !== 'none' ? invite.vehicle_id : null;

        // Atualiza role do usuário para driver e associa dados da empresa/veículo
        try {
          await base44.auth.updateMe({
            company_id: companyId,
            driver_id: driverId,
            vehicle_id: vehicleId,
          });
        } catch (e) {
          // ignora se não estiver logado ainda
        }

        // Salva contexto no localStorage e redireciona ao portal
        const context = {
          company_id: companyId,
          driver_id: driverId,
          vehicle_id: vehicleId,
        };
        localStorage.setItem('driver_portal_context', JSON.stringify(context));

        setStatus('ok');
        // Redireciona para o portal do motorista após breve feedback
        setTimeout(() => {
          window.location.href = createPageUrl('DriverPortal');
        }, 1500);
      } catch (e) {
        setStatus('error');
        setMessage('Erro ao validar o convite. Tente novamente.');
      }
    }
    process();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm text-center">
        <div className="flex justify-center mb-4">
          <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Truck className="w-7 h-7 text-white" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-1">TransportaBR</h1>

        {status === 'loading' && (
          <>
            <p className="text-slate-500 text-sm mb-4">Validando seu convite...</p>
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto" />
          </>
        )}

        {status === 'ok' && (
          <>
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
            <p className="text-slate-700 font-semibold">Convite válido!</p>
            <p className="text-slate-500 text-sm mt-1">Redirecionando para o portal...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
            <p className="text-rose-700 font-semibold">Link inválido</p>
            <p className="text-slate-500 text-sm mt-1">{message}</p>
          </>
        )}
      </div>
    </div>
  );
}