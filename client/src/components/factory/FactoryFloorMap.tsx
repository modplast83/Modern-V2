import React, { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { CheckCircle, AlertTriangle, XCircle, Activity } from "lucide-react";

type SectionId = "SEC03" | "SEC04" | "SEC05";
type MachineStatus = "active" | "maintenance" | "down" | "unknown";
type MachineType = "extruder" | "printer" | "cutter" | "quality_check" | "other";

interface Machine {
  id: string;
  name: string;
  name_ar?: string;
  type: string;
  section_id?: string;
  status: string;
  capacity_small_kg_per_hour?: number;
  capacity_medium_kg_per_hour?: number;
  capacity_large_kg_per_hour?: number;
}

interface Section {
  id: string;
  name: string;
  name_ar?: string;
}

/** Icons (SVG) */
const FilmExtruderIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="8" r="5" />
    <path d="M12 13v8" />
    <path d="M8 17h8" />
    <path d="M7 21h10" />
    <circle cx="12" cy="8" r="2" />
  </svg>
);

const PrintingMachineIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="3" y="8" width="18" height="10" rx="2" />
    <path d="M7 8V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" />
    <path d="M7 15h10" />
    <path d="M7 18h10" />
    <circle cx="17" cy="11" r="1" fill="currentColor" />
  </svg>
);

const CuttingMachineIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="4" y="6" width="16" height="12" rx="1" />
    <path d="M4 12h16" />
    <path d="M12 6v12" />
    <path d="M8 9v6" />
    <path d="M16 9v6" />
  </svg>
);

const SECTION_IDS: SectionId[] = ["SEC03", "SEC04", "SEC05"];

const SECTION_POSITIONS: Record<SectionId, { x: number; y: number; width: number; height: number; label: string }> = {
  SEC03: { x: 30, y: 80, width: 380, height: 320, label: "قسم الفيلم" },
  SEC04: { x: 430, y: 80, width: 380, height: 320, label: "قسم الطباعة" },
  SEC05: { x: 830, y: 80, width: 380, height: 320, label: "قسم القص" },
};

function isSectionId(id?: string): id is SectionId {
  return id === "SEC03" || id === "SEC04" || id === "SEC05";
}

function normalizeStatus(status?: string): MachineStatus {
  if (status === "active" || status === "maintenance" || status === "down") return status;
  return "unknown";
}

function normalizeType(type?: string): MachineType {
  if (type === "extruder" || type === "printer" || type === "cutter" || type === "quality_check") return type;
  return "other";
}

type StatusStyle = { bg: string; border: string; text: string; glow?: string };
const STATUS_STYLE: Record<MachineStatus, StatusStyle> = {
  active: { bg: "#22c55e", border: "#16a34a", text: "white", glow: "0 0 20px rgba(34, 197, 94, 0.5)" },
  maintenance: { bg: "#f59e0b", border: "#d97706", text: "white", glow: "0 0 20px rgba(245, 158, 11, 0.5)" },
  down: { bg: "#ef4444", border: "#dc2626", text: "white", glow: "0 0 20px rgba(239, 68, 68, 0.5)" },
  unknown: { bg: "#6b7280", border: "#4b5563", text: "white" },
};

const STATUS_ICON: Record<MachineStatus, React.ReactNode> = {
  active: <Activity className="w-3 h-3" />,
  maintenance: <AlertTriangle className="w-3 h-3" />,
  down: <XCircle className="w-3 h-3" />,
  unknown: null,
};

function resolveIcon(typeRaw: string, sectionId?: SectionId) {
  const type = normalizeType(typeRaw);
  if (type === "extruder" || sectionId === "SEC03") return FilmExtruderIcon;
  if (type === "printer" || sectionId === "SEC04") return PrintingMachineIcon;
  if (type === "cutter" || sectionId === "SEC05") return CuttingMachineIcon;
  if (type === "quality_check") return CheckCircle;
  return Activity;
}

function getTypeLabel(typeRaw: string, t: any) {
  const type = normalizeType(typeRaw);
  switch (type) {
    case "extruder":
      return t("factory.type.extruder", "ماكينة فيلم");
    case "printer":
      return t("factory.type.printer", "ماكينة طباعة");
    case "cutter":
      return t("factory.type.cutter", "ماكينة قص");
    case "quality_check":
      return t("factory.type.qualityCheck", "فحص جودة");
    default:
      return typeRaw;
  }
}

function getStatusLabel(statusRaw: string, t: any) {
  const status = normalizeStatus(statusRaw);
  switch (status) {
    case "active":
      return t("factory.status.active", "تعمل");
    case "maintenance":
      return t("factory.status.maintenance", "صيانة");
    case "down":
      return t("factory.status.down", "متوقفة");
    default:
      return t("factory.status.unknown", "غير معروف");
  }
}

/** Fixed 4x4 grid (max 16 machines) */
function gridPosition(pos: { x: number; y: number }, idx: number) {
  const cols = 4;
  const row = Math.floor(idx / cols);
  const col = idx % cols;
  return {
    x: pos.x + 50 + col * 85,
    y: pos.y + 60 + row * 75,
  };
}

