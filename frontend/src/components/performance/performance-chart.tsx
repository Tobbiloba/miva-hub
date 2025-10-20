"use client";

import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";

export type ChartType = "line" | "bar" | "area" | "radar";

interface WeeklyPerformanceData {
  week: number;
  averageGrade: number;
  assignmentsCompleted?: number;
  assignmentsTotal?: number;
  studyTimeMinutes?: number;
}

interface ConceptMasteryData {
  concept: string;
  masteryLevel: number;
}

interface PerformanceChartProps {
  data: WeeklyPerformanceData[] | ConceptMasteryData[];
  type: ChartType;
  dataKey: string;
  xAxisKey: string;
  title?: string;
  color?: string;
  secondaryDataKey?: string;
  secondaryColor?: string;
  height?: number;
}

export function PerformanceChart({
  data,
  type,
  dataKey,
  xAxisKey,
  title,
  color = "#8884d8",
  secondaryDataKey,
  secondaryColor = "#82ca9d",
  height = 300,
}: PerformanceChartProps) {
  const renderChart = () => {
    switch (type) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
              {secondaryDataKey && (
                <Line
                  type="monotone"
                  dataKey={secondaryDataKey}
                  stroke={secondaryColor}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        );

      case "bar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey={dataKey} fill={color} />
              {secondaryDataKey && <Bar dataKey={secondaryDataKey} fill={secondaryColor} />}
            </BarChart>
          </ResponsiveContainer>
        );

      case "area":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisKey} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={color}
                fill={color}
                fillOpacity={0.6}
              />
              {secondaryDataKey && (
                <Area
                  type="monotone"
                  dataKey={secondaryDataKey}
                  stroke={secondaryColor}
                  fill={secondaryColor}
                  fillOpacity={0.6}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        );

      case "radar":
        return (
          <ResponsiveContainer width="100%" height={height}>
            <RadarChart data={data}>
              <PolarGrid />
              <PolarAngleAxis dataKey={xAxisKey} />
              <PolarRadiusAxis angle={90} domain={[0, 1]} />
              <Radar
                name={title || dataKey}
                dataKey={dataKey}
                stroke={color}
                fill={color}
                fillOpacity={0.6}
              />
              <Tooltip />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {title && <h3 className="text-lg font-semibold mb-4">{title}</h3>}
      {renderChart()}
    </div>
  );
}

interface WeeklyGradeChartProps {
  data: WeeklyPerformanceData[];
  height?: number;
}

export function WeeklyGradeChart({ data, height = 300 }: WeeklyGradeChartProps) {
  return (
    <PerformanceChart
      data={data}
      type="line"
      dataKey="averageGrade"
      xAxisKey="week"
      title="Weekly Grade Performance"
      color="#3b82f6"
      height={height}
    />
  );
}

interface StudyTimeChartProps {
  data: WeeklyPerformanceData[];
  height?: number;
}

export function StudyTimeChart({ data, height = 300 }: StudyTimeChartProps) {
  return (
    <PerformanceChart
      data={data}
      type="bar"
      dataKey="studyTimeMinutes"
      xAxisKey="week"
      title="Weekly Study Time (minutes)"
      color="#10b981"
      height={height}
    />
  );
}

interface CompletionRateChartProps {
  data: WeeklyPerformanceData[];
  height?: number;
}

export function CompletionRateChart({ data, height = 300 }: CompletionRateChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    completionRate:
      item.assignmentsTotal && item.assignmentsTotal > 0
        ? (item.assignmentsCompleted! / item.assignmentsTotal) * 100
        : 0,
  }));

  return (
    <PerformanceChart
      data={chartData}
      type="area"
      dataKey="completionRate"
      xAxisKey="week"
      title="Assignment Completion Rate (%)"
      color="#f59e0b"
      height={height}
    />
  );
}

interface ConceptMasteryChartProps {
  data: ConceptMasteryData[];
  height?: number;
  maxConcepts?: number;
}

export function ConceptMasteryChart({
  data,
  height = 400,
  maxConcepts = 10,
}: ConceptMasteryChartProps) {
  const topConcepts = data.slice(0, maxConcepts);

  return (
    <PerformanceChart
      data={topConcepts}
      type="bar"
      dataKey="masteryLevel"
      xAxisKey="concept"
      title="Concept Mastery Levels"
      color="#8b5cf6"
      height={height}
    />
  );
}

interface RadarConceptChartProps {
  data: ConceptMasteryData[];
  height?: number;
  maxConcepts?: number;
}

export function RadarConceptChart({
  data,
  height = 400,
  maxConcepts = 8,
}: RadarConceptChartProps) {
  const topConcepts = data.slice(0, maxConcepts);

  return (
    <PerformanceChart
      data={topConcepts}
      type="radar"
      dataKey="masteryLevel"
      xAxisKey="concept"
      title="Concept Mastery Radar"
      color="#ec4899"
      height={height}
    />
  );
}

interface CombinedPerformanceChartProps {
  data: WeeklyPerformanceData[];
  height?: number;
}

export function CombinedPerformanceChart({ data, height = 350 }: CombinedPerformanceChartProps) {
  const normalizedData = data.map((item) => ({
    week: item.week,
    grade: item.averageGrade,
    studyTime: item.studyTimeMinutes ? item.studyTimeMinutes / 10 : 0,
  }));

  return (
    <div className="w-full">
      <h3 className="text-lg font-semibold mb-4">Grade vs Study Time Correlation</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={normalizedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="week" />
          <YAxis yAxisId="left" />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="grade"
            stroke="#3b82f6"
            strokeWidth={2}
            name="Grade (%)"
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="studyTime"
            stroke="#10b981"
            strokeWidth={2}
            name="Study Time (×10 min)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default PerformanceChart;
