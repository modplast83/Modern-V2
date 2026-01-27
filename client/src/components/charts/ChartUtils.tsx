interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  formatValue?: (value: any) => string;
}

export const CustomTooltip = ({ active, payload, label, formatValue }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg"
        dir="rtl"
      >
        <p className="font-medium text-gray-900">{`${label}`}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {`${entry.name}: ${formatValue ? formatValue(entry.value) : entry.value}`}
          </p>
        ))}
      </div>
    );
  }
  return null;
};
