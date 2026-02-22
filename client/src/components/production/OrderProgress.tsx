import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Badge } from "../ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Package, Scissors, Archive, Plus, QrCode, Play } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

interface ProductionOrder {
  id: number;
  production_order: any; // Add proper type based on your schema
}

interface ProgressData {
  production_order: any;
  progress: {
    printing?: { completed: number; total: number };
    lamination?: { completed: number; total: number };
    cutting?: { completed: number; total: number };
    packaging?: { completed: number; total: number };
    film_weight?: number;
    film_percentage?: number;
    printed_weight?: number;
    printed_percentage?: number;
    cut_weight?: number;
    cut_percentage?: number;
    warehouse_weight?: number;
    warehouse_percentage?: number;
  };
  rolls: any[];
  warehouse_receipts: any[];
}

interface AvailableCut {
  id: string;
  name: string;
}

export default function OrderProgress() {
  const { t } = useTranslation();
  const [selectedProductionOrderId, setSelectedProductionOrderId] = useState<
    number | null
  >(null);
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [receiptData, setReceiptData] = useState({
    production_order_id: 0,
    cut_id: "",
    received_weight_kg: "",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all production orders
  const { data: productionOrders = [] } = useQuery<ProductionOrder[]>({
    queryKey: ["/api/production-orders"],
    refetchInterval: false, // Disabled polling - use manual refresh
    staleTime: 5 * 60 * 1000, // 5 minutes stale time
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });

  // Fetch progress for selected production order
  const { data: progress, isLoading: progressLoading } = useQuery<ProgressData>(
    {
      queryKey: ["/api/production/order-progress", selectedProductionOrderId],
      enabled: !!selectedProductionOrderId,
      refetchInterval: false, // Disabled polling - use manual refresh
      staleTime: 3 * 60 * 1000, // 3 minutes stale time
      gcTime: 5 * 60 * 1000, // 5 minutes garbage collection
      refetchOnWindowFocus: false, // Prevent unnecessary refetches
    },
  );

  // Fetch available cuts for warehouse receipt
  const { data: availableCuts = [] } = useQuery<AvailableCut[]>({
    queryKey: ["/api/cuts/available"],
    enabled: warehouseDialogOpen,
  });

  const warehouseReceiptMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/warehouse/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('production.orderProgress.receiptFailed'));
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: t('production.orderProgress.receiptSuccess'),
        description: t('production.orderProgress.receiptRegistered'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/warehouse/receipts"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/production/order-progress"],
      });
      setWarehouseDialogOpen(false);
      setReceiptData({
        production_order_id: 0,
        cut_id: "",
        received_weight_kg: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWarehouseReceipt = () => {
    if (!receiptData.production_order_id || !receiptData.received_weight_kg) {
      toast({
        title: t('common.error'),
        description: t('production.orderProgress.fillRequiredFields'),
        variant: "destructive",
      });
      return;
    }

    warehouseReceiptMutation.mutate({
      production_order_id: receiptData.production_order_id,
      cut_id: receiptData.cut_id ? parseInt(receiptData.cut_id) : null,
      received_weight_kg: parseFloat(receiptData.received_weight_kg),
    });
  };

  return (
    <div className="space-y-6">
      {/* Job Order Selection */}
      <Card>
        <CardHeader>
          <CardTitle>{t('production.orderProgress.selectProductionOrder')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedProductionOrderId?.toString() ?? ""}
            onValueChange={(value) =>
              setSelectedProductionOrderId(parseInt(value))
            }
          >
            <SelectTrigger data-testid="select-job-order">
              <SelectValue placeholder={t('production.orderProgress.selectOrderPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {productionOrders
                .filter((order: any) => order.status === "in_production")
                .map((order: any) => (
                  <SelectItem key={order.id} value={order.id.toString()}>
                    {order.production_order_number} - {order.quantity_required}{" "}
                    {t('production.units.kg')}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Progress Display */}
      {selectedProductionOrderId && progress && (
        <div className="space-y-4">
          {/* Progress Summary */}
          <Card>
            <CardHeader>
              <CardTitle>
                {t('production.orderProgress.orderProgress')} -{" "}
                {progress.production_order?.production_order_number}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Package className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                  <p className="text-sm text-gray-600">{t('production.stages.film')}</p>
                  <p className="font-bold text-lg">
                    {progress.progress?.film_weight?.toFixed(2) || 0} {t('production.units.kg')}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(progress.progress?.film_percentage || 0, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="text-center">
                  <Play className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-gray-600">{t('production.stages.printing')}</p>
                  <p className="font-bold text-lg">
                    {progress.progress?.printed_weight?.toFixed(2) || 0} {t('production.units.kg')}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(progress.progress?.printed_percentage || 0, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="text-center">
                  <Scissors className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <p className="text-sm text-gray-600">{t('production.stages.cutting')}</p>
                  <p className="font-bold text-lg">
                    {progress.progress?.cut_weight?.toFixed(2) || 0} {t('production.units.kg')}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(progress.progress?.cut_percentage || 0, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="text-center">
                  <Archive className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                  <p className="text-sm text-gray-600">{t('production.stages.warehouse')}</p>
                  <p className="font-bold text-lg">
                    {progress.progress?.warehouse_weight?.toFixed(2) || 0} {t('production.units.kg')}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(progress.progress?.warehouse_percentage || 0, 100)}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rolls Details */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('production.orderProgress.rolls')}</CardTitle>
                <Dialog
                  open={warehouseDialogOpen}
                  onOpenChange={setWarehouseDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      onClick={() =>
                        setReceiptData({
                          ...receiptData,
                          production_order_id: selectedProductionOrderId,
                        })
                      }
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t('production.orderProgress.warehouseReceipt')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{t('production.orderProgress.registerWarehouseReceipt')}</DialogTitle>
                      <DialogDescription>
                        {t('production.orderProgress.registerReceiptDescription')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('production.orderProgress.receivedWeightLabel')}</Label>
                        <Input
                          type="number"
                          step="0.1"
                          value={receiptData.received_weight_kg}
                          onChange={(e) =>
                            setReceiptData({
                              ...receiptData,
                              received_weight_kg: e.target.value,
                            })
                          }
                          placeholder="45.2"
                          className="text-right"
                          data-testid="input-received-weight"
                        />
                      </div>

                      <div className="flex justify-end space-x-3 space-x-reverse pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setWarehouseDialogOpen(false)}
                          disabled={warehouseReceiptMutation.isPending}
                        >
                          {t('common.cancel')}
                        </Button>
                        <Button
                          onClick={handleWarehouseReceipt}
                          disabled={warehouseReceiptMutation.isPending}
                          data-testid="button-confirm-receipt"
                        >
                          {warehouseReceiptMutation.isPending
                            ? t('production.orderProgress.registering')
                            : t('production.orderProgress.registerReceipt')}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {progress.rolls?.map((roll: any) => (
                  <div
                    key={roll.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3 space-x-reverse">
                      <QrCode className="h-5 w-5 text-gray-400" />
                      <div>
                        <p
                          className="font-medium"
                          data-testid={`text-roll-${roll.id}`}
                        >
                          {roll.roll_number}
                        </p>
                        <p className="text-sm text-gray-500">
                          {roll.weight_kg?.toFixed(2)} {t('production.units.kg')} - {roll.machine_id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 space-x-reverse">
                      <Badge
                        variant={
                          roll.stage === "film"
                            ? "secondary"
                            : roll.stage === "printing"
                              ? "default"
                              : "outline"
                        }
                      >
                        {roll.stage === "film"
                          ? t('production.stages.film')
                          : roll.stage === "printing"
                            ? t('production.stageLabels.printed')
                            : t('production.stageLabels.cut')}
                      </Badge>

                      {roll.printed_at && (
                        <span className="text-xs text-gray-400">
                          {t('production.orderProgress.printedAt')}:{" "}
                          {new Date(roll.printed_at).toLocaleDateString("ar")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Warehouse Receipts */}
          {progress.warehouse_receipts?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t('production.orderProgress.warehouseReceipts')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {progress.warehouse_receipts.map((receipt: any) => (
                    <div
                      key={receipt.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{t('production.orderProgress.receipt')} #{receipt.id}</p>
                        <p className="text-sm text-gray-500">
                          {receipt.received_weight_kg?.toFixed(2)} {t('production.units.kg')}
                        </p>
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(receipt.created_at).toLocaleDateString("ar")}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {progressLoading && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">{t('production.orderProgress.loadingProgress')}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
