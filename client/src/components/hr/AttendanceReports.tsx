import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { useToast } from "../../hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { 
  Calendar as CalendarIcon, 
  FileText,
  Clock, 
  TrendingUp,
  Users,
  Search,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Timer,
  Eye,
  Printer,
  Building2,
  User,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { ar } from "date-fns/locale";

interface AttendanceReportData {
  user_id: number;
  username: string;
  display_name: string;
  display_name_ar: string;
  role_name: string;
  role_name_ar: string;
  total_days: number;
  present_days: number;
  absent_days: number;
  leave_days: number;
  late_days: number;
  total_work_hours: number;
  total_overtime_hours: number;
  total_late_minutes: number;
  total_early_leave_minutes: number;
}

interface EmployeeReportData {
  factoryInfo: { name: string; address: string; phone: string; email: string };
  employee: { id: number; name: string; employeeNumber: string; department: string; position: string };
  period: { startDate: string; endDate: string; totalDays: number };
  summary: { totalWorkHours: number; totalOvertimeHours: number; presentDays: number; absentDays: number; leaveDays: number; earlyLeaveDays: number; attendanceRate: number };
  records: { date: string; dayName: string; status: string; checkIn: string | null; checkOut: string | null; workHours: number | null; overtimeHours: number | null; notes: string | null }[];
  generatedAt: string;
}

