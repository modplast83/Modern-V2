import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { formatNumberAr } from "../../../../shared/number-utils";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Progress } from "../ui/progress";

export interface OrderGroup<T> {
  orderNumber: string;
  items: T[];
}

export function groupByOrderNumber<T>(
  items: T[],
  getOrderNumber: (item: T) => string,
): OrderGroup<T>[] {
  const groups = new Map<string, T[]>();
  const order: string[] = [];
  for (const item of items) {
    const key = getOrderNumber(item) || "—";
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item);
  }
  return order.map((key) => ({ orderNumber: key, items: groups.get(key)! }));
}

const accentClasses: Record<string, string> = {
  blue: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  green: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

interface OrderGroupCardProps {
  orderNumber: string;
  customerName: string;
  productionOrderCount: number;
  progressPercent: number;
  metrics: { label: string; value: string }[];
  accent: "blue" | "purple" | "green";
  icon: ReactNode;
  onSelect: () => void;
  testId: string;
}

export function OrderGroupCard({
  orderNumber,
  customerName,
  productionOrderCount,
  progressPercent,
  metrics,
  accent,
  icon,
  onSelect,
  testId,
}: OrderGroupCardProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const ForwardIcon = isArabic ? ChevronLeft : ChevronRight;

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="transition-all hover:shadow-lg cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      data-testid={`card-order-${testId}`}
    >
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle
              className="text-lg"
              data-testid={`text-order-group-number-${testId}`}
            >
              {t("operators.common.order")}: {orderNumber}
            </CardTitle>
            <CardDescription
              data-testid={`text-order-group-customer-${testId}`}
            >
              {customerName}
            </CardDescription>
          </div>
          <Badge variant="secondary" className={accentClasses[accent]}>
            {icon}
            {formatNumberAr(productionOrderCount)}{" "}
            {t("operators.common.productionOrdersCount")}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {metrics.length > 0 && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            {metrics.map((m, i) => (
              <div key={i}>
                <p className="text-gray-500 dark:text-gray-400">{m.label}</p>
                <p
                  className="font-medium"
                  data-testid={`text-order-group-metric-${testId}-${i}`}
                >
                  {m.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {t("operators.common.progress")}
            </span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <div className="flex items-center justify-end gap-1 text-sm font-medium text-primary">
          {t("operators.common.viewProductionOrders")}
          <ForwardIcon className="h-4 w-4" />
        </div>
      </CardContent>
    </Card>
  );
}

interface BackToOrdersBarProps {
  orderNumber: string;
  onBack: () => void;
  testId: string;
}

export function BackToOrdersBar({
  orderNumber,
  onBack,
  testId,
}: BackToOrdersBarProps) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const BackIcon = isArabic ? ArrowRight : ArrowLeft;

  return (
    <div className="flex items-center justify-between gap-2 flex-wrap">
      <Button
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="gap-1"
        data-testid={`button-back-to-orders-${testId}`}
      >
        <BackIcon className="h-4 w-4" />
        {t("operators.common.backToOrders")}
      </Button>
      <Badge
        variant="outline"
        className="text-sm"
        data-testid={`badge-selected-order-${testId}`}
      >
        {t("operators.common.order")}: {orderNumber}
      </Badge>
    </div>
  );
}

interface OrdersListHeaderProps {
  testId: string;
}

export function OrdersListHeader({ testId }: OrdersListHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <h2
        className="text-lg font-semibold text-gray-900 dark:text-gray-100"
        data-testid={`heading-orders-${testId}`}
      >
        {t("operators.common.ordersHeading")}
      </h2>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {t("operators.common.selectOrderToView")}
      </span>
    </div>
  );
}
