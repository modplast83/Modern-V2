import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Button } from "../ui/button";
import { Dialog, DialogTrigger } from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Plus, Trash2, RefreshCw, ChevronDown } from "lucide-react";
import OrdersSearch from "./OrdersSearch";
import OrdersTable from "./OrdersTable";
import OrdersForm from "./OrdersForm";

interface OrdersTabsProps {
  orders: any[];
  productionOrders: any[];
  customers: any[];
  customerProducts: any[];
  users: any[];
  items: any[];
  categories: any[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  productionSearchTerm: string;
  setProductionSearchTerm: (term: string) => void;
  productionStatusFilter: string;
  setProductionStatusFilter: (status: string) => void;
  filteredOrders: any[];
  filteredProductionOrders: any[];
  isOrderDialogOpen: boolean;
  setIsOrderDialogOpen: (open: boolean) => void;
  editingOrder: any;
  onAddOrder: () => void;
  onEditOrder: (order: any) => void;
  onDeleteOrder: (order: any) => void;
  onStatusChange: (order: any, status: string) => void;
  onViewOrder: (order: any) => void;
  onPrintOrder: (order: any) => void;
  onOrderSubmit: (data: any, productionOrders: any[]) => void;
  onBulkDelete?: (orderIds: number[]) => Promise<void>;
  onBulkStatusChange?: (orderIds: number[], status: string) => Promise<void>;
  currentUser?: any;
  isAdmin?: boolean;
}

export default function OrdersTabs({
  orders,
  productionOrders,
  customers,
  customerProducts,
  users,
  items,
  categories,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  productionSearchTerm,
  setProductionSearchTerm,
  productionStatusFilter,
  setProductionStatusFilter,
  filteredOrders,
  filteredProductionOrders,
  isOrderDialogOpen,
  setIsOrderDialogOpen,
  editingOrder,
  onAddOrder,
  onEditOrder,
  onDeleteOrder,
  onStatusChange,
  onViewOrder,
  onPrintOrder,
  onOrderSubmit,
  onBulkDelete,
  onBulkStatusChange,
  currentUser,
  isAdmin = false,
}: OrdersTabsProps) {
  // Ensure arrays are valid
  const safeOrders = Array.isArray(orders) ? orders : [];
  const safeCustomers = Array.isArray(customers) ? customers : [];
  const safeCustomerProducts = Array.isArray(customerProducts) ? customerProducts : [];
  const safeCategories = Array.isArray(categories) ? categories : [];
  const safeItems = Array.isArray(items) ? items : [];
  
  // Bulk selection state
  const [selectedOrders, setSelectedOrders] = useState<number[]>([]);

  const handleCloseOrderDialog = () => {
    setIsOrderDialogOpen(false);
  };

  // Bulk selection handlers
  const handleOrderSelect = (orderId: number, selected: boolean) => {
    if (selected) {
      setSelectedOrders((prev) => [...prev, orderId]);
    } else {
      setSelectedOrders((prev) => prev.filter((id) => id !== orderId));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedOrders(filteredOrders.map((order: any) => order.id));
    } else {
      setSelectedOrders([]);
    }
  };

  const handleBulkDelete = async () => {
    if (!onBulkDelete || selectedOrders.length === 0 || !isAdmin) return;

    const confirmMessage = `هل أنت متأكد من حذف ${selectedOrders.length} طلب؟ هذا الإجراء لا يمكن التراجع عنه.`;
    if (!confirm(confirmMessage)) return;

    try {
      await onBulkDelete(selectedOrders);
      setSelectedOrders([]);
    } catch (error) {
      console.error("خطأ في الحذف الجماعي:", error);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    if (!onBulkStatusChange || selectedOrders.length === 0) return;

    try {
      await onBulkStatusChange(selectedOrders, status);
      setSelectedOrders([]);
    } catch (error) {
      console.error("خطأ في تغيير الحالة الجماعية:", error);
    }
  };

  return (
    <Tabs defaultValue="orders" className="space-y-4 w-full">
      <div className="overflow-x-auto">
        <TabsList className="w-full md:w-auto grid grid-cols-2 md:flex">
          <TabsTrigger value="orders" className="text-xs md:text-sm">الطلبات</TabsTrigger>
          <TabsTrigger value="production-orders" className="text-xs md:text-sm">أوامر الإنتاج</TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="orders" className="space-y-4 w-full">
        <Card className="w-full">
          <CardHeader className="p-3 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <CardTitle className="text-lg md:text-2xl">إدارة الطلبات</CardTitle>
              <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
                <div className="w-full md:w-auto">
                  <OrdersSearch
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    statusFilter={statusFilter}
                    setStatusFilter={setStatusFilter}
                  />
                </div>
                <Dialog
                  open={isOrderDialogOpen}
                  onOpenChange={setIsOrderDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button onClick={onAddOrder} data-testid="button-add-order" className="text-xs md:text-sm">
                      <Plus className="h-4 w-4 ml-1" />
                      <span className="hidden sm:inline">إضافة طلب</span>
                      <span className="sm:hidden">إضافة</span>
                    </Button>
                  </DialogTrigger>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            {/* Bulk Actions Bar */}
            {selectedOrders.length > 0 && (
              <Alert className="mb-4 text-xs md:text-base">
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      تم تحديد {selectedOrders.length} طلب
                    </span>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-orange-600 border-orange-600 hover:bg-orange-50"
                            data-testid="button-bulk-status-change"
                          >
                            <RefreshCw className="h-4 w-4 mr-1" />
                            تغيير الحالة
                            <ChevronDown className="h-3 w-3 mr-1" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() =>
                              handleBulkStatusChange("for_production")
                            }
                          >
                            <div className="flex items-center w-full">
                              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                              إلى الإنتاج
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleBulkStatusChange("on_hold")}
                          >
                            <div className="flex items-center w-full">
                              <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                              إيقاف مؤقت
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleBulkStatusChange("pending")}
                          >
                            <div className="flex items-center w-full">
                              <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                              في الانتظار
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleBulkStatusChange("completed")}
                          >
                            <div className="flex items-center w-full">
                              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                              مكتمل
                            </div>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {isAdmin && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBulkDelete}
                          data-testid="button-bulk-delete"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          حذف المحدد ({selectedOrders.length})
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedOrders([])}
                        data-testid="button-clear-selection"
                      >
                        إلغاء التحديد
                      </Button>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <OrdersTable
              orders={filteredOrders}
              customers={customers}
              users={users}
              productionOrders={productionOrders}
              onViewOrder={onViewOrder}
              onPrintOrder={onPrintOrder}
              onEditOrder={isAdmin ? onEditOrder : undefined}
              onDeleteOrder={onDeleteOrder}
              onStatusChange={onStatusChange}
              currentUser={currentUser}
              isAdmin={isAdmin}
              selectedOrders={selectedOrders}
              onOrderSelect={handleOrderSelect}
              onSelectAll={handleSelectAll}
            />
          </CardContent>
        </Card>

        {/* Orders Form Dialog */}
        <OrdersForm
          isOpen={isOrderDialogOpen}
          onClose={handleCloseOrderDialog}
          onSubmit={onOrderSubmit}
          customers={customers}
          customerProducts={customerProducts}
          items={items}
          editingOrder={editingOrder}
        />
      </TabsContent>

      <TabsContent value="production-orders" className="space-y-4 w-full">
        <Card className="w-full">
          <CardHeader className="p-3 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <CardTitle className="text-lg md:text-2xl">أوامر الإنتاج</CardTitle>
              <div className="w-full md:w-auto">
                <OrdersSearch
                  searchTerm={productionSearchTerm}
                  setSearchTerm={setProductionSearchTerm}
                  statusFilter={productionStatusFilter}
                  setStatusFilter={setProductionStatusFilter}
                  type="production"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            {filteredProductionOrders.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm md:text-base">
                {productionOrders.length === 0 
                  ? "لا توجد أوامر إنتاج" 
                  : "لا توجد نتائج مطابقة للبحث"}
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم أمر الإنتاج</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">رقم الطلب</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">العميل</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الفئة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">المنتج</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكمية (كجم)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">نسبة الزيادة</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الكمية النهائية (كجم)</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredProductionOrders.map((po: any) => {
                        const order = safeOrders.find((o: any) => o.id === po.order_id);
                        const customer = safeCustomers.find((c: any) => c.id === order?.customer_id);
                        const customerProduct = safeCustomerProducts.find((cp: any) => cp.id === po.customer_product_id);
                        const category = safeCategories.find((cat: any) => cat.id === customerProduct?.category_id);
                        const item = safeItems.find((itm: any) => itm.id === customerProduct?.item_id);
                        
                        return (
                          <tr key={po.id} className="hover:bg-gray-50" data-testid={`row-production-order-${po.id}`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.production_order_number || po.id}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order?.order_number || "غير محدد"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{customer?.name_ar || customer?.name || "غير محدد"}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-category-${po.id}`}>{category?.name_ar || category?.name || "غير محدد"}</td>
                            <td className="px-6 py-4 text-sm text-gray-900" data-testid={`text-product-${po.id}`}>
                              <div className="text-right">
                                <div className="font-medium text-gray-900">{item?.name_ar || item?.name || "غير محدد"}</div>
                                {customerProduct?.size_caption && <div className="text-xs text-gray-500 mt-0.5">{customerProduct.size_caption}</div>}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{po.quantity_kg || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900" data-testid={`text-overrun-percentage-${po.id}`}>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">{po.overrun_percentage ?? 0}%</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900" data-testid={`text-final-quantity-${po.id}`}>{po.final_quantity_kg || po.quantity_kg || 0}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${po.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : po.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : po.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                {po.status === 'pending' ? 'معلق' : po.status === 'in_progress' ? 'قيد التنفيذ' : po.status === 'completed' ? 'مكتمل' : po.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3">
                  {filteredProductionOrders.map((po: any) => {
                    const order = safeOrders.find((o: any) => o.id === po.order_id);
                    const customer = safeCustomers.find((c: any) => c.id === order?.customer_id);
                    const customerProduct = safeCustomerProducts.find((cp: any) => cp.id === po.customer_product_id);
                    const category = safeCategories.find((cat: any) => cat.id === customerProduct?.category_id);
                    const item = safeItems.find((itm: any) => itm.id === customerProduct?.item_id);
                    
                    return (
                      <div key={po.id} className="bg-white rounded-lg border p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-semibold text-base">{po.production_order_number}</div>
                            <div className="text-xs text-muted-foreground">#{order?.order_number}</div>
                          </div>
                          <span className={`text-xs font-semibold px-2 py-1 rounded ${po.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : po.status === 'in_progress' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {po.status === 'pending' ? 'معلق' : po.status === 'in_progress' ? 'قيد' : 'مكتمل'}
                          </span>
                        </div>
                        <div className="text-sm font-medium">{customer?.name_ar || customer?.name}</div>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">المنتج:</span><span>{item?.name_ar || item?.name}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">الفئة:</span><span>{category?.name_ar || category?.name}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">الكمية (كجم):</span><span className="font-medium">{po.quantity_kg}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">النهائية (كجم):</span><span className="font-medium">{po.final_quantity_kg || po.quantity_kg}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">نسبة الزيادة:</span><span className="font-medium">{po.overrun_percentage ?? 0}%</span></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
