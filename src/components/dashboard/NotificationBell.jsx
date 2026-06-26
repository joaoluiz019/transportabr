import React, { useState, useEffect, useRef } from 'react';
import { Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STORAGE_KEY = 'fleetpro_notifications_seen';

function buildNotifications(vehicles, drivers, expenses, fuelings) {
  const notifications = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // --- Mileage-based alerts from expenses (maintenance / oil_change) ---
  const serviceExpenses = expenses.filter(e => e.type === 'maintenance' || e.type === 'oil_change');
  serviceExpenses.forEach(exp => {
    if (!exp.next_service_mileage || !exp.vehicle_id) return;
    const vehicle = vehicles.find(v => v.id === exp.vehicle_id);
    if (!vehicle || vehicle.mileage == null) return;
    const remaining = exp.next_service_mileage - vehicle.mileage;
    if (remaining <= 100) {
      notifications.push({
        id: `exp-km-${exp.id}`,
        type: remaining < 0 ? 'overdue' : 'warning',
        message: remaining < 0
          ? `Veiculo ${vehicle.plate}: revisao/troca de oleo atrasada (${Math.abs(remaining)} km acima da meta)`
          : `Veiculo ${vehicle.plate}: revisao/troca de oleo a ${remaining} km (meta: ${exp.next_service_mileage.toLocaleString()} km)`,
      });
    }
  });

  // --- Date-based alerts from expenses ---
  serviceExpenses.forEach(exp => {
    if (!exp.next_service_date || !exp.vehicle_id) return;
    const vehicle = vehicles.find(v => v.id === exp.vehicle_id);
    if (!vehicle) return;
    const serviceDate = new Date(exp.next_service_date);
    serviceDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((serviceDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      notifications.push({
        id: `exp-date-${exp.id}`,
        type: diffDays < 0 ? 'overdue' : 'warning',
        message: diffDays < 0
          ? `Veiculo ${vehicle.plate}: revisao atrasada (${Math.abs(diffDays)} dias)`
          : `Veiculo ${vehicle.plate}: revisao em ${diffDays} dia(s)`,
      });
    }
  });

  // --- Vehicle registration expiry alerts ---
  vehicles.forEach(v => {
    if (!v.registration_expiry) return;
    const expDate = new Date(v.registration_expiry);
    expDate.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) {
      notifications.push({
        id: `reg-${v.id}`,
        type: diffDays < 0 ? 'overdue' : 'warning',
        message: diffDays < 0
          ? `Veiculo ${v.plate}: emplacamento vencido ha ${Math.abs(diffDays)} dia(s)`
          : `Veiculo ${v.plate}: emplacamento vence em ${diffDays} dia(s)`,
      });
    }
  });

  // --- Latest fueling per vehicle: km/l alerts vs desired_km_per_liter ---
  const latestFuelingPerVehicle = {};
  fuelings.forEach(f => {
    if (!f.vehicle_id) return;
    if (!latestFuelingPerVehicle[f.vehicle_id] || f.mileage > (latestFuelingPerVehicle[f.vehicle_id].mileage || 0)) {
      latestFuelingPerVehicle[f.vehicle_id] = f;
    }
  });
  Object.values(latestFuelingPerVehicle).forEach(f => {
    if (f.km_per_liter == null) return;
    const vehicle = vehicles.find(v => v.id === f.vehicle_id);
    if (!vehicle) return;
    // Use desired_km_per_liter if set, otherwise fallback to threshold of 3
    const threshold = vehicle.desired_km_per_liter || 3;
    if (f.km_per_liter < threshold) {
      notifications.push({
        id: `fuel-${f.id}`,
        type: 'warning',
        message: `Veiculo ${vehicle.plate}: rendimento abaixo do desejado — ${f.km_per_liter.toFixed(2)} km/l (meta: ${threshold} km/l)`,
      });
    }
  });

  // --- Driver CNH and toxicological expiry alerts ---
  drivers.forEach(driver => {
    if (driver.cnh_expiry) {
      const expDate = new Date(driver.cnh_expiry);
      expDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) {
        notifications.push({
          id: `cnh-${driver.id}`,
          type: diffDays < 0 ? 'overdue' : 'warning',
          message: diffDays < 0
            ? `Motorista ${driver.name}: CNH vencida ha ${Math.abs(diffDays)} dias`
            : `Motorista ${driver.name}: CNH vence em ${diffDays} dia(s)`,
        });
      }
    }
    if (driver.toxicological_expiry) {
      const expDate = new Date(driver.toxicological_expiry);
      expDate.setHours(0, 0, 0, 0);
      const diffDays = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));
      if (diffDays <= 30) {
        notifications.push({
          id: `tox-${driver.id}`,
          type: diffDays < 0 ? 'overdue' : 'warning',
          message: diffDays < 0
            ? `Motorista ${driver.name}: exame toxicologico vencido ha ${Math.abs(diffDays)} dias`
            : `Motorista ${driver.name}: exame toxicologico vence em ${diffDays} dia(s)`,
        });
      }
    }
  });

  return notifications;
}

export default function NotificationBell({ company }) {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const [seenIds, setSeenIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'));
    } catch {
      return new Set();
    }
  });
  const panelRef = useRef(null);

  useEffect(() => {
    if (!company) return;
    async function load() {
      const [vehicles, drivers, expenses, fuelings] = await Promise.all([
        base44.entities.Vehicle.filter({ company_id: company.id }),
        base44.entities.Driver.filter({ company_id: company.id }),
        base44.entities.Expense.filter({ company_id: company.id }),
        base44.entities.Fueling.filter({ company_id: company.id }),
      ]);
      setNotifications(buildNotifications(vehicles, drivers, expenses, fuelings));
    }
    load();

    // Subscribe to real-time updates
    const unsubExp = base44.entities.Expense.subscribe(() => load());
    const unsubFuel = base44.entities.Fueling.subscribe(() => load());
    const unsubDriver = base44.entities.Driver.subscribe(() => load());
    const unsubVehicle = base44.entities.Vehicle.subscribe(() => load());
    return () => { unsubExp(); unsubFuel(); unsubDriver(); unsubVehicle(); };
  }, [company]);

  // Close panel on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const unseenNotifications = notifications.filter(n => !seenIds.has(n.id));
  const hasUnseen = unseenNotifications.length > 0;

  const handleOpen = () => {
    setOpen(prev => !prev);
    if (!open && hasUnseen) {
      // Mark all current notifications as seen
      const newSeenIds = new Set([...seenIds, ...notifications.map(n => n.id)]);
      setSeenIds(newSeenIds);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...newSeenIds]));
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Notificacoes"
      >
        <Bell className={`w-6 h-6 ${hasUnseen ? 'text-amber-500' : 'text-slate-400'}`} />
        {hasUnseen && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unseenNotifications.length > 9 ? '9+' : unseenNotifications.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-96 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Notificacoes</h3>
            <span className="text-xs text-slate-400">{notifications.length} alerta(s)</span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-slate-400 text-sm">
                Nenhuma notificacao pendente
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-slate-50 last:border-0 ${
                    n.type === 'overdue' ? 'bg-rose-50' : 'bg-amber-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${n.type === 'overdue' ? 'bg-rose-500' : 'bg-amber-400'}`} />
                    <p className={`text-sm ${n.type === 'overdue' ? 'text-rose-700' : 'text-amber-800'}`}>
                      {n.message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}