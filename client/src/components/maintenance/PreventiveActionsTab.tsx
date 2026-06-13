import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Save,
  History,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  MaintenanceComponent,
  Machine,
  Section,
} from "../../../../shared/schema";
import { useAuth } from "../../hooks/use-auth";
import { useToast } from "../../hooks/use-toast";
import { formatNumber } from "../../lib/formatNumber";
import { apiRequest } from "../../lib/queryClient";
import {
  canAddInArea,
  canDeleteInArea,
} from "../../utils/roleUtils";
import {
  printPreventiveAction,
  printPreventiveReference,
} from "./PreventiveMaintenancePrint";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Textarea } from "../ui/textarea";

const ACTION_TYPES = [
  "inspection",
  "cleaning",
  "lubrication",
  "adjustment",
  "repair",
  "replacement",
] as const;

const CONDITIONS = ["good", "fair", "poor"] as const;

// Map a machine's stored type (inconsistent values across the DB) to the
// catalog's normalized machine_type (extruder / printer / cutter).
function normalizeMachineType(rawType: string | null | undefined): string {
  const t = (rawType || "").toLowerCase();
  if (t.includes("film") || t.includes("extrud")) return "extruder";
  if (t.includes("print")) return "printer";
  if (t.includes("cut")) return "cutter";
  return t;
}

interface LineItem {
  component_id: number | null;
  component_name_ar: string;
  component_name_en: string;
  action_type: string;
  quantity: number;
  cost: number;
  condition: string;
  notes: string;
}

function emptyItem(): LineItem {
  return {
    component_id: null,
    component_name_ar: "",
    component_name_en: "",
    action_type: "inspection",
    quantity: 1,
    cost: 0,
    condition: "good",
    notes: "",
  };
}

