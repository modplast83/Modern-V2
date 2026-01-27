import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CustomTooltip } from "./ChartUtils";

interface InteractiveLineChartProps {
  data: any[];
  title: string;
  description?: string;
  xAxisKey: string;
  lines: {
    key: string;
    name: string;
    color: string;
    strokeWidth?: number;
  }[];
  height?: number;
  showLegend?: boolean;
  formatValue?: (value: any) => string;
  className?: string;
  showDots?: boolean;
}

export function InteractiveLineChart({
  data,
  title,
  description,
  xAxisKey,
  lines,
  height = 300,
  showLegend = true,
  formatValue,
  className = "",
  showDots = true,
}: InteractiveLineChartProps) {
  return (
    <Card className={`${className}`} data-testid="chart-interactive-line">
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
          <LineChart
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
            {lines.map((line, index) => (
              <Line
                key={line.key}
                type="monotone"
                dataKey={line.key}
                name={line.name}
                stroke={line.color}
                strokeWidth={line.strokeWidth || 2}
                dot={
                  showDots ? { fill: line.color, strokeWidth: 2, r: 4 } : false
                }
                activeDot={{ r: 6, stroke: line.color, strokeWidth: 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
