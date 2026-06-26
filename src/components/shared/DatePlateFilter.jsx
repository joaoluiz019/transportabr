import React from 'react';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Filter } from "lucide-react";

export default function DatePlateFilter({ startDate, endDate, selectedPlate, vehicles, onStartDateChange, onEndDateChange, onPlateChange }) {
  return (
    <div className="flex flex-wrap gap-3 items-end p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Filter className="w-4 h-4" />
        <span className="font-medium">Filtros</span>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500 font-medium">Data Início</label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="w-40 h-9 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500 font-medium">Data Fim</label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="w-40 h-9 text-sm"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-slate-500 font-medium">Placa</label>
        <Select value={selectedPlate || "all"} onValueChange={onPlateChange}>
          <SelectTrigger className="w-40 h-9 text-sm">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as placas</SelectItem>
            {vehicles?.map(v => (
              <SelectItem key={v.id} value={v.plate}>{v.plate} - {v.model}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}