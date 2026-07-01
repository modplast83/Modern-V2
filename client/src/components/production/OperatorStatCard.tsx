import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "../ui/card";
import { cn } from "../../lib/utils";

export type StatColor =
  | "blue"
  | "amber"
  | "green"
  | "orange"
  | "purple"
  | "teal";

const COLOR_STYLES: Record<
  StatColor,
  { border: string; iconWrap: string; icon: string; value: string }
> = {
  blue: {
    border: "border-blue-200 dark:border-blue-900/50",
    iconWrap: "bg-blue-100 dark:bg-blue-900/40",
    icon: "text-blue-600 dark:text-blue-400",
    value: "text-blue-700 dark:text-blue-300",
  },
  amber: {
    border: "border-amber-200 dark:border-amber-900/50",
    iconWrap: "bg-amber-100 dark:bg-amber-900/40",
    icon: "text-amber-600 dark:text-amber-400",
    value: "text-amber-700 dark:text-amber-300",
  },
  green: {
    border: "border-green-200 dark:border-green-900/50",
    iconWrap: "bg-green-100 dark:bg-green-900/40",
    icon: "text-green-600 dark:text-green-400",
    value: "text-green-700 dark:text-green-300",
  },
  orange: {
    border: "border-orange-200 dark:border-orange-900/50",
    iconWrap: "bg-orange-100 dark:bg-orange-900/40",
    icon: "text-orange-600 dark:text-orange-400",
    value: "text-orange-700 dark:text-orange-300",
  },
  purple: {
    border: "border-purple-200 dark:border-purple-900/50",
    iconWrap: "bg-purple-100 dark:bg-purple-900/40",
    icon: "text-purple-600 dark:text-purple-400",
    value: "text-purple-700 dark:text-purple-300",
  },
  teal: {
    border: "border-teal-200 dark:border-teal-900/50",
    iconWrap: "bg-teal-100 dark:bg-teal-900/40",
    icon: "text-teal-600 dark:text-teal-400",
    value: "text-teal-700 dark:text-teal-300",
  },
};

interface OperatorStatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  sublabel?: string;
  color: StatColor;
  testId?: string;
  valueTestId?: string;
}

export function OperatorStatCard({
  icon: Icon,
  value,
  label,
  sublabel,
  color,
  testId,
  valueTestId,
}: OperatorStatCardProps) {
  const styles = COLOR_STYLES[color];
  return (
    <Card
      data-testid={testId}
      className={cn(
        "border-2 transition-shadow hover:shadow-md",
        styles.border,
      )}
    >
      <CardContent className="flex flex-col items-center justify-center gap-2 p-5 text-center">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-full",
            styles.iconWrap,
          )}
          title={label}
          aria-label={label}
        >
          <Icon className={cn("h-6 w-6", styles.icon)} />
        </div>
        <div
          className={cn("text-3xl font-extrabold leading-none", styles.value)}
          data-testid={valueTestId}
        >
          {value}
        </div>
        <p className="text-sm font-bold text-gray-700 dark:text-gray-200">
          {label}
        </p>
        {sublabel ? (
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            {sublabel}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
