import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { CustomTooltip } from "./ChartUtils";

interface InteractiveAreaChartProps {
  data: any[];
  title: string;
  description?: string;
  xAxisKey: string;
  areas: {
    key: string;
    name: string;
    color: string;
    fillOpacity?: number;
  }[];
  height?: number;
  showLegend?: boolean;
  formatValue?: (value: any) => string;
  className?: string;
  stacked?: boolean;
}

export function InteractiveAreaChart({
  data,
  title,
  description,
  xAxisKey,
  areas,
  height = 300,
  showLegend = true,
  formatValue,
  className = "",
  stacked = false,
}: InteractiveAreaChartProps) {
  return (
    <Card className={`${className}`} data-testid="chart-interactive-area">
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
          <AreaChart
            data={data}
            margin={{
              top: 10,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <defs>
              {areas.map((area, index) => (
                <linearGradient
                  key={area.key}
                  id={`colorGradient${index}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={area.color}
                    stopOpacity={area.fillOpacity || 0.8}
                  />
                  <stop offset="95%" stopColor={area.color} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
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
            {areas.map((area, index) => (
              <Area
                key={area.key}
                type="monotone"
                dataKey={area.key}
                name={area.name}
                stackId={stacked ? "1" : area.key}
                stroke={area.color}
                fill={`url(#colorGradient${index})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
