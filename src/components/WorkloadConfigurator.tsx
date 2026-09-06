import React from "react";
import {
  Layers,
  Clock,
  HardDrive,
  Cpu,
  Flame,
  CheckCircle,
  Sliders,
} from "lucide-react";
import { PRESET_WORKLOADS } from "../data/presets";
import { AcceleratorType, UrgencyLevel, WorkloadConfig, WorkloadType } from "../types";

interface WorkloadConfiguratorProps {
  workload: WorkloadConfig;
  onChangeWorkload: (updated: WorkloadConfig) => void;
  onSelectPreset: (preset: WorkloadConfig) => void;
}

const ACCELERATOR_SPECS: Record<AcceleratorType, { powerKw: number; desc: string }> = {
  "NVIDIA H100": { powerKw: 0.75, desc: "700W SXM5, flagship tensor core" },
  "NVIDIA A100": { powerKw: 0.4, desc: "400W SXM4, high memory bandwidth" },
  "NVIDIA L4": { powerKw: 0.12, desc: "72W-120W, ultra-efficient inference" },
  "Google TPU v5e": { powerKw: 0.25, desc: "Cost-optimized custom silicon" },
  "Google TPU v5p": { powerKw: 0.45, desc: "High-performance AI pod chip" },
  "CPU High-Mem": { powerKw: 0.3, desc: "96-core x86 compute cluster" },
};

