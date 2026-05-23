import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";

interface OrdersSearchProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  type?: "orders" | "production";
  salesReps?: any[];
  salesRepFilter?: string;
  setSalesRepFilter?: (repId: string) => void;
}

export default function OrdersSearch({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  type = "orders",
  salesReps = [],
  salesRepFilter = "all",
  setSalesRepFilter,
}: OrdersSearchProps) {
  const { t } = useTranslation();
  const isProduction = type === "production";

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
      <div className="relative flex-1 sm:flex-none">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder={t("common.search")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full sm:w-64 text-xs sm:text-sm"
          data-testid={
            isProduction ? "input-search-production" : "input-search-orders"
          }
        />
      </div>
      {!isProduction && setSalesRepFilter && salesReps.length > 0 && (
        <Select value={salesRepFilter || "all"} onValueChange={setSalesRepFilter}>
          <SelectTrigger
            className="w-full sm:w-44 text-xs sm:text-sm"
            data-testid="select-sales-rep-filter"
          >
            <SelectValue placeholder="المندوب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل المندوبين</SelectItem>
            <SelectItem value="none">بدون مندوب</SelectItem>
            {salesReps.map((rep: any) => (
              <SelectItem key={rep.id} value={String(rep.id)}>
                {rep.display_name_ar || rep.display_name || rep.username}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Select value={statusFilter || ""} onValueChange={setStatusFilter}>
        <SelectTrigger
          className="w-full sm:w-48 text-xs sm:text-sm"
          data-testid="select-status-filter"
        >
          <SelectValue placeholder={t("common.status")} />
        </SelectTrigger>
        <SelectContent>
          {isProduction ? (
            <>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="pending">
                {t("orders.statuses.pending")}
              </SelectItem>
              <SelectItem value="in_progress">
                {t("production.statuses.in_progress")}
              </SelectItem>
              <SelectItem value="completed">
                {t("orders.statuses.completed")}
              </SelectItem>
            </>
          ) : (
            <>
              <SelectItem value="all">{t("common.all")}</SelectItem>
              <SelectItem value="waiting">
                {t("orders.statuses.waiting")}
              </SelectItem>
              <SelectItem value="on_hold">
                {t("orders.statuses.on_hold")}
              </SelectItem>
              <SelectItem value="in_production">
                {t("orders.statuses.in_production")}
              </SelectItem>
              <SelectItem value="paused">
                {t("orders.statuses.paused")}
              </SelectItem>
              <SelectItem value="completed">
                {t("orders.statuses.completed")}
              </SelectItem>
              <SelectItem value="received">
                {t("orders.statuses.received")}
              </SelectItem>
              <SelectItem value="delivered">
                {t("orders.statuses.delivered")}
              </SelectItem>
              <SelectItem value="archived">
                {t("orders.statuses.archived")}
              </SelectItem>
            </>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
