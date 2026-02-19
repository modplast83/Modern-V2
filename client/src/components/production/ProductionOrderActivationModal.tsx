import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";

interface ProductionOrderActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (machineId?: string, operatorId?: number) => void;
  order: any;
  machines: any[];
  operators: any[];
  isUpdating?: boolean;
}

export default function ProductionOrderActivationModal({
  isOpen,
  onClose,
  onConfirm,
  order,
  machines,
  operators,
  isUpdating = false,
}: ProductionOrderActivationModalProps) {
  const [selectedMachineId, setSelectedMachineId] = useState<string>("");
  const [selectedOperatorId, setSelectedOperatorId] = useState<string>("");

  const handleConfirm = () => {
    const machineId = selectedMachineId || undefined;
    const operatorId = selectedOperatorId ? parseInt(selectedOperatorId) : undefined;
    onConfirm(machineId, operatorId);
  };

  // فلتر المكائن النشطة فقط
  const activeMachines = machines.filter(m => m.status === "active");

  // فلتر العمال حسب الأقسام المناسبة
  const productionOperators = operators.filter(u => {
    // يمكنك تعديل هذا الفلتر حسب هيكل البيانات
    return u.section_id && ['production', 'factory'].includes(u.section_id);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isUpdating ? "تحديث تخصيص أمر الإنتاج" : "تفعيل أمر الإنتاج"}
          </DialogTitle>
          <DialogDescription className="sr-only">تخصيص الماكينة والعامل لأمر الإنتاج</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {order && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600">رقم أمر الإنتاج:</span>
                  <span className="font-medium">{order.production_order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">العميل:</span>
                  <span className="font-medium">
                    {order.customer_name_ar || order.customer_name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">المنتج:</span>
                  <span className="font-medium">{order.size_caption}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">الكمية:</span>
                  <span className="font-medium">{order.quantity_kg} كجم</span>
                </div>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="machine">الماكينة (اختياري)</Label>
            <Select value={selectedMachineId} onValueChange={setSelectedMachineId}>
              <SelectTrigger id="machine" data-testid="select-machine">
                <SelectValue placeholder="اختر الماكينة..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" data-testid="option-no-machine">
                  بدون تخصيص
                </SelectItem>
                {activeMachines.map((machine) => (
                  <SelectItem
                    key={machine.id}
                    value={machine.id}
                    data-testid={`option-machine-${machine.id}`}
                  >
                    <div className="flex items-center gap-2">
                      {machine.name_ar || machine.name}
                      {machine.type && (
                        <Badge variant="outline" className="text-xs">
                          {machine.type}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMachineId && selectedMachineId !== "none" && (
              <p className="text-sm text-green-600 mt-1">
                سيتم تخصيص الماكينة لهذا الأمر
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="operator">العامل المسؤول (اختياري)</Label>
            <Select value={selectedOperatorId} onValueChange={setSelectedOperatorId}>
              <SelectTrigger id="operator" data-testid="select-operator">
                <SelectValue placeholder="اختر العامل..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" data-testid="option-no-operator">
                  بدون تخصيص
                </SelectItem>
                {productionOperators.map((operator) => (
                  <SelectItem
                    key={operator.id}
                    value={operator.id.toString()}
                    data-testid={`option-operator-${operator.id}`}
                  >
                    {operator.display_name_ar || operator.display_name || operator.username}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOperatorId && selectedOperatorId !== "none" && (
              <p className="text-sm text-green-600 mt-1">
                سيتم تخصيص العامل لهذا الأمر
              </p>
            )}
          </div>

          {!isUpdating && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                <strong>ملاحظة:</strong> سيتم تفعيل أمر الإنتاج وتغيير حالته إلى "نشط".
                يمكنك تخصيص الماكينة والعامل الآن أو لاحقاً.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={handleConfirm} data-testid="button-confirm-activation">
            {isUpdating ? "تحديث التخصيص" : "تفعيل الأمر"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}