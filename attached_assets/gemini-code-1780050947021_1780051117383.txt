// نقوم بالتعديل داخل ملف client/src/pages/ProductionDashboard.tsx
// أضف هذا الفحص المرن في بداية المكون:

const userRole = user?.role_id; // 1 = Admin, 2 = Production Manager
const userSectionId = user?.section_id;

// إذا كان المستخدم مشغلاً (وليس مديراً أو مشرفاً) ويمتلك معرف ماكينة
const isLineOperator = userRole !== 1 && userRole !== 2; 

if (isLineOperator && userSectionId) {
  // نقوم فوراً بتحويله لـ Focus Mode المخصص لماكينته دون عرض جداول أو طوابير
  const fallbackMachineId = `M00${userSectionId}`; // أو ربطها بالماكينة الحالية المخصصة له
  return <OperatorFocusView machineId={fallbackMachineId} />;
}