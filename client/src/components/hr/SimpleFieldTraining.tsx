import { useState } from "react";
import { Card, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { Shield, Users, Star } from "lucide-react";

export default function SimpleFieldTraining() {
  const [selectedView, setSelectedView] = useState<
    "programs" | "enrollments" | "evaluations"
  >("programs");

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            نظام التدريب الميداني
          </h2>
          <p className="text-gray-600 dark:text-gray-300">
            إدارة التدريبات العملية والميدانية مع التقييم وإصدار الشهادات
          </p>
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={selectedView === "programs" ? "default" : "ghost"}
          onClick={() => setSelectedView("programs")}
          className="rounded-b-none"
          data-testid="tab-programs"
        >
          <Shield className="w-4 h-4 ml-2" />
          برامج التدريب
        </Button>
        <Button
          variant={selectedView === "enrollments" ? "default" : "ghost"}
          onClick={() => setSelectedView("enrollments")}
          className="rounded-b-none"
          data-testid="tab-enrollments"
        >
          <Users className="w-4 h-4 ml-2" />
          التسجيلات
        </Button>
        <Button
          variant={selectedView === "evaluations" ? "default" : "ghost"}
          onClick={() => setSelectedView("evaluations")}
          className="rounded-b-none"
          data-testid="tab-evaluations"
        >
          <Star className="w-4 h-4 ml-2" />
          التقييمات
        </Button>
      </div>

      {/* Content based on selected view */}
      {selectedView === "programs" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Shield className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              نظام التدريب الميداني
            </h3>
            <p className="text-gray-500 text-center">
              تم تحويل النظام من التدريب الإلكتروني إلى التدريب الميداني بنجاح
            </p>
          </CardContent>
        </Card>
      )}

      {selectedView === "enrollments" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Users className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              إدارة التسجيلات
            </h3>
            <p className="text-gray-500 text-center">
              تسجيل الموظفين في برامج التدريب الميداني
            </p>
          </CardContent>
        </Card>
      )}

      {selectedView === "evaluations" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <Star className="w-16 h-16 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">
              نظام التقييم
            </h3>
            <p className="text-gray-500 text-center">
              تقييم التدريب مع معايير الفهم النظري والمهارات العملية والسلامة
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
