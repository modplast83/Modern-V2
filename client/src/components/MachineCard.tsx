// src/components/MachineCard.tsx
import { CheckCircle, XCircle, AlertTriangle, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { calcOEE, pct } from "../utils/oee";
import Sparkline from "./Sparkline";

type Machine = {
  machine_id: string;
  machine_name: string;
  status: "active" | "maintenance" | "down" | string;
  current_rolls?: number;
  utilization?: number; // 0..1
  lastDowntime?: string | null;
  last24hUtilization?: number[];
  operatingTimeSec?: number;
  plannedProductionSec?: number;
  producedUnits?: number;
  goodUnits?: number;
  idealCycleTimeSec?: number;
  oee?: number; // optional precomputed
};

const statusColor = (s: string) => {
  switch (s) {
    case "active": return "bg-green-50 border-green-200";
    case "maintenance": return "bg-yellow-50 border-yellow-200";
    case "down": return "bg-red-50 border-red-200";
    default: return "bg-gray-50 border-gray-200";
  }
};

const statusIcon = (s: string) => {
  switch (s) {
    case "active": return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "maintenance": return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case "down": return <XCircle className="w-4 h-4 text-red-500" />;
    default: return <Timer className="w-4 h-4 text-gray-400" />;
  }
};

export default function MachineCard({ machine }: { machine: Machine }) {
  const { t } = useTranslation();
  const {
    machine_name, status, current_rolls = 0, utilization = 0, lastDowntime,
    last24hUtilization = [], operatingTimeSec = 0, plannedProductionSec = 0,
    producedUnits = 0, goodUnits = 0, idealCycleTimeSec = 1,
  } = machine;

  const computed = calcOEE({
    operatingTimeSec,
    plannedProductionSec,
    producedUnits,
    goodUnits,
    idealCycleTimeSec,
  });

  const oeePct = pct(computed.oee);

  const statusLabel = status === "active" ? t('machineCard.statusActive') : status === "maintenance" ? t('machineCard.statusMaintenance') : t('machineCard.statusDown');

  return (
    <div className={`p-3 rounded-lg border ${statusColor(status)}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-medium">{machine_name}</div>
          <div className="text-xs text-gray-500">{statusLabel}</div>
        </div>
        <div className="flex items-center gap-2">
          {statusIcon(status)}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-gray-600">{t('machineCard.utilization')}</div>
          <div className="text-lg font-bold">{Math.round(utilization * 100)}%</div>
        </div>

        <div className="text-right">
          <div className="text-xs text-gray-600">OEE</div>
          <div className="text-lg font-bold">{oeePct}%</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <div style={{ width: 90 }}>
          <Sparkline data={last24hUtilization} />
        </div>

        <div className="text-xs text-gray-500 text-right">
          <div>{t('machineCard.currentRolls')}: <strong>{current_rolls}</strong></div>
          <div>{t('machineCard.lastDowntime')}: <strong>{lastDowntime ? new Date(lastDowntime).toLocaleString() : "-"}</strong></div>
        </div>
      </div>

      <div className="mt-3 text-xs text-gray-600 grid grid-cols-3 gap-2">
        <div className="text-center">
          <div className="font-semibold">{pct(computed.availability)}%</div>
          <div className="text-[11px] text-gray-500">{t('machineCard.availability')}</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{pct(computed.performance)}%</div>
          <div className="text-[11px] text-gray-500">{t('machineCard.performance')}</div>
        </div>
        <div className="text-center">
          <div className="font-semibold">{pct(computed.quality)}%</div>
          <div className="text-[11px] text-gray-500">{t('machineCard.quality')}</div>
        </div>
      </div>
    </div>
  );
}
