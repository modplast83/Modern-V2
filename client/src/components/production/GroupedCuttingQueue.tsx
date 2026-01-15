import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "../ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import {
  QrCode,
  Scissors,
  ChevronDown,
  ChevronUp,
  Clock,
  Package,
  Printer,
} from "lucide-react";
import { formatWeight } from "../../lib/formatNumber";
import { Progress } from "../ui/progress";
import { useToast } from "../../hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { printRollLabel } from "./RollLabelPrint";
import { safeParseFloat, formatNumberAr } from "../../../../shared/number-utils";

const cutFormSchema = z.object({
  cut_weight_kg: z.coerce
    .number()
    .positive("الوزن الصافي يجب أن يكون أكبر من صفر"),
  pieces_count: z.coerce
    .number()
    .positive("عدد القطع يجب أن يكون أكبر من صفر")
    .optional(),
  cutting_machine_id: z.string().min(1, "يجب اختيار ماكينة القطع"),
});

type CutFormData = z.infer<typeof cutFormSchema>;

interface GroupedCuttingQueueProps {
  items: any[];
}

export default function GroupedCuttingQueue({
  items,
}: GroupedCuttingQueueProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedOrders, setExpandedOrders] = useState<Record<number, boolean>>(
    {},
  );
  const [expandedProductionOrders, setExpandedProductionOrders] = useState<
    Record<number, boolean>
  >({});
  const [selectedRoll, setSelectedRoll] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch machines and sections
  const { data: machines = [] } = useQuery<any[]>({
    queryKey: ["/api/machines"],
    staleTime: 5 * 60 * 1000,
  });

  const { data: sections = [] } = useQuery<any[]>({
    queryKey: ["/api/sections"],
    staleTime: 10 * 60 * 1000,
  });

  // Find cutting section
  const cuttingSection = sections.find(
    s => s.name_ar?.includes("تقطيع") || s.name?.toLowerCase().includes("cutting")
  );
  
  const cuttingMachines = machines.filter(m => 
    m.status === "active" && 
    (m.type === "cutting" || m.section_id === cuttingSection?.id)
  );

  const form = useForm<CutFormData>({
    resolver: zodResolver(cutFormSchema),
    defaultValues: {
      cut_weight_kg: 0,
      pieces_count: 1,
      cutting_machine_id: "",
    },
  });

  const cutMutation = useMutation({
    mutationFn: async (data: {
      roll_id: number;
      cut_weight_kg: number;
      pieces_count?: number;
      cutting_machine_id: string;
    }) => {
      const response = await fetch("/api/cuts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في تسجيل التقطيع");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "تم بنجاح",
        description: "تم تسجيل التقطيع وحساب الهدر",
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/production/grouped-cutting-queue"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/production/cutting-queue"],
      });
      queryClient.invalidateQueries({ queryKey: ["/api/rolls"] });
      setDialogOpen(false);
      setSelectedRoll(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "خطأ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCutSubmit = (data: CutFormData) => {
    if (!selectedRoll) return;

    cutMutation.mutate({
      roll_id: selectedRoll.id,
      cut_weight_kg: data.cut_weight_kg,
      pieces_count: data.pieces_count,
      cutting_machine_id: data.cutting_machine_id,
    });
  };

  const openCutDialog = (roll: any) => {
    setSelectedRoll(roll);
    form.setValue("cut_weight_kg", safeParseFloat(roll.weight_kg, 0));
    setDialogOpen(true);
  };

  const toggleOrderExpansion = (orderId: number) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const toggleProductionOrderExpansion = (productionOrderId: number) => {
    setExpandedProductionOrders((prev) => ({
      ...prev,
      [productionOrderId]: !prev[productionOrderId],
    }));
  };

  const calculateWaste = (rollWeight: number, cutWeight: number) => {
    return rollWeight - cutWeight;
  };

  // Helper function to calculate completion percentage for cutting stage
  const calculateOrderProgress = (order: any) => {
    if (!order.production_orders || order.production_orders.length === 0)
      return 0;

    let totalRolls = 0;
    let cutRolls = 0;

    order.production_orders.forEach((po: any) => {
      if (po.rolls && po.rolls.length > 0) {
        totalRolls += po.rolls.length;
        // In cutting queue, all rolls are ready for cutting but not yet cut
        // cutRolls += po.rolls.filter((roll: any) => roll.cut_weight_total_kg > 0).length;
      }
    });

    return totalRolls > 0 ? Math.round((cutRolls / totalRolls) * 100) : 0;
  };

  const calculateProductionOrderProgress = (productionOrder: any) => {
    if (!productionOrder.rolls || productionOrder.rolls.length === 0) return 0;

    const totalRolls = productionOrder.rolls.length;
    // const cutRolls = productionOrder.rolls.filter((roll: any) => roll.cut_weight_total_kg > 0).length;
    const cutRolls = 0; // All rolls in cutting queue are pending cutting

    return Math.round((cutRolls / totalRolls) * 100);
  };

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-gray-500">
            <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>لا توجد رولات جاهزة للتقطيع</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((order) => (
        <Card key={order.id} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <CardTitle className="text-lg">
                    طلب رقم: {order.order_number}
                  </CardTitle>
                  <p className="text-base font-bold text-blue-700">
                    العميل:{" "}
                    {order.customer_name_ar ||
                      order.customer_name ||
                      "غير محدد"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-muted-foreground">
                  <div className="w-20">
                    <Progress
                      value={calculateOrderProgress(order)}
                      className="h-2"
                    />
                    <span className="text-xs">
                      {calculateOrderProgress(order)}%
                    </span>
                  </div>
                </div>
                <Badge variant="outline">
                  {order.production_orders?.reduce(
                    (total: number, po: any) => total + (po.rolls?.length || 0),
                    0,
                  ) || 0}{" "}
                  رول
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleOrderExpansion(order.id)}
                  data-testid={`button-expand-order-${order.id}`}
                >
                  {expandedOrders[order.id] ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>

          <Collapsible open={expandedOrders[order.id]}>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  {order.production_orders?.map((productionOrder: any) => (
                    <Card
                      key={productionOrder.id}
                      className="bg-gray-50 border-l-2 border-l-green-400"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-base">
                              {productionOrder.production_order_number}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {productionOrder.item_name_ar ||
                                productionOrder.item_name ||
                                "غير محدد"}
                            </p>
                            <div className="grid grid-cols-3 gap-x-4 gap-y-1 mt-2 text-xs">
                              {productionOrder.size_caption && (
                                <div>
                                  <span className="font-medium">المقاس: </span>
                                  <span className="text-muted-foreground">
                                    {productionOrder.size_caption}
                                  </span>
                                </div>
                              )}
                              {productionOrder.thickness && (
                                <div>
                                  <span className="font-medium">السماكة: </span>
                                  <span className="text-muted-foreground">
                                    {productionOrder.thickness}
                                  </span>
                                </div>
                              )}
                              {productionOrder.raw_material && (
                                <div>
                                  <span className="font-medium">الخامة: </span>
                                  <span className="text-muted-foreground">
                                    {productionOrder.raw_material}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-muted-foreground">
                              <div className="w-16">
                                <Progress
                                  value={calculateProductionOrderProgress(
                                    productionOrder,
                                  )}
                                  className="h-2"
                                />
                                <span className="text-xs">
                                  {calculateProductionOrderProgress(
                                    productionOrder,
                                  )}
                                  %
                                </span>
                              </div>
                            </div>
                            <Badge variant="secondary">
                              {productionOrder.rolls?.length || 0} رول
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                toggleProductionOrderExpansion(
                                  productionOrder.id,
                                )
                              }
                              data-testid={`button-expand-production-${productionOrder.id}`}
                            >
                              {expandedProductionOrders[productionOrder.id] ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>

                      <Collapsible
                        open={expandedProductionOrders[productionOrder.id]}
                      >
                        <CollapsibleContent>
                          <CardContent className="pt-0">
                            <div className="mt-4 ml-6 space-y-2">
                              <h5 className="text-sm font-medium text-gray-700 mb-2">
                                الرولات ({productionOrder.rolls?.length || 0})
                              </h5>
                              {!productionOrder.rolls || productionOrder.rolls.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  لا توجد رولات بعد
                                </p>
                              ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {productionOrder.rolls.map((roll: any) => (
                                    <div
                                      key={roll.id}
                                      className="border rounded p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                      data-testid={`roll-item-${roll.id}`}
                                    >
                                      <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                          <div className="flex-1">
                                            <p className="font-medium text-sm">
                                              {roll.roll_number}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                              الوزن: {formatWeight(safeParseFloat(roll.weight_kg, 0))}
                                            </p>
                                            {roll.cut_weight_total_kg > 0 && (
                                              <div className="text-xs space-y-1 mt-1">
                                                <p className="text-green-600">
                                                  الوزن الصافي: {formatWeight(safeParseFloat(roll.cut_weight_total_kg, 0))}
                                                </p>
                                                <p className="text-red-600">
                                                  الهدر: {formatWeight(safeParseFloat(roll.waste_kg, 0))}
                                                </p>
                                              </div>
                                            )}
                                          </div>
                                          <Button
                                            onClick={() => openCutDialog(roll)}
                                            disabled={cutMutation.isPending}
                                            size="sm"
                                            variant="default"
                                            data-testid={`button-cut-${roll.id}`}
                                          >
                                            <Scissors className="h-3 w-3" />
                                          </Button>
                                        </div>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full text-xs"
                                          onClick={() => {
                                            printRollLabel({
                                              roll: roll,
                                              productionOrder: {
                                                production_order_number: productionOrder.production_order_number,
                                                item_name_ar: productionOrder.item_name_ar,
                                                item_name: productionOrder.item_name,
                                                size_caption: productionOrder.size_caption
                                              },
                                              order: {
                                                order_number: order.order_number,
                                                customer_name_ar: order.customer_name_ar,
                                                customer_name: order.customer_name
                                              }
                                            });
                                          }}
                                          data-testid={`button-print-label-${roll.id}`}
                                        >
                                          <Printer className="h-3 w-3 mr-1" />
                                          طباعة ملصق
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </CollapsibleContent>
                      </Collapsible>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      ))}

      {/* Dialog for cutting input */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>تقطيع الرول</DialogTitle>
            <DialogDescription>
              إدخال بيانات تقطيع الرول وتحديد الكميات المطلوبة
            </DialogDescription>
          </DialogHeader>

          {selectedRoll && (
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-medium">{selectedRoll.roll_number}</p>
                <p className="text-sm text-gray-500">
                  الوزن الأصلي:{" "}
                  {formatNumberAr(safeParseFloat(selectedRoll.weight_kg, 0), 2)} كجم
                </p>
              </div>

              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleCutSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="cutting_machine_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ماكينة القطع *</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-cutting-machine">
                              <SelectValue placeholder="اختر ماكينة القطع" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cuttingMachines.length === 0 ? (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                لا توجد ماكينات قطع نشطة
                              </div>
                            ) : (
                              cuttingMachines.map((machine) => (
                                <SelectItem
                                  key={machine.id}
                                  value={machine.id}
                                  data-testid={`machine-option-${machine.id}`}
                                >
                                  {machine.name}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="cut_weight_kg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الوزن الصافي المقطع (كجم)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="أدخل الوزن الصافي"
                            {...field}
                            data-testid="input-cut-weight"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pieces_count"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عدد القطع (اختياري)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="أدخل عدد القطع"
                            {...field}
                            data-testid="input-pieces-count"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {form.watch("cut_weight_kg") > 0 && selectedRoll && (
                    <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                      <p className="text-sm">
                        <span className="font-medium">الهدر المحسوب: </span>
                        <span
                          className={
                            calculateWaste(
                              safeParseFloat(selectedRoll.weight_kg, 0),
                              form.watch("cut_weight_kg"),
                            ) > 0
                              ? "text-red-600"
                              : "text-green-600"
                          }
                        >
                          {formatNumberAr(calculateWaste(
                            safeParseFloat(selectedRoll.weight_kg, 0),
                            form.watch("cut_weight_kg"),
                          ), 2)}{" "}
                          كجم
                        </span>
                      </p>
                    </div>
                  )}

                  <div className="flex justify-end space-x-2 space-x-reverse">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                      data-testid="button-cancel-cut"
                    >
                      إلغاء
                    </Button>
                    <Button
                      type="submit"
                      disabled={cutMutation.isPending}
                      data-testid="button-confirm-cut"
                    >
                      {cutMutation.isPending
                        ? "جاري التقطيع..."
                        : "تأكيد التقطيع"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