export const WorkloadConfigurator: React.FC<WorkloadConfiguratorProps> = ({
  workload,
  onChangeWorkload,
  onSelectPreset,
}) => {
  const peakPowerKw = Math.round(workload.gpuCount * workload.basePowerKwPerNode * 10) / 10;
  const baseEnergyKwh = Math.round(peakPowerKw * workload.durationHours);

  const handleAcceleratorChange = (accel: AcceleratorType) => {
    const spec = ACCELERATOR_SPECS[accel];
    onChangeWorkload({
      ...workload,
      accelerator: accel,
      basePowerKwPerNode: spec.powerKw,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
      {/* Header and presets */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-stone-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900">Task Specification & SLA</h2>
            <p className="text-xs text-stone-500">Configure workload compute scale, urgency, and data payload</p>
          </div>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <span className="text-xs font-medium text-stone-400 mr-1 whitespace-nowrap">Presets:</span>
          {PRESET_WORKLOADS.map((preset) => {
            const isActive = preset.id === workload.id;
            return (
              <button
                key={preset.id}
                id={`preset-btn-${preset.id}`}
                onClick={() => onSelectPreset(preset)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                {preset.name.split("(")[0].trim()}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inputs grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
        {/* Hardware Accelerator */}
        <div>
          <label className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1.5">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-stone-500" />
              Compute Hardware
            </span>
            <span className="text-[11px] font-normal text-stone-500">
              {Math.round(workload.basePowerKwPerNode * 1000)}W / unit
            </span>
          </label>
          <select
            id="workload-accelerator-select"
            value={workload.accelerator}
            onChange={(e) => handleAcceleratorChange(e.target.value as AcceleratorType)}
            className="w-full text-xs font-medium bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-stone-900 focus:bg-white focus:outline-emerald-500"
          >
            {Object.keys(ACCELERATOR_SPECS).map((acc) => (
              <option key={acc} value={acc}>
                {acc} ({Math.round(ACCELERATOR_SPECS[acc as AcceleratorType].powerKw * 1000)}W)
              </option>
            ))}
          </select>
          <p className="text-[11px] text-stone-500 mt-1 truncate">
            {ACCELERATOR_SPECS[workload.accelerator]?.desc}
          </p>
        </div>

        {/* Cluster Scale & Duration */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-stone-500" />
              Hardware Units
            </span>
            <span className="text-emerald-700 font-mono font-bold">{workload.gpuCount} units</span>
          </div>
          <input
            id="workload-gpu-slider"
            type="range"
            min={1}
            max={64}
            value={workload.gpuCount}
            onChange={(e) =>
              onChangeWorkload({ ...workload, gpuCount: parseInt(e.target.value, 10) })
            }
            className="w-full accent-emerald-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-stone-400 mt-0.5 font-mono">
            <span>1 unit</span>
            <span>16</span>
            <span>32</span>
            <span>64 units</span>
          </div>
        </div>

        {/* Duration Hours */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-stone-500" />
              Runtime Duration
            </span>
            <span className="text-emerald-700 font-mono font-bold">{workload.durationHours} hours</span>
          </div>
          <input
            id="workload-duration-slider"
            type="range"
            min={1}
            max={48}
            value={workload.durationHours}
            onChange={(e) =>
              onChangeWorkload({ ...workload, durationHours: parseInt(e.target.value, 10) })
            }
            className="w-full accent-emerald-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-stone-400 mt-0.5 font-mono">
            <span>1h</span>
            <span>12h</span>
            <span>24h</span>
            <span>48h</span>
          </div>
        </div>

        {/* Data Transfer Size */}
        <div>
          <div className="flex items-center justify-between text-xs font-semibold text-stone-700 mb-1">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-stone-500" />
              Dataset / Model Payload
            </span>
            <span className="text-emerald-700 font-mono font-bold">{workload.dataSizeGb} GB</span>
          </div>
          <input
            id="workload-data-slider"
            type="range"
            min={5}
            max={500}
            step={5}
            value={workload.dataSizeGb}
            onChange={(e) =>
              onChangeWorkload({ ...workload, dataSizeGb: parseInt(e.target.value, 10) })
            }
            className="w-full accent-emerald-600 h-1.5 bg-stone-200 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-stone-400 mt-0.5 font-mono">
            <span>5 GB</span>
            <span>100 GB</span>
            <span>250 GB</span>
            <span>500 GB</span>
          </div>
        </div>
      </div>

      {/* Urgency / SLA Selector & Power Footprint Pill */}
      <div className="mt-4 pt-3 border-t border-stone-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        {/* Urgency pills */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs font-semibold text-stone-700 flex items-center gap-1 mr-1">
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            Urgency / SLA:
          </span>

          <button
            id="urgency-immediate-btn"
            onClick={() =>
              onChangeWorkload({
                ...workload,
                urgency: "immediate",
                maxDelayHours: 1,
              })
            }
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
              workload.urgency === "immediate"
                ? "bg-red-600 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Strict SLA (&lt; 1h delay)
          </button>

          <button
            id="urgency-moderate-btn"
            onClick={() =>
              onChangeWorkload({
                ...workload,
                urgency: "moderate",
                maxDelayHours: 12,
              })
            }
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
              workload.urgency === "moderate"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Moderate (Flexible 6-12h)
          </button>

          <button
            id="urgency-flexible-btn"
            onClick={() =>
              onChangeWorkload({
                ...workload,
                urgency: "flexible",
                maxDelayHours: 24,
              })
            }
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
              workload.urgency === "flexible"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Flexible (24h Window)
          </button>

          <button
            id="urgency-spot-btn"
            onClick={() =>
              onChangeWorkload({
                ...workload,
                urgency: "batch_spot",
                maxDelayHours: 48,
              })
            }
            className={`text-xs px-2.5 py-1 rounded-md font-medium transition-all ${
              workload.urgency === "batch_spot"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200"
            }`}
          >
            Opportunistic Spot (48h Flex)
          </button>
        </div>

        {/* Compute power metric chip */}
        <div className="flex items-center gap-3 text-xs bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5">
          <div>
            <span className="text-stone-400">Peak Draw:</span>{" "}
            <span className="font-mono font-bold text-stone-800">{peakPowerKw} kW</span>
          </div>
          <div className="w-px h-3 bg-stone-300" />
          <div>
            <span className="text-stone-400">Baseline Energy:</span>{" "}
            <span className="font-mono font-bold text-emerald-700">{baseEnergyKwh} kWh</span>
          </div>
        </div>
      </div>
    </div>
  );
};
