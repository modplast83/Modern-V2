import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, Plus, Trash2, Wrench, Code, Globe, MessageSquare } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";

interface CustomTool {
  id: number;
  name: string;
  display_name: string | null;
  description: string;
  parameters_schema: any;
  action_type: "sql" | "http" | "prompt";
  action_config: any;
  required_permission: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_PARAMS = `{
  "type": "object",
  "properties": {
    "param1": { "type": "string", "description": "..." }
  },
  "required": []
}`;

const TEMPLATES = {
  sql: `{
  "query": "SELECT * FROM customers WHERE name ILIKE '%{{search}}%' LIMIT 20",
  "allow_writes": false,
  "max_rows": 100
}`,
  http: `{
  "url": "https://api.example.com/data?q={{search}}",
  "method": "GET",
  "headers": { "Authorization": "Bearer ..." },
  "timeout_ms": 15000
}`,
  prompt: `{
  "text": "نصّ ثابت أو قالب يستخدم {{param1}} للتعويض"
}`,
};

const emptyForm = {
  id: null as number | null,
  name: "",
  display_name: "",
  description: "",
  parameters_schema: DEFAULT_PARAMS,
  action_type: "sql" as "sql" | "http" | "prompt",
  action_config: TEMPLATES.sql,
  required_permission: "",
  is_active: true,
};

export default function CustomToolsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const { data: tools = [], isLoading } = useQuery<CustomTool[]>({
    queryKey: ["/api/ai-agent/custom-tools"],
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof emptyForm) => {
      let parsedParams: any = {};
      let parsedConfig: any = {};
      try {
        parsedParams = JSON.parse(payload.parameters_schema || "{}");
      } catch {
        throw new Error(t("aiAgent.customTools.invalidParamsJson"));
      }
      try {
        parsedConfig = JSON.parse(payload.action_config || "{}");
      } catch {
        throw new Error(t("aiAgent.customTools.invalidConfigJson"));
      }
      const body: any = {
        display_name: payload.display_name || null,
        description: payload.description,
        parameters_schema: parsedParams,
        action_type: payload.action_type,
        action_config: parsedConfig,
        required_permission: payload.required_permission || null,
        is_active: payload.is_active,
      };
      if (payload.id) {
        return apiRequest(`/api/ai-agent/custom-tools/${payload.id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      }
      body.name = payload.name;
      return apiRequest("/api/ai-agent/custom-tools", {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ai-agent/custom-tools"] });
      setOpen(false);
      setForm(emptyForm);
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
      apiRequest(`/api/ai-agent/custom-tools/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ai-agent/custom-tools"] });
      toast({ title: t("aiAgent.toasts.deleted") });
    },
  });

  const openCreate = () => {
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (tool: CustomTool) => {
    setForm({
      id: tool.id,
      name: tool.name,
      display_name: tool.display_name || "",
      description: tool.description,
      parameters_schema: JSON.stringify(
        tool.parameters_schema || {},
        null,
        2,
      ),
      action_type: tool.action_type,
      action_config: JSON.stringify(tool.action_config || {}, null, 2),
      required_permission: tool.required_permission || "",
      is_active: tool.is_active,
    });
    setOpen(true);
  };

  const onTypeChange = (val: "sql" | "http" | "prompt") => {
    setForm((f) => ({
      ...f,
      action_type: val,
      action_config: f.id ? f.action_config : TEMPLATES[val],
    }));
  };

  const typeIcon = (type: string) => {
    if (type === "sql") return <Code className="h-3.5 w-3.5" />;
    if (type === "http") return <Globe className="h-3.5 w-3.5" />;
    return <MessageSquare className="h-3.5 w-3.5" />;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            {t("aiAgent.customTools.title")}
          </CardTitle>
          <CardDescription>
            {t("aiAgent.customTools.description")}
          </CardDescription>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 ml-2" />
          {t("aiAgent.customTools.addTool")}
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground text-center py-8">
            {t("aiAgent.knowledge.loading")}
          </p>
        ) : tools.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
            <Wrench className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">
              {t("aiAgent.customTools.empty")}
            </p>
            <p className="text-sm mt-1">
              {t("aiAgent.customTools.emptyDesc")}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tools.map((tool) => (
              <div
                key={tool.id}
                className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {typeIcon(tool.action_type)}
                        {tool.action_type.toUpperCase()}
                      </Badge>
                      <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                        {tool.name}
                      </code>
                      {!tool.is_active && (
                        <Badge variant="outline" className="text-xs">
                          {t("aiAgent.customTools.inactive")}
                        </Badge>
                      )}
                      {tool.required_permission && (
                        <Badge variant="outline" className="text-xs">
                          🔒 {tool.required_permission}
                        </Badge>
                      )}
                    </div>
                    {tool.display_name && (
                      <p className="font-medium text-sm">{tool.display_name}</p>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {tool.description}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(tool)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(t("aiAgent.customTools.confirmDelete"))) {
                          deleteMutation.mutate(tool.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {form.id
                ? t("aiAgent.customTools.editTool")
                : t("aiAgent.customTools.addTool")}
            </DialogTitle>
            <DialogDescription>
              {t("aiAgent.customTools.formDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t("aiAgent.customTools.name")} *</Label>
                <Input
                  dir="ltr"
                  placeholder="my_custom_tool"
                  value={form.name}
                  disabled={!!form.id}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value.toLowerCase() })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {t("aiAgent.customTools.nameHint")}
                </p>
              </div>
              <div>
                <Label>{t("aiAgent.customTools.displayName")}</Label>
                <Input
                  value={form.display_name}
                  onChange={(e) =>
                    setForm({ ...form, display_name: e.target.value })
                  }
                  placeholder={t("aiAgent.customTools.displayNamePlaceholder")}
                />
              </div>
            </div>

            <div>
              <Label>{t("aiAgent.customTools.description")} *</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder={t("aiAgent.customTools.descriptionPlaceholder")}
                className="min-h-[60px]"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("aiAgent.customTools.descriptionHint")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>{t("aiAgent.customTools.actionType")} *</Label>
                <Select value={form.action_type} onValueChange={onTypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sql">
                      {t("aiAgent.customTools.types.sql")}
                    </SelectItem>
                    <SelectItem value="http">
                      {t("aiAgent.customTools.types.http")}
                    </SelectItem>
                    <SelectItem value="prompt">
                      {t("aiAgent.customTools.types.prompt")}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("aiAgent.customTools.requiredPermission")}</Label>
                <Input
                  dir="ltr"
                  value={form.required_permission}
                  onChange={(e) =>
                    setForm({ ...form, required_permission: e.target.value })
                  }
                  placeholder="e.g. manage_orders"
                />
              </div>
            </div>

            <div>
              <Label>{t("aiAgent.customTools.parametersSchema")}</Label>
              <Textarea
                dir="ltr"
                className="font-mono text-xs min-h-[140px]"
                value={form.parameters_schema}
                onChange={(e) =>
                  setForm({ ...form, parameters_schema: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t("aiAgent.customTools.parametersHint")}
              </p>
            </div>

            <div>
              <Label>{t("aiAgent.customTools.actionConfig")}</Label>
              <Textarea
                dir="ltr"
                className="font-mono text-xs min-h-[140px]"
                value={form.action_config}
                onChange={(e) =>
                  setForm({ ...form, action_config: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                {t(`aiAgent.customTools.configHint.${form.action_type}`)}
              </p>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <Label>{t("aiAgent.customTools.active")}</Label>
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
