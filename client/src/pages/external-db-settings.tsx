import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Plus,
  Trash2,
  Database,
  Play,
  Printer,
  Download,
  Loader2,
  ServerCog,
  Table as TableIcon,
  Pencil,
  CheckCircle2,
  Columns3,
} from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Switch } from "../components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../hooks/use-toast";
import { apiRequest, queryClient } from "../lib/queryClient";

interface ExternalConnection {
  id: number;
  name: string;
  host: string;
  port: number;
  database_name: string;
  username: string;
  encrypt: boolean;
  trust_server_certificate: boolean;
  is_active: boolean;
  created_at: string | null;
}

interface TableInfo {
  schema: string;
  name: string;
  type: string;
}

interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: string;
  maxLength: number | null;
}

interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  rowCount: number;
  truncated: boolean;
}

const emptyForm = {
  name: "",
  host: "",
  port: 1433,
  database_name: "",
  username: "",
  password: "",
  encrypt: true,
  trust_server_certificate: false,
  is_active: true,
};

type FormState = typeof emptyForm;

export function ExternalDbSettingsContent() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [testing, setTesting] = useState(false);
  const [activeConnId, setActiveConnId] = useState<number | null>(null);

  // Browse tab state
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);

  // Query tab state
  const [sqlText, setSqlText] = useState("");
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  const { data: connections = [], isLoading } = useQuery<ExternalConnection[]>({
    queryKey: ["/api/external-db/connections"],
  });

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
  };

  const openCreate = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (c: ExternalConnection) => {
    setForm({
      name: c.name,
      host: c.host,
      port: c.port,
      database_name: c.database_name,
      username: c.username,
      password: "",
      encrypt: c.encrypt,
      trust_server_certificate: c.trust_server_certificate,
      is_active: c.is_active,
    });
    setEditId(c.id);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = editId
        ? `/api/external-db/connections/${editId}`
        : "/api/external-db/connections";
      const method = editId ? "PATCH" : "POST";
      const payload: Record<string, unknown> = { ...form };
      // On edit, omit empty password so existing one is kept.
      if (editId && !form.password) delete payload.password;
      const res = await apiRequest(url, {
        method,
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/external-db/connections"],
      });
      toast({ title: editId ? "تم تحديث الاتصال" : "تم حفظ الاتصال" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({
        title: "خطأ",
        description: err?.message || "تعذر حفظ الاتصال",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest(`/api/external-db/connections/${id}`, {
        method: "DELETE",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["/api/external-db/connections"],
      });
      toast({ title: "تم حذف الاتصال" });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({
        title: "خطأ",
        description: err?.message || "تعذر حذف الاتصال",
        variant: "destructive",
      });
    },
  });

  const handleTest = async () => {
    setTesting(true);
    try {
      const body =
        editId && !form.password
          ? JSON.stringify({ connectionId: editId })
          : JSON.stringify({
              host: form.host,
              port: form.port,
              database_name: form.database_name,
              username: form.username,
              password: form.password,
              encrypt: form.encrypt,
              trust_server_certificate: form.trust_server_certificate,
            });
      const res = await apiRequest("/api/external-db/test", {
        method: "POST",
        body,
      });
      const data = await res.json();
      toast({
        title: "نجح الاتصال",
        description: data?.message || "تم الاتصال بنجاح",
      });
    } catch (err: any) {
      toast({
        title: "فشل الاتصال",
        description: err?.message || "تعذر الاتصال بالخادم",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  // ---- Browse tab queries ----
  const { data: tables = [], isFetching: tablesLoading } = useQuery<
    TableInfo[]
  >({
    queryKey: ["/api/external-db/connections", activeConnId, "tables"],
    enabled: !!activeConnId,
    queryFn: async () => {
      const res = await apiRequest(
        `/api/external-db/connections/${activeConnId}/tables`,
      );
      return res.json();
    },
  });

  const { data: columns = [], isFetching: columnsLoading } = useQuery<
    ColumnInfo[]
  >({
    queryKey: [
      "/api/external-db/connections",
      activeConnId,
      "columns",
      selectedTable?.schema,
      selectedTable?.name,
    ],
    enabled: !!activeConnId && !!selectedTable,
    queryFn: async () => {
      const res = await apiRequest(
        `/api/external-db/connections/${activeConnId}/columns?schema=${encodeURIComponent(
          selectedTable!.schema,
        )}&table=${encodeURIComponent(selectedTable!.name)}`,
      );
      return res.json();
    },
  });

  const queryMutation = useMutation({
    mutationFn: async () => {
      if (!activeConnId) throw new Error("اختر اتصالاً أولاً");
      const res = await apiRequest(
        `/api/external-db/connections/${activeConnId}/query`,
        { method: "POST", body: JSON.stringify({ sql: sqlText }), timeout: 60000 },
      );
      return res.json() as Promise<QueryResult>;
    },
    onSuccess: (data) => {
      setQueryResult(data);
      if (data.truncated) {
        toast({
          title: "تم تقييد النتائج",
          description: "تم عرض أول 1000 صف فقط",
        });
      }
    },
    onError: (err: any) => {
      setQueryResult(null);
      toast({
        title: "خطأ في الاستعلام",
        description: err?.message || "تعذر تنفيذ الاستعلام",
        variant: "destructive",
      });
    },
  });

  const useTableInQuery = (tbl: TableInfo) => {
    setSqlText(
      `SELECT TOP 100 * FROM [${tbl.schema}].[${tbl.name}]`,
    );
  };

  const exportCsv = () => {
    if (!queryResult || queryResult.rows.length === 0) return;
    const esc = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return `"${s.replace(/"/g, '""')}"`;
    };
    const header = queryResult.columns.map(esc).join(",");
    const lines = queryResult.rows.map((r) =>
      queryResult.columns.map((c) => esc(r[c])).join(","),
    );
    const csv = "\uFEFF" + [header, ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `query-result-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printResult = () => {
    if (!queryResult || queryResult.rows.length === 0) return;
    const conn = connections.find((c) => c.id === activeConnId);
    const head = queryResult.columns
      .map((c) => `<th>${escapeHtml(c)}</th>`)
      .join("");
    const body = queryResult.rows
      .map(
        (r) =>
          `<tr>${queryResult.columns
            .map((c) => `<td>${escapeHtml(r[c] == null ? "" : String(r[c]))}</td>`)
            .join("")}</tr>`,
      )
      .join("");
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
      <title>تقرير</title>
      <style>
        body{font-family:Cairo,system-ui,sans-serif;padding:24px;color:#111}
        h2{margin:0 0 4px}
        .meta{color:#666;font-size:12px;margin-bottom:16px}
        table{border-collapse:collapse;width:100%;font-size:12px}
        th,td{border:1px solid #ccc;padding:6px 8px;text-align:right}
        th{background:#f3f4f6}
        tr:nth-child(even) td{background:#fafafa}
      </style></head><body>
      <h2>${escapeHtml(conn?.name || "تقرير قاعدة البيانات")}</h2>
      <div class="meta">${escapeHtml(
        conn?.database_name || "",
      )} — ${queryResult.rowCount} صف — ${new Date().toLocaleString("ar")}</div>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <script>window.onload=function(){window.print();}</script>
      </body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center gap-3 mb-2">
        <ServerCog className="h-6 w-6 text-indigo-600" />
        <div>
          <h2 className="text-xl font-bold">قاعدة بيانات خارجية (SQL Server)</h2>
          <p className="text-sm text-muted-foreground">
            الاتصال بخادم Microsoft SQL Server للقراءة فقط لتصفح الجداول
            المحاسبية وتشغيل استعلامات وطباعة التقارير
          </p>
        </div>
      </div>

      <Tabs defaultValue="connections" className="w-full">
        <TabsList>
          <TabsTrigger value="connections">
            <Database className="h-4 w-4 ml-2" /> الاتصالات
          </TabsTrigger>
          <TabsTrigger value="browse">
            <TableIcon className="h-4 w-4 ml-2" /> تصفح الجداول
          </TabsTrigger>
          <TabsTrigger value="query">
            <Play className="h-4 w-4 ml-2" /> الاستعلامات والتقارير
          </TabsTrigger>
        </TabsList>

        {/* ---- Connections ---- */}
        <TabsContent value="connections" className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              يتم تخزين كلمة المرور مشفّرة على الخادم ولا تظهر للمستخدم أبداً.
            </p>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 ml-2" /> إضافة اتصال
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : connections.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                لا توجد اتصالات بعد. أضف اتصالاً للبدء.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {connections.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base flex items-center gap-2">
                        {c.name}
                        {c.is_active ? (
                          <Badge variant="default">نشط</Badge>
                        ) : (
                          <Badge variant="secondary">معطّل</Badge>
                        )}
                      </CardTitle>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(c)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(c.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                    <CardDescription className="text-xs">
                      {c.host}:{c.port} / {c.database_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground space-y-1">
                    <div>المستخدم: {c.username}</div>
                    <div>
                      التشفير: {c.encrypt ? "مفعّل" : "معطّل"} — الثقة بالشهادة:{" "}
                      {c.trust_server_certificate ? "نعم" : "لا"}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ---- Browse ---- */}
        <TabsContent value="browse" className="space-y-4">
          <ConnectionPicker
            connections={connections}
            value={activeConnId}
            onChange={(id) => {
              setActiveConnId(id);
              setSelectedTable(null);
            }}
          />
          {!activeConnId ? (
            <p className="text-sm text-muted-foreground">
              اختر اتصالاً لعرض الجداول.
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">
                    الجداول والمشاهدات{" "}
                    {tablesLoading && (
                      <Loader2 className="inline h-3 w-3 animate-spin" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="max-h-[420px] overflow-auto p-2">
                  {tables.map((tbl) => (
                    <button
                      key={`${tbl.schema}.${tbl.name}`}
                      onClick={() => setSelectedTable(tbl)}
                      className={`w-full text-right px-3 py-2 rounded text-sm hover:bg-muted flex items-center justify-between ${
                        selectedTable?.schema === tbl.schema &&
                        selectedTable?.name === tbl.name
                          ? "bg-muted"
                          : ""
                      }`}
                    >
                      <span className="truncate">
                        {tbl.schema}.{tbl.name}
                      </span>
                      <Badge variant="outline" className="text-[10px]">
                        {tbl.type === "VIEW" ? "مشاهدة" : "جدول"}
                      </Badge>
                    </button>
                  ))}
                  {!tablesLoading && tables.length === 0 && (
                    <p className="text-xs text-muted-foreground p-2">
                      لا توجد جداول.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Columns3 className="h-4 w-4" />
                    {selectedTable
                      ? `أعمدة ${selectedTable.name}`
                      : "الأعمدة"}
                    {columnsLoading && (
                      <Loader2 className="inline h-3 w-3 animate-spin" />
                    )}
                  </CardTitle>
                  {selectedTable && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => useTableInQuery(selectedTable)}
                    >
                      استعلام
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="max-h-[420px] overflow-auto p-2">
                  {!selectedTable ? (
                    <p className="text-xs text-muted-foreground p-2">
                      اختر جدولاً لعرض أعمدته.
                    </p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground">
                          <th className="text-right p-1">العمود</th>
                          <th className="text-right p-1">النوع</th>
                          <th className="text-right p-1">Null</th>
                        </tr>
                      </thead>
                      <tbody>
                        {columns.map((col) => (
                          <tr key={col.name} className="border-t">
                            <td className="p-1 font-medium">{col.name}</td>
                            <td className="p-1">
                              {col.dataType}
                              {col.maxLength ? `(${col.maxLength})` : ""}
                            </td>
                            <td className="p-1">
                              {col.isNullable === "YES" ? "نعم" : "لا"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* ---- Query ---- */}
        <TabsContent value="query" className="space-y-4">
          <ConnectionPicker
            connections={connections}
            value={activeConnId}
            onChange={setActiveConnId}
          />
          <div className="space-y-2">
            <Label>استعلام SELECT (للقراءة فقط)</Label>
            <Textarea
              dir="ltr"
              className="font-mono text-sm min-h-[140px]"
              placeholder="SELECT TOP 100 * FROM [dbo].[Accounts]"
              value={sqlText}
              onChange={(e) => setSqlText(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                onClick={() => queryMutation.mutate()}
                disabled={!activeConnId || !sqlText.trim() || queryMutation.isPending}
              >
                {queryMutation.isPending ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 ml-2" />
                )}
                تنفيذ
              </Button>
              <Button
                variant="outline"
                onClick={printResult}
                disabled={!queryResult || queryResult.rows.length === 0}
              >
                <Printer className="h-4 w-4 ml-2" /> طباعة
              </Button>
              <Button
                variant="outline"
                onClick={exportCsv}
                disabled={!queryResult || queryResult.rows.length === 0}
              >
                <Download className="h-4 w-4 ml-2" /> تصدير CSV
              </Button>
            </div>
          </div>

          {queryResult && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  النتائج ({queryResult.rowCount} صف)
                  {queryResult.truncated && (
                    <Badge variant="secondary">مقيّد بـ 1000</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="overflow-auto max-h-[500px] p-0">
                {queryResult.rows.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4">
                    لا توجد نتائج.
                  </p>
                ) : (
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-muted">
                      <tr>
                        {queryResult.columns.map((c) => (
                          <th
                            key={c}
                            className="text-right p-2 border whitespace-nowrap"
                          >
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {queryResult.rows.map((row, i) => (
                        <tr key={i} className="even:bg-muted/30">
                          {queryResult.columns.map((c) => (
                            <td
                              key={c}
                              className="p-2 border whitespace-nowrap max-w-[280px] truncate"
                            >
                              {formatCell(row[c])}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Connection form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {editId ? "تعديل الاتصال" : "إضافة اتصال جديد"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>اسم الاتصال</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="خادم المحاسبة"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5 col-span-2">
                <Label>عنوان الخادم (Host/IP)</Label>
                <Input
                  dir="ltr"
                  value={form.host}
                  onChange={(e) => setForm({ ...form, host: e.target.value })}
                  placeholder="123.45.67.89"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>المنفذ</Label>
                <Input
                  dir="ltr"
                  type="number"
                  value={form.port}
                  onChange={(e) =>
                    setForm({ ...form, port: Number(e.target.value) || 1433 })
                  }
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>اسم قاعدة البيانات</Label>
              <Input
                dir="ltr"
                value={form.database_name}
                onChange={(e) =>
                  setForm({ ...form, database_name: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>اسم المستخدم</Label>
                <Input
                  dir="ltr"
                  value={form.username}
                  onChange={(e) =>
                    setForm({ ...form, username: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-1.5">
                <Label>
                  كلمة المرور{editId ? " (اتركها فارغة للإبقاء)" : ""}
                </Label>
                <Input
                  dir="ltr"
                  type="password"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  placeholder={editId ? "••••••••" : ""}
                />
              </div>
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <Label className="cursor-pointer">تشفير الاتصال (Encrypt)</Label>
              <Switch
                checked={form.encrypt}
                onCheckedChange={(v) => setForm({ ...form, encrypt: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <Label className="cursor-pointer">
                الثقة بشهادة الخادم (Trust Server Certificate)
              </Label>
              <Switch
                checked={form.trust_server_certificate}
                onCheckedChange={(v) =>
                  setForm({ ...form, trust_server_certificate: v })
                }
              />
            </div>
            <div className="flex items-center justify-between rounded border p-3">
              <Label className="cursor-pointer">الاتصال نشط</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm({ ...form, is_active: v })}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              ملاحظة: يجب أن يكون خادم SQL Server متاحاً للوصول من الإنترنت
              (إعادة توجيه المنفذ {form.port} وفتحه في جدار الحماية)، ويُفضّل
              استخدام مستخدم SQL بصلاحية قراءة فقط.
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : null}
              اختبار الاتصال
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                saveMutation.isPending ||
                !form.name ||
                !form.host ||
                !form.database_name ||
                !form.username ||
                (!editId && !form.password)
              }
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : null}
              حفظ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الاتصال؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف بيانات هذا الاتصال نهائياً. لا يؤثر ذلك على قاعدة
              البيانات الخارجية نفسها.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConnectionPicker({
  connections,
  value,
  onChange,
}: {
  connections: ExternalConnection[];
  value: number | null;
  onChange: (id: number) => void;
}) {
  return (
    <div className="flex items-center gap-2 max-w-md">
      <Label className="shrink-0">الاتصال:</Label>
      <Select
        value={value ? String(value) : undefined}
        onValueChange={(v) => onChange(Number(v))}
      >
        <SelectTrigger>
          <SelectValue placeholder="اختر اتصالاً" />
        </SelectTrigger>
        <SelectContent>
          {connections
            .filter((c) => c.is_active)
            .map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.name} ({c.database_name})
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
