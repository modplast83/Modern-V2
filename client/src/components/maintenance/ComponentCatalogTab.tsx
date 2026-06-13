import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { MaintenanceComponent } from "../../../../shared/schema";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
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
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";

const MACHINE_TYPES = ["extruder", "printer", "cutter"] as const;
type MachineType = (typeof MACHINE_TYPES)[number];

interface FormState {
  id: number | null;
  machine_type: string;
  name_ar: string;
  name_en: string;
  sort_order: number;
  enabled: boolean;
}

function emptyForm(machineType: string = "extruder"): FormState {
  return {
    id: null,
    machine_type: machineType,
    name_ar: "",
    name_en: "",
    sort_order: 0,
    enabled: true,
  };
}

export default function ComponentCatalogTab() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language?.startsWith("ar");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());

  const { data: components = [], isLoading } = useQuery<MaintenanceComponent[]>({
    queryKey: ["/api/maintenance-components/all"],
  });

  const grouped = useMemo(() => {
    const map: Record<string, MaintenanceComponent[]> = {
      extruder: [],
      printer: [],
      cutter: [],
    };
    for (const c of components) {
      const key = (c.machine_type || "").toLowerCase();
      if (!map[key]) map[key] = [];
      map[key].push(c);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
    return map;
  }, [components]);

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: ["/api/maintenance-components/all"],
    });
    // Refresh the Preventive Actions add form catalog
    queryClient.invalidateQueries({
      queryKey: ["/api/maintenance-components"],
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: any) =>
      apiRequest("/api/maintenance-components", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: t("maintenance.componentCatalog.toast.created") });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: t("maintenance.componentCatalog.toast.createFailed"),
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: any }) =>
      apiRequest(`/api/maintenance-components/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      invalidate();
      toast({ title: t("maintenance.componentCatalog.toast.updated") });
      setIsDialogOpen(false);
    },
    onError: () => {
      toast({
        title: t("maintenance.componentCatalog.toast.updateFailed"),
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/maintenance-components/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      toast({ title: t("maintenance.componentCatalog.toast.deleted") });
    },
    onError: (error: any) => {
      toast({
        title:
          error?.message ||
          t("maintenance.componentCatalog.toast.deleteFailed"),
        variant: "destructive",
      });
    },
  });

  const openAdd = (machineType: string) => {
    const maxOrder = (grouped[machineType] || []).reduce(
      (m, c) => Math.max(m, c.sort_order ?? 0),
      0,
    );
    setForm({ ...emptyForm(machineType), sort_order: maxOrder + 1 });
    setIsDialogOpen(true);
  };

  const openEdit = (c: MaintenanceComponent) => {
    setForm({
      id: c.id,
      machine_type: c.machine_type,
      name_ar: c.name_ar,
      name_en: c.name_en,
      sort_order: c.sort_order ?? 0,
      enabled: c.enabled,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.machine_type) {
      toast({
        title: t("maintenance.componentCatalog.validation.machineTypeRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!form.name_ar.trim()) {
      toast({
        title: t("maintenance.componentCatalog.validation.nameArRequired"),
        variant: "destructive",
      });
      return;
    }
    if (!form.name_en.trim()) {
      toast({
        title: t("maintenance.componentCatalog.validation.nameEnRequired"),
        variant: "destructive",
      });
      return;
    }
    const payload = {
      machine_type: form.machine_type,
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim(),
      sort_order: Number(form.sort_order) || 0,
      enabled: form.enabled,
    };
    if (form.id) {
      updateMutation.mutate({ id: form.id, payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleEnabled = (c: MaintenanceComponent) => {
    updateMutation.mutate({
      id: c.id,
      payload: { enabled: !c.enabled },
    });
  };

  const handleDelete = (c: MaintenanceComponent) => {
    if (window.confirm(t("maintenance.componentCatalog.confirmDelete"))) {
      deleteMutation.mutate(c.id);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("maintenance.componentCatalog.title")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("maintenance.componentCatalog.description")}
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : (
            <div className="space-y-8">
              {MACHINE_TYPES.map((mt) => (
                <div key={mt}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-semibold">
                      {t(`maintenance.componentCatalog.machineTypes.${mt}`)}
                    </h3>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openAdd(mt)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("maintenance.componentCatalog.addComponent")}
                    </Button>
                  </div>
                  <div className="border rounded-md overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-center w-20">
                            {t("maintenance.componentCatalog.sortOrder")}
                          </th>
                          <th className="px-4 py-2 text-center">
                            {t("maintenance.componentCatalog.nameAr")}
                          </th>
                          <th className="px-4 py-2 text-center">
                            {t("maintenance.componentCatalog.nameEn")}
                          </th>
                          <th className="px-4 py-2 text-center w-28">
                            {t("maintenance.componentCatalog.status")}
                          </th>
                          <th className="px-4 py-2 text-center w-24">
                            {t("maintenance.componentCatalog.enabled")}
                          </th>
                          <th className="px-4 py-2 text-center w-24"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {(grouped[mt] || []).length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-4 py-6 text-center text-muted-foreground"
                            >
                              {t("maintenance.componentCatalog.emptyGroup")}
                            </td>
                          </tr>
                        ) : (
                          grouped[mt].map((c) => (
                            <tr
                              key={c.id}
                              className={c.enabled ? "" : "opacity-60"}
                            >
                              <td className="px-4 py-2 text-center">
                                {c.sort_order}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {c.name_ar}
                              </td>
                              <td className="px-4 py-2 text-center">
                                {c.name_en}
                              </td>
                              <td className="px-4 py-2 text-center">
                                <Badge
                                  variant={c.enabled ? "default" : "secondary"}
                                >
                                  {c.enabled
                                    ? t("maintenance.componentCatalog.active")
                                    : t(
                                        "maintenance.componentCatalog.disabled",
                                      )}
                                </Badge>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <div className="flex justify-center">
                                  <Switch
                                    checked={c.enabled}
                                    onCheckedChange={() => toggleEnabled(c)}
                                  />
                                </div>
                              </td>
                              <td className="px-4 py-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEdit(c)}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(c)}
                                  >
                                    <Trash2 className="h-4 w-4 text-red-500" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {form.id
                ? t("maintenance.componentCatalog.editComponent")
                : t("maintenance.componentCatalog.addComponent")}
            </DialogTitle>
            <DialogDescription>
              {t("maintenance.componentCatalog.description")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="mb-1 block">
                {t("maintenance.componentCatalog.machineType")}
              </Label>
              <Select
                value={form.machine_type}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, machine_type: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MACHINE_TYPES.map((mt) => (
                    <SelectItem key={mt} value={mt}>
                      {t(`maintenance.componentCatalog.machineTypes.${mt}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="mb-1 block">
                {t("maintenance.componentCatalog.nameAr")}
              </Label>
              <Input
                value={form.name_ar}
                dir="rtl"
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name_ar: e.target.value }))
                }
              />
            </div>

            <div>
              <Label className="mb-1 block">
                {t("maintenance.componentCatalog.nameEn")}
              </Label>
              <Input
                value={form.name_en}
                dir="ltr"
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name_en: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="mb-1 block">
                  {t("maintenance.componentCatalog.sortOrder")}
                </Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      sort_order: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="flex items-end gap-2 pb-2">
                <Switch
                  checked={form.enabled}
                  onCheckedChange={(v) =>
                    setForm((prev) => ({ ...prev, enabled: v }))
                  }
                />
                <Label>{t("maintenance.componentCatalog.enabled")}</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
