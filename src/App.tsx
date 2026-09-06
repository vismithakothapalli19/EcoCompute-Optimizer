import React, { useState, useMemo, useEffect } from "react";
import { GLOBAL_REGIONS, generate24HourForecast, generateHistoricalTelemetry } from "./data/gridData";
import { PRESET_WORKLOADS } from "./data/presets";
import { GridRegion, WorkloadConfig, DispatchDecision } from "./types";
import { evaluateWorkloadDecisions } from "./utils/dispatchEngine";
import { Header } from "./components/Header";
import { CarbonEquivalentsBanner } from "./components/CarbonEquivalentsBanner";
import { WorkloadConfigurator } from "./components/WorkloadConfigurator";
import { GridFactorCheck } from "./components/GridFactorCheck";
import { DecisionCards } from "./components/DecisionCards";
import { ForecastChart } from "./components/ForecastChart";
import { RegionMap } from "./components/RegionMap";
import { DispatchSimulator } from "./components/DispatchSimulator";
import { GeminiAnalysisModal } from "./components/GeminiAnalysisModal";

export default function App() {
  // Origin region (default US East - high carbon baseline to illustrate optimization)
  const [originRegion, setOriginRegion] = useState<GridRegion>(GLOBAL_REGIONS[0]);

  // Current workload specification
  const [workload, setWorkload] = useState<WorkloadConfig>(PRESET_WORKLOADS[0]);

  // 24-Hour forecast for current origin
  const forecast = useMemo(() => {
    return generate24HourForecast(originRegion);
  }, [originRegion]);

  // Historical recorded telemetry (past 12 hours) for current origin
  const historical = useMemo(() => {
    return generateHistoricalTelemetry(originRegion, 12);
  }, [originRegion]);

  // Evaluate decisions (When, Where, How)
  const analysis = useMemo(() => {
    return evaluateWorkloadDecisions(workload, originRegion, GLOBAL_REGIONS, forecast);
  }, [workload, originRegion, forecast]);

  // Selected decision for detailed view or simulation
  const [selectedDecisionId, setSelectedDecisionId] = useState<string>(
    analysis.recommendedDecision.id
  );

  // Keep selected decision in sync when recommended updates
  useEffect(() => {
    setSelectedDecisionId(analysis.recommendedDecision.id);
  }, [analysis.recommendedDecision.id]);

  const activeDecision = useMemo(() => {
    return (
      analysis.decisions.find((d) => d.id === selectedDecisionId) ||
      analysis.recommendedDecision
    );
  }, [analysis, selectedDecisionId]);

  // Dispatch Simulator Modal state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [simulatedDecision, setSimulatedDecision] = useState<DispatchDecision | null>(null);

  // Gemini AI Analysis Modal state
  const [isGeminiModalOpen, setIsGeminiModalOpen] = useState<boolean>(false);
  const [geminiAnalysisText, setGeminiAnalysisText] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  // Fetch AI optimization from /api/gemini/optimize
  const fetchGeminiOptimization = async () => {
    setIsAiLoading(true);
    setIsGeminiModalOpen(true);
    try {
      const response = await fetch("/api/gemini/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workload,
          candidates: analysis.decisions,
          telemetry: {
            localRegion: originRegion,
            forecast: forecast.slice(0, 6),
          },
        }),
      });

      const data = await response.json();
      if (data.success && data.analysis) {
        setGeminiAnalysisText(data.analysis);
      } else {
        setGeminiAnalysisText(
          `Decision Recommendation: Proceed with ${analysis.recommendedDecision.title}.\n\n` +
            `Thermodynamic Assessment:\n` +
            `• Ambient temperature at ${originRegion.ambientTempC}°C requires active mechanical refrigeration in ${originRegion.name}, incurring an extra ${Math.round((originRegion.pue - 1.0) * 100)}% power overhead.\n` +
            `• Shifting execution avoids peaker plant thermal emissions and cuts overall carbon intensity by ${analysis.recommendedDecision.metrics.carbonSavingsPercent}%.\n\n` +
            `Directives:\n` +
            `• Enforce ${analysis.recommendedDecision.how.powerCapTdpPercent}% TDP power limit via DVFS to avoid thermal throttling.\n` +
            `• Set checkpoint interval to 30 minutes for carbon-aware interruption resilience.`
        );
      }
    } catch (err) {
      console.error("Failed to fetch Gemini optimization:", err);
      setGeminiAnalysisText(
        `Algorithmic Optimization Ready:\n\n` +
          `Recommended Strategy: ${analysis.recommendedDecision.title}\n` +
          `• When: ${analysis.recommendedDecision.when.scheduledTime}\n` +
          `• Where: ${analysis.recommendedDecision.where.regionName}\n` +
          `• How: ${analysis.recommendedDecision.how.precisionMode} with ${analysis.recommendedDecision.how.powerCapTdpPercent}% TDP power limit\n\n` +
          `Projected Impact: Saves ${analysis.equivalents.kgCo2Saved} kg CO2e (${analysis.recommendedDecision.metrics.carbonSavingsPercent}% reduction) and $${analysis.equivalents.dollarSaved} in operational energy cost.`
      );
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleOpenDispatch = (decision: DispatchDecision) => {
    setSimulatedDecision(decision);
    setIsSimulatorOpen(true);
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900 flex flex-col font-sans selection:bg-emerald-200">
      {/* Top Header */}
      <Header
        currentRegion={originRegion}
        allRegions={GLOBAL_REGIONS}
        onSelectRegion={setOriginRegion}
        onOpenAiInsight={fetchGeminiOptimization}
        isAiLoading={isAiLoading}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Impact & Recommendation Banner */}
        <CarbonEquivalentsBanner
          equivalents={analysis.equivalents}
          recommendedDecision={analysis.recommendedDecision}
          summaryReasoning={analysis.summaryReasoning}
        />

        {/* Task Specification & Urgency Control */}
        <WorkloadConfigurator
          workload={workload}
          onChangeWorkload={setWorkload}
          onSelectPreset={setWorkload}
        />

        {/* Real-Time Environmental & Grid Telemetry Audit (The 6 Factors) */}
        <GridFactorCheck region={originRegion} workload={workload} />

        {/* The 4 Algorithmic Dispatch Decisions: When, Where, How */}
        <DecisionCards
          decisions={analysis.decisions}
          recommendedDecision={analysis.recommendedDecision}
          onSelectDecision={(d) => setSelectedDecisionId(d.id)}
          onDispatchTask={handleOpenDispatch}
          selectedDecisionId={selectedDecisionId}
        />

        {/* Temporal Forecast (24-Hour Horizon) with Carbon Intensity Trend Overlay */}
        <ForecastChart
          forecast={forecast}
          region={originRegion}
          historical={historical}
        />

        {/* Spatial Matrix (Global Regional Migration) */}
        <RegionMap
          regions={GLOBAL_REGIONS}
          currentRegion={originRegion}
          workload={workload}
          onSelectTargetRegion={(reg) => setOriginRegion(reg)}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white py-4 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700">EcoCompute Dispatcher</span>
            <span>•</span>
            <span>Carbon-Aware Compute Scheduling (When, Where, How)</span>
          </div>
          <div className="text-stone-400">
            Compliant with Green Software Foundation (GSF) SCI Specification
          </div>
        </div>
      </footer>

      {/* Dispatch Simulator Modal */}
      {isSimulatorOpen && simulatedDecision && (
        <DispatchSimulator
          decision={simulatedDecision}
          workload={workload}
          equivalents={analysis.equivalents}
          onClose={() => setIsSimulatorOpen(false)}
        />
      )}

      {/* Gemini AI Synthesis Modal */}
      <GeminiAnalysisModal
        isOpen={isGeminiModalOpen}
        onClose={() => setIsGeminiModalOpen(false)}
        analysisText={geminiAnalysisText}
        isLoading={isAiLoading}
        onRefresh={fetchGeminiOptimization}
        workload={workload}
        recommendedDecision={analysis.recommendedDecision}
        localRegion={originRegion}
      />
    </div>
  );
}
