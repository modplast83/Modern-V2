import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { GraduationCap, Target, Calendar, Clock, FileText, FileEdit } from "lucide-react";
import SimpleFieldTraining from "./SimpleFieldTraining.tsx";
import PerformanceReviews from "./PerformanceReviews.tsx";
import LeaveManagement from "./LeaveManagement.tsx";
import AttendanceManagement from "./AttendanceManagement.tsx";
import AttendanceReports from "./AttendanceReports.tsx";
import MonthlyAttendanceEditor from "./MonthlyAttendanceEditor.tsx";

export default function HRTabs() {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          نظام الموارد البشرية المتقدم
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mt-2">
          إدارة شاملة للحضور والتدريب وتقييم الأداء والإجازات
        </p>
      </div>

      <Tabs defaultValue="attendance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 gap-1 bg-gray-100 dark:bg-gray-800 h-auto p-1">
          <TabsTrigger
            value="attendance"
            className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            <Clock className="w-4 h-4" />
            <span className="hidden sm:inline">إدارة الحضور</span>
            <span className="sm:hidden">الحضور</span>
          </TabsTrigger>
          <TabsTrigger
            value="monthly-editor"
            className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            <FileEdit className="w-4 h-4" />
            <span className="hidden sm:inline">الحضور الشهري</span>
            <span className="sm:hidden">شهري</span>
          </TabsTrigger>
          <TabsTrigger
            value="reports"
            className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">تقارير الحضور</span>
            <span className="sm:hidden">التقارير</span>
          </TabsTrigger>
          <TabsTrigger
            value="training"
            className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">التدريب الميداني</span>
            <span className="sm:hidden">التدريب</span>
          </TabsTrigger>
          <TabsTrigger
            value="performance"
            className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">تقييم الأداء</span>
            <span className="sm:hidden">الأداء</span>
          </TabsTrigger>
          <TabsTrigger
            value="leaves"
            className="flex items-center justify-center gap-1 md:gap-2 text-xs md:text-sm py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700"
          >
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">إدارة الطلبات</span>
            <span className="sm:hidden">الطلبات</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <AttendanceManagement />
        </TabsContent>

        <TabsContent value="monthly-editor" className="space-y-4">
          <MonthlyAttendanceEditor />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <AttendanceReports />
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <SimpleFieldTraining />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceReviews />
        </TabsContent>

        <TabsContent value="leaves" className="space-y-4">
          <LeaveManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
}
