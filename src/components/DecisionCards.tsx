import React from "react";
import {
  Clock,
  MapPin,
  Cpu,
  Zap,
  DollarSign,
  Leaf,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { DispatchDecision } from "../types";

interface DecisionCardsProps {
  decisions: DispatchDecision[];
  recommendedDecision: DispatchDecision;
  onSelectDecision: (decision: DispatchDecision) => void;
  onDispatchTask: (decision: DispatchDecision) => void;
  selectedDecisionId: string;
}

export const DecisionCards: React.FC<DecisionCardsProps> = ({
  decisions,
  recommendedDecision,
  onSelectDecision,
  onDispatchTask,
  selectedDecisionId,
}) => {
  // Find maximum carbon to calculate comparative percentage bars
  const maxCarbon = Math.max(...decisions.map((d) => d.metrics.carbonFootprintKg), 1);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <span>Algorithmic Dispatch Decisions</span>
            <span className="text-xs font-normal text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">
              4 Strategies Evaluated
            </span>
          </h2>
          <p className="text-xs text-stone-500">
            Comparing <span className="font-semibold text-stone-700">When</span>,{" "}
            <span className="font-semibold text-stone-700">Where</span>, and{" "}
            <span className="font-semibold text-stone-700">How</span> to execute the workload
          </p>
        </div>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {decisions.map((decision) => {
          const isSelected = selectedDecisionId === decision.id;
          const isRecommended = decision.id === recommendedDecision.id;
          const carbonBarWidth = Math.max(
            8,
            Math.round((decision.metrics.carbonFootprintKg / maxCarbon) * 100)
          );

          // Card border style based on strategy
          let borderStyle = "border-stone-200 hover:border-stone-300";
          let badgeBg = "bg-stone-100 text-stone-700";

          if (isRecommended) {
            borderStyle = "border-emerald-500 ring-2 ring-emerald-500/20";
            badgeBg = "bg-emerald-600 text-white";
          } else if (decision.id === "run_now") {
            borderStyle = isSelected ? "border-stone-800" : "border-stone-200";
            badgeBg = "bg-stone-800 text-stone-100";
          } else if (decision.id === "temporal_shift") {
            borderStyle = isSelected ? "border-amber-500" : "border-stone-200";
            badgeBg = "bg-amber-600 text-white";
          } else if (decision.id === "spatial_shift") {
            borderStyle = isSelected ? "border-sky-500" : "border-stone-200";
            badgeBg = "bg-sky-600 text-white";
          }

          return (
            <div
              key={decision.id}
              id={`decision-card-${decision.id}`}
              onClick={() => onSelectDecision(decision)}
              className={`bg-white rounded-xl border p-5 transition-all cursor-pointer flex flex-col justify-between shadow-xs ${borderStyle} ${
                isSelected ? "shadow-md bg-stone-50/40" : ""
              }`}
            >
              {/* Top info */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${badgeBg}`}>
                    {decision.recommendedBadge || (decision.id === "run_now" ? "Immediate" : "Alternative")}
                  </span>
                  {decision.metrics.carbonSavingsPercent > 0 && (
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                      -{decision.metrics.carbonSavingsPercent}% CO2
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-stone-900 leading-snug">
                  {decision.title}
                </h3>
                <p className="text-xs text-stone-500 mt-1 line-clamp-2">
                  {decision.description}
                </p>

                {/* Relative Carbon Bar */}
                <div className="mt-3 pt-3 border-t border-stone-100">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-stone-500 font-medium">Carbon Footprint:</span>
                    <span className="font-mono font-bold text-stone-900">
                      {decision.metrics.carbonFootprintKg} kg CO2e
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        decision.id === "run_now"
                          ? "bg-stone-400"
                          : decision.metrics.carbonSavingsPercent >= 50
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${carbonBarWidth}%` }}
                    />
                  </div>
                </div>

                {/* The 3 Dimensions: When, Where, How */}
                <div className="space-y-2 mt-4 text-xs">
                  {/* WHEN */}
                  <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-100">
                    <div className="flex items-center gap-1.5 font-semibold text-stone-700 mb-0.5">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>WHEN:</span>
                      <span className="font-mono text-stone-900 font-bold ml-auto">
                        {decision.when.scheduledTime}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 truncate">
                      {decision.when.windowDescription}
                    </p>
                  </div>

                  {/* WHERE */}
                  <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-100">
                    <div className="flex items-center gap-1.5 font-semibold text-stone-700 mb-0.5">
                      <MapPin className="w-3.5 h-3.5 text-sky-600" />
                      <span>WHERE:</span>
                      <span className="font-medium text-stone-900 ml-auto truncate max-w-[130px]">
                        {decision.where.flag} {decision.where.regionName.split("(")[0].trim()}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 truncate">
                      {decision.where.dataTransferTimeMinutes > 0
                        ? `Sync payload: ${decision.where.dataTransferTimeMinutes}m (${decision.where.dataTransferCarbonKg} kg CO2)`
                        : "Local storage (Zero network egress)"}
                    </p>
                  </div>

                  {/* HOW */}
                  <div className="bg-stone-50 rounded-lg p-2.5 border border-stone-100">
                    <div className="flex items-center gap-1.5 font-semibold text-stone-700 mb-0.5">
                      <Cpu className="w-3.5 h-3.5 text-emerald-600" />
                      <span>HOW:</span>
                      <span className="font-mono text-stone-900 font-bold ml-auto">
                        {decision.how.powerCapTdpPercent}% TDP
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 truncate">
                      {decision.how.precisionMode} • {decision.how.coolingThermodynamics.split("(")[0].trim()}
                    </p>
                  </div>
                </div>

                {/* Financial & Energy Metrics */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-stone-100 text-xs">
                  <div>
                    <span className="text-[11px] text-stone-400">Total Facility Energy</span>
                    <p className="font-mono font-bold text-stone-800">
                      {decision.metrics.totalEnergyKwh} kWh
                    </p>
                    <span className="text-[10px] text-stone-400">
                      Cooling: {decision.metrics.coolingEnergyKwh} kWh
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-stone-400">Estimated Power Cost</span>
                    <p className="font-mono font-bold text-stone-800">
                      ${decision.metrics.financialCostUsd}
                    </p>
                    {decision.metrics.costSavingsPercent > 0 ? (
                      <span className="text-[10px] font-semibold text-emerald-700">
                        Saves {decision.metrics.costSavingsPercent}%
                      </span>
                    ) : (
                      <span className="text-[10px] text-stone-400">Standard rate</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Action Button */}
              <div className="mt-4 pt-3 border-t border-stone-100">
                <button
                  id={`dispatch-btn-${decision.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDispatchTask(decision);
                  }}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-xs ${
                    isRecommended
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-stone-900 hover:bg-stone-800 text-white"
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  <span>Dispatch via This Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
