import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Label } from "../ui/label";
import { Checkbox } from "../ui/checkbox";
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
import { formatNumber } from "../../lib/formatNumber";
import {
  Search,
  Filter,
  CalendarIcon,
  Film,
  PrinterIcon,
  Scissors,
  CheckCircle,
  Package,
  RefreshCw,
  X,
  Download,
  Tag,
  FileText,
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

  // جلب الرولات
  const { data: rolls = [], isLoading, refetch } = useQuery<RollData[]>({
    queryKey: ["/api/rolls/search"],
    queryFn: async () => {
      const response = await fetch("/api/rolls/search?q=");
      if (!response.ok) throw new Error("فشل في جلب الرولات");
      return response.json();
    },
  });

  // الفلترة
  const filteredRolls = useMemo(() => {
    return rolls.filter((roll) => {
      // البحث النصي
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        roll.roll_number.toLowerCase().includes(searchLower) ||
        roll.production_order_number.toLowerCase().includes(searchLower) ||
        roll.order_number.toLowerCase().includes(searchLower) ||
        (roll.customer_name_ar || roll.customer_name).toLowerCase().includes(searchLower) ||
        (roll.item_name_ar || roll.item_name || "").toLowerCase().includes(searchLower);

      // فلتر المرحلة
      const matchesStage = stageFilter === "all" || roll.stage === stageFilter;

      // فلتر العميل
      const matchesCustomer = customerFilter === "all" || roll.customer_id === customerFilter;

      // فلتر أمر الإنتاج
      const matchesProductionOrder = productionOrderFilter === "all" || 
        roll.production_order_id === parseInt(productionOrderFilter);

      // فلتر التاريخ
      const rollDate = new Date(roll.created_at);
      const matchesStartDate = !startDate || rollDate >= startDate;
      const matchesEndDate = !endDate || rollDate <= endDate;

      return matchesSearch && matchesStage && matchesCustomer && 
             matchesProductionOrder && matchesStartDate && matchesEndDate;
    });
  }, [rolls, searchTerm, stageFilter, customerFilter, productionOrderFilter, startDate, endDate]);

  // إحصائيات سريعة
  const stats = useMemo(() => {
    const byStage = {
      film: filteredRolls.filter(r => r.stage === "film").length,
      printing: filteredRolls.filter(r => r.stage === "printing").length,
      cutting: filteredRolls.filter(r => r.stage === "cutting").length,
      done: filteredRolls.filter(r => r.stage === "done").length,
      archived: filteredRolls.filter(r => r.stage === "archived").length,
    };
    const totalWeight = filteredRolls.reduce((sum, r) => sum + parseFloat(r.weight_kg || "0"), 0);
    return { byStage, totalWeight, total: filteredRolls.length };
  }, [filteredRolls]);

  // الترجمة
  const getStageNameAr = (stage: string) => {
    const stages: Record<string, string> = {
      film: "فيلم",
      printing: "طباعة",
      cutting: "تقطيع",
      done: "منتهي",
      archived: "مؤرشف",
    };
    return stages[stage] || stage;
  };

  const getStageBadgeVariant = (stage: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      film: "secondary",
      printing: "default",
      cutting: "outline",
      done: "default",
      archived: "secondary",
    };
    return variants[stage] || "default";
  };

  const getStageBadgeClassName = (stage: string) => {
    if (stage === "done") {
      return "bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900 dark:text-green-100";
    }
    return "";
  };

  const getStageIcon = (stage: string) => {
    const icons: Record<string, any> = {
      film: Film,
      printing: PrinterIcon,
      cutting: Scissors,
      done: CheckCircle,
      archived: Package,
    };
    const Icon = icons[stage] || Package;
    return <Icon className="h-4 w-4" />;
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
        stage: getStageNameAr(roll.stage),
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

  // مسح الفلاتر
  const clearFilters = () => {
    setSearchTerm("");
    setStageFilter("all");
    setCustomerFilter("all");
    setProductionOrderFilter("all");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  // طباعة ملصق رول واحد (4x6 انش)
  const printRollLabel = async (roll: RollData) => {
    try {
      const printWindow = window.open("", "_blank", "width=480,height=720");
      if (!printWindow) {
        alert("يرجى السماح بالنوافذ المنبثقة");
        return;
      }

      const labelHTML = `
        <html dir="rtl">
          <head>
            <meta charset="UTF-8">
            <title>ملصق رول - ${roll.roll_number}</title>
            <style>
              @page {
                size: 4in 6in;
                margin: 0;
              }
              
              * { margin: 0; padding: 0; box-sizing: border-box; }
              
              body {
                font-family: 'Arial', 'Segoe UI', sans-serif;
                direction: rtl;
                width: 4in;
                height: 6in;
                padding: 3mm;
                font-size: 9pt;
                color: #000;
                background: white;
              }
              
              .label-container {
                width: 100%;
                height: 100%;
                border: 2px solid #000;
                display: flex;
                flex-direction: column;
                padding: 3mm;
              }
              
              .header {
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 2mm;
                margin-bottom: 2mm;
              }
              
              .company-name {
                font-size: 8pt;
                font-weight: bold;
                margin-bottom: 1mm;
              }
              
              .roll-number {
                font-size: 14pt;
                font-weight: bold;
                background: #000;
                color: #fff;
                padding: 1.5mm 3mm;
                margin-top: 0.5mm;
                display: inline-block;
              }
              
              .content {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 2mm;
                margin: 2mm 0;
              }
              
              .info-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1mm;
              }
              
              .info-box {
                border: 1px solid #333;
                padding: 1.5mm;
                background: #fff;
                min-height: 8mm;
              }
              
              .info-box.full {
                grid-column: 1 / -1;
              }
              
              .info-box.highlight {
                background: #ffe6e6;
                border: 2px solid #c00;
              }
              
              .label {
                font-size: 6.5pt;
                color: #666;
                font-weight: 600;
                margin-bottom: 0.5mm;
                text-transform: uppercase;
              }
              
              .value {
                font-size: 8.5pt;
                font-weight: bold;
                color: #000;
              }
              
              .footer {
                margin-top: auto;
                padding-top: 1.5mm;
                border-top: 1px solid #333;
                text-align: center;
                font-size: 5.5pt;
                color: #666;
              }
              
              @media print {
                body { margin: 0; padding: 0; }
                .label-container { page-break-after: always; }
              }
            </style>
          </head>
          <body>
            <div class="label-container">
              <div class="header">
                <div class="company-name">نظام إدارة الإنتاج</div>
                <div class="roll-number">${roll.roll_number}</div>
              </div>
              
              <div class="content">
                ${roll.customer_name_ar || roll.customer_name ? `
                  <div class="info-box full">
                    <div class="label">العميل</div>
                    <div class="value">${roll.customer_name_ar || roll.customer_name}</div>
                  </div>
                ` : ''}
                
                <div class="info-row">
                  <div class="info-box">
                    <div class="label">أمر الإنتاج</div>
                    <div class="value">${roll.production_order_number}</div>
                  </div>
                  <div class="info-box">
                    <div class="label">رقم الطلب</div>
                    <div class="value">${roll.order_number}</div>
                  </div>
                </div>
                
                ${roll.item_name_ar || roll.item_name ? `
                  <div class="info-box full">
                    <div class="label">الصنف</div>
                    <div class="value">${roll.item_name_ar || roll.item_name}</div>
                  </div>
                ` : ''}
                
                <div class="info-row">
                  ${roll.size_caption ? `
                    <div class="info-box">
                      <div class="label">المقاس</div>
                      <div class="value">${roll.size_caption} سم</div>
                    </div>
                  ` : '<div class="info-box"></div>'}
                  <div class="info-box">
                    <div class="label">المرحلة</div>
                    <div class="value">${roll.stage === 'film' ? 'فيلم' : roll.stage === 'printing' ? 'طباعة' : roll.stage === 'cutting' ? 'تقطيع' : roll.stage === 'done' ? 'منتهي' : roll.stage}</div>
                  </div>
                </div>
                
                <div class="info-box highlight full">
                  <div class="label">الوزن الكلي</div>
                  <div class="value">${parseFloat(roll.weight_kg).toFixed(2)} كجم</div>
                </div>

                ${roll.created_by_name || roll.printed_by_name || roll.cut_by_name ? `
                  <div class="info-box full">
                    <div class="label">العاملين</div>
                    <div class="value" style="font-size: 7.5pt; line-height: 1.3;">
                      ${roll.created_by_name ? `<div>▪ فيلم بواسطة: <strong>${roll.created_by_name}</strong></div>` : ''}
                      ${roll.printed_by_name ? `<div>▪ طباعة بواسطة: <strong>${roll.printed_by_name}</strong></div>` : ''}
                      ${roll.cut_by_name ? `<div>▪ قطع بواسطة: <strong>${roll.cut_by_name}</strong></div>` : ''}
                    </div>
                  </div>
                ` : ''}
                
                ${roll.created_at ? `
                  <div class="info-box full">
                    <div class="label">تاريخ الإنتاج</div>
                    <div class="value">${format(new Date(roll.created_at), 'dd/MM/yyyy - HH:mm')}</div>
                  </div>
                ` : ''}
              </div>
              
              <div class="footer">
                طُبع: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
              </div>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(labelHTML);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
      }, 300);
    } catch (error) {
      alert("خطأ في طباعة الملصق");
      console.error(error);
    }
  };

  // طباعة تقرير A4 للرولات المحددة
  const printA4Report = () => {
    if (selectedRolls.size === 0) {
      alert("يرجى تحديد رولات للطباعة");
      return;
    }

    const selectedRollsData = filteredRolls.filter(r => selectedRolls.has(r.roll_id));
    
    const printWindow = window.open("", "_blank", "width=800,height=600");
    if (!printWindow) {
      alert("يرجى السماح بالنوافذ المنبثقة");
      return;
    }

    const reportHTML = `
      <html dir="rtl">
        <head>
          <meta charset="UTF-8">
          <title>تقرير الرولات</title>
          <style>
            @page {
              size: A4;
              margin: 20mm;
            }
            
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            body {
              font-family: 'Arial', 'Segoe UI', sans-serif;
              direction: rtl;
              color: #000;
              background: white;
              font-size: 10pt;
              line-height: 1.6;
            }
            
            .report-container {
              max-width: 100%;
            }
            
            .header {
              text-align: center;
              border-bottom: 3px solid #333;
              padding-bottom: 10mm;
              margin-bottom: 10mm;
            }
            
            .company-name {
              font-size: 16pt;
              font-weight: bold;
              margin-bottom: 2mm;
            }
            
            .report-title {
              font-size: 14pt;
              font-weight: bold;
              margin-bottom: 2mm;
            }
            
            .report-date {
              font-size: 9pt;
              color: #666;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10mm;
            }
            
            th {
              background: #f0f0f0;
              border: 1px solid #333;
              padding: 4mm;
              font-weight: bold;
              text-align: right;
              font-size: 9pt;
            }
            
            td {
              border: 1px solid #ddd;
              padding: 3mm;
              font-size: 9pt;
            }
            
            tr:nth-child(even) {
              background: #f9f9f9;
            }
            
            .summary {
              margin-top: 10mm;
              border-top: 2px solid #333;
              padding-top: 5mm;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin-bottom: 3mm;
              padding: 2mm 0;
            }
            
            .summary-label {
              font-weight: bold;
            }
            
            .summary-value {
              font-weight: bold;
              color: #0066cc;
            }
            
            @media print {
              body { margin: 0; padding: 0; }
              .report-container { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="report-container">
            <div class="header">
              <div class="company-name">نظام إدارة الإنتاج</div>
              <div class="report-title">تقرير الرولات</div>
              <div class="report-date">التاريخ: ${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
            </div>
            
            <table>
              <thead>
                <tr>
                  <th>رقم الرول</th>
                  <th>المرحلة</th>
                  <th>أمر الإنتاج</th>
                  <th>العميل</th>
                  <th>المنتج</th>
                  <th>الوزن (كجم)</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                ${selectedRollsData.map(roll => `
                  <tr>
                    <td>${roll.roll_number}</td>
                    <td>${roll.stage === 'film' ? 'فيلم' : roll.stage === 'printing' ? 'طباعة' : roll.stage === 'cutting' ? 'تقطيع' : roll.stage === 'done' ? 'منتهي' : roll.stage}</td>
                    <td>${roll.production_order_number}</td>
                    <td>${roll.customer_name_ar || roll.customer_name}</td>
                    <td>${roll.item_name_ar || roll.item_name || '-'}</td>
                    <td>${parseFloat(roll.weight_kg).toFixed(2)}</td>
                    <td>${format(new Date(roll.created_at), 'dd/MM/yyyy')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            
            <div class="summary">
              <div class="summary-row">
                <span class="summary-label">عدد الرولات:</span>
                <span class="summary-value">${selectedRollsData.length}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">إجمالي الوزن:</span>
                <span class="summary-value">${selectedRollsData.reduce((sum, r) => sum + parseFloat(r.weight_kg), 0).toFixed(2)} كجم</span>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(reportHTML);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 300);
  };

  // دالة تحديث الرولات المختارة
  const toggleRollSelection = (rollId: number) => {
    const newSelected = new Set(selectedRolls);
    if (newSelected.has(rollId)) {
      newSelected.delete(rollId);
    } else {
      newSelected.add(rollId);
    }
    setSelectedRolls(newSelected);
  };

  // تحديد/إلغاء تحديد الكل
  const toggleSelectAll = () => {
    if (selectedRolls.size === filteredRolls.length) {
      setSelectedRolls(new Set());
    } else {
      setSelectedRolls(new Set(filteredRolls.map(r => r.roll_id)));
    }
  };

  return (
    <div className="space-y-4">
      {/* الإحصائيات السريعة */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">الإجمالي</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{formatNumber(stats.total)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <Film className="h-4 w-4" />
              فيلم
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{formatNumber(stats.byStage.film)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <PrinterIcon className="h-4 w-4" />
              طباعة
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{formatNumber(stats.byStage.printing)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <Scissors className="h-4 w-4" />
              تقطيع
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{formatNumber(stats.byStage.cutting)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-1">
              <CheckCircle className="h-4 w-4" />
              منتهي
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold">{formatNumber(stats.byStage.done)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">إجمالي الوزن</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-xl font-bold">{stats.totalWeight.toFixed(2)} كجم</div>
          </CardContent>
        </Card>
      </div>

      {/* شريط البحث والفلاتر */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* صف البحث والأزرار */}
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="ابحث برقم الرول، أمر الإنتاج، الطلب، العميل، أو المنتج..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-9"
                  data-testid="input-search-rolls"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowFilters(!showFilters)}
                  data-testid="button-toggle-filters"
                >
                  <Filter className="h-4 w-4 ml-2" />
                  الفلاتر
                </Button>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  data-testid="button-refresh-rolls"
                >
                  <RefreshCw className="h-4 w-4 ml-2" />
                  تحديث
                </Button>
                <Button
                  variant="outline"
                  onClick={exportToExcel}
                  disabled={filteredRolls.length === 0}
                  data-testid="button-export-rolls"
                >
                  <Download className="h-4 w-4 ml-2" />
                  تصدير
                </Button>
                <Button
                  variant="default"
                  onClick={printA4Report}
                  disabled={selectedRolls.size === 0}
                  data-testid="button-print-report-a4"
                >
                  <FileText className="h-4 w-4 ml-2" />
                  طباعة تقرير ({selectedRolls.size})
                </Button>
              </div>
            </div>

            {/* الفلاتر المتقدمة */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                {/* فلتر المرحلة */}
                <div className="space-y-2">
                  <Label>المرحلة</Label>
                  <Select value={stageFilter} onValueChange={setStageFilter}>
                    <SelectTrigger data-testid="select-stage-filter">
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

                {/* فلتر العميل */}
                <div className="space-y-2">
                  <Label>العميل</Label>
                  <Select value={customerFilter} onValueChange={setCustomerFilter}>
                    <SelectTrigger data-testid="select-customer-filter">
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

                {/* فلتر أمر الإنتاج */}
                <div className="space-y-2">
                  <Label>أمر الإنتاج</Label>
                  <Select value={productionOrderFilter} onValueChange={setProductionOrderFilter}>
                    <SelectTrigger data-testid="select-production-order-filter">
                      <SelectValue placeholder="كل أوامر الإنتاج" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل أوامر الإنتاج</SelectItem>
                      {productionOrders.slice(0, 50).map((po: any) => (
                        <SelectItem key={po.id} value={po.id.toString()}>
                          {po.production_order_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* فلتر التاريخ */}
                <div className="space-y-2">
                  <Label>التاريخ</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-right font-normal flex-1",
                            !startDate && "text-muted-foreground"
                          )}
                          data-testid="button-start-date"
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {startDate ? format(startDate, "dd/MM/yyyy") : "من"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          locale={ar}
                        />
                      </PopoverContent>
                    </Popover>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-right font-normal flex-1",
                            !endDate && "text-muted-foreground"
                          )}
                          data-testid="button-end-date"
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {endDate ? format(endDate, "dd/MM/yyyy") : "إلى"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          locale={ar}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* زر مسح الفلاتر */}
                <div className="md:col-span-2 lg:col-span-4 flex justify-end">
                  <Button
                    variant="ghost"
                    onClick={clearFilters}
                    className="text-sm"
                    data-testid="button-clear-filters"
                  >
                    <X className="h-4 w-4 ml-2" />
                    مسح الفلاتر
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* الجدول */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredRolls.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">لا توجد رولات</p>
              <p className="text-sm mt-1">جرب تغيير معايير البحث أو الفلاتر</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12 text-center">
                      <Checkbox
                        checked={selectedRolls.size === filteredRolls.length && filteredRolls.length > 0}
                        onCheckedChange={toggleSelectAll}
                        data-testid="checkbox-select-all-rolls"
                      />
                    </TableHead>
                    <TableHead className="text-center min-w-[120px]">رقم الرول</TableHead>
                    <TableHead className="text-center min-w-[90px]">المرحلة</TableHead>
                    <TableHead className="text-center min-w-[120px]">أمر الإنتاج</TableHead>
                    <TableHead className="text-center min-w-[110px]">رقم الطلب</TableHead>
                    <TableHead className="text-center min-w-[140px]">العميل</TableHead>
                    <TableHead className="text-center min-w-[150px]">المنتج</TableHead>
                    <TableHead className="text-center min-w-[100px]">المقاس</TableHead>
                    <TableHead className="text-center min-w-[100px]">الوزن (كجم)</TableHead>
                    <TableHead className="text-center min-w-[130px]">فيلم بواسطة</TableHead>
                    <TableHead className="text-center min-w-[130px]">طبع بواسطة</TableHead>
                    <TableHead className="text-center min-w-[130px]">قطع بواسطة</TableHead>
                    <TableHead className="text-center min-w-[140px]">تاريخ الإنشاء</TableHead>
                    <TableHead className="text-center w-24">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRolls.map((roll) => (
                    <TableRow key={roll.roll_id} data-testid={`row-roll-${roll.roll_id}`}>
                      <TableCell className="w-12 text-center">
                        <Checkbox
                          checked={selectedRolls.has(roll.roll_id)}
                          onCheckedChange={() => toggleRollSelection(roll.roll_id)}
                          data-testid={`checkbox-roll-${roll.roll_id}`}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-center min-w-[120px]" data-testid={`text-roll-number-${roll.roll_id}`}>
                        {roll.roll_number}
                      </TableCell>
                      <TableCell className="text-center min-w-[90px]">
                        <div className="flex justify-center">
                          <Badge 
                            variant={getStageBadgeVariant(roll.stage)} 
                            className={`flex items-center gap-1 w-fit ${getStageBadgeClassName(roll.stage)}`}
                            data-testid={`badge-stage-${roll.roll_id}`}
                          >
                            {getStageIcon(roll.stage)}
                            {getStageNameAr(roll.stage)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-center min-w-[120px]" data-testid={`text-production-order-${roll.roll_id}`}>
                        {roll.production_order_number}
                      </TableCell>
                      <TableCell className="text-center min-w-[110px]" data-testid={`text-order-number-${roll.roll_id}`}>
                        {roll.order_number}
                      </TableCell>
                      <TableCell className="text-center min-w-[140px]" data-testid={`text-customer-${roll.roll_id}`}>
                        {roll.customer_name_ar || roll.customer_name}
                      </TableCell>
                      <TableCell className="text-center min-w-[150px]" data-testid={`text-item-${roll.roll_id}`}>
                        {roll.item_name_ar || roll.item_name || "-"}
                      </TableCell>
                      <TableCell className="text-center min-w-[100px]" data-testid={`text-size-${roll.roll_id}`}>
                        {roll.size_caption || "-"}
                      </TableCell>
                      <TableCell className="font-medium text-center min-w-[100px]" data-testid={`text-weight-${roll.roll_id}`}>
                        {parseFloat(roll.weight_kg).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-sm text-center min-w-[130px]" data-testid={`text-created-by-${roll.roll_id}`}>
                        {roll.created_by_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-center min-w-[130px]" data-testid={`text-printed-by-${roll.roll_id}`}>
                        {roll.printed_by_name || "-"}
                      </TableCell>
                      <TableCell className="text-sm text-center min-w-[130px]" data-testid={`text-cut-by-${roll.roll_id}`}>
                        {roll.cut_by_name || "-"}
                      </TableCell>
                      <TableCell className="text-center min-w-[140px]" data-testid={`text-created-at-${roll.roll_id}`}>
                        {format(new Date(roll.created_at), "dd/MM/yyyy HH:mm", { locale: ar })}
                      </TableCell>
                      <TableCell className="text-center w-24">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => printRollLabel(roll)}
                          title="طباعة ملصق (4x6)"
                          data-testid={`button-print-label-${roll.roll_id}`}
                        >
                          <Tag className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* معلومات النتائج */}
      {!isLoading && filteredRolls.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          عرض {formatNumber(filteredRolls.length)} من {formatNumber(rolls.length)} رول
        </div>
      )}
    </div>
  );
}
