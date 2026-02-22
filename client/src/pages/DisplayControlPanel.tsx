import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import PageLayout from "../components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Switch } from "../components/ui/switch";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import {
  Plus,
  Trash2,
  Edit,
  Monitor,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Package,
  Factory,
  Megaphone,
  BookOpen,
  Bell,
  ExternalLink,
  Eye,
  GripVertical,
  Clock,
} from "lucide-react";

interface SlideData {
  id: number;
  title: string;
  slide_type: string;
  content: any;
  duration_seconds: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

const SLIDE_TYPES = [
  { value: "production_stats", label: "إحصائيات الإنتاج", icon: BarChart3, description: "عرض إحصائيات الإنتاج اليومية (أوامر نشطة، لفات، كميات)" },
  { value: "recent_production", label: "طلبات الإنتاج الأخيرة", icon: Package, description: "عرض آخر أوامر الإنتاج مع حالتها ونسب التقدم" },
  { value: "latest_rolls", label: "آخر اللفات المنتجة", icon: Factory, description: "عرض آخر اللفات المنتجة مع تفاصيل الوزن والماكينة" },
  { value: "announcement", label: "إعلان إداري", icon: Megaphone, description: "عرض رسالة إعلانية أو تنبيه مهم" },
  { value: "instructions", label: "تعليمات وقوانين", icon: BookOpen, description: "عرض قائمة تعليمات أو قوانين أو شروحات" },
  { value: "notification", label: "إشعار / تنبيه", icon: Bell, description: "عرض إشعار بتغيير أو حدث معين" },
];

const COLORS = [
  { value: "blue", label: "أزرق", class: "bg-blue-500" },
  { value: "red", label: "أحمر", class: "bg-red-500" },
  { value: "green", label: "أخضر", class: "bg-green-500" },
  { value: "yellow", label: "أصفر", class: "bg-yellow-500" },
  { value: "purple", label: "بنفسجي", class: "bg-purple-500" },
];

const ICONS = [
  { value: "announcement", label: "إعلان" },
  { value: "warning", label: "تحذير" },
  { value: "info", label: "معلومات" },
  { value: "notification", label: "إشعار" },
];

function SlideForm({
  initialData,
  onSubmit,
  onCancel,
}: {
  initialData?: SlideData;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialData?.title || "");
  const [slideType, setSlideType] = useState(initialData?.slide_type || "");
  const [durationSeconds, setDurationSeconds] = useState(initialData?.duration_seconds || 10);
  const [contentTitle, setContentTitle] = useState(initialData?.content?.title || "");
  const [contentMessage, setContentMessage] = useState(initialData?.content?.message || "");
  const [contentFooter, setContentFooter] = useState(initialData?.content?.footer || "");
  const [contentColor, setContentColor] = useState(initialData?.content?.color || "blue");
  const [contentIcon, setContentIcon] = useState(initialData?.content?.icon || "announcement");
  const [instructionItems, setInstructionItems] = useState<string[]>(initialData?.content?.items || [""]);

  const selectedType = SLIDE_TYPES.find(t => t.value === slideType);
  const needsContent = ["announcement", "notification", "instructions"].includes(slideType);

  const handleSubmit = () => {
    if (!title || !slideType) return;
    let content: any = null;
    if (slideType === "announcement" || slideType === "notification") {
      content = { title: contentTitle, message: contentMessage, footer: contentFooter, color: contentColor, icon: contentIcon };
    } else if (slideType === "instructions") {
      content = { items: instructionItems.filter(i => i.trim()) };
    }
    onSubmit({ title, slide_type: slideType, duration_seconds: durationSeconds, content });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>عنوان الشريحة</Label>
          <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: إحصائيات اليوم" />
        </div>
        <div className="space-y-2">
          <Label>مدة العرض (ثواني)</Label>
          <Input type="number" min={3} max={120} value={durationSeconds} onChange={e => setDurationSeconds(Number(e.target.value))} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>نوع الشريحة</Label>
        <div className="grid grid-cols-2 gap-3">
          {SLIDE_TYPES.map(type => {
            const Icon = type.icon;
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setSlideType(type.value)}
                className={`flex items-start gap-3 p-4 rounded-xl border-2 transition-all text-right ${
                  slideType === type.value
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className={`w-6 h-6 mt-0.5 flex-shrink-0 ${slideType === type.value ? "text-blue-600" : "text-gray-400"}`} />
                <div>
                  <div className="font-bold text-sm">{type.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{type.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {(slideType === "announcement" || slideType === "notification") && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">محتوى الإعلان</h4>
          <div className="space-y-2">
            <Label>العنوان الرئيسي</Label>
            <Input value={contentTitle} onChange={e => setContentTitle(e.target.value)} placeholder="عنوان الإعلان" />
          </div>
          <div className="space-y-2">
            <Label>نص الرسالة</Label>
            <Textarea
              value={contentMessage}
              onChange={e => setContentMessage(e.target.value)}
              placeholder="اكتب نص الرسالة هنا..."
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>نص أسفل الشريحة (اختياري)</Label>
            <Input value={contentFooter} onChange={e => setContentFooter(e.target.value)} placeholder="مثال: الإدارة العامة" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>لون الخلفية</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setContentColor(c.value)}
                    className={`w-10 h-10 rounded-lg ${c.class} transition-all ${contentColor === c.value ? "ring-4 ring-offset-2 ring-blue-400 scale-110" : "opacity-60 hover:opacity-100"}`}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>الأيقونة</Label>
              <Select value={contentIcon} onValueChange={setContentIcon}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ICONS.map(i => <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {slideType === "instructions" && (
        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <h4 className="font-bold text-sm text-gray-700 dark:text-gray-300">التعليمات</h4>
          {instructionItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-sm font-bold text-blue-700 dark:text-blue-300 flex-shrink-0">
                {i + 1}
              </span>
              <Input
                value={item}
                onChange={e => {
                  const newItems = [...instructionItems];
                  newItems[i] = e.target.value;
                  setInstructionItems(newItems);
                }}
                placeholder={`التعليمة ${i + 1}`}
              />
              {instructionItems.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setInstructionItems(instructionItems.filter((_, idx) => idx !== i))}
                  className="text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setInstructionItems([...instructionItems, ""])}>
            <Plus className="w-4 h-4 ml-2" />
            إضافة تعليمة
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>إلغاء</Button>
        <Button onClick={handleSubmit} disabled={!title || !slideType}>
          {initialData ? "تحديث" : "إضافة"} الشريحة
        </Button>
      </div>
    </div>
  );
}

export default function DisplayControlPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSlide, setEditingSlide] = useState<SlideData | null>(null);

  const { data: slides = [], isLoading } = useQuery<SlideData[]>({
    queryKey: ["/api/display/slides"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("/api/display/slides", { method: "POST", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/display/slides"] });
      toast({ title: "تم إنشاء الشريحة بنجاح" });
      setDialogOpen(false);
    },
    onError: () => toast({ title: "خطأ في إنشاء الشريحة", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest(`/api/display/slides/${id}`, { method: "PUT", body: JSON.stringify(data) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/display/slides"] });
      toast({ title: "تم تحديث الشريحة بنجاح" });
      setDialogOpen(false);
      setEditingSlide(null);
    },
    onError: () => toast({ title: "خطأ في تحديث الشريحة", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(`/api/display/slides/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/display/slides"] });
      toast({ title: "تم حذف الشريحة" });
    },
    onError: () => toast({ title: "خطأ في حذف الشريحة", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: number; is_active: boolean }) => {
      const res = await apiRequest(`/api/display/slides/${id}`, { method: "PUT", body: JSON.stringify({ is_active }) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/display/slides"] });
    },
  });

  const moveMutation = useMutation({
    mutationFn: async (slideOrders: { id: number; sort_order: number }[]) => {
      const res = await apiRequest("/api/display/slides/reorder", { method: "PUT", body: JSON.stringify({ slideOrders }) });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/display/slides"] });
    },
  });

  const moveSlide = (index: number, direction: "up" | "down") => {
    const newSlides = [...slides];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSlides.length) return;
    [newSlides[index], newSlides[targetIndex]] = [newSlides[targetIndex], newSlides[index]];
    const orders = newSlides.map((s, i) => ({ id: s.id, sort_order: i }));
    moveMutation.mutate(orders);
  };

  const handleSubmit = (data: any) => {
    if (editingSlide) {
      updateMutation.mutate({ id: editingSlide.id, data });
    } else {
      createMutation.mutate({ ...data, sort_order: slides.length });
    }
  };

  const openEdit = (slide: SlideData) => {
    setEditingSlide(slide);
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingSlide(null);
    setDialogOpen(true);
  };

  const getSlideTypeInfo = (type: string) => SLIDE_TYPES.find(t => t.value === type);

  return (
    <PageLayout title="لوحة تحكم شاشة العرض" description="إدارة محتوى شاشة العرض في المصنع">
      <div className="space-y-6" dir="rtl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">إدارة الشرائح</h2>
            <p className="text-gray-500 mt-1">أضف وعدّل الشرائح التي ستظهر على شاشة العرض</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/display-screen" target="_blank" rel="noopener noreferrer">
              <Button variant="outline">
                <Monitor className="w-4 h-4 ml-2" />
                فتح شاشة العرض
                <ExternalLink className="w-3 h-3 mr-2" />
              </Button>
            </a>
            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingSlide(null); }}>
              <DialogTrigger asChild>
                <Button onClick={openCreate}>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة شريحة جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingSlide ? "تعديل الشريحة" : "إضافة شريحة جديدة"}</DialogTitle>
                </DialogHeader>
                <SlideForm
                  initialData={editingSlide || undefined}
                  onSubmit={handleSubmit}
                  onCancel={() => { setDialogOpen(false); setEditingSlide(null); }}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : slides.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Monitor className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-xl font-bold text-gray-500 mb-2">لا توجد شرائح</h3>
              <p className="text-gray-400 mb-6">ابدأ بإضافة شرائح لعرضها على شاشة المصنع</p>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة أول شريحة
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, index) => {
              const typeInfo = getSlideTypeInfo(slide.slide_type);
              const Icon = typeInfo?.icon || Monitor;
              return (
                <Card key={slide.id} className={`transition-all ${!slide.is_active ? "opacity-50" : ""}`}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveSlide(index, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </Button>
                        <GripVertical className="w-4 h-4 text-gray-300 mx-auto" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveSlide(index, "down")}
                          disabled={index === slides.length - 1}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-lg">{slide.title}</h3>
                          <Badge variant="secondary" className="text-xs">{typeInfo?.label || slide.slide_type}</Badge>
                        </div>
                        {slide.content?.message && (
                          <p className="text-sm text-gray-500 truncate mt-1">{slide.content.message}</p>
                        )}
                        {slide.content?.items && (
                          <p className="text-sm text-gray-500 mt-1">{slide.content.items.length} تعليمة</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm font-medium">{slide.duration_seconds} ث</span>
                      </div>

                      <Switch
                        checked={slide.is_active}
                        onCheckedChange={(checked) => toggleMutation.mutate({ id: slide.id, is_active: checked })}
                      />

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(slide)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => {
                            if (confirm("هل تريد حذف هذه الشريحة؟")) {
                              deleteMutation.mutate(slide.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardContent className="py-4 px-5">
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-bold text-sm text-blue-900 dark:text-blue-100">نصائح للاستخدام</h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 space-y-1 list-disc list-inside">
                  <li>اضغط على زر "فتح شاشة العرض" لفتح الشاشة في نافذة جديدة</li>
                  <li>اضغط F في شاشة العرض للتبديل إلى وضع ملء الشاشة</li>
                  <li>اضغط مسافة لإيقاف/استئناف التبديل التلقائي</li>
                  <li>الشرائح من نوع "إحصائيات" و"طلبات الإنتاج" تتحدث تلقائياً من قاعدة البيانات</li>
                  <li>يمكنك تعطيل أي شريحة مؤقتاً دون حذفها</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