function MachineNode({
  machine,
  sectionPos,
  idx,
  onSelect,
  t,
}: {
  machine: Machine;
  sectionPos: { x: number; y: number; width: number; height: number };
  idx: number;
  onSelect: (m: Machine) => void;
  t: any;
}) {
  const { x: machineX, y: machineY } = gridPosition(sectionPos, idx);
  const status = normalizeStatus(machine.status);
  const style = STATUS_STYLE[status];
  const Icon = resolveIcon(machine.type, isSectionId(machine.section_id) ? machine.section_id : undefined);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <g onClick={() => onSelect(machine)} style={{ cursor: "pointer" }} className="transition-transform hover:scale-110">
          <rect
            x={machineX - 28}
            y={machineY - 28}
            width="56"
            height="56"
            rx="10"
            fill={style.bg}
            stroke={style.border}
            strokeWidth="3"
            style={{ filter: style.glow ? `drop-shadow(${style.glow})` : undefined }}
          />
          <foreignObject x={machineX - 14} y={machineY - 14} width="28" height="28">
            <div className="flex items-center justify-center w-full h-full">
              <Icon className="w-6 h-6 text-white" />
            </div>
          </foreignObject>
          <text
            x={machineX}
            y={machineY + 42}
            textAnchor="middle"
            className="fill-slate-700 dark:fill-slate-300"
            style={{ fontSize: "10px", fontWeight: 600 }}
          >
            {machine.name_ar || machine.name}
          </text>
        </g>
      </TooltipTrigger>

      <TooltipContent side="top" className="bg-slate-900 text-white p-3">
        <div className="text-sm font-bold">{machine.name_ar || machine.name}</div>
        <div className="text-xs opacity-80">{getTypeLabel(machine.type, t)}</div>
        <div className="flex items-center gap-1 mt-1">
          {STATUS_ICON[status]}
          <span>{getStatusLabel(machine.status, t)}</span>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export default function FactoryFloorMap() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === "ar";
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);

  const { data: machines = [], isLoading: machinesLoading } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
  });

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });

  const sectionsMap = useMemo(() => new Map(sections.map((s) => [s.id, s])), [sections]);

  const machinesBySection = useMemo(() => {
    const grouped: Record<SectionId, Machine[]> = { SEC03: [], SEC04: [], SEC05: [] };

    for (const m of machines) {
      if (!isSectionId(m.section_id)) continue; // ignore unexpected
      grouped[m.section_id].push(m);
    }

    // Optional: enforce max 16 just in case API sends more
    for (const sid of SECTION_IDS) grouped[sid] = grouped[sid].slice(0, 16);

    return grouped;
  }, [machines]);

  const stats = useMemo(() => {
    return machines.reduce(
      (acc, m) => {
        acc.total += 1;
        const st = normalizeStatus(m.status);
        if (st === "active") acc.active += 1;
        else if (st === "maintenance") acc.maintenance += 1;
        else if (st === "down") acc.down += 1;
        return acc;
      },
      { total: 0, active: 0, maintenance: 0, down: 0 }
    );
  }, [machines]);

  const onSelectMachine = useCallback((m: Machine) => setSelectedMachine(m), []);

  if (machinesLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">{stats.total}</div>
            <div className="text-sm text-blue-600 dark:text-blue-300">{t("factory.totalMachines", "إجمالي الماكينات")}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">{stats.active}</div>
            <div className="text-sm text-green-600 dark:text-green-300">{t("factory.activeMachines", "تعمل")}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-700 dark:text-yellow-400">{stats.maintenance}</div>
            <div className="text-sm text-yellow-600 dark:text-yellow-300">{t("factory.maintenanceMachines", "صيانة")}</div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200">
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-red-700 dark:text-red-400">{stats.down}</div>
            <div className="text-sm text-red-600 dark:text-red-300">{t("factory.downMachines", "متوقفة")}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            {t("factory.floorMap", "خريطة أرضية المصنع")}
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="relative bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-xl p-4 overflow-x-auto">
            <TooltipProvider>
              <svg viewBox="0 0 1240 520" className="w-full min-w-[1000px]" style={{ minHeight: "480px" }}>
                <defs>
                  <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#cbd5e1" strokeWidth="0.5" opacity="0.5" />
                  </pattern>
                  <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
                  </filter>
                </defs>

                <rect width="100%" height="100%" fill="url(#grid)" />

                <text x="620" y="45" textAnchor="middle" className="fill-slate-700 dark:fill-slate-300" style={{ fontSize: "22px", fontWeight: 700 }}>
                  {t("factory.productionHall", "صالة الإنتاج")}
                </text>

                {SECTION_IDS.map((sectionId) => {
                  const pos = SECTION_POSITIONS[sectionId];
                  const sectionMachines = machinesBySection[sectionId];
                  const section = sectionsMap.get(sectionId);

                  return (
                    <g key={sectionId}>
                      <rect
                        x={pos.x}
                        y={pos.y}
                        width={pos.width}
                        height={pos.height}
                        rx="12"
                        fill="white"
                        stroke="#94a3b8"
                        strokeWidth="2"
                        filter="url(#shadow)"
                        className="dark:fill-slate-700"
                      />

                      <text
                        x={pos.x + pos.width / 2}
                        y={pos.y + 25}
                        textAnchor="middle"
                        className="fill-slate-600 dark:fill-slate-300"
                        style={{ fontSize: "14px", fontWeight: 600 }}
                      >
                        {section?.name_ar || pos.label}
                      </text>

                      {sectionMachines.map((machine, idx) => (
                        <MachineNode key={machine.id} machine={machine} sectionPos={pos} idx={idx} onSelect={onSelectMachine} t={t} />
                      ))}
                    </g>
                  );
                })}

                <g>
                  <rect x="30" y="420" width="1180" height="60" rx="8" fill="#1e40af" opacity="0.1" stroke="#1e40af" strokeWidth="1" />
                  <text x="620" y="455" textAnchor="middle" className="fill-blue-700 dark:fill-blue-400" style={{ fontSize: "14px", fontWeight: 600 }}>
                    {t("factory.warehouseArea", "منطقة المستودعات والتخزين")}
                  </text>
                </g>

                <g>
                  <circle cx="100" cy="30" r="8" fill="#22c55e" />
                  <text x="115" y="35" className="fill-slate-600 dark:fill-slate-300" style={{ fontSize: "11px" }}>
                    {t("factory.status.active", "تعمل")}
                  </text>

                  <circle cx="180" cy="30" r="8" fill="#f59e0b" />
                  <text x="195" y="35" className="fill-slate-600 dark:fill-slate-300" style={{ fontSize: "11px" }}>
                    {t("factory.status.maintenance", "صيانة")}
                  </text>

                  <circle cx="270" cy="30" r="8" fill="#ef4444" />
                  <text x="285" y="35" className="fill-slate-600 dark:fill-slate-300" style={{ fontSize: "11px" }}>
                    {t("factory.status.down", "متوقفة")}
                  </text>
                </g>
              </svg>
            </TooltipProvider>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              <FilmExtruderIcon className="w-4 h-4 text-slate-600" />
              <span className="text-sm">{t("factory.type.extruder", "نفخ الفيلم")}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              <PrintingMachineIcon className="w-4 h-4 text-slate-600" />
              <span className="text-sm">{t("factory.type.printer", "الطباعة")}</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              <CuttingMachineIcon className="w-4 h-4 text-slate-600" />
              <span className="text-sm">{t("factory.type.cutter", "التقطيع")}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!selectedMachine} onOpenChange={() => setSelectedMachine(null)}>
        <DialogContent className="max-w-md" dir={isRTL ? "rtl" : "ltr"}>
          {selectedMachine && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  {(() => {
                    const Icon = resolveIcon(selectedMachine.type, isSectionId(selectedMachine.section_id) ? selectedMachine.section_id : undefined);
                    const st = normalizeStatus(selectedMachine.status);
                    const style = STATUS_STYLE[st];
                    return (
                      <div className="p-3 rounded-lg" style={{ backgroundColor: style.bg }}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                    );
                  })()}

                  <div>
                    <div className="text-lg font-bold">{selectedMachine.name_ar || selectedMachine.name}</div>
                    <div className="text-sm text-muted-foreground">{selectedMachine.name}</div>
                  </div>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">{t("factory.machineType", "نوع الماكينة")}</div>
                    <div className="font-semibold">{getTypeLabel(selectedMachine.type, t)}</div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                    <div className="text-xs text-muted-foreground mb-1">{t("factory.currentStatus", "الحالة الحالية")}</div>
                    <Badge
                      variant="outline"
                      className="inline-flex items-center gap-1"
                      style={{ backgroundColor: STATUS_STYLE[normalizeStatus(selectedMachine.status)].bg, color: "white", border: "none" }}
                    >
                      {STATUS_ICON[normalizeStatus(selectedMachine.status)]}
                      <span>{getStatusLabel(selectedMachine.status, t)}</span>
                    </Badge>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-1">{t("factory.section", "القسم")}</div>
                  <div className="font-semibold">
                    {sectionsMap.get(selectedMachine.section_id || "")?.name_ar ||
                      sectionsMap.get(selectedMachine.section_id || "")?.name ||
                      t("factory.unknown", "غير محدد")}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-lg">
                  <div className="text-xs text-muted-foreground mb-2">{t("factory.productionCapacity", "الطاقة الإنتاجية (كجم/ساعة)")}</div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                      <div className="text-muted-foreground text-xs">{t("factory.small", "صغير")}</div>
                      <div className="font-bold">{selectedMachine.capacity_small_kg_per_hour ?? "-"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">{t("factory.medium", "متوسط")}</div>
                      <div className="font-bold">{selectedMachine.capacity_medium_kg_per_hour ?? "-"}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-xs">{t("factory.large", "كبير")}</div>
                      <div className="font-bold">{selectedMachine.capacity_large_kg_per_hour ?? "-"}</div>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-center text-muted-foreground">
                  {t("factory.machineId", "رقم الماكينة")}: {selectedMachine.id}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
