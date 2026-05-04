import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, ShieldAlert, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Textarea } from "../ui/textarea";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";

interface Setting {
  id: number;
  key: string;
  value: string;
  description: string | null;
}

interface Props {
  settings: Setting[];
}

const ADVANCED_KEYS = [
  "ai_model",
  "temperature",
  "max_tool_rounds",
  "max_chat_history",
  "max_completion_tokens",
  "system_prompt_override",
  "unrestricted_sql",
];

export default function AdvancedSettingsCard({ settings }: Props) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const get = (k: string) =>
    settings.find((s) => s.key === k)?.value || "";

  const [model, setModel] = useState(get("ai_model"));
  const [temperature, setTemperature] = useState(get("temperature"));
  const [maxToolRounds, setMaxToolRounds] = useState(get("max_tool_rounds"));
  const [maxChatHistory, setMaxChatHistory] = useState(get("max_chat_history"));
  const [maxCompletionTokens, setMaxCompletionTokens] = useState(
    get("max_completion_tokens"),
  );
  const [systemOverride, setSystemOverride] = useState(
    get("system_prompt_override"),
  );
  const [unrestrictedSql, setUnrestrictedSql] = useState(
    get("unrestricted_sql") === "true",
  );

  useEffect(() => {
    setModel(get("ai_model"));
    setTemperature(get("temperature"));
    setMaxToolRounds(get("max_tool_rounds"));
    setMaxChatHistory(get("max_chat_history"));
    setMaxCompletionTokens(get("max_completion_tokens"));
    setSystemOverride(get("system_prompt_override"));
    setUnrestrictedSql(get("unrestricted_sql") === "true");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.length]);

  const saveMutation = useMutation({
    mutationFn: async (entries: Array<{ key: string; value: string }>) => {
      for (const e of entries) {
        await apiRequest(`/api/ai-agent/settings/${e.key}`, {
          method: "PUT",
          body: JSON.stringify({ value: e.value, description: null }),
        });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/ai-agent/settings"] });
      toast({ title: t("aiAgent.toasts.saved") });
    },
    onError: (e: Error) =>
      toast({
        title: t("aiAgent.toasts.error"),
        description: e.message,
        variant: "destructive",
      }),
  });

  const onSave = () => {
    saveMutation.mutate([
      { key: "ai_model", value: model },
      { key: "temperature", value: temperature },
      { key: "max_tool_rounds", value: maxToolRounds },
      { key: "max_chat_history", value: maxChatHistory },
      { key: "max_completion_tokens", value: maxCompletionTokens },
      { key: "system_prompt_override", value: systemOverride },
      { key: "unrestricted_sql", value: unrestrictedSql ? "true" : "false" },
    ]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5" />
          {t("aiAgent.advanced.title")}
        </CardTitle>
        <CardDescription>{t("aiAgent.advanced.description")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <Label>{t("aiAgent.advanced.model")}</Label>
            <Input
              dir="ltr"
              value={model}
              placeholder="gpt-4.1"
              onChange={(e) => setModel(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("aiAgent.advanced.modelHint")}
            </p>
          </div>
          <div>
            <Label>{t("aiAgent.advanced.temperature")}</Label>
            <Input
              dir="ltr"
              value={temperature}
              placeholder="0.7"
              onChange={(e) => setTemperature(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {t("aiAgent.advanced.temperatureHint")}
            </p>
          </div>
          <div>
            <Label>{t("aiAgent.advanced.maxToolRounds")}</Label>
            <Input
              type="number"
              value={maxToolRounds}
              placeholder="10"
              onChange={(e) => setMaxToolRounds(e.target.value)}
            />
          </div>
          <div>
            <Label>{t("aiAgent.advanced.maxChatHistory")}</Label>
            <Input
              type="number"
              value={maxChatHistory}
              placeholder="20"
              onChange={(e) => setMaxChatHistory(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Label>{t("aiAgent.advanced.maxCompletionTokens")}</Label>
            <Input
              type="number"
              value={maxCompletionTokens}
              placeholder="4096"
              onChange={(e) => setMaxCompletionTokens(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>{t("aiAgent.advanced.systemPromptOverride")}</Label>
          <Textarea
            value={systemOverride}
            onChange={(e) => setSystemOverride(e.target.value)}
            placeholder={t("aiAgent.advanced.systemPromptPlaceholder")}
            className="min-h-[140px] font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {t("aiAgent.advanced.systemPromptHint")}
          </p>
        </div>

        <div className="flex items-start justify-between border-2 border-amber-200 dark:border-amber-700 rounded-lg p-4 bg-amber-50/40 dark:bg-amber-900/10">
          <div className="flex gap-3 flex-1">
            <ShieldAlert className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <Label>{t("aiAgent.advanced.unrestrictedSql")}</Label>
              <p className="text-xs text-muted-foreground mt-1">
                {t("aiAgent.advanced.unrestrictedSqlHint")}
              </p>
            </div>
          </div>
          <Switch
            checked={unrestrictedSql}
            onCheckedChange={setUnrestrictedSql}
          />
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onSave} disabled={saveMutation.isPending}>
            <Save className="h-4 w-4 ml-2" />
            {t("common.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
