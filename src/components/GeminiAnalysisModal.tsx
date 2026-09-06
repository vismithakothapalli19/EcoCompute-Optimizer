import React from "react";
import { Sparkles, X, CheckCircle, RefreshCw, Cpu, Leaf, ShieldAlert } from "lucide-react";
import { DispatchDecision, WorkloadConfig, GridRegion } from "../types";

interface GeminiAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysisText: string | null;
  isLoading: boolean;
  onRefresh: () => void;
  workload: WorkloadConfig;
  recommendedDecision: DispatchDecision;
  localRegion: GridRegion;
}

export const GeminiAnalysisModal: React.FC<GeminiAnalysisModalProps> = ({
  isOpen,
  onClose,
  analysisText,
  isLoading,
  onRefresh,
  workload,
  recommendedDecision,
  localRegion,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 relative max-h-[90vh] flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-stone-100 shrink-0">
          <div className="p-2.5 rounded-xl bg-stone-900 text-amber-300 shadow-xs">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-stone-900">
                Gemini AI Green Computing Synthesis
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-semibold">
                gemini-3.8-flash
              </span>
            </div>
            <p className="text-xs text-stone-500">
              Thermodynamic analysis, silicon efficiency, and load shifting recommendations
            </p>
          </div>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto flex-1 pr-1 space-y-4 text-xs leading-relaxed text-stone-700">
          {/* Quick context summary banner */}
          <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/70 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-[10px] text-stone-400">Target Workload</span>
              <p className="font-semibold text-stone-800 truncate">{workload.name}</p>
            </div>
            <div>
              <span className="text-[10px] text-stone-400">Current Grid</span>
              <p className="font-semibold text-stone-800">
                {localRegion.currentCarbonIntensity} g/kWh ({localRegion.name.split("(")[0]})
              </p>
            </div>
            <div>
              <span className="text-[10px] text-stone-400">Top Algorithmic Match</span>
              <p className="font-semibold text-emerald-700 truncate">{recommendedDecision.title}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-stone-500">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin" />
              <p className="text-xs font-medium">
                Gemini 3.8 Flash is synthesizing grid telemetry and silicon thermodynamic models...
              </p>
            </div>
          ) : analysisText ? (
            <div className="bg-stone-50/70 rounded-xl p-4 border border-stone-200/80 font-sans whitespace-pre-line text-stone-800 leading-relaxed">
              {analysisText}
            </div>
          ) : (
            <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800">
              <p className="font-semibold mb-1">Algorithmic Optimization Active</p>
              <p className="text-xs">
                To enable deep multi-variable reasoning via Gemini 3.8 Flash, connect your Gemini API key in the AI Studio settings. In the meantime, full deterministic thermodynamic modeling is active.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between shrink-0">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Re-evaluate Synthesis</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-stone-900 text-white hover:bg-stone-800 transition-colors shadow-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
