import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CustomTooltip } from "./ChartUtils";

interface InteractiveBarChartProps {
  data: any[];
  title: string;
  description?: string;
  xAxisKey: string;
  yAxisKey: string;
  barColor?: string;
  height?: number;
  showLegend?: boolean;
  formatValue?: (value: any) => string;
  className?: string;
}

export function InteractiveBarChart({
  data,
  title,
  description,
  xAxisKey,
  yAxisKey,
  barColor = "#3b82f6",
  height = 300,
  showLegend = false,
  formatValue,
  className = "",
}: InteractiveBarChartProps) {
  return (
    <Card className={`${className}`} data-testid="chart-interactive-bar">
      <CardHeader>
        <CardTitle
          className="text-lg font-semibold text-gray-900"
          data-testid="text-chart-title"
        >
          {title}
        </CardTitle>
        {description && (
          <p
            className="text-sm text-gray-600"
            data-testid="text-chart-description"
          >
            {description}
          </p>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={data}
            margin={{
              top: 10,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12, fill: "#374151" }}
              tickLine={{ stroke: "#d1d5db" }}
              axisLine={{ stroke: "#d1d5db" }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#374151" }}
              tickLine={{ stroke: "#d1d5db" }}
              axisLine={{ stroke: "#d1d5db" }}
              tickFormatter={formatValue}
            />
            <Tooltip content={<CustomTooltip formatValue={formatValue} />} />
            {showLegend && <Legend />}
            <Bar
              dataKey={yAxisKey}
              fill={barColor}
              radius={[4, 4, 0, 0]}
              stroke={barColor}
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
