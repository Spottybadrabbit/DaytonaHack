import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { Card, CardContent } from "@/components/ui/card";

interface PerformanceData {
  timestamp: string;
  performance: number;
  tasks: number;
}

interface PerformanceChartProps {
  data: PerformanceData[];
  title: string;
  className?: string;
}

export default function PerformanceChart({ data, title, className }: PerformanceChartProps) {
  return (
    <Card className={className}>
      <CardContent className="pt-6">
        <h3 className="font-semibold mb-4">{title}</h3>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="timestamp"
                className="text-muted-foreground text-xs"
              />
              <YAxis className="text-muted-foreground text-xs" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="performance"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Performance %"
              />
              <Line
                type="monotone"
                dataKey="tasks"
                stroke="hsl(var(--chart-2))"
                strokeWidth={2}
                dot={false}
                name="Tasks Completed"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}