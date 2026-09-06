import React, { useState, useMemo } from "react";
import { HourlyForecast, GridRegion, HistoricalTelemetryPoint } from "../types";
import { generateHistoricalTelemetry } from "../data/gridData";
import {
  TrendingDown,
  TrendingUp,
  Activity,
  Calendar,
  Layers,
  Sparkles,
  Info,
  Clock,
  Zap,
} from "lucide-react";

interface ForecastChartProps {
  forecast: HourlyForecast[];
  region: GridRegion;
  historical?: HistoricalTelemetryPoint[];
  onSelectHour?: (hour: HourlyForecast) => void;
}

type OverlayMode = "timeline" | "comparative";

export const ForecastChart: React.FC<ForecastChartProps> = ({
  forecast,
  region,
  historical: propHistorical,
  onSelectHour,
}) => {
  // Toggle overlay on/off and select overlay style
  const [showTrendOverlay, setShowTrendOverlay] = useState<boolean>(true);
  const [overlayMode, setOverlayMode] = useState<OverlayMode>("timeline");
  const [hoveredItem, setHoveredItem] = useState<{
    type: "historical" | "projected";
    index: number;
    x: number;
    y: number;
    data: any;
  } | null>(null);

  // Generate historical past 12 hours telemetry if not passed
  const historical = useMemo(() => {
    return propHistorical || generateHistoricalTelemetry(region, 12);
  }, [propHistorical, region]);

  if (!forecast || forecast.length === 0) return null;

  // Key summary statistics for the trend metrics
  const stats = useMemo(() => {
    const histAvg = Math.round(
      historical.reduce((sum, h) => sum + h.carbonIntensity, 0) / (historical.length || 1)
    );
    const projAvg = Math.round(
      forecast.reduce((sum, f) => sum + f.carbonIntensity, 0) / (forecast.length || 1)
    );
    const projMin = Math.min(...forecast.map((f) => f.carbonIntensity));
    const projMax = Math.max(...forecast.map((f) => f.carbonIntensity));
    const bestHour = forecast.find((f) => f.carbonIntensity === projMin);
    const peakHour = forecast.find((f) => f.carbonIntensity === projMax);
    const deltaPercent = Math.round(((projAvg - histAvg) / (histAvg || 1)) * 100);

    return {
      histAvg,
      projAvg,
      projMin,
      projMax,
      bestHourTime: bestHour?.timeLabel || "02:00",
      peakHourTime: peakHour?.timeLabel || "19:00",
      deltaPercent,
    };
  }, [historical, forecast]);

  // Dimensions for SVG
  const width = 860;
  const height = 260;
  const paddingLeft = 45;
  const paddingRight = 25;
  const paddingTop = 30;
  const paddingBottom = 42;

  const graphWidth = width - paddingLeft - paddingRight;
  const graphHeight = height - paddingTop - paddingBottom;

  // ==========================================
  // MODE 1: CONTINUOUS TIMELINE (Past 12h -> NOW -> Next 24h)
  // ==========================================
  const totalTimelinePoints = historical.length + forecast.length; // 12 + 24 = 36 points
  const nowIndex = historical.length; // Index where "NOW" sits

  const allCarbonValues = [
    ...historical.map((h) => h.carbonIntensity),
    ...forecast.map((f) => f.carbonIntensity),
    ...(forecast.map((f) => f.historicalCarbonIntensity || f.carbonIntensity)),
  ];
  const maxCarbon = Math.max(...allCarbonValues, 100);
  const minCarbon = Math.min(...allCarbonValues, 10);

  const getY = (val: number) => {
    const ratio = (val - minCarbon * 0.8) / (maxCarbon - minCarbon * 0.8 || 1);
    return paddingTop + graphHeight - ratio * graphHeight;
  };

  // Timeline coordinate mapping
  const timelineHistoricalPoints = historical.map((h, i) => {
    const x = paddingLeft + (i / (totalTimelinePoints - 1)) * graphWidth;
    const y = getY(h.carbonIntensity);
    return { x, y, data: h, type: "historical" as const };
  });

  const nowX = paddingLeft + (nowIndex / (totalTimelinePoints - 1)) * graphWidth;
  const nowY = getY(forecast[0]?.carbonIntensity || region.currentCarbonIntensity);

  const timelineProjectedPoints = forecast.map((f, i) => {
    const x = paddingLeft + ((nowIndex + i) / (totalTimelinePoints - 1)) * graphWidth;
    const y = getY(f.carbonIntensity);
    const yLower = f.confidenceLower ? getY(f.confidenceLower) : y + 6;
    const yUpper = f.confidenceUpper ? getY(f.confidenceUpper) : y - 6;
    return { x, y, yLower, yUpper, data: f, type: "projected" as const };
  });

  // SVG paths for Timeline mode
  const histPathD = timelineHistoricalPoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, "");
  // Connect historical to NOW
  const histFullD = `${histPathD} L ${nowX},${nowY}`;

  const projPathD = timelineProjectedPoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${nowX},${nowY} L ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, "");

  const projAreaD = `${projPathD} L ${
    timelineProjectedPoints[timelineProjectedPoints.length - 1].x
  },${paddingTop + graphHeight} L ${nowX},${paddingTop + graphHeight} Z`;

  // Confidence ribbon path
  const confidenceRibbonD = timelineProjectedPoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.yUpper}` : `${acc} L ${pt.x},${pt.yUpper}`;
  }, "") +
  [...timelineProjectedPoints].reverse().reduce((acc, pt) => {
    return `${acc} L ${pt.x},${pt.yLower}`;
  }, "") + " Z";

  // ==========================================
  // MODE 2: COMPARATIVE 24H OVERLAY (Projected vs Historical 7-Day Baseline for same 24 hours)
  // ==========================================
  const compProjectedPoints = forecast.map((f, i) => {
    const x = paddingLeft + (i / (forecast.length - 1)) * graphWidth;
    const y = getY(f.carbonIntensity);
    const yBase = getY(f.historicalCarbonIntensity || f.carbonIntensity * 1.05);
    const yLower = f.confidenceLower ? getY(f.confidenceLower) : y + 5;
    const yUpper = f.confidenceUpper ? getY(f.confidenceUpper) : y - 5;
    return { x, y, yBase, yLower, yUpper, data: f, type: "projected" as const };
  });

  const compProjPathD = compProjectedPoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, "");

  const compBasePathD = compProjectedPoints.reduce((acc, pt, i) => {
    return i === 0 ? `M ${pt.x},${pt.yBase}` : `${acc} L ${pt.x},${pt.yBase}`;
  }, "");

  const compProjAreaD = `${compProjPathD} L ${
    compProjectedPoints[compProjectedPoints.length - 1].x
  },${paddingTop + graphHeight} L ${compProjectedPoints[0].x},${
    paddingTop + graphHeight
  } Z`;

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
      {/* Top Header & View Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-stone-900 tracking-tight flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Carbon Intensity Trend & 24-Hour Forecast</span>
            </h3>

            <div className="flex items-center gap-1.5 bg-stone-100 rounded-lg p-0.5 border border-stone-200 text-xs">
              <button
                type="button"
                onClick={() => {
                  setShowTrendOverlay(true);
                  setOverlayMode("timeline");
                }}
                className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 text-[11px] ${
                  showTrendOverlay && overlayMode === "timeline"
                    ? "bg-white text-stone-900 shadow-xs font-semibold"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Historical Past 12h → Next 24h</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowTrendOverlay(true);
                  setOverlayMode("comparative");
                }}
                className={`px-2.5 py-1 rounded-md transition-all font-medium flex items-center gap-1 text-[11px] ${
                  showTrendOverlay && overlayMode === "comparative"
                    ? "bg-white text-stone-900 shadow-xs font-semibold"
                    : "text-stone-500 hover:text-stone-800"
                }`}
              >
                <Layers className="w-3 h-3" />
                <span>Projected vs. 7-Day Baseline</span>
              </button>
            </div>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Carbon Intensity Trend overlay tracking recorded emissions against the 24-hour predictive dispatch horizon
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div className="flex items-center gap-1.5 text-stone-600">
            <span className="w-3 h-1 bg-stone-400 rounded-full" />
            <span className="text-[11px]">
              {overlayMode === "timeline" ? "Historical Recorded" : "7-Day Historical Avg"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <span className="w-3 h-1 bg-emerald-600 rounded-full" />
            <span className="text-[11px]">Projected Horizon</span>
          </div>
          <div className="flex items-center gap-1.5 text-stone-600">
            <span className="w-3 h-2 bg-emerald-100/80 rounded-xs border border-emerald-300" />
            <span className="text-[11px]">Clean Shift Window</span>
          </div>
        </div>
      </div>

      {/* Real-Time Trend Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 bg-stone-50/80 rounded-xl p-3 border border-stone-200/70">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
            Historical Avg (Past 12h)
          </span>
          <div className="text-base font-bold font-mono text-stone-800 mt-0.5">
            {stats.histAvg} <span className="text-xs font-normal text-stone-500">gCO2/kWh</span>
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
            Projected 24h Avg
          </span>
          <div className="text-base font-bold font-mono text-emerald-700 mt-0.5 flex items-center gap-1">
            <span>{stats.projAvg}</span>
            <span className="text-xs font-normal text-stone-500">g/kWh</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ml-1 ${
                stats.deltaPercent <= 0
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
              }`}
            >
              {stats.deltaPercent <= 0 ? "↓" : "↑"} {Math.abs(stats.deltaPercent)}%
            </span>
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
            Optimal Off-Peak Window
          </span>
          <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
            {stats.projMin} <span className="text-xs font-normal text-stone-500">g/kWh</span>
            <span className="text-[11px] font-sans font-semibold text-stone-600 ml-1.5">
              ({stats.bestHourTime})
            </span>
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
            Projected Peak Gas Spike
          </span>
          <div className="text-base font-bold font-mono text-amber-700 mt-0.5">
            {stats.projMax} <span className="text-xs font-normal text-stone-500">g/kWh</span>
            <span className="text-[11px] font-sans font-semibold text-stone-600 ml-1.5">
              ({stats.peakHourTime})
            </span>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[700px] select-none"
          onMouseLeave={() => setHoveredItem(null)}
        >
          <defs>
            {/* Projected Green Gradient */}
            <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>

            {/* Historical Gray Gradient for timeline background */}
            <linearGradient id="histBgGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#64748b" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.02" />
            </linearGradient>

            {/* Confidence Band Ribbon */}
            <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
            </linearGradient>

            {/* Highlight Optimal Execution Band */}
            <linearGradient id="optimalShiftBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.04" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y Axis values */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + graphHeight * ratio;
            const value = Math.round(maxCarbon - ratio * (maxCarbon - minCarbon * 0.8));
            return (
              <g key={ratio}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#e7e5e4"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-stone-400"
                >
                  {value}
                </text>
              </g>
            );
          })}

          {/* ========================================================================= */}
          {/* RENDER MODE A: CONTINUOUS TIMELINE (Past 12h Recorded | NOW | Next 24h Projected) */}
          {/* ========================================================================= */}
          {overlayMode === "timeline" && (
            <>
              {/* Historical Zone Background Shading */}
              <rect
                x={paddingLeft}
                y={paddingTop}
                width={nowX - paddingLeft}
                height={graphHeight}
                fill="url(#histBgGradient)"
              />
              <text
                x={paddingLeft + 10}
                y={paddingTop + 14}
                className="text-[10px] font-bold uppercase tracking-wider fill-stone-400"
              >
                ◀ Historical Recorded (Past 12h)
              </text>

              <text
                x={nowX + 12}
                y={paddingTop + 14}
                className="text-[10px] font-bold uppercase tracking-wider fill-emerald-600"
              >
                Projected Forecast (Next 24h) ▶
              </text>

              {/* Optimal Shift Window Highlighting in Projected Zone */}
              {timelineProjectedPoints.map((pt, i) => {
                if (pt.data.isOptimalWindow) {
                  const nextX = timelineProjectedPoints[i + 1]?.x || pt.x + 20;
                  return (
                    <rect
                      key={`opt-time-${i}`}
                      x={pt.x - 6}
                      y={paddingTop}
                      width={nextX - pt.x + 6}
                      height={graphHeight}
                      fill="url(#optimalShiftBand)"
                    />
                  );
                }
                return null;
              })}

              {/* Confidence interval band */}
              <path d={confidenceRibbonD} fill="url(#confidenceGradient)" />

              {/* Projected Area Fill */}
              <path d={projAreaD} fill="url(#projGradient)" />

              {/* Historical Line (Slate-500) */}
              <path
                d={histFullD}
                fill="none"
                stroke="#64748b"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Projected Line (Emerald-600) */}
              <path
                d={projPathD}
                fill="none"
                stroke="#059669"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* NOW Vertical Marker & Milestone */}
              <line
                x1={nowX}
                y1={paddingTop - 6}
                x2={nowX}
                y2={paddingTop + graphHeight}
                stroke="#0f172a"
                strokeWidth="2"
                strokeDasharray="4 2"
              />

              <rect
                x={nowX - 28}
                y={paddingTop - 18}
                width="56"
                height="16"
                rx="3"
                fill="#0f172a"
              />
              <text
                x={nowX}
                y={paddingTop - 6}
                textAnchor="middle"
                className="text-[9px] font-bold fill-white uppercase tracking-wider"
              >
                ● NOW
              </text>

              {/* Historical Data Dots */}
              {timelineHistoricalPoints.map((pt, i) => (
                <g
                  key={`hist-pt-${i}`}
                  className="cursor-pointer"
                  onMouseEnter={() =>
                    setHoveredItem({
                      type: "historical",
                      index: i,
                      x: pt.x,
                      y: pt.y,
                      data: pt.data,
                    })
                  }
                >
                  <circle cx={pt.x} cy={pt.y} r="10" fill="transparent" />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredItem?.index === i && hoveredItem?.type === "historical" ? 5 : 3}
                    fill="#64748b"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  {i % 3 === 0 && (
                    <text
                      x={pt.x}
                      y={height - 18}
                      textAnchor="middle"
                      className="text-[10px] font-mono fill-stone-400"
                    >
                      {pt.data.timeLabel}
                    </text>
                  )}
                </g>
              ))}

              {/* Projected Data Dots */}
              {timelineProjectedPoints.map((pt, i) => {
                const is2AM = pt.data.hour === 2;
                return (
                  <g
                    key={`proj-pt-${i}`}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredItem({
                        type: "projected",
                        index: i,
                        x: pt.x,
                        y: pt.y,
                        data: pt.data,
                      })
                    }
                    onClick={() => onSelectHour && onSelectHour(pt.data)}
                  >
                    <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredItem?.index === i && hoveredItem?.type === "projected" ? 6 : is2AM ? 5 : 3.5}
                      fill={is2AM ? "#10b981" : "#059669"}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    {/* 2:00 AM Callout */}
                    {is2AM && (
                      <g>
                        <rect
                          x={pt.x - 38}
                          y={pt.y - 28}
                          width="76"
                          height="18"
                          rx="4"
                          fill="#047857"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 16}
                          textAnchor="middle"
                          className="text-[9px] font-bold fill-white"
                        >
                          ★ 2:00 AM (-38%)
                        </text>
                      </g>
                    )}

                    {i % 3 === 0 && (
                      <text
                        x={pt.x}
                        y={height - 18}
                        textAnchor="middle"
                        className="text-[10px] font-mono fill-stone-500 font-medium"
                      >
                        {pt.data.timeLabel}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* ========================================================================= */}
          {/* RENDER MODE B: DIRECT COMPARATIVE OVERLAY (Projected vs Historical 7-Day Baseline) */}
          {/* ========================================================================= */}
          {overlayMode === "comparative" && (
            <>
              {/* Optimal Shift Window */}
              {compProjectedPoints.map((pt, i) => {
                if (pt.data.isOptimalWindow) {
                  const nextX = compProjectedPoints[i + 1]?.x || pt.x + 20;
                  return (
                    <rect
                      key={`comp-opt-${i}`}
                      x={pt.x - 8}
                      y={paddingTop}
                      width={nextX - pt.x + 8}
                      height={graphHeight}
                      fill="url(#optimalShiftBand)"
                    />
                  );
                }
                return null;
              })}

              {/* Projected Area */}
              <path d={compProjAreaD} fill="url(#projGradient)" />

              {/* Historical 7-Day Baseline Curve (Dashed Slate) */}
              <path
                d={compBasePathD}
                fill="none"
                stroke="#64748b"
                strokeWidth="2"
                strokeDasharray="4 3"
              />

              {/* Projected 24h Horizon Line (Solid Emerald) */}
              <path
                d={compProjPathD}
                fill="none"
                stroke="#059669"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Points */}
              {compProjectedPoints.map((pt, i) => {
                const is2AM = pt.data.hour === 2;
                return (
                  <g
                    key={`comp-pt-${i}`}
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredItem({
                        type: "projected",
                        index: i,
                        x: pt.x,
                        y: pt.y,
                        data: pt.data,
                      })
                    }
                    onClick={() => onSelectHour && onSelectHour(pt.data)}
                  >
                    <circle cx={pt.x} cy={pt.y} r="12" fill="transparent" />

                    {/* Historical Baseline Marker */}
                    <circle cx={pt.x} cy={pt.yBase} r="2.5" fill="#94a3b8" />

                    {/* Projected Point */}
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={hoveredItem?.index === i ? 6 : is2AM ? 5 : 3.5}
                      fill={is2AM ? "#10b981" : "#059669"}
                      stroke="#ffffff"
                      strokeWidth="2"
                    />

                    {is2AM && (
                      <g>
                        <rect
                          x={pt.x - 38}
                          y={pt.y - 28}
                          width="76"
                          height="18"
                          rx="4"
                          fill="#047857"
                        />
                        <text
                          x={pt.x}
                          y={pt.y - 16}
                          textAnchor="middle"
                          className="text-[9px] font-bold fill-white"
                        >
                          ★ 2:00 AM (-38%)
                        </text>
                      </g>
                    )}

                    {i % 3 === 0 && (
                      <text
                        x={pt.x}
                        y={height - 18}
                        textAnchor="middle"
                        className="text-[10px] font-mono fill-stone-500 font-medium"
                      >
                        {pt.data.timeLabel}
                      </text>
                    )}
                  </g>
                );
              })}
            </>
          )}

          {/* Hover guideline */}
          {hoveredItem && (
            <line
              x1={hoveredItem.x}
              y1={paddingTop}
              x2={hoveredItem.x}
              y2={paddingTop + graphHeight}
              stroke="#0f172a"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
          )}
        </svg>

        {/* Floating Tooltip HTML Overlay */}
        {hoveredItem && (
          <div
            className="absolute top-2 pointer-events-none bg-stone-900/95 text-white text-xs rounded-xl p-3 shadow-xl border border-stone-700 backdrop-blur-xs transition-all z-20 min-w-[210px]"
            style={{
              left: `${Math.min(
                Math.max(hoveredItem.x - 105, 10),
                width - 230
              )}px`,
            }}
          >
            {/* Header Badge */}
            <div className="flex items-center justify-between gap-2 border-b border-stone-700 pb-1.5 mb-1.5">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-sm ${
                  hoveredItem.type === "historical"
                    ? "bg-slate-700 text-slate-200"
                    : "bg-emerald-500/30 text-emerald-300"
                }`}
              >
                {hoveredItem.type === "historical" ? "Historical Recorded" : "Projected Horizon"}
              </span>
              <span className="font-mono font-bold text-white">
                {hoveredItem.data.timeLabel}
              </span>
            </div>

            {/* Metrics */}
            <div className="space-y-1 text-[11px]">
              <div className="flex justify-between items-baseline">
                <span className="text-stone-400">Carbon Intensity:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {hoveredItem.data.carbonIntensity} gCO2/kWh
                </span>
              </div>

              {hoveredItem.type === "projected" && hoveredItem.data.historicalCarbonIntensity && (
                <div className="flex justify-between items-baseline text-stone-300">
                  <span className="text-stone-400">7-Day Historical:</span>
                  <span className="font-mono">
                    {hoveredItem.data.historicalCarbonIntensity} g/kWh (
                    <span
                      className={
                        hoveredItem.data.carbonIntensity <
                        hoveredItem.data.historicalCarbonIntensity
                          ? "text-emerald-400 font-semibold"
                          : "text-amber-400 font-semibold"
                      }
                    >
                      {Math.round(
                        ((hoveredItem.data.carbonIntensity -
                          hoveredItem.data.historicalCarbonIntensity) /
                          hoveredItem.data.historicalCarbonIntensity) *
                          100
                      )}
                      %
                    </span>
                    )
                  </span>
                </div>
              )}

              {hoveredItem.type === "projected" && hoveredItem.data.confidenceLower && (
                <div className="flex justify-between items-baseline text-stone-400 text-[10px]">
                  <span>Confidence Interval:</span>
                  <span className="font-mono text-stone-300">
                    {hoveredItem.data.confidenceLower} - {hoveredItem.data.confidenceUpper} g/kWh
                  </span>
                </div>
              )}

              <div className="flex justify-between items-baseline">
                <span className="text-stone-400">Renewable Availability:</span>
                <span className="font-semibold text-white">
                  {hoveredItem.data.renewablePercent}%
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-stone-400">Ambient / PUE:</span>
                <span className="font-semibold text-white">
                  {hoveredItem.data.ambientTempC}°C (PUE {hoveredItem.data.pue.toFixed(2)})
                </span>
              </div>

              <div className="flex justify-between items-baseline">
                <span className="text-stone-400">Grid Demand:</span>
                <span className="font-semibold text-white">
                  {(hoveredItem.data.gridDemandMw / 1000).toFixed(1)} GW
                </span>
              </div>

              {hoveredItem.data.isOptimalWindow && (
                <div className="pt-1 mt-1 border-t border-stone-800 text-[10px] text-emerald-300 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Optimal Clean Shift Opportunity</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Note */}
      <div className="mt-3 pt-2.5 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-2">
        <div className="flex items-center gap-2 text-stone-600">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>
            {overlayMode === "timeline"
              ? "Timeline spans past 12 hours of recorded sensor telemetry seamlessly through the 24-hour predictive dispatch window."
              : "Direct hourly overlay comparing today's forecast against the 7-day historical diurnal baseline."}
          </span>
        </div>
        <span className="text-[11px] text-stone-400">
          Click any projected point to test shift
        </span>
      </div>
    </div>
  );
};
