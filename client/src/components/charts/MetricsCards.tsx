import { Card, CardContent } from "../ui/card";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  className?: string;
  valueClassName?: string;
}

export function MetricCard({
  title,
  value,
  description,
  icon,
  trend,
  className = "",
  valueClassName = "",
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;

    if (trend.value === 0) {
      return <Minus className="w-4 h-4 text-gray-500" />;
    }

    return trend.isPositive ? (
      <TrendingUp className="w-4 h-4 text-green-500" />
    ) : (
      <TrendingDown className="w-4 h-4 text-red-500" />
    );
  };

  const getTrendColor = () => {
    if (!trend) return "";
    if (trend.value === 0) return "text-gray-500";
    return trend.isPositive ? "text-green-600" : "text-red-600";
  };

  return (
    <Card className={`${className}`} data-testid="card-metric">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p
                className="text-sm font-medium text-gray-600"
                data-testid="text-metric-title"
              >
                {title}
              </p>
              {icon && <div className="text-gray-400">{icon}</div>}
            </div>

            <div className="mt-2">
              <p
                className={`text-2xl font-bold text-gray-900 ${valueClassName}`}
                data-testid="text-metric-value"
              >
                {value}
              </p>

              {description && (
                <p
                  className="text-xs text-gray-500 mt-1"
                  data-testid="text-metric-description"
                >
                  {description}
                </p>
              )}

              {trend && (
                <div className="flex items-center gap-1 mt-2">
                  {getTrendIcon()}
                  <span
                    className={`text-xs font-medium ${getTrendColor()}`}
                    data-testid="text-metric-trend"
                  >
                    {trend.value !== 0 && `${Math.abs(trend.value)}%`}{" "}
                    {trend.label}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface MetricsGridProps {
  metrics: MetricCardProps[];
  columns?: number;
  className?: string;
}

export function MetricsGrid({
  metrics,
  columns = 4,
  className = "",
}: MetricsGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
    5: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
    6: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
  };

  return (
    <div
      className={`grid gap-4 ${gridCols[columns as keyof typeof gridCols]} ${className}`}
      data-testid="grid-metrics"
    >
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}