export default function AttendanceReports() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [selectedPeriod, setSelectedPeriod] = useState<string>("month");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState<AttendanceReportData | null>(null);
  const [showReportDialog, setShowReportDialog] = useState(false);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    const now = new Date();
    
    switch (period) {
      case "week":
        setStartDate(startOfWeek(now, { weekStartsOn: 0 }));
        setEndDate(endOfWeek(now, { weekStartsOn: 0 }));
        break;
      case "month":
        setStartDate(startOfMonth(now));
        setEndDate(endOfMonth(now));
        break;
      case "custom":
        break;
    }
  };

  const reportUrl = `/api/attendance/report?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`;
  
  const { data: reportData, isLoading } = useQuery<{ data: AttendanceReportData[] }>({
    queryKey: [reportUrl],
  });

  const { data: dailyStats } = useQuery<{ data: any }>({
    queryKey: ["/api/attendance/daily-stats"],
  });

  const filteredData = (reportData?.data || []).filter((employee) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      employee.username?.toLowerCase().includes(search) ||
      employee.display_name?.toLowerCase().includes(search) ||
      employee.display_name_ar?.includes(search) ||
      employee.role_name_ar?.includes(search)
    );
  });

  const totals = filteredData.reduce((acc, emp) => ({
    presentDays: acc.presentDays + (parseInt(emp.present_days as any) || 0),
    absentDays: acc.absentDays + (parseInt(emp.absent_days as any) || 0),
    lateDays: acc.lateDays + (parseInt(emp.late_days as any) || 0),
    workHours: acc.workHours + (parseFloat(emp.total_work_hours as any) || 0),
    overtimeHours: acc.overtimeHours + (parseFloat(emp.total_overtime_hours as any) || 0),
    lateMinutes: acc.lateMinutes + (parseInt(emp.total_late_minutes as any) || 0),
  }), { presentDays: 0, absentDays: 0, lateDays: 0, workHours: 0, overtimeHours: 0, lateMinutes: 0 });

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} د`;
    return `${h} س ${m} د`;
  };

  const { data: employeeReportData, isLoading: isLoadingEmployeeReport } = useQuery<{ success: boolean; report: EmployeeReportData }>({
    queryKey: ["/api/attendance/report", selectedEmployee?.user_id, { startDate: format(startDate, "yyyy-MM-dd"), endDate: format(endDate, "yyyy-MM-dd") }],
    enabled: showReportDialog && !!selectedEmployee,
  });

  const handleViewReport = (employee: AttendanceReportData) => {
    setSelectedEmployee(employee);
    setShowReportDialog(true);
  };

  const handleExportEmployeeReport = async () => {
    if (!selectedEmployee) return;
    try {
      const response = await fetch(
        `/api/attendance/report/${selectedEmployee.user_id}/export?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}`
      );
      if (!response.ok) throw new Error("خطأ في التصدير");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance_report_${selectedEmployee.user_id}_${format(startDate, "yyyy-MM-dd")}_${format(endDate, "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ title: "تم تصدير التقرير بنجاح" });
    } catch (err) {
      toast({ title: "خطأ في تصدير التقرير", variant: "destructive" });
    }
  };

  const handlePrintReport = () => {
    if (printRef.current) {
      const printContents = printRef.current.innerHTML;
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html dir="rtl">
            <head>
              <title>تقرير حضور موظف</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; direction: rtl; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: right; }
                th { background-color: #f5f5f5; }
                .header { text-align: center; margin-bottom: 20px; }
                .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 20px 0; }
                .summary-item { text-align: center; padding: 10px; background: #f9f9f9; border-radius: 8px; }
                @media print { body { -webkit-print-color-adjust: exact; } }
              </style>
            </head>
            <body>${printContents}</body>
          </html>
        `);
        printWindow.document.close();
        printWindow.print();
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "حاضر": return <Badge className="bg-green-100 text-green-800">حاضر</Badge>;
      case "غائب": return <Badge className="bg-red-100 text-red-800">غائب</Badge>;
      case "إجازة": return <Badge className="bg-blue-100 text-blue-800">إجازة</Badge>;
      case "مغادر": return <Badge className="bg-yellow-100 text-yellow-800">مغادر</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const report = employeeReportData?.report;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                تقارير الحضور والانصراف
              </CardTitle>
              <CardDescription>
                تقرير شامل لحضور وانصراف الموظفين مع ساعات العمل والإضافي
              </CardDescription>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="الفترة" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">هذا الأسبوع</SelectItem>
                  <SelectItem value="month">هذا الشهر</SelectItem>
                  <SelectItem value="custom">فترة مخصصة</SelectItem>
                </SelectContent>
              </Select>

              {selectedPeriod === "custom" && (
                <>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="h-4 w-4 ml-2" />
                        من: {format(startDate, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(date) => date && setStartDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <CalendarIcon className="h-4 w-4 ml-2" />
                        إلى: {format(endDate, "dd/MM/yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={(date) => date && setEndDate(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-3 text-center">
              <CheckCircle className="h-5 w-5 text-green-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {dailyStats?.data?.present || 0}
              </div>
              <div className="text-xs text-green-600">حاضرون اليوم</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3 text-center">
              <XCircle className="h-5 w-5 text-red-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                {dailyStats?.data?.absent || 0}
              </div>
              <div className="text-xs text-red-600">غائبون اليوم</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 text-center">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                {dailyStats?.data?.late || 0}
              </div>
              <div className="text-xs text-yellow-600">متأخرون اليوم</div>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-3 text-center">
              <Clock className="h-5 w-5 text-blue-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {formatHours(totals.workHours)}
              </div>
              <div className="text-xs text-blue-600">إجمالي ساعات العمل</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800 rounded-lg p-3 text-center">
              <TrendingUp className="h-5 w-5 text-purple-600 mx-auto mb-1" />
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                {formatHours(totals.overtimeHours)}
              </div>
              <div className="text-xs text-purple-600">إجمالي الإضافي</div>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="بحث بالاسم أو الوظيفة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            
            <div className="text-sm text-gray-500">
              الفترة: {format(startDate, "dd/MM/yyyy")} - {format(endDate, "dd/MM/yyyy")}
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50 dark:bg-gray-800">
                    <TableHead className="text-right min-w-[150px]">الموظف</TableHead>
                    <TableHead className="text-right min-w-[100px]">الوظيفة</TableHead>
                    <TableHead className="text-center min-w-[80px]">
                      <div className="flex flex-col items-center">
                        <CheckCircle className="h-3 w-3 text-green-600" />
                        <span>حضور</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center min-w-[80px]">
                      <div className="flex flex-col items-center">
                        <XCircle className="h-3 w-3 text-red-600" />
                        <span>غياب</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center min-w-[80px]">
                      <div className="flex flex-col items-center">
                        <AlertTriangle className="h-3 w-3 text-yellow-600" />
                        <span>تأخير</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <Clock className="h-3 w-3 text-blue-600" />
                        <span>ساعات العمل</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <TrendingUp className="h-3 w-3 text-purple-600" />
                        <span>الإضافي</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      <div className="flex flex-col items-center">
                        <Timer className="h-3 w-3 text-orange-600" />
                        <span>دقائق التأخير</span>
                      </div>
                    </TableHead>
                    <TableHead className="text-center min-w-[100px]">
                      <span>إجراءات</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        جاري التحميل...
                      </TableCell>
                    </TableRow>
                  ) : filteredData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        لا توجد بيانات للفترة المحددة
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredData.map((employee) => {
                      const presentDays = parseInt(employee.present_days as any) || 0;
                      const absentDays = parseInt(employee.absent_days as any) || 0;
                      const lateDays = parseInt(employee.late_days as any) || 0;
                      const workHours = parseFloat(employee.total_work_hours as any) || 0;
                      const overtimeHours = parseFloat(employee.total_overtime_hours as any) || 0;
                      const lateMinutes = parseInt(employee.total_late_minutes as any) || 0;

                      return (
                        <TableRow key={employee.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                          <TableCell className="font-medium">
                            {employee.display_name_ar || employee.display_name || employee.username}
                          </TableCell>
                          <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                            {employee.role_name_ar || employee.role_name || "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              {presentDays} يوم
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`${absentDays > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600'}`}>
                              {absentDays} يوم
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className={`${lateDays > 0 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-gray-50 text-gray-600'}`}>
                              {lateDays} يوم
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            {formatHours(workHours)}
                          </TableCell>
                          <TableCell className="text-center font-mono">
                            <span className={overtimeHours > 0 ? 'text-purple-600 font-semibold' : ''}>
                              {formatHours(overtimeHours)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={lateMinutes > 0 ? 'text-orange-600' : 'text-gray-400'}>
                              {formatMinutes(lateMinutes)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReport(employee)}
                              className="h-7 px-2"
                              title="عرض تقرير مفصل"
                            >
                              <Eye className="h-3 w-3 ml-1" />
                              تقرير
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="flex flex-wrap justify-between items-center gap-4 text-sm">
              <div className="flex items-center gap-4">
                <span className="font-semibold">إجمالي الفترة:</span>
                <span className="text-green-600">حضور: {totals.presentDays} يوم</span>
                <span className="text-red-600">غياب: {totals.absentDays} يوم</span>
                <span className="text-yellow-600">تأخير: {totals.lateDays} يوم</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-blue-600">ساعات العمل: {formatHours(totals.workHours)}</span>
                <span className="text-purple-600">الإضافي: {formatHours(totals.overtimeHours)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              تقرير حضور موظف مفصل
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingEmployeeReport ? (
            <div className="text-center py-8">جاري تحميل التقرير...</div>
          ) : report ? (
            <div className="space-y-4">
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handlePrintReport}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportEmployeeReport}>
                  <Download className="h-4 w-4 ml-2" />
                  تصدير Excel
                </Button>
              </div>

              <div ref={printRef}>
                <div className="border rounded-lg p-6 bg-white">
                  <div className="header text-center mb-6">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      <Building2 className="h-8 w-8 text-primary" />
                      <h1 className="text-2xl font-bold">{report.factoryInfo.name}</h1>
                    </div>
                    <p className="text-gray-600">{report.factoryInfo.address}</p>
                    <p className="text-gray-500 text-sm">{report.factoryInfo.phone} | {report.factoryInfo.email}</p>
                  </div>

                  <Separator className="my-4" />
                  <h2 className="text-xl font-semibold text-center mb-4">تقرير حضور موظف</h2>

                  <div className="grid grid-cols-2 gap-6 mb-6">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <User className="h-5 w-5 text-primary" />
                        <span className="font-semibold">بيانات الموظف</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><strong>الاسم:</strong> {report.employee.name}</p>
                        <p><strong>رقم الموظف:</strong> {report.employee.employeeNumber}</p>
                        <p><strong>القسم:</strong> {report.employee.department}</p>
                        <p><strong>المنصب:</strong> {report.employee.position}</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                        <span className="font-semibold">الفترة الزمنية</span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><strong>من:</strong> {report.period.startDate}</p>
                        <p><strong>إلى:</strong> {report.period.endDate}</p>
                        <p><strong>إجمالي الأيام:</strong> {report.period.totalDays}</p>
                      </div>
                    </div>
                  </div>

                  <div className="summary grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="summary-item p-3 bg-green-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-green-600">{report.summary.presentDays}</p>
                      <p className="text-sm text-gray-600">أيام الحضور</p>
                    </div>
                    <div className="summary-item p-3 bg-red-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-red-600">{report.summary.absentDays}</p>
                      <p className="text-sm text-gray-600">أيام الغياب</p>
                    </div>
                    <div className="summary-item p-3 bg-blue-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-blue-600">{report.summary.leaveDays}</p>
                      <p className="text-sm text-gray-600">أيام الإجازة</p>
                    </div>
                    <div className="summary-item p-3 bg-purple-50 rounded-lg text-center">
                      <p className="text-2xl font-bold text-purple-600">{report.summary.attendanceRate}%</p>
                      <p className="text-sm text-gray-600">نسبة الحضور</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="p-3 bg-gray-100 rounded-lg text-center">
                      <p className="text-xl font-bold">{report.summary.totalWorkHours}</p>
                      <p className="text-sm text-gray-600">إجمالي ساعات العمل</p>
                    </div>
                    <div className="p-3 bg-orange-50 rounded-lg text-center">
                      <p className="text-xl font-bold text-orange-600">{report.summary.totalOvertimeHours}</p>
                      <p className="text-sm text-gray-600">ساعات إضافية</p>
                    </div>
                  </div>

                  <h3 className="font-semibold mb-3">تفاصيل الحضور</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-100">
                          <TableHead className="text-right">التاريخ</TableHead>
                          <TableHead className="text-right">اليوم</TableHead>
                          <TableHead className="text-center">الحالة</TableHead>
                          <TableHead className="text-center">الحضور</TableHead>
                          <TableHead className="text-center">الانصراف</TableHead>
                          <TableHead className="text-center">ساعات العمل</TableHead>
                          <TableHead className="text-center">إضافي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.records.map((record, idx) => (
                          <TableRow key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                            <TableCell className="font-mono">{record.date}</TableCell>
                            <TableCell>{record.dayName}</TableCell>
                            <TableCell className="text-center">{getStatusBadge(record.status)}</TableCell>
                            <TableCell className="text-center font-mono">{record.checkIn || "-"}</TableCell>
                            <TableCell className="text-center font-mono">{record.checkOut || "-"}</TableCell>
                            <TableCell className="text-center">{record.workHours ?? "-"}</TableCell>
                            <TableCell className="text-center">{record.overtimeHours ?? "-"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="mt-4 text-center text-xs text-gray-400">
                    <p>تم إنشاء التقرير بتاريخ: {new Date(report.generatedAt).toLocaleString("ar-SA")}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">لا توجد بيانات للعرض</div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
