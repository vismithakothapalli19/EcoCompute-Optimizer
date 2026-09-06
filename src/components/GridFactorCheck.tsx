import React from "react";
import {
  Activity,
  Sun,
  Wind,
  Droplets,
  Gauge,
  Thermometer,
  Fan,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
} from "lucide-react";
import { GridRegion, WorkloadConfig } from "../types";

interface GridFactorCheckProps {
  region: GridRegion;
  workload: WorkloadConfig;
}

export const GridFactorCheck: React.FC<GridFactorCheckProps> = ({ region, workload }) => {
  // Determine carbon tier
  const isClean = region.currentCarbonIntensity < 100;
  const isModerate = region.currentCarbonIntensity >= 100 && region.currentCarbonIntensity < 350;

  // Cooling overhead percentage = (PUE - 1.0) * 100
  const coolingOverheadPct = Math.round((region.pue - 1.0) * 100);

  // Demand stress color
  const demandColor =
    region.demandStress === "Low"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : region.demandStress === "Moderate"
      ? "text-amber-700 bg-amber-50 border-amber-200"
      : "text-red-700 bg-red-50 border-red-200";

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-stone-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-sm font-bold text-stone-900 tracking-tight">
              Real-Time Environmental & Grid Telemetry Audit
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            Evaluating the 6 core physical constraints governing compute placement in {region.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-stone-400 font-mono">Telemetry Node: {region.code}</span>
        </div>
      </div>

      {/* The 6 Factor Grid Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-4">
        {/* Factor 1: Electricity Demand */}
        <div className="bg-stone-50 rounded-lg p-3 border border-stone-200/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-1">
              <span className="flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-stone-600" />
                1. Grid Demand
              </span>
              <span className={`px-1.5 py-0.2 rounded text-[10px] border font-medium ${demandColor}`}>
                {region.demandStress}
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-stone-900 mt-1">
              {(region.gridDemandMw / 1000).toFixed(1)}{" "}
              <span className="text-xs font-normal text-stone-500">GW</span>
            </div>
          </div>
          <div className="text-[11px] text-stone-600 mt-2">
            Capacity load:{" "}
            <span className="font-semibold text-stone-800">
              {Math.round((region.gridDemandMw / region.gridCapacityMw) * 100)}%
            </span>
          </div>
        </div>

        {/* Factor 2: Renewable-Energy Availability */}
        <div className="bg-stone-50 rounded-lg p-3 border border-stone-200/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-1">
              <span className="flex items-center gap-1">
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                2. Renewables
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-bold">
                {region.renewablePercent}% Clean
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-emerald-700 mt-1">
              {region.renewablePercent}
              <span className="text-xs font-normal text-stone-500">%</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-stone-500 mt-2 font-mono">
            <span title="Solar">☀️ {region.solarPercent}%</span>
            <span title="Wind">💨 {region.windPercent}%</span>
            <span title="Hydro">💧 {region.hydroPercent}%</span>
          </div>
        </div>

        {/* Factor 3: Carbon Intensity */}
        <div className="bg-stone-50 rounded-lg p-3 border border-stone-200/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-1">
              <span className="flex items-center gap-1">
                <Gauge className="w-3.5 h-3.5 text-stone-600" />
                3. Carbon Intensity
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                  isClean
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : isModerate
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {isClean ? "Clean" : isModerate ? "Moderate" : "High Carbon"}
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-stone-900 mt-1">
              {region.currentCarbonIntensity}{" "}
              <span className="text-xs font-normal text-stone-500">g/kWh</span>
            </div>
          </div>
          <div className="text-[11px] text-stone-600 mt-2 truncate">
            {isClean ? "Hydro/Wind baseload" : isModerate ? "Mixed gas & solar" : "Peaker gas & coal"}
          </div>
        </div>

        {/* Factor 4: Temperature */}
        <div className="bg-stone-50 rounded-lg p-3 border border-stone-200/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-1">
              <span className="flex items-center gap-1">
                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                4. Temperature
              </span>
              <span className="text-[10px] font-mono text-stone-600">
                {region.ambientTempC > 25 ? "Warm" : region.ambientTempC < 15 ? "Cool" : "Moderate"}
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-stone-900 mt-1">
              {region.ambientTempC}
              <span className="text-xs font-normal text-stone-500">°C</span>
            </div>
          </div>
          <div className="text-[11px] text-stone-600 mt-2 truncate">
            {region.ambientTempC < 16 ? "Free-air cooling enabled" : "Thermal chillers engaged"}
          </div>
        </div>

        {/* Factor 5: Cooling Requirement (PUE) */}
        <div className="bg-stone-50 rounded-lg p-3 border border-stone-200/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-1">
              <span className="flex items-center gap-1">
                <Fan className="w-3.5 h-3.5 text-sky-600" />
                5. Cooling (PUE)
              </span>
              <span className="text-[10px] font-mono text-sky-700 font-bold">
                {region.pue.toFixed(2)}
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-stone-900 mt-1">
              +{coolingOverheadPct}
              <span className="text-xs font-normal text-stone-500">% power</span>
            </div>
          </div>
          <div className="text-[11px] text-stone-600 mt-2 truncate" title={region.coolingMode}>
            {region.coolingMode}
          </div>
        </div>

        {/* Factor 6: Task Urgency / SLA */}
        <div className="bg-stone-50 rounded-lg p-3 border border-stone-200/70 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 mb-1">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                6. Task Urgency
              </span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-medium border ${
                  workload.urgency === "immediate"
                    ? "bg-red-50 text-red-700 border-red-200"
                    : "bg-emerald-50 text-emerald-700 border-emerald-200"
                }`}
              >
                {workload.urgency === "immediate" ? "Strict SLA" : "Flexible SLA"}
              </span>
            </div>
            <div className="text-lg font-bold font-mono text-stone-900 mt-1">
              {workload.maxDelayHours}
              <span className="text-xs font-normal text-stone-500">h window</span>
            </div>
          </div>
          <div className="text-[11px] text-stone-600 mt-2 truncate">
            {workload.urgency === "immediate"
              ? "Cannot defer execution"
              : `Can delay up to ${workload.maxDelayHours}h`}
          </div>
        </div>
      </div>
    </div>
  );
};