export default function PreventiveActionsTab() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canAdd = canAddInArea(user, "maintenance");
  const canDelete = canDeleteInArea(user, "maintenance");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [sectionId, setSectionId] = useState<string>("");
  const [machineId, setMachineId] = useState<string>("");
  const [actionDate, setActionDate] = useState<string>(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<LineItem[]>([emptyItem()]);

  // Reference view state
  const [refMachineId, setRefMachineId] = useState<string>("");

  const { data: sections = [] } = useQuery<Section[]>({
    queryKey: ["/api/sections"],
  });
  const { data: machines = [] } = useQuery<Machine[]>({
    queryKey: ["/api/machines"],
  });
  const { data: actions = [], isLoading: loadingActions } = useQuery<any[]>({
    queryKey: ["/api/preventive-actions"],
  });

  const selectedMachine = useMemo(
    () => machines.find((m) => m.id === machineId),
    [machines, machineId],
  );
  const machineType = normalizeMachineType(selectedMachine?.type);

  const { data: components = [] } = useQuery<MaintenanceComponent[]>({
    queryKey: ["/api/maintenance-components", { machineType }],
    enabled: !!machineType,
  });

  const { data: lastActions = [], isLoading: loadingLast } = useQuery<any[]>({
    queryKey: ["/api/preventive-actions/last", refMachineId],
    enabled: !!refMachineId,
  });

  const sectionMachines = useMemo(
    () =>
      sectionId
        ? machines.filter((m) => m.section_id === sectionId)
        : machines,
    [machines, sectionId],
  );

  const machineName = (id: string) => {
    const m = machines.find((x) => x.id === id);
    if (!m) return id;
    return (isAr ? m.name_ar : m.name) || m.name || id;
  };

  const sectionName = (id: string | null | undefined) => {
    if (!id) return "";
    const s = sections.find((x) => x.id === id);
    if (!s) return "";
    return (isAr ? s.name_ar : s.name) || s.name || "";
  };

  const handlePrintAction = (a: any) => {
    printPreventiveAction(
      a,
      machineName(a.machine_id),
      sectionName(a.section_id),
      isAr,
    );
  };

  const handlePrintReference = () => {
    if (!refMachineId) return;
    printPreventiveReference(machineName(refMachineId), lastActions, isAr);
  };

  const handleExportReferenceExcel = async () => {
    if (!refMachineId) return;
    try {
      const response = await fetch(
        `/api/preventive-actions/last/${encodeURIComponent(refMachineId)}/export`,
        { credentials: "include" },
      );
      if (!response.ok) {
        throw new Error("export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `preventive-maintenance-${refMachineId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast({
        title: t("maintenance.preventiveActions.toast.exportFailed"),
        variant: "destructive",
      });
    }
  };

  const totalCost = useMemo(
    () =>
      items.reduce(
        (sum, it) => sum + Number(it.cost || 0) * Number(it.quantity || 1),
        0,
      ),
    [items],
  );

  const resetForm = () => {
    setSectionId("");
    setMachineId("");
    setActionDate(new Date().toISOString().slice(0, 10));
    setNotes("");
    setItems([emptyItem()]);
  };

  const updateItem = (index: number, patch: Partial<LineItem>) => {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it)),
    );
  };

  const onSelectComponent = (index: number, value: string) => {
    const comp = components.find((c) => String(c.id) === value);
    if (comp) {
      updateItem(index, {
        component_id: comp.id,
        component_name_ar: comp.name_ar,
        component_name_en: comp.name_en,
      });
    }
  };

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest("/api/preventive-actions", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/preventive-actions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/preventive-actions/last"],
      });
      toast({ title: t("maintenance.preventiveActions.toast.created") });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: t("maintenance.preventiveActions.toast.createFailed"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/preventive-actions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/preventive-actions"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/preventive-actions/last"],
      });
      toast({ title: t("maintenance.preventiveActions.toast.deleted") });
    },
    onError: () => {
      toast({
        title: t("maintenance.preventiveActions.toast.deleteFailed"),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!machineId) {
      toast({
        title: t("maintenance.preventiveActions.validation.machineRequired"),
        variant: "destructive",
      });
      return;
    }
    const validItems = items.filter(
      (it) => it.component_name_en && it.action_type,
    );
    if (validItems.length === 0) {
      toast({
        title: t("maintenance.preventiveActions.validation.itemsRequired"),
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate({
      section_id: sectionId || null,
      machine_id: machineId,
      action_date: actionDate ? new Date(actionDate).toISOString() : undefined,
      notes: notes || null,
      items: validItems.map((it) => ({
        component_id: it.component_id,
        component_name_ar: it.component_name_ar,
        component_name_en: it.component_name_en,
        action_type: it.action_type,
        quantity: Number(it.quantity) || 1,
        cost: Number(it.cost) || 0,
        condition: it.condition || null,
        notes: it.notes || null,
      })),
    });
  };

  const elapsedLabel = (dateStr: string) => {
    if (!dateStr) return "-";
    const then = new Date(dateStr).getTime();
    const days = Math.floor((Date.now() - then) / (1000 * 60 * 60 * 24));
    if (days <= 0) return t("maintenance.preventiveActions.today");
    return t("maintenance.preventiveActions.daysAgo", { count: days });
  };

  return (
    <div className="space-y-6">
      {/* Saved actions */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{t("maintenance.preventiveActions.title")}</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              {canAdd && (
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("maintenance.preventiveActions.newAction")}
                  </Button>
                </DialogTrigger>
              )}
              <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {t("maintenance.preventiveActions.newAction")}
                  </DialogTitle>
                  <DialogDescription>
                    {t("maintenance.preventiveActions.formHint")}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {t("maintenance.preventiveActions.section")}
                      </label>
                      <Select
                        value={sectionId}
                        onValueChange={(v) => {
                          setSectionId(v);
                          setMachineId("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "maintenance.preventiveActions.selectSection",
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {(isAr ? s.name_ar : s.name) || s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {t("maintenance.preventiveActions.machine")}
                      </label>
                      <Select
                        value={machineId}
                        onValueChange={(v) => {
                          setMachineId(v);
                          setItems([emptyItem()]);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t(
                              "maintenance.preventiveActions.selectMachine",
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {sectionMachines.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {(isAr ? m.name_ar : m.name) || m.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium mb-1 block">
                        {t("maintenance.preventiveActions.actionDate")}
                      </label>
                      <Input
                        type="date"
                        value={actionDate}
                        onChange={(e) => setActionDate(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Line items */}
                  <div className="border rounded-md overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-2 py-2 text-center">
                            {t("maintenance.preventiveActions.component")}
                          </th>
                          <th className="px-2 py-2 text-center">
                            {t("maintenance.preventiveActions.actionType")}
                          </th>
                          <th className="px-2 py-2 text-center w-20">
                            {t("maintenance.preventiveActions.quantity")}
                          </th>
                          <th className="px-2 py-2 text-center">
                            {t("maintenance.preventiveActions.condition")}
                          </th>
                          <th className="px-2 py-2 text-center w-28">
                            {t("maintenance.preventiveActions.cost")}
                          </th>
                          <th className="px-2 py-2 text-center">
                            {t("maintenance.preventiveActions.notes")}
                          </th>
                          <th className="px-2 py-2 text-center w-12"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="px-2 py-1 min-w-[180px]">
                              <Select
                                value={
                                  it.component_id
                                    ? String(it.component_id)
                                    : ""
                                }
                                onValueChange={(v) =>
                                  onSelectComponent(idx, v)
                                }
                                disabled={!machineId}
                              >
                                <SelectTrigger>
                                  <SelectValue
                                    placeholder={t(
                                      "maintenance.preventiveActions.selectComponent",
                                    )}
                                  />
                                </SelectTrigger>
                                <SelectContent>
                                  {components.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                      {isAr ? c.name_ar : c.name_en}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-2 py-1 min-w-[140px]">
                              <Select
                                value={it.action_type}
                                onValueChange={(v) =>
                                  updateItem(idx, { action_type: v })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {ACTION_TYPES.map((a) => (
                                    <SelectItem key={a} value={a}>
                                      {t(
                                        `maintenance.preventiveActions.actionTypes.${a}`,
                                      )}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="number"
                                min={1}
                                value={it.quantity}
                                onChange={(e) =>
                                  updateItem(idx, {
                                    quantity: Number(e.target.value),
                                  })
                                }
                              />
                            </td>
                            <td className="px-2 py-1 min-w-[120px]">
                              <Select
                                value={it.condition}
                                onValueChange={(v) =>
                                  updateItem(idx, { condition: v })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CONDITIONS.map((c) => (
                                    <SelectItem key={c} value={c}>
                                      {t(
                                        `maintenance.preventiveActions.conditions.${c}`,
                                      )}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-2 py-1">
                              <Input
                                type="number"
                                min={0}
                                step="0.01"
                                value={it.cost}
                                onChange={(e) =>
                                  updateItem(idx, {
                                    cost: Number(e.target.value),
                                  })
                                }
                              />
                            </td>
                            <td className="px-2 py-1 min-w-[160px]">
                              <Input
                                value={it.notes}
                                onChange={(e) =>
                                  updateItem(idx, { notes: e.target.value })
                                }
                              />
                            </td>
                            <td className="px-2 py-1 text-center">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                disabled={items.length === 1}
                                onClick={() =>
                                  setItems((prev) =>
                                    prev.filter((_, i) => i !== idx),
                                  )
                                }
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setItems((prev) => [...prev, emptyItem()])}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("maintenance.preventiveActions.addRow")}
                    </Button>
                    <div className="text-sm font-semibold">
                      {t("maintenance.preventiveActions.totalCost")}:{" "}
                      {formatNumber(totalCost)}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1 block">
                      {t("maintenance.preventiveActions.notes")}
                    </label>
                    <Textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    onClick={handleSubmit}
                    disabled={createMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {t("common.save")}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingActions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : actions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              {t("maintenance.preventiveActions.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-center">
                      {t("maintenance.preventiveActions.actionNumber")}
                    </th>
                    <th className="px-4 py-3 text-center">
                      {t("maintenance.preventiveActions.machine")}
                    </th>
                    <th className="px-4 py-3 text-center">
                      {t("maintenance.preventiveActions.actionDate")}
                    </th>
                    <th className="px-4 py-3 text-center">
                      {t("maintenance.preventiveActions.itemsCount")}
                    </th>
                    <th className="px-4 py-3 text-center">
                      {t("maintenance.preventiveActions.totalCost")}
                    </th>
                    <th className="px-4 py-3 text-center">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {actions.map((a) => (
                    <tr key={a.id}>
                      <td className="px-4 py-3 text-center font-medium">
                        {a.action_number}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {machineName(a.machine_id)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.action_date
                          ? new Date(a.action_date).toLocaleDateString(
                              isAr ? "ar" : "en",
                            )
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {formatNumber(a.items?.length || 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {formatNumber(Number(a.total_cost || 0))}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            title={t("maintenance.preventiveActions.print")}
                            onClick={() => handlePrintAction(a)}
                          >
                            <Printer className="h-4 w-4 text-blue-600" />
                          </Button>
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteMutation.mutate(a.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Per-machine reference: last action per component */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-2 flex-wrap">
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              {t("maintenance.preventiveActions.referenceTitle")}
            </CardTitle>
            {refMachineId && lastActions.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePrintReference}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  {t("maintenance.preventiveActions.print")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportReferenceExcel}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  {t("maintenance.preventiveActions.exportExcel")}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs">
            <Select value={refMachineId} onValueChange={setRefMachineId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={t("maintenance.preventiveActions.selectMachine")}
                />
              </SelectTrigger>
              <SelectContent>
                {machines.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {(isAr ? m.name_ar : m.name) || m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!refMachineId ? (
            <p className="text-center text-muted-foreground py-6">
              {t("maintenance.preventiveActions.selectMachineHint")}
            </p>
          ) : loadingLast ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : lastActions.length === 0 ? (
            <p className="text-center text-muted-foreground py-6">
              {t("maintenance.preventiveActions.noHistory")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-center">
                      {t("maintenance.preventiveActions.component")}
                    </th>
                    <th className="px-4 py-3 text-center">
                      {t("maintenance.preventiveActions.lastAction")}
                    </th>
                    <th className="px-4 py-3 text-center">
                      {t("maintenance.preventiveActions.lastDate")}
                    </th>
                    <th className="px-4 py-3 text-center">
                      {t("maintenance.preventiveActions.elapsed")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lastActions.map((r, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-center">
                        {isAr ? r.component_name_ar : r.component_name_en}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary">
                          {t(
                            `maintenance.preventiveActions.actionTypes.${r.action_type}`,
                            { defaultValue: r.action_type },
                          )}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {r.action_date
                          ? new Date(r.action_date).toLocaleDateString(
                              isAr ? "ar" : "en",
                            )
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {elapsedLabel(r.action_date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
