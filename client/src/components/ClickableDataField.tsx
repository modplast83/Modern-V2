import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../hooks/use-auth";
import { useToast } from "../hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Loader2, Pencil } from "lucide-react";

export type EntityType = 
  | "customer" 
  | "order" 
  | "roll" 
  | "user" 
  | "product" 
  | "productionOrder";

interface EntityConfig {
  apiEndpoint: string;
  queryKey: string;
  fields: {
    key: string;
    label: string;
    labelAr: string;
    type: "text" | "textarea" | "number" | "readonly";
  }[];
}

const entityConfigs: Record<EntityType, EntityConfig> = {
  customer: {
    apiEndpoint: "/api/customers",
    queryKey: "/api/customers",
    fields: [
      { key: "name", label: "Name", labelAr: "الاسم (إنجليزي)", type: "text" },
      { key: "name_ar", label: "Arabic Name", labelAr: "الاسم (عربي)", type: "text" },
      { key: "code", label: "Code", labelAr: "الرمز", type: "text" },
      { key: "phone", label: "Phone", labelAr: "الهاتف", type: "text" },
      { key: "city", label: "City", labelAr: "المدينة", type: "text" },
      { key: "address", label: "Address", labelAr: "العنوان", type: "textarea" },
      { key: "tax_number", label: "Tax Number", labelAr: "الرقم الضريبي", type: "text" },
    ],
  },
  order: {
    apiEndpoint: "/api/orders",
    queryKey: "/api/orders",
    fields: [
      { key: "order_number", label: "Order Number", labelAr: "رقم الطلب", type: "readonly" },
      { key: "notes", label: "Notes", labelAr: "ملاحظات", type: "textarea" },
      { key: "total_quantity", label: "Total Quantity (kg)", labelAr: "الكمية الإجمالية (كجم)", type: "number" },
    ],
  },
  roll: {
    apiEndpoint: "/api/rolls",
    queryKey: "/api/rolls",
    fields: [
      { key: "roll_number", label: "Roll Number", labelAr: "رقم الرول", type: "readonly" },
      { key: "weight_kg", label: "Weight (kg)", labelAr: "الوزن (كجم)", type: "number" },
      { key: "notes", label: "Notes", labelAr: "ملاحظات", type: "textarea" },
    ],
  },
  user: {
    apiEndpoint: "/api/users",
    queryKey: "/api/users",
    fields: [
      { key: "username", label: "Username", labelAr: "اسم المستخدم", type: "text" },
      { key: "display_name", label: "Display Name", labelAr: "الاسم المعروض (إنجليزي)", type: "text" },
      { key: "display_name_ar", label: "Arabic Display Name", labelAr: "الاسم المعروض (عربي)", type: "text" },
      { key: "phone", label: "Phone", labelAr: "الهاتف", type: "text" },
      { key: "email", label: "Email", labelAr: "البريد الإلكتروني", type: "text" },
    ],
  },
  product: {
    apiEndpoint: "/api/items",
    queryKey: "/api/items",
    fields: [
      { key: "name", label: "Name", labelAr: "الاسم (إنجليزي)", type: "text" },
      { key: "name_ar", label: "Arabic Name", labelAr: "الاسم (عربي)", type: "text" },
      { key: "code", label: "Code", labelAr: "الرمز", type: "text" },
      { key: "description", label: "Description", labelAr: "الوصف", type: "textarea" },
    ],
  },
  productionOrder: {
    apiEndpoint: "/api/production-orders",
    queryKey: "/api/production-orders",
    fields: [
      { key: "production_order_number", label: "Production Order Number", labelAr: "رقم أمر الإنتاج", type: "readonly" },
      { key: "quantity_kg", label: "Quantity (kg)", labelAr: "الكمية (كجم)", type: "number" },
      { key: "notes", label: "Notes", labelAr: "ملاحظات", type: "textarea" },
    ],
  },
};

interface ClickableDataFieldProps {
  entityType: EntityType;
  entityId: string | number | undefined | null;
  displayValue: string;
  className?: string;
}

export function ClickableDataField({
  entityType,
  entityId,
  displayValue,
  className = "",
}: ClickableDataFieldProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const isArabic = i18n.language === "ar";
  
  const isGeneralManager = user?.role_id === 1;
  const config = entityConfigs[entityType];
  
  // If entityId is undefined/null, render as plain text (no edit capability)
  const hasValidEntityId = entityId !== undefined && entityId !== null && String(entityId).trim() !== "";

  const { data: entityData, isLoading } = useQuery({
    queryKey: [config.apiEndpoint, entityId],
    queryFn: async () => {
      const response = await fetch(`${config.apiEndpoint}/${entityId}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch entity");
      const data = await response.json();
      return data.data || data;
    },
    enabled: isOpen && isGeneralManager && hasValidEntityId,
  });

  useEffect(() => {
    if (entityData) {
      setFormData(entityData);
    }
  }, [entityData]);

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      return apiRequest(`${config.apiEndpoint}/${entityId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [config.queryKey] });
      queryClient.invalidateQueries({ queryKey: [config.apiEndpoint, entityId] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/production-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/rolls"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({
        title: t("common.success"),
        description: t("clickableField.updateSuccess"),
      });
      setIsOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: t("common.error"),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleClick = () => {
    if (isGeneralManager && hasValidEntityId) {
      setIsOpen(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleFieldChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const getEntityTitle = () => {
    const titles: Record<EntityType, { en: string; ar: string }> = {
      customer: { en: "Customer Details", ar: "بيانات العميل" },
      order: { en: "Order Details", ar: "بيانات الطلب" },
      roll: { en: "Roll Details", ar: "بيانات الرول" },
      user: { en: "User Details", ar: "بيانات المستخدم" },
      product: { en: "Product Details", ar: "بيانات المنتج" },
      productionOrder: { en: "Production Order Details", ar: "بيانات أمر الإنتاج" },
    };
    return isArabic ? titles[entityType].ar : titles[entityType].en;
  };

  // Render as plain text if not a general manager or if entityId is invalid
  if (!isGeneralManager || !hasValidEntityId) {
    return <span className={className}>{displayValue}</span>;
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center gap-1 hover:text-primary hover:underline cursor-pointer transition-colors ${className}`}
        title={isArabic ? "اضغط للتعديل" : "Click to edit"}
      >
        {displayValue}
        <Pencil className="h-3 w-3 opacity-50" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg" dir={isArabic ? "rtl" : "ltr"}>
          <DialogHeader>
            <DialogTitle>{getEntityTitle()}</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-4 max-h-[60vh] overflow-y-auto py-4">
              {config.fields.map((field) => (
                <div key={field.key} className="space-y-2">
                  <Label htmlFor={field.key}>
                    {isArabic ? field.labelAr : field.label}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={field.key}
                      value={formData[field.key] || ""}
                      onChange={(e) => handleFieldChange(field.key, e.target.value)}
                      className="min-h-[80px]"
                    />
                  ) : field.type === "readonly" ? (
                    <Input
                      id={field.key}
                      value={formData[field.key] || ""}
                      readOnly
                      disabled
                      className="bg-muted"
                    />
                  ) : (
                    <Input
                      id={field.key}
                      type={field.type === "number" ? "number" : "text"}
                      value={formData[field.key] || ""}
                      onChange={(e) =>
                        handleFieldChange(
                          field.key,
                          field.type === "number"
                            ? parseFloat(e.target.value) || 0
                            : e.target.value
                        )
                      }
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending || isLoading}
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
              {t("common.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
