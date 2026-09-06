import React from "react";
import { Leaf, Cpu, Globe, Zap, Sparkles } from "lucide-react";
import { GridRegion } from "../types";

interface HeaderProps {
  currentRegion: GridRegion;
  allRegions: GridRegion[];
  onSelectRegion: (region: GridRegion) => void;
  onOpenAiInsight: () => void;
  isAiLoading: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentRegion,
  allRegions,
  onSelectRegion,
  onOpenAiInsight,
  isAiLoading,
}) => {
  return (
    <header className="border-b border-stone-200 bg-white/90 backdrop-blur-md sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-stone-900">
                EcoCompute Dispatcher
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Grid-Aware v2.4
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Intelligent scheduler: Deciding <span className="font-semibold text-stone-700">When</span>,{" "}
              <span className="font-semibold text-stone-700">Where</span>, and{" "}
              <span className="font-semibold text-stone-700">How</span> to run computing tasks
            </p>
          </div>
        </div>

        {/* Region & AI actions */}
        <div className="flex items-center flex-wrap gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {/* Origin Region Selector */}
          <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg px-2.5 py-1.5 text-xs text-stone-700">
            <Globe className="w-3.5 h-3.5 text-stone-500" />
            <span className="text-stone-500 hidden sm:inline">Origin:</span>
            <select
              id="origin-region-select"
              value={currentRegion.id}
              onChange={(e) => {
                const found = allRegions.find((r) => r.id === e.target.value);
                if (found) onSelectRegion(found);
              }}
              className="bg-transparent font-medium text-stone-800 cursor-pointer focus:outline-hidden"
            >
              {allRegions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.flag} {r.name} ({r.currentCarbonIntensity} g/kWh)
                </option>
              ))}
            </select>
          </div>

          {/* Quick telemetry chips */}
          <div className="hidden lg:flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 rounded-md text-stone-700">
              <Zap className="w-3 h-3 text-amber-600" />
              <span>{currentRegion.currentCarbonIntensity} gCO2/kWh</span>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 bg-stone-100 rounded-md text-stone-700">
              <Cpu className="w-3 h-3 text-sky-600" />
              <span>PUE {currentRegion.pue.toFixed(2)}</span>
            </div>
          </div>

          {/* AI Advisor Button */}
          <button
            id="open-gemini-ai-button"
            onClick={onOpenAiInsight}
            disabled={isAiLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-xs disabled:opacity-50"
          >
            <Sparkles className={`w-3.5 h-3.5 text-amber-300 ${isAiLoading ? "animate-spin" : ""}`} />
            <span>{isAiLoading ? "Analyzing..." : "Gemini AI Synthesis"}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
