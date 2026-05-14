import { type Sector } from "@/data/climate-data";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ComposedChart, Area,
} from "recharts";

interface SectorChartProps {
  sector: Sector;
  dataView: "historical" | "projected" | "both";
}

export function SectorChart({ sector, dataView }: SectorChartProps) {
  let data: any[] = [];

  if (dataView === "historical") {
    data = sector.historicalData;
  } else if (dataView === "projected") {
    data = sector.projectedData;
  } else {
    data = [
      ...sector.historicalData.map(d => ({ ...d, type: "historical" })),
      ...sector.projectedData.map(d => ({ ...d, projected: d.emissions, emissions: undefined, type: "projected" })),
    ];
  }

  if (dataView === "both") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 11 }} />
          <Bar dataKey="emissions" name="Actual Emissions" fill="hsl(var(--chart-4))" radius={[2, 2, 0, 0]} />
          <Area dataKey="projected" name="Projected" fill="hsl(var(--chart-1) / 0.15)" stroke="hsl(var(--chart-1))" strokeDasharray="5 5" />
          <Line dataKey="target" name="Target Path" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{
            background: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="emissions" name="Emissions (MtCO₂e)" fill="hsl(var(--chart-4))" radius={[2, 2, 0, 0]} />
        <Line dataKey="target" name="Target Path" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} type="monotone" />
      </BarChart>
    </ResponsiveContainer>
  );
}
