import { useState, useMemo, Fragment } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
import { Progress } from "../ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Skeleton } from "../ui/skeleton";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { cn } from "../../lib/utils";
import {
  Search,
  Filter,
  CalendarIcon,
  Film,
  Printer as PrinterIcon,
  Scissors,
  CheckCircle,
  Package,
  RefreshCw,
  X,
  Download,
  Tag,
  FileText,
  Scale,
  ChevronDown,
  ChevronUp,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import ExcelJS from "exceljs";

interface RollData {
  roll_id: number;
  roll_number: string;
  roll_seq: number;
  stage: string;
  weight_kg: string;
  cut_weight_total_kg?: string;
  waste_kg?: string;
  created_at: string;
  printed_at?: string;
  cut_completed_at?: string;
  production_order_id: number;
  production_order_number: string;
  order_id: number;
  order_number: string;
  customer_id: string;
  customer_name: string;
  customer_name_ar?: string;
  item_name?: string;
  item_name_ar?: string;
  size_caption?: string;
  color?: string;
  punching?: string;
  film_machine_name?: string;
  printing_machine_name?: string;
  cutting_machine_name?: string;
  created_by_name?: string;
  printed_by_name?: string;
  cut_by_name?: string;
}

interface RollsTabProps {
  customers?: any[];
  productionOrders?: any[];
}

export default function RollsTab({ customers = [], productionOrders = [] }: RollsTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [productionOrderFilter, setProductionOrderFilter] = useState("all");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRolls, setSelectedRolls] = useState<Set<number>>(new Set());
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const { data: rolls = [], isLoading, refetch } = useQuery<RollData[]>({
    queryKey: ["/api/rolls/search"],
    queryFn: async () => {
      const response = await fetch("/api/rolls/search?q=");
      if (!response.ok) throw new Error("فشل في جلب الرولات");
      return response.json();
    },
  });

  const filteredRolls = useMemo(() => {
    return rolls.filter((roll) => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        roll.roll_number.toLowerCase().includes(searchLower) ||
        roll.production_order_number.toLowerCase().includes(searchLower) ||
        roll.order_number.toLowerCase().includes(searchLower) ||
        (roll.customer_name_ar || roll.customer_name).toLowerCase().includes(searchLower) ||
        (roll.item_name_ar || roll.item_name || "").toLowerCase().includes(searchLower);

      const matchesStage = stageFilter === "all" || roll.stage === stageFilter;
      const matchesCustomer = customerFilter === "all" || roll.customer_id === customerFilter;
      const matchesProductionOrder = productionOrderFilter === "all" || 
        roll.production_order_id === parseInt(productionOrderFilter);

      const rollDate = new Date(roll.created_at);
      const matchesStartDate = !startDate || rollDate >= startDate;
      const matchesEndDate = !endDate || rollDate <= endDate;

      return matchesSearch && matchesStage && matchesCustomer && 
             matchesProductionOrder && matchesStartDate && matchesEndDate;
    });
  }, [rolls, searchTerm, stageFilter, customerFilter, productionOrderFilter, startDate, endDate]);

  const stats = useMemo(() => {
    const byStage = {
      film: filteredRolls.filter(r => r.stage === "film").length,
      printing: filteredRolls.filter(r => r.stage === "printing").length,
      cutting: filteredRolls.filter(r => r.stage === "cutting").length,
      done: filteredRolls.filter(r => r.stage === "done").length,
      archived: filteredRolls.filter(r => r.stage === "archived").length,
    };
    const totalWeight = filteredRolls.reduce((sum, r) => sum + parseFloat(r.weight_kg || "0"), 0);
    const total = filteredRolls.length;
    
    const stageProgress = total > 0 ? {
      film: (byStage.film / total) * 100,
      printing: (byStage.printing / total) * 100,
      cutting: (byStage.cutting / total) * 100,
      done: (byStage.done / total) * 100,
    } : { film: 0, printing: 0, cutting: 0, done: 0 };
    
    return { byStage, totalWeight, total, stageProgress };
  }, [filteredRolls]);

  const getStageConfig = (stage: string) => {
    const configs: Record<string, { icon: any; color: string; bg: string; label: string; border: string }> = {
      film: { icon: Film, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", label: "فيلم", border: "border-blue-500" },
      printing: { icon: PrinterIcon, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950", label: "طباعة", border: "border-purple-500" },
      cutting: { icon: Scissors, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950", label: "تقطيع", border: "border-orange-500" },
      done: { icon: CheckCircle, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", label: "منتهي", border: "border-green-500" },
      archived: { icon: Package, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-800", label: "مؤرشف", border: "border-gray-500" },
    };
    return configs[stage] || configs.film;
  };

  const exportToExcel = async () => {
    if (filteredRolls.length === 0) {
      alert("لا توجد بيانات للتصدير");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("الرولات");

    worksheet.columns = [
      { header: "رقم الرول", key: "rollNumber", width: 15 },
      { header: "رقم أمر الإنتاج", key: "productionOrder", width: 20 },
      { header: "رقم الطلب", key: "orderNumber", width: 15 },
      { header: "العميل", key: "customer", width: 25 },
      { header: "المنتج", key: "product", width: 20 },
      { header: "المقاس", key: "size", width: 12 },
      { header: "المرحلة", key: "stage", width: 12 },
      { header: "الوزن (كجم)", key: "weight", width: 12 },
      { header: "فيلم بواسطة", key: "filmBy", width: 15 },
      { header: "طبع بواسطة", key: "printBy", width: 15 },
      { header: "قطع بواسطة", key: "cutBy", width: 15 },
      { header: "وزن التقطيع", key: "cutWeight", width: 12 },
      { header: "الهدر", key: "waste", width: 10 },
      { header: "تاريخ الإنشاء", key: "createdAt", width: 18 },
    ];

    filteredRolls.forEach((roll) => {
      worksheet.addRow({
        rollNumber: roll.roll_number,
        productionOrder: roll.production_order_number,
        orderNumber: roll.order_number,
        customer: roll.customer_name_ar || roll.customer_name,
        product: roll.item_name_ar || roll.item_name || "-",
        size: roll.size_caption || "-",
        stage: getStageConfig(roll.stage).label,
        weight: roll.weight_kg,
        filmBy: roll.created_by_name || "-",
        printBy: roll.printed_by_name || "-",
        cutBy: roll.cut_by_name || "-",
        cutWeight: roll.cut_weight_total_kg || "-",
        waste: roll.waste_kg || "-",
        createdAt: format(new Date(roll.created_at), "yyyy-MM-dd HH:mm", { locale: ar }),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rolls-${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStageFilter("all");
    setCustomerFilter("all");
    setProductionOrderFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const printRollLabel = async (roll: RollData) => {
    const printWindow = window.open("", "_blank", "width=480,height=720");
    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة");
      return;
    }

    const stageConfig = getStageConfig(roll.stage);

    const labelHTML = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>ملصق رول - ${roll.roll_number}</title>
          <style>
            @page { size: 4in 6in; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Arial', sans-serif; direction: rtl; width: 4in; height: 6in; padding: 3mm; }
            .label { width: 100%; height: 100%; border: 2px solid #000; display: flex; flex-direction: column; padding: 3mm; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 2mm; margin-bottom: 2mm; }
            .company { font-size: 10pt; font-weight: bold; }
            .roll-num { font-size: 16pt; font-weight: bold; background: #000; color: #fff; padding: 2mm 4mm; margin-top: 1mm; display: inline-block; }
            .content { flex: 1; display: flex; flex-direction: column; gap: 2mm; }
            .row { display: grid; grid-template-columns: 1fr 1fr; gap: 1mm; }
            .box { border: 1px solid #333; padding: 2mm; }
            .box.full { grid-column: 1 / -1; }
            .box.highlight { background: #ffe; border: 2px solid #c90; }
            .lbl { font-size: 7pt; color: #666; font-weight: 600; }
            .val { font-size: 9pt; font-weight: bold; }
            .footer { border-top: 1px solid #333; padding-top: 1mm; text-align: center; font-size: 6pt; color: #666; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="header">
              <div class="company">نظام إدارة الإنتاج</div>
              <div class="roll-num">${roll.roll_number}</div>
            </div>
            <div class="content">
              <div class="box full"><div class="lbl">العميل</div><div class="val">${roll.customer_name_ar || roll.customer_name || '-'}</div></div>
              <div class="row">
                <div class="box"><div class="lbl">أمر الإنتاج</div><div class="val">${roll.production_order_number}</div></div>
                <div class="box"><div class="lbl">رقم الطلب</div><div class="val">${roll.order_number}</div></div>
              </div>
              <div class="row">
                <div class="box"><div class="lbl">المقاس</div><div class="val">${roll.size_caption || '-'}</div></div>
                <div class="box"><div class="lbl">المرحلة</div><div class="val">${stageConfig.label}</div></div>
              </div>
              <div class="box highlight full"><div class="lbl">الوزن</div><div class="val">${parseFloat(roll.weight_kg).toFixed(2)} كجم</div></div>
              <div class="box full"><div class="lbl">تاريخ الإنتاج</div><div class="val">${format(new Date(roll.created_at), 'dd/MM/yyyy HH:mm')}</div></div>
            </div>
            <div class="footer">طُبع: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(labelHTML);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  };

  const toggleRollSelection = (rollId: number) => {
    const newSelected = new Set(selectedRolls);
    if (newSelected.has(rollId)) {
      newSelected.delete(rollId);
    } else {
      newSelected.add(rollId);
    }
    setSelectedRolls(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedRolls.size === filteredRolls.length) {
      setSelectedRolls(new Set());
    } else {
      setSelectedRolls(new Set(filteredRolls.map(r => r.roll_id)));
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="border-r-4 border-r-slate-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الرولات</p>
                <p className="text-3xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-slate-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-blue-500">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Film className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-muted-foreground">فيلم</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">{stats.byStage.film}</span>
              </div>
              <Progress value={stats.stageProgress.film} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-purple-500">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <PrinterIcon className="h-4 w-4 text-purple-600" />
                  <span className="text-sm text-muted-foreground">طباعة</span>
                </div>
                <span className="text-2xl font-bold text-purple-600">{stats.byStage.printing}</span>
              </div>
              <Progress value={stats.stageProgress.printing} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-orange-500">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-muted-foreground">تقطيع</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">{stats.byStage.cutting}</span>
              </div>
              <Progress value={stats.stageProgress.cutting} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-green-500">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-muted-foreground">منتهي</span>
                </div>
                <span className="text-2xl font-bold text-green-600">{stats.byStage.done}</span>
              </div>
              <Progress value={stats.stageProgress.done} className="h-1.5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الوزن</p>
                <p className="text-xl font-bold text-amber-600">{stats.totalWeight.toLocaleString()} كجم</p>
              </div>
              <Scale className="h-8 w-8 text-amber-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم الرول أو أمر الإنتاج أو العميل..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={showFilters ? "secondary" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  <Filter className="h-4 w-4 ml-2" />
                  الفلاتر
                  {showFilters ? <ChevronUp className="h-4 w-4 mr-2" /> : <ChevronDown className="h-4 w-4 mr-2" />}
                </Button>
                <Button variant="outline" size="icon" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={exportToExcel} disabled={filteredRolls.length === 0}>
                  <Download className="h-4 w-4 ml-2" />
                  تصدير
                </Button>
              </div>
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4 bg-muted/50 rounded-lg animate-in slide-in-from-top-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">المرحلة</Label>
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="كل المراحل" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المراحل</SelectItem>
                      <SelectItem value="film">فيلم</SelectItem>
                      <SelectItem value="printing">طباعة</SelectItem>
                      <SelectItem value="cutting">تقطيع</SelectItem>
                      <SelectItem value="done">منتهي</SelectItem>
                      <SelectItem value="archived">مؤرشف</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">العميل</Label>
                  <Select value={customerFilter} onValueChange={setCustomerFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="كل العملاء" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل العملاء</SelectItem>
                      {customers.map((customer: any) => (
                        <SelectItem key={customer.id} value={customer.id}>
                          {customer.name_ar || customer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">من تاريخ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-right", !startDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : "اختر التاريخ"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} locale={ar} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">إلى تاريخ</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn("w-full justify-start text-right", !endDate && "text-muted-foreground")}
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yyyy") : "اختر التاريخ"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} locale={ar} />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="flex items-end">
                  <Button variant="ghost" onClick={clearFilters} className="w-full">
                    <X className="h-4 w-4 ml-2" />
                    مسح الفلاتر
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Rolls Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              قائمة الرولات
              <Badge variant="secondary">{filteredRolls.length}</Badge>
            </CardTitle>
            {selectedRolls.size > 0 && (
              <Badge variant="default">{selectedRolls.size} محدد</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredRolls.length === 0 ? (
            <div className="p-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium text-muted-foreground">لا توجد رولات</p>
              <p className="text-sm text-muted-foreground mt-1">جرب تغيير معايير البحث أو الفلاتر</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={selectedRolls.size === filteredRolls.length && filteredRolls.length > 0}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="font-semibold">رقم الرول</TableHead>
                    <TableHead className="font-semibold text-center">المرحلة</TableHead>
                    <TableHead className="font-semibold">أمر الإنتاج</TableHead>
                    <TableHead className="font-semibold">العميل</TableHead>
                    <TableHead className="font-semibold">المنتج</TableHead>
                    <TableHead className="font-semibold text-center">الوزن</TableHead>
                    <TableHead className="font-semibold text-center">التاريخ</TableHead>
                    <TableHead className="font-semibold text-center w-20">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRolls.map((roll) => {
                    const stageConfig = getStageConfig(roll.stage);
                    const StageIcon = stageConfig.icon;
                    const isExpanded = expandedRow === roll.roll_id;
                    
                    return (
                      <Fragment key={roll.roll_id}>
                        <TableRow 
                          className={cn(
                            "hover:bg-muted/50 transition-colors cursor-pointer",
                            selectedRolls.has(roll.roll_id) && "bg-primary/5"
                          )}
                          onClick={() => setExpandedRow(isExpanded ? null : roll.roll_id)}
                        >
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedRolls.has(roll.roll_id)}
                              onCheckedChange={() => toggleRollSelection(roll.roll_id)}
                            />
                          </TableCell>
                          <TableCell className="font-mono font-medium">
                            {roll.roll_number}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn("gap-1", stageConfig.bg, stageConfig.color, "border-0")}>
                              <StageIcon className="h-3 w-3" />
                              {stageConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {roll.production_order_number}
                          </TableCell>
                          <TableCell>
                            {roll.customer_name_ar || roll.customer_name}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="text-sm">{roll.item_name_ar || roll.item_name || "-"}</div>
                              {roll.size_caption && (
                                <div className="text-xs text-muted-foreground">{roll.size_caption}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-semibold">
                            {parseFloat(roll.weight_kg).toFixed(2)} كجم
                          </TableCell>
                          <TableCell className="text-center text-sm text-muted-foreground">
                            {format(new Date(roll.created_at), "dd/MM/yyyy", { locale: ar })}
                          </TableCell>
                          <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-1 justify-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => printRollLabel(roll)}
                                title="طباعة ملصق"
                              >
                                <Tag className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setExpandedRow(isExpanded ? null : roll.roll_id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {isExpanded && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={9} className="p-4">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">رقم الطلب:</span>
                                  <span className="font-medium mr-2">{roll.order_number}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">فيلم بواسطة:</span>
                                  <span className="font-medium mr-2">{roll.created_by_name || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">طباعة بواسطة:</span>
                                  <span className="font-medium mr-2">{roll.printed_by_name || "-"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">تقطيع بواسطة:</span>
                                  <span className="font-medium mr-2">{roll.cut_by_name || "-"}</span>
                                </div>
                                {roll.cut_weight_total_kg && (
                                  <div>
                                    <span className="text-muted-foreground">وزن التقطيع:</span>
                                    <span className="font-medium mr-2">{roll.cut_weight_total_kg} كجم</span>
                                  </div>
                                )}
                                {roll.waste_kg && (
                                  <div>
                                    <span className="text-muted-foreground">الهدر:</span>
                                    <span className="font-medium mr-2 text-red-600">{roll.waste_kg} كجم</span>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Info */}
      {!isLoading && filteredRolls.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          عرض {filteredRolls.length.toLocaleString()} من {rolls.length.toLocaleString()} رول
        </div>
      )}
    </div>
  );
}
