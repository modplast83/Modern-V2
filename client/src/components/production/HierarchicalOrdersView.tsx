import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Progress } from "../ui/progress";
import { Input } from "../ui/input";
import { ChevronDown, ChevronRight, Plus, Search, Printer } from "lucide-react";
import { formatNumber, formatWeight } from "../../lib/formatNumber";
import { printRollLabel } from "./RollLabelPrint";

interface MasterBatchColor {
  id: number;
  code: string;
  name_ar: string;
  name_en: string;
  hex_color: string;
  aliases?: string;
}

const ColorBadge = ({ color, code, nameAr }: { color: string; code: string; nameAr: string }) => {
  const displayColor = !color || color === "transparent" ? "#E0E0E0" : color;
  
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-4 h-4 rounded-sm border border-gray-300 flex-shrink-0"
        style={{ backgroundColor: displayColor }}
      />
      <span className="text-muted-foreground">
        {nameAr}
      </span>
    </span>
  );
};

interface HierarchicalOrdersViewProps {
  stage: string;
  onCreateRoll: (productionOrderId?: number) => void;
}

const formatPercentage = (value: number): string => {
  return `${value}%`;
};

export default function HierarchicalOrdersView({
  stage,
  onCreateRoll,
}: HierarchicalOrdersViewProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
  const [expandedProductionOrders, setExpandedProductionOrders] = useState<
    Set<number>
  >(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  const { data: ordersData = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/production/hierarchical-orders"],
    refetchInterval: 90000,
    staleTime: 60000,
    gcTime: 2 * 60 * 1000,
  });

  const { data: masterBatchColors = [] } = useQuery<MasterBatchColor[]>({
    queryKey: ["/api/master-batch-colors"],
    queryFn: async () => {
      const response = await fetch("/api/master-batch-colors");
      if (!response.ok) return [];
      const result = await response.json();
      return result.data || result || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const findColorByCode = useMemo(() => (code: string): MasterBatchColor | undefined => {
    if (!code) return undefined;
    const normalizedCode = code.toUpperCase().trim();
    return masterBatchColors.find((c) => {
      if (c.code.toUpperCase() === normalizedCode) return true;
      if (c.aliases) {
        const aliasArr = c.aliases.split(",").map((a) => a.trim().toUpperCase());
        return aliasArr.includes(normalizedCode);
      }
      return false;
    });
  }, [masterBatchColors]);

  const getMasterBatchDisplay = (masterBatchId: string) => {
    if (!masterBatchId) return null;
    const colorData = findColorByCode(masterBatchId);
    if (colorData) {
      return <ColorBadge color={colorData.hex_color} code={colorData.code} nameAr={colorData.name_ar} />;
    }
    return <span className="text-muted-foreground">{masterBatchId}</span>;
  };

  // تنظيف الاستعلامات عند إلغاء تحميل المكون
  useEffect(() => {
    return () => {
      // Cancel all queries for this component when unmounting
      queryClient.cancelQueries({
        queryKey: ["/api/production/hierarchical-orders"],
      });
    };
  }, [queryClient]);

  const toggleOrderExpansion = (orderId: number) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const toggleProductionOrderExpansion = (productionOrderId: number) => {
    const newExpanded = new Set(expandedProductionOrders);
    if (newExpanded.has(productionOrderId)) {
      newExpanded.delete(productionOrderId);
    } else {
      newExpanded.add(productionOrderId);
    }
    setExpandedProductionOrders(newExpanded);
  };

  // Filter based on search term and stage requirements
  const filteredOrders = ordersData.filter((order) => {
    // For film stage, show only orders with "for_production" status
    if (stage === "film" && order.status !== "for_production") {
      return false;
    }

    // Apply search filter if search term is provided
    if (!searchTerm) return true;

    const searchLower = searchTerm.toLowerCase();

    // Search in order number and customer name
    const orderMatch =
      order.order_number?.toLowerCase().includes(searchLower) ||
      order.customer_name?.toLowerCase().includes(searchLower) ||
      order.customer_name_ar?.toLowerCase().includes(searchLower);

    // Search in production orders
    const productionOrderMatch = order.production_orders?.some(
      (productionOrder: any) =>
        productionOrder.production_order_number
          ?.toLowerCase()
          .includes(searchLower) ||
        productionOrder.item_name?.toLowerCase().includes(searchLower) ||
        productionOrder.item_name_ar?.toLowerCase().includes(searchLower),
    );

    // Search in rolls
    const rollMatch = order.production_orders?.some((productionOrder: any) =>
      productionOrder.rolls?.some((roll: any) =>
        roll.roll_number?.toLowerCase().includes(searchLower),
      ),
    );

    return orderMatch || productionOrderMatch || rollMatch;
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded"></div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder={t('production.searchOrdersPlaceholder')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="input-search-orders"
        />
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">
            {searchTerm
              ? t('production.noSearchResults')
              : t('production.noOrdersInProduction')}
          </p>
        </div>
      ) : (
        filteredOrders.map((order) => (
          <Card key={order.id} className="border-l-4 border-l-blue-500">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleOrderExpansion(order.id)}
                    data-testid={`button-expand-order-${order.id}`}
                  >
                    {expandedOrders.has(order.id) ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  <div>
                    <CardTitle className="text-lg">
                      {order.order_number}
                    </CardTitle>
                    <p className="text-base font-bold text-blue-700">
                      {t('production.customer')}:{" "}
                      {order.customer_name_ar ||
                        order.customer_name ||
                        t('production.notSpecified')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    {order.production_orders?.length || 0} {t('production.productionOrders')}
                  </Badge>
                  <Badge
                    variant="secondary"
                    data-testid={`badge-order-status-${order.id}`}
                  >
                    {order.status === "for_production"
                      ? t('production.statuses.forProduction')
                      : order.status === "pending"
                        ? t('production.statuses.pending')
                        : order.status === "in_production"
                          ? t('production.statuses.inProduction')
                          : order.status === "completed"
                            ? t('production.statuses.completed')
                            : order.status === "cancelled"
                              ? t('production.statuses.cancelled')
                              : order.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>

            {expandedOrders.has(order.id) && (
              <CardContent className="pt-0">
                {order.production_orders &&
                order.production_orders.length > 0 ? (
                  <div className="space-y-3">
                    {order.production_orders.map((productionOrder: any) => {
                      const required =
                        parseFloat(productionOrder.quantity_kg) || 0;
                      const produced = productionOrder.rolls
                        ? productionOrder.rolls.reduce(
                            (sum: number, roll: any) =>
                              sum + (parseFloat(roll.weight_kg) || 0),
                            0,
                          )
                        : 0;
                      const progress =
                        required > 0
                          ? Math.round((produced / required) * 100)
                          : 0;

                      return (
                        <Card
                          key={productionOrder.id}
                          className="border border-gray-200 ml-6"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    toggleProductionOrderExpansion(
                                      productionOrder.id,
                                    )
                                  }
                                  data-testid={`button-expand-production-order-${productionOrder.id}`}
                                >
                                  {expandedProductionOrders.has(
                                    productionOrder.id,
                                  ) ? (
                                    <ChevronDown className="h-4 w-4" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" />
                                  )}
                                </Button>
                                <div>
                                  <h4 className="font-medium">
                                    {productionOrder.production_order_number}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {productionOrder.item_name_ar ||
                                      productionOrder.item_name ||
                                      t('production.notSpecified')}
                                  </p>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-xs">
                                    {productionOrder.size_caption && (
                                      <div>
                                        <span className="font-medium">
                                          {t('production.size')}:{" "}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {productionOrder.size_caption}
                                        </span>
                                      </div>
                                    )}
                                    {productionOrder.thickness && (
                                      <div>
                                        <span className="font-medium">
                                          {t('production.thickness')}:{" "}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {productionOrder.thickness}
                                        </span>
                                      </div>
                                    )}
                                    {productionOrder.raw_material && (
                                      <div>
                                        <span className="font-medium">
                                          {t('production.rawMaterial')}:{" "}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {productionOrder.raw_material}
                                        </span>
                                      </div>
                                    )}
                                    {productionOrder.master_batch_id && (
                                      <div className="flex items-center gap-1">
                                        <span className="font-medium">
                                          {t('production.masterBatchColor')}:{" "}
                                        </span>
                                        {getMasterBatchDisplay(productionOrder.master_batch_id)}
                                      </div>
                                    )}
                                    <div>
                                      <span className="font-medium">
                                        {t('production.printing.label')}:{" "}
                                      </span>
                                      <span className="text-muted-foreground">
                                        {productionOrder.is_printed
                                          ? t('common.yes')
                                          : t('common.no')}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    {t('production.quantity')}:{" "}
                                  </span>
                                  {formatWeight(produced)} /{" "}
                                  {formatWeight(required)}
                                </div>
                                <div className="w-24">
                                  <Progress value={progress} className="h-2" />
                                  <span className="text-xs text-muted-foreground">
                                    {formatPercentage(progress)}
                                  </span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    onCreateRoll(productionOrder.id)
                                  }
                                  data-testid={`button-create-roll-${productionOrder.id}`}
                                >
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {expandedProductionOrders.has(productionOrder.id) &&
                              productionOrder.rolls && (
                                <div className="mt-4 ml-6 space-y-2">
                                  <h5 className="text-sm font-medium text-gray-700 mb-2">
                                    {t('production.rolls')} ({productionOrder.rolls.length})
                                  </h5>
                                  {productionOrder.rolls.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">
                                      {t('production.noRollsYet')}
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                      {productionOrder.rolls.map(
                                        (roll: any) => (
                                          <div
                                            key={roll.id}
                                            className="border rounded p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                                            data-testid={`roll-item-${roll.id}`}
                                          >
                                            <div className="flex justify-between items-start mb-2">
                                              <div className="flex-1">
                                                <p className="font-medium text-sm">
                                                  {roll.roll_number}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {t('production.weight')}:{" "}
                                                  {formatWeight(
                                                    parseFloat(
                                                      roll.weight_kg,
                                                    ) || 0,
                                                  )}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {t('production.stage')}:{" "}
                                                  {roll.stage === "film"
                                                    ? t('production.stages.film')
                                                    : roll.stage === "printing"
                                                      ? t('production.stages.printing')
                                                      : roll.stage === "cutting"
                                                        ? t('production.stages.cutting')
                                                        : roll.stage}
                                                </p>
                                              </div>
                                              <Badge
                                                variant={
                                                  roll.stage === "done"
                                                    ? "default"
                                                    : "secondary"
                                                }
                                                className="text-xs"
                                              >
                                                {roll.stage === "done"
                                                  ? t('production.stages.done')
                                                  : roll.stage === "film"
                                                    ? t('production.stages.film')
                                                    : roll.stage === "printing"
                                                      ? t('production.stages.printing')
                                                      : roll.stage === "cutting"
                                                        ? t('production.stages.cutting')
                                                        : roll.stage}
                                              </Badge>
                                            </div>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              className="w-full text-xs"
                                              onClick={() => printRollLabel({
                                                roll: roll,
                                                productionOrder: productionOrder,
                                                order: order
                                              })}
                                              data-testid={`button-print-label-${roll.id}`}
                                            >
                                              <Printer className="h-3 w-3 mr-1" />
                                              {t('production.printLabel')}
                                            </Button>
                                          </div>
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground ml-6">
                    {t('production.noProductionOrdersForOrder')}
                  </p>
                )}
              </CardContent>
            )}
          </Card>
        ))
      )}
    </div>
  );
}
