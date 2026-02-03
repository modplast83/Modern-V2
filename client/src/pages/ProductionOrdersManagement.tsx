import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from 'react-i18next';
import { apiRequest } from "../lib/queryClient";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Progress } from "../components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { 
  Loader2, 
  Play, 
  Settings, 
  Printer,
  Search,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Factory,
  TrendingUp,
  Filter,
  RefreshCw,
  Eye,
  Calendar
} from "lucide-react";
import ProductionOrderActivationModal from "../components/production/ProductionOrderActivationModal";
import ProductionOrderStatsCard from "../components/production/ProductionOrderStatsCard";
import ProductionOrderPrintTemplate from "../components/production/ProductionOrderPrintTemplate";
import { toastMessages } from "../lib/toastMessages";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function ProductionOrdersManagement() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [showStats, setShowStats] = useState<number | null>(null);
  const [printingProductionOrder, setPrintingProductionOrder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  const { data: ordersData, isLoading: ordersLoading, refetch } = useQuery({
    queryKey: ["/api/production-orders/management"],
    queryFn: async () => {
      const response = await fetch("/api/production-orders/management");
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || t('production.ordersManagement.noProductionOrders'));
      }
      return response.json();
    },
  });

  const { data: machines = [] } = useQuery({
    queryKey: ["/api/machines"],
    queryFn: async () => {
      const response = await fetch("/api/machines");
      if (!response.ok) throw new Error("Failed to fetch machines");
      return response.json();
    },
  });

  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const result = await response.json();
      return result.data || result;
    },
  });

  const activateMutation = useMutation({
    mutationFn: async ({ id, machineId, operatorId }: any) => {
      const response = await apiRequest(`/api/production-orders/${id}/activate`, {
        method: "PATCH",
        body: JSON.stringify({ machineId, operatorId }),
      });
      return response;
    },
    onSuccess: (data, variables) => {
      const orderNumber = selectedOrder?.production_order_number || `#${variables.id}`;
      const message = toastMessages.productionOrders.activated(orderNumber);
      toast({
        title: message.title,
        description: message.description,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders/management"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-queues"] });
      setIsActivationModalOpen(false);
      setSelectedOrder(null);
    },
    onError: (error: any) => {
      toast({
        title: "خطأ",
        description: error.message || toastMessages.productionOrders.errors.activation,
        variant: "destructive",
      });
    },
  });

  const handleActivate = (order: any) => {
    setSelectedOrder(order);
    setIsActivationModalOpen(true);
  };

  const handleActivationConfirm = (machineId?: string, operatorId?: number) => {
    if (selectedOrder) {
      activateMutation.mutate({
        id: selectedOrder.id,
        machineId,
        operatorId,
      });
    }
  };

  const filteredOrders = useMemo(() => {
    const orders = ordersData?.data || [];
    return orders.filter((order: any) => {
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          order.production_order_number?.toLowerCase().includes(searchLower) ||
          order.order_number?.toLowerCase().includes(searchLower) ||
          order.customer_name?.toLowerCase().includes(searchLower) ||
          order.customer_name_ar?.toLowerCase().includes(searchLower) ||
          order.size_caption?.toLowerCase().includes(searchLower);
        
        if (!matchesSearch) return false;
      }

      return true;
    });
  }, [ordersData, statusFilter, searchTerm]);

  const stats = useMemo(() => {
    const orders = ordersData?.data || [];
    const pending = orders.filter((o: any) => o.status === "pending").length;
    const active = orders.filter((o: any) => o.status === "active" || o.status === "in_production").length;
    const completed = orders.filter((o: any) => o.status === "completed").length;
    const cancelled = orders.filter((o: any) => o.status === "cancelled").length;
    const total = orders.length;
    
    const totalQuantity = orders.reduce((sum: number, o: any) => sum + parseFloat(o.quantity_kg || 0), 0);
    const completedQuantity = orders
      .filter((o: any) => o.status === "completed")
      .reduce((sum: number, o: any) => sum + parseFloat(o.final_quantity_kg || o.quantity_kg || 0), 0);

    return { pending, active, completed, cancelled, total, totalQuantity, completedQuantity };
  }, [ordersData]);

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { icon: any; color: string; bg: string; label: string }> = {
      pending: { icon: Clock, color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950", label: "قيد الانتظار" },
      active: { icon: Play, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", label: "نشط" },
      in_production: { icon: Factory, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", label: "قيد الإنتاج" },
      completed: { icon: CheckCircle2, color: "text-gray-600", bg: "bg-gray-50 dark:bg-gray-800", label: "مكتمل" },
      cancelled: { icon: XCircle, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", label: "ملغي" },
    };
    return configs[status] || configs.pending;
  };

  const getProgressPercentage = (order: any) => {
    const quantity = parseFloat(order.quantity_kg || 0);
    const produced = parseFloat(order.produced_kg || 0);
    if (quantity === 0) return 0;
    return Math.min(100, Math.round((produced / quantity) * 100));
  };

  if (ordersLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">جاري تحميل أوامر الإنتاج...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-r-4 border-r-amber-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">قيد الانتظار</p>
                <p className="text-3xl font-bold text-amber-600">{stats.pending}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">قيد التنفيذ</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-950 flex items-center justify-center">
                <Factory className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">مكتملة</p>
                <p className="text-3xl font-bold text-blue-600">{stats.completed}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-950 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الكمية</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalQuantity.toLocaleString()} كجم</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-950 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث برقم الأمر أو العميل..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                <SelectItem value="pending">قيد الانتظار</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="in_production">قيد الإنتاج</SelectItem>
                <SelectItem value="completed">مكتمل</SelectItem>
                <SelectItem value="cancelled">ملغي</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              أوامر الإنتاج
              <Badge variant="secondary">{filteredOrders.length}</Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">رقم أمر الإنتاج</TableHead>
                  <TableHead className="font-semibold">رقم الطلب</TableHead>
                  <TableHead className="font-semibold">العميل</TableHead>
                  <TableHead className="font-semibold">المنتج</TableHead>
                  <TableHead className="font-semibold text-center">الكمية</TableHead>
                  <TableHead className="font-semibold text-center">التقدم</TableHead>
                  <TableHead className="font-semibold text-center">الحالة</TableHead>
                  <TableHead className="font-semibold">التعيين</TableHead>
                  <TableHead className="font-semibold text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Package className="h-12 w-12 opacity-50" />
                        <p>لا توجد أوامر إنتاج</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order: any) => {
                    const statusConfig = getStatusConfig(order.status);
                    const StatusIcon = statusConfig.icon;
                    const progress = getProgressPercentage(order);
                    
                    return (
                      <TableRow key={order.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-mono font-medium">
                          {order.production_order_number}
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{order.customer_name_ar || order.customer_name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="text-sm">{order.size_caption}</div>
                            {order.is_printed && (
                              <Badge variant="outline" className="text-xs">
                                مطبوع
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="space-y-1">
                            <div className="font-semibold">{order.quantity_kg} كجم</div>
                            <div className="text-xs text-muted-foreground">
                              النهائي: {order.final_quantity_kg} كجم
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="w-24 mx-auto space-y-1">
                            <Progress value={progress} className="h-2" />
                            <div className="text-xs text-muted-foreground">{progress}%</div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`${statusConfig.bg} ${statusConfig.color} border-0`}>
                            <StatusIcon className="h-3 w-3 ml-1" />
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {order.assigned_machine_id && (
                              <Badge variant="secondary" className="text-xs">
                                <Factory className="h-3 w-3 ml-1" />
                                {order.machine_name_ar || order.machine_name}
                              </Badge>
                            )}
                            {order.assigned_operator_id && (
                              <Badge variant="secondary" className="text-xs">
                                👷 {order.operator_name_ar || order.operator_name}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 justify-center">
                            {order.status === "pending" && (
                              <Button
                                size="sm"
                                onClick={() => handleActivate(order)}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Play className="h-4 w-4 ml-1" />
                                تفعيل
                              </Button>
                            )}
                            {(order.status === "active" || order.status === "in_production") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleActivate(order)}
                              >
                                <Settings className="h-4 w-4 ml-1" />
                                تعديل
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowStats(showStats === order.id ? null : order.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setPrintingProductionOrder(order)}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stats Panel */}
      {showStats && (
        <div className="animate-in slide-in-from-top-2 duration-200">
          <ProductionOrderStatsCard productionOrderId={showStats} />
        </div>
      )}

      {/* Activation Modal */}
      <ProductionOrderActivationModal
        isOpen={isActivationModalOpen}
        onClose={() => {
          setIsActivationModalOpen(false);
          setSelectedOrder(null);
        }}
        onConfirm={handleActivationConfirm}
        order={selectedOrder}
        machines={machines}
        operators={users.filter((u: any) => 
          u.role_id && ["operator", "production_worker"].includes(u.role_id)
        )}
        isUpdating={selectedOrder?.status === "active" || selectedOrder?.status === "in_production"}
      />

      {/* Print Template */}
      {printingProductionOrder && (
        <PrintProductionOrderWrapper
          productionOrder={printingProductionOrder}
          onClose={() => setPrintingProductionOrder(null)}
        />
      )}
    </div>
  );
}

function PrintProductionOrderWrapper({ productionOrder, onClose }: { productionOrder: any, onClose: () => void }) {
  const { data: ordersData } = useQuery({
    queryKey: ["/api/orders", productionOrder.order_id],
    queryFn: async () => {
      const response = await fetch(`/api/orders`);
      if (!response.ok) throw new Error("Failed to fetch orders");
      const result = await response.json();
      const data = result.data || result;
      return Array.isArray(data) ? data : [];
    },
  });

  const { data: customersData } = useQuery({
    queryKey: ["/api/customers", { all: true }],
    queryFn: async () => {
      const response = await fetch("/api/customers?all=true");
      if (!response.ok) throw new Error("Failed to fetch customers");
      const result = await response.json();
      return result.data || result;
    },
  });

  const { data: customerProductsData } = useQuery({
    queryKey: ["/api/customer-products"],
    queryFn: async () => {
      const response = await fetch("/api/customer-products");
      if (!response.ok) throw new Error("Failed to fetch customer products");
      const result = await response.json();
      return result.data || result;
    },
  });

  const { data: itemsData } = useQuery({
    queryKey: ["/api/items"],
    queryFn: async () => {
      const response = await fetch("/api/items");
      if (!response.ok) throw new Error("Failed to fetch items");
      const result = await response.json();
      return result.data || result;
    },
  });

  const { data: machinesData } = useQuery({
    queryKey: ["/api/machines"],
    queryFn: async () => {
      const response = await fetch("/api/machines");
      if (!response.ok) throw new Error("Failed to fetch machines");
      return response.json();
    },
  });

  const { data: usersData } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users");
      if (!response.ok) throw new Error("Failed to fetch users");
      const result = await response.json();
      return result.data || result;
    },
  });

  const { data: rollsData } = useQuery({
    queryKey: ["/api/rolls", productionOrder.id],
    queryFn: async () => {
      const response = await fetch("/api/rolls");
      if (!response.ok) throw new Error("Failed to fetch rolls");
      const result = await response.json();
      const data = result.data || result;
      return Array.isArray(data) ? data.filter((r: any) => r.production_order_id === productionOrder.id) : [];
    },
  });

  if (!ordersData || !customersData || !customerProductsData || !itemsData || !machinesData || !usersData || !rollsData) {
    return null;
  }

  const order = ordersData.find((o: any) => o.id === productionOrder.order_id);
  const customer = customersData.find((c: any) => c.id === order?.customer_id);
  const customerProduct = customerProductsData.find((cp: any) => cp.id === productionOrder.customer_product_id);
  const item = itemsData.find((i: any) => i.id === customerProduct?.item_id);
  const machine = machinesData.find((m: any) => m.id === productionOrder.assigned_machine_id);
  const operator = usersData.find((u: any) => u.id === productionOrder.assigned_operator_id);

  return (
    <ProductionOrderPrintTemplate
      productionOrder={productionOrder}
      order={order}
      customer={customer}
      customerProduct={customerProduct}
      item={item}
      machine={machine}
      operator={operator}
      rolls={rollsData}
      onClose={onClose}
    />
  );
}
