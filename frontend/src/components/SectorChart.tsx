import { type Sector } from "@/data/climate-data";
import {
  ChartHatchPatternDef,
  ObservedProjectedLegend,
} from "@/components/dashboard/ChartObservedProjected";
import {
  BarChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Area,
} from "recharts";

const HATCH_ID = "sector-chart-hatch";

interface SectorChartProps {
  sector: Sector;
  dataView: "historical" | "projected" | "both";
}

export function SectorChart({ sector, dataView }: SectorChartProps) {
  const yUnit = "MtCO₂e";

  if (dataView === "both") {
    const data = [
      ...sector.historicalData.map((d) => ({
        year: d.year,
        observedValue: d.emissions,
        projectedValue: null as number | null,
        target: d.target,
      })),
      ...sector.projectedData.map((d) => ({
        year: d.year,
        observedValue: null as number | null,
        projectedValue: d.emissions,
        target: d.target,
      })),
    ];

    return (
      <div aria-label={`${sector.name} emissions chart — observed and projected`} role="img">
        <ResponsiveContainer width="100%" height={300}>
          <ComposedChart data={data}>
            <ChartHatchPatternDef id={HATCH_ID} />
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis
              tick={{ fontSize: 11 }}
              stroke="hsl(var(--muted-foreground))"
              label={{
                value: yUnit,
                angle: -90,
                position: "insideLeft",
                offset: 10,
                style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
              }}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
            <Bar dataKey="observedValue" name="Observed emissions" fill="hsl(var(--chart-4))" radius={[2, 2, 0, 0]} />
            <Area
              dataKey="projectedValue"
              name="Projected"
              fill={`url(#${HATCH_ID})`}
              stroke="hsl(var(--chart-1))"
              strokeWidth={2}
              strokeDasharray="5 5"
              connectNulls
            />
            <Line dataKey="target" name="Target Path" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} strokeDasharray="4 4" />
          </ComposedChart>
        </ResponsiveContainer>
        <ObservedProjectedLegend className="mt-2 px-1" />
      </div>
    );
  }

  const data = dataView === "historical" ? sector.historicalData : sector.projectedData;
  const isProjected = dataView === "projected";

  return (
    <div aria-label={`${sector.name} ${isProjected ? "projected" : "historical"} emissions chart`} role="img">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <ChartHatchPatternDef id={HATCH_ID} />
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis dataKey="year" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
          <YAxis
            tick={{ fontSize: 11 }}
            stroke="hsl(var(--muted-foreground))"
            label={{
              value: yUnit,
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fontSize: 10, fill: "hsl(var(--muted-foreground))" },
            }}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              fontSize: 12,
            }}
          />
          <Bar
            dataKey="emissions"
            name={isProjected ? "Projected emissions" : "Emissions (MtCO₂e)"}
            fill={isProjected ? `url(#${HATCH_ID})` : "hsl(var(--chart-4))"}
            radius={[2, 2, 0, 0]}
          />
          <Line dataKey="target" name="Target Path" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} type="monotone" strokeDasharray={isProjected ? "5 5" : undefined} />
        </BarChart>
      </ResponsiveContainer>
      <ObservedProjectedLegend className="mt-2 px-1" />
    </div>
  );
}
