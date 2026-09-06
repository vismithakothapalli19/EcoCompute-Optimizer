import React from "react";
import { CarbonEquivalents, DispatchDecision } from "../types";
import { Leaf, Car, Trees, BatteryCharging, DollarSign, CheckCircle2 } from "lucide-react";

interface CarbonEquivalentsBannerProps {
  equivalents: CarbonEquivalents;
  recommendedDecision: DispatchDecision;
  summaryReasoning: string;
}

export const CarbonEquivalentsBanner: React.FC<CarbonEquivalentsBannerProps> = ({
  equivalents,
  recommendedDecision,
  summaryReasoning,
}) => {
  return (
    <div className="bg-gradient-to-r from-emerald-900 via-stone-900 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-800/40">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Left side: Primary Decision Badge & Impact */}
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Optimal Dispatch Strategy Identified
            </span>
            {recommendedDecision.metrics.carbonSavingsPercent > 0 && (
              <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-700/50">
                -{recommendedDecision.metrics.carbonSavingsPercent}% Carbon Footprint
              </span>
            )}
          </div>

          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {recommendedDecision.title}
          </h2>

          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            {summaryReasoning}
          </p>

          <div className="flex items-center gap-4 text-xs text-stone-300 pt-1">
            <div>
              <span className="text-stone-400">Scheduled:</span>{" "}
              <span className="font-semibold text-white">{recommendedDecision.when.scheduledTime}</span>
            </div>
            <div className="w-1 h-1 rounded-full bg-stone-500" />
            <div>
              <span className="text-stone-400">Target Region:</span>{" "}
              <span className="font-semibold text-white">
                {recommendedDecision.where.flag} {recommendedDecision.where.regionName.split("(")[0]}
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Real-World Carbon Equivalency Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0">
          {/* Carbon avoided */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-300 mb-1">
              <Leaf className="w-3.5 h-3.5" />
              <span>CO2e Avoided</span>
            </div>
            <div className="text-lg font-black font-mono text-white">
              {equivalents.kgCo2Saved}{" "}
              <span className="text-xs font-normal text-stone-400">kg</span>
            </div>
          </div>

          {/* Dollar savings */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-[11px] text-amber-300 mb-1">
              <DollarSign className="w-3.5 h-3.5" />
              <span>Cost Saved</span>
            </div>
            <div className="text-lg font-black font-mono text-white">
              ${equivalents.dollarSaved}
            </div>
          </div>

          {/* Vehicle miles */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-[11px] text-sky-300 mb-1">
              <Car className="w-3.5 h-3.5" />
              <span>Gas Car Miles</span>
            </div>
            <div className="text-lg font-black font-mono text-white">
              {equivalents.milesDrivenEquivalent}{" "}
              <span className="text-xs font-normal text-stone-400">mi</span>
            </div>
          </div>

          {/* Tree absorption */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 backdrop-blur-xs">
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 mb-1">
              <Trees className="w-3.5 h-3.5" />
              <span>Tree Years</span>
            </div>
            <div className="text-lg font-black font-mono text-white">
              {equivalents.treesYearEquivalent}{" "}
              <span className="text-xs font-normal text-stone-400">yrs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
