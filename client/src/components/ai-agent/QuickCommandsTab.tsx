import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Terminal, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
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
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";

interface QuickCommand {
  id: number;
  trigger: string;
  label: string;
  prompt_template: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  is_active: boolean;
  sort_order: number;
}

const ICON_OPTIONS = [
  "Sparkles",
  "Package",
  "Calculator",
  "FileText",
  "BarChart3",
  "Cpu",
  "Users",
  "MessageCircle",
  "Settings",
  "Wrench",
  "Bot",
  "Lightbulb",
  "BookOpen",
];

const empty = {
  id: null as number | null,
  trigger: "",
  label: "",
  prompt_template: "",
  description: "",
  icon: "Sparkles",
  category: "general",
  is_active: true,
  sort_order: 0,
};

export default function QuickCommandsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);

  const { data: commands = [], isLoading } = useQuery<QuickCommand[]>({
    queryKey: ["/api/ai-agent/commands"],
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof empty) => {
      const body = {
        trigger: payload.trigger,
        label: payload.label,
        prompt_template: payload.prompt_template,
        description: payload.description || null,
        icon: payload.icon,
        category: payload.category,
        is_active: payload.is_active,
        sort_order: payload.sort_order,
      };
      if (payload.id) {
        return apiRequest(`/api/ai-agent/commands/${payload.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      }
      return apiRequest("/api/ai-agent/commands", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ai-agent/commands"] });
      setOpen(false);
      setForm(empty);
      toast({ title: t("aiAgent.toasts.saved") });
    },
    onError: (e: Error) => {
      toast({
        title: t("aiAgent.toasts.error"),
        description: e.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) =>
      apiRequest(`/api/ai-agent/commands/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ai-agent/commands"] });
      toast({ title: t("aiAgent.toasts.deleted") });
    },
  });

  const openCreate = () => {
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (cmd: QuickCommand) => {
    setForm({
      id: cmd.id,
      trigger: cmd.trigger,
      label: cmd.label,
      prompt_template: cmd.prompt_template,
      description: cmd.description || "",
      icon: cmd.icon || "Sparkles",
      category: cmd.category || "general",
      is_active: cmd.is_active,
      sort_order: cmd.sort_order,
    });
    setOpen(true);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="h-5 w-5" />
            {t("aiAgent.commands.title")}
          </CardTitle>
          <CardDescription>{t("aiAgent.commands.description")}</CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 ml-2" />
          {t("aiAgent.commands.addCommand")}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">
            {t("aiAgent.knowledge.loading")}
          </p>
        ) : commands.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
            <Terminal className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">{t("aiAgent.commands.empty")}</p>
            <p className="text-sm mt-1">{t("aiAgent.commands.emptyDesc")}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {commands.map((c) => (
              <div
                key={c.id}
                className="border rounded-lg p-3 flex items-start justify-between gap-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code
                      dir="ltr"
                      className="text-xs font-mono bg-muted px-2 py-0.5 rounded"
                    >
                      {c.trigger}
                    </code>
                    <span className="font-medium text-sm">{c.label}</span>
                    {!c.is_active && (
                      <Badge variant="outline" className="text-xs">
                        {t("aiAgent.customTools.inactive")}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {c.prompt_template}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(c)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm(t("aiAgent.commands.confirmDelete"))) {
                        deleteMutation.mutate(c.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.id
                ? t("aiAgent.commands.editCommand")
                : t("aiAgent.commands.addCommand")}
            </DialogTitle>
            <DialogDescription>
              {t("aiAgent.commands.formDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t("aiAgent.commands.trigger")} *</Label>
                <Input
                  dir="ltr"
                  placeholder="/orders"
                  value={form.trigger}
                  onChange={(e) =>
                    setForm({ ...form, trigger: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t("aiAgent.commands.label")} *</Label>
                <Input
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  placeholder={t("aiAgent.commands.labelPlaceholder")}
                />
              </div>
            </div>

            <div>
              <Label>{t("aiAgent.commands.promptTemplate")} *</Label>
              <Textarea
                value={form.prompt_template}
                onChange={(e) =>
                  setForm({ ...form, prompt_template: e.target.value })
                }
                placeholder={t("aiAgent.commands.promptPlaceholder")}
                className="min-h-[100px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("aiAgent.commands.promptHint")}
              </p>
            </div>

            <div>
              <Label>{t("aiAgent.commands.descriptionField")}</Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label>{t("aiAgent.commands.icon")}</Label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.icon}
                  onChange={(e) => setForm({ ...form, icon: e.target.value })}
                >
                  {ICON_OPTIONS.map((i) => (
                    <option key={i} value={i}>
                      {i}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>{t("aiAgent.commands.category")}</Label>
                <Input
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>{t("aiAgent.commands.sortOrder")}</Label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sort_order: Number(e.target.value) || 0,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label>{t("aiAgent.commands.active")}</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={() => saveMutation.mutate(form)}
              disabled={saveMutation.isPending}
            >
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
