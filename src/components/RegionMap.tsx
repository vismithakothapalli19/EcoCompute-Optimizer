import React, { useState, useMemo } from "react";
import { GridRegion, WorkloadConfig } from "../types";
import {
  Globe,
  ArrowRight,
  ArrowLeftRight,
  Scale,
  Zap,
  Thermometer,
  TrendingDown,
  Clock,
  DollarSign,
  CheckCircle2,
  Sparkles,
  Layers,
  AlertTriangle,
} from "lucide-react";

interface RegionMapProps {
  regions: GridRegion[];
  currentRegion: GridRegion;
  workload: WorkloadConfig;
  onSelectTargetRegion: (region: GridRegion) => void;
}

export const RegionMap: React.FC<RegionMapProps> = ({
  regions,
  currentRegion,
  workload,
  onSelectTargetRegion,
}) => {
  // A/B Comparison state
  const [isAbMode, setIsAbMode] = useState<boolean>(false);
  const [regionAId, setRegionAId] = useState<string>(currentRegion.id);
  const [regionBId, setRegionBId] = useState<string>(() => {
    // Default region B to the cleanest candidate that isn't region A
    const otherRegions = regions.filter((r) => r.id !== currentRegion.id);
    const cleanest = [...otherRegions].sort(
      (a, b) => a.currentCarbonIntensity - b.currentCarbonIntensity
    )[0];
    return cleanest ? cleanest.id : regions[1]?.id || regions[0].id;
  });

  // Keep Region A in sync if currentRegion changes externally
  React.useEffect(() => {
    setRegionAId(currentRegion.id);
  }, [currentRegion.id]);

  const regionA = useMemo(
    () => regions.find((r) => r.id === regionAId) || currentRegion,
    [regions, regionAId, currentRegion]
  );

  const regionB = useMemo(
    () => regions.find((r) => r.id === regionBId) || regions[1] || currentRegion,
    [regions, regionBId, currentRegion]
  );

  // Calculate detailed A/B carbon and thermodynamic metrics for the current workload
  const comparison = useMemo(() => {
    // Compute Energy (kWh) = Hardware Power (kW) * Hours * PUE
    const computeEnergyA = workload.totalPowerKw * workload.durationHours * regionA.pue;
    const computeEnergyB = workload.totalPowerKw * workload.durationHours * regionB.pue;

    // Direct Compute Carbon (kg CO2e) = (kWh * g/kWh) / 1000
    const carbonA = (computeEnergyA * regionA.currentCarbonIntensity) / 1000;
    const carbonB = (computeEnergyB * regionB.currentCarbonIntensity) / 1000;

    // Data Transfer Penalty for Region B (if remote: ~0.015 kWh/GB cloud network energy)
    const isRemoteTransfer = regionA.id !== regionB.id;
    const transferEnergyKwh = isRemoteTransfer ? workload.dataSizeGb * 0.015 : 0;
    const transferCarbonKg = (transferEnergyKwh * regionA.currentCarbonIntensity) / 1000;
    const transferTimeMinutes = isRemoteTransfer
      ? Math.max(1, Math.round((workload.dataSizeGb / 70) * 10) / 10)
      : 0;

    const totalCarbonA = carbonA;
    const totalCarbonB = carbonB + transferCarbonKg;

    const netCarbonDeltaKg = totalCarbonA - totalCarbonB;
    const percentSavings = totalCarbonA > 0 ? (netCarbonDeltaKg / totalCarbonA) * 100 : 0;

    // Cost calculation (USD)
    const costA = computeEnergyA * regionA.electricityPriceUsdKwh;
    const costB = computeEnergyB * regionB.electricityPriceUsdKwh;
    const costDelta = costA - costB;

    // Break-even minutes (time to recoup network transfer carbon on clean grid)
    const hourlyRateDiff =
      (workload.totalPowerKw * regionA.pue * regionA.currentCarbonIntensity) / 1000 -
      (workload.totalPowerKw * regionB.pue * regionB.currentCarbonIntensity) / 1000;
    const breakEvenMinutes =
      hourlyRateDiff > 0 && transferCarbonKg > 0
        ? Math.round((transferCarbonKg / hourlyRateDiff) * 60)
        : 0;

    return {
      computeEnergyA: Math.round(computeEnergyA * 10) / 10,
      computeEnergyB: Math.round(computeEnergyB * 10) / 10,
      totalCarbonA: Math.round(totalCarbonA * 10) / 10,
      totalCarbonB: Math.round(totalCarbonB * 10) / 10,
      netCarbonDeltaKg: Math.round(netCarbonDeltaKg * 10) / 10,
      percentSavings: Math.round(percentSavings * 10) / 10,
      costA: Math.round(costA * 100) / 100,
      costB: Math.round(costB * 100) / 100,
      costDelta: Math.round(costDelta * 100) / 100,
      transferTimeMinutes,
      transferCarbonKg: Math.round(transferCarbonKg * 100) / 100,
      breakEvenMinutes,
    };
  }, [workload, regionA, regionB]);

  const swapRegions = () => {
    const temp = regionAId;
    setRegionAId(regionBId);
    setRegionBId(temp);
  };

  // Max carbon for comparative bar scale
  const maxIntensity = Math.max(regionA.currentCarbonIntensity, regionB.currentCarbonIntensity, 100);

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs">
      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <Globe className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-stone-900 tracking-tight">
              Global Cloud Datacenter Telemetry & Spatial Shift
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
              Spatial Load Balancing
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-0.5">
            Compare regional grid carbon, cooling thermodynamics, and data transfer penalties for cross-region migration
          </p>
        </div>

        {/* View Mode Toggle: Grid Overview vs A/B Side-by-Side Comparison */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-0.5 rounded-lg border border-stone-200 text-xs shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setIsAbMode(false)}
            className={`px-3 py-1.5 rounded-md transition-all font-medium flex items-center gap-1.5 ${
              !isAbMode
                ? "bg-white text-stone-900 shadow-xs font-semibold"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Regional Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAbMode(true)}
            className={`px-3 py-1.5 rounded-md transition-all font-medium flex items-center gap-1.5 ${
              isAbMode
                ? "bg-emerald-600 text-white shadow-xs font-semibold"
                : "text-stone-500 hover:text-stone-800"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>A/B Comparison</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: A/B SIDE-BY-SIDE COMPARISON CHART & BENCHMARK */}
      {/* ========================================================================= */}
      {isAbMode ? (
        <div className="space-y-4">
          {/* Region Selector Controls Bar */}
          <div className="bg-stone-50 rounded-xl p-3.5 border border-stone-200/80 flex flex-col md:flex-row items-center justify-between gap-3">
            {/* Region A Selector */}
            <div className="flex-1 w-full flex items-center gap-2">
              <span className="text-xs font-bold text-stone-700 bg-stone-200 px-2 py-1 rounded-md shrink-0">
                Region A
              </span>
              <select
                value={regionAId}
                onChange={(e) => setRegionAId(e.target.value)}
                className="flex-1 bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {regions.map((r) => (
                  <option key={`a-${r.id}`} value={r.id}>
                    {r.flag} {r.name} ({r.currentCarbonIntensity} g/kWh)
                  </option>
                ))}
              </select>
            </div>

            {/* Swap Button */}
            <button
              type="button"
              onClick={swapRegions}
              title="Swap Region A and B"
              className="p-2 rounded-lg bg-white border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 shadow-xs transition-colors shrink-0"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>

            {/* Region B Selector */}
            <div className="flex-1 w-full flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-1 rounded-md shrink-0">
                Region B
              </span>
              <select
                value={regionBId}
                onChange={(e) => setRegionBId(e.target.value)}
                className="flex-1 bg-white border border-stone-300 rounded-lg px-3 py-1.5 text-xs font-semibold text-stone-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {regions.map((r) => (
                  <option key={`b-${r.id}`} value={r.id}>
                    {r.flag} {r.name} ({r.currentCarbonIntensity} g/kWh)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Verdict Banner */}
          <div
            className={`rounded-xl p-4 border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              comparison.percentSavings > 0
                ? "bg-emerald-50/70 border-emerald-200 text-emerald-950"
                : comparison.percentSavings < 0
                ? "bg-amber-50/70 border-amber-200 text-amber-950"
                : "bg-stone-50 border-stone-200 text-stone-800"
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                  comparison.percentSavings > 0
                    ? "bg-emerald-600 text-white"
                    : "bg-amber-600 text-white"
                }`}
              >
                {comparison.percentSavings > 0 ? (
                  <TrendingDown className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold uppercase tracking-wider">
                    A/B Comparison Verdict:
                  </span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-white/80 border font-mono">
                    {comparison.percentSavings > 0
                      ? `Region B saves ${comparison.percentSavings}% carbon`
                      : comparison.percentSavings < 0
                      ? `Region A is ${Math.abs(comparison.percentSavings)}% cleaner`
                      : "Identical emissions"}
                  </span>
                </div>
                <p className="text-xs mt-1 leading-relaxed">
                  {comparison.percentSavings > 0 ? (
                    <>
                      Executing <strong>{workload.name}</strong> in <strong>{regionB.name}</strong>{" "}
                      instead of <strong>{regionA.name}</strong> eliminates{" "}
                      <strong>{comparison.netCarbonDeltaKg} kg CO2e</strong>
                      {comparison.costDelta > 0 && (
                        <span> and saves <strong>${comparison.costDelta}</strong> in power costs</span>
                      )}
                      {comparison.transferTimeMinutes > 0 ? (
                        <span> (transfer amortized within {comparison.breakEvenMinutes}m)</span>
                      ) : (
                        ""
                      )}.
                    </>
                  ) : (
                    <>
                      Executing in <strong>{regionA.name}</strong> currently delivers better carbon
                      efficiency than migrating to <strong>{regionB.name}</strong>.
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Quick Adopt Action */}
            <button
              type="button"
              onClick={() => onSelectTargetRegion(regionB)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-700 text-white hover:bg-emerald-800 shadow-xs transition-colors shrink-0 flex items-center gap-1.5"
            >
              <span>Adopt Region B</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Side-by-Side Comparative Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* REGION A CARD */}
            <div className="bg-stone-50/70 rounded-xl border border-stone-200 p-4 flex flex-col justify-between">
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-stone-200">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label="flag">
                      {regionA.flag}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-stone-200 text-stone-700">
                          Option A
                        </span>
                        <h4 className="text-sm font-bold text-stone-900">{regionA.name}</h4>
                      </div>
                      <span className="text-[11px] font-mono text-stone-500">
                        {regionA.code} • {regionA.provider}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block">Carbon Intensity</span>
                    <span className="text-lg font-bold font-mono text-stone-900">
                      {regionA.currentCarbonIntensity}{" "}
                      <span className="text-[11px] font-normal text-stone-500">g/kWh</span>
                    </span>
                  </div>
                </div>

                {/* Visual Intensity Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                    <span>Grid Carbon Intensity</span>
                    <span className="font-mono font-bold text-stone-700">
                      {regionA.currentCarbonIntensity} gCO2/kWh
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        regionA.currentCarbonIntensity < 100
                          ? "bg-emerald-500"
                          : regionA.currentCarbonIntensity > 300
                          ? "bg-red-500"
                          : "bg-amber-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (regionA.currentCarbonIntensity / maxIntensity) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Workload Emissions Breakdown */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-stone-200/80 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200/80">
                    <span className="text-[10px] text-stone-400 block">Workload Emissions</span>
                    <div className="text-base font-bold font-mono text-stone-900 mt-0.5">
                      {comparison.totalCarbonA}{" "}
                      <span className="text-[11px] font-normal text-stone-500">kg CO2e</span>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-stone-200/80">
                    <span className="text-[10px] text-stone-400 block">Energy Power Cost</span>
                    <div className="text-base font-bold font-mono text-stone-900 mt-0.5">
                      ${comparison.costA}
                    </div>
                  </div>
                </div>

                {/* Telemetry Details */}
                <div className="space-y-1.5 mt-3 text-xs text-stone-600">
                  <div className="flex justify-between items-center py-1 border-b border-stone-200/50">
                    <span className="text-stone-500 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      Clean Energy Share
                    </span>
                    <span className="font-bold text-stone-800">{regionA.renewablePercent}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-200/50">
                    <span className="text-stone-500 flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                      Ambient & PUE
                    </span>
                    <span className="font-mono text-stone-800">
                      {regionA.ambientTempC}°C (PUE {regionA.pue.toFixed(2)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-200/50">
                    <span className="text-stone-500">Cooling System</span>
                    <span className="text-stone-700 truncate max-w-[180px]" title={regionA.coolingMode}>
                      {regionA.coolingMode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-stone-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      Payload Ingress Latency
                    </span>
                    <span className="font-mono text-stone-800">
                      {regionA.id === currentRegion.id ? "0 min (Local Storage)" : "Backbone Transfer"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Select button */}
              <button
                type="button"
                onClick={() => onSelectTargetRegion(regionA)}
                className="mt-4 w-full py-1.5 rounded-lg border border-stone-300 text-xs font-semibold text-stone-700 hover:bg-white transition-colors"
              >
                Set as Active Origin
              </button>
            </div>

            {/* REGION B CARD */}
            <div className="bg-emerald-50/30 rounded-xl border border-emerald-300/80 p-4 flex flex-col justify-between ring-1 ring-emerald-400/20">
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 pb-3 border-b border-emerald-200/70">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl" role="img" aria-label="flag">
                      {regionB.flag}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Option B (Candidate)
                        </span>
                        <h4 className="text-sm font-bold text-stone-900">{regionB.name}</h4>
                      </div>
                      <span className="text-[11px] font-mono text-stone-500">
                        {regionB.code} • {regionB.provider}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-stone-400 block">Carbon Intensity</span>
                    <span className="text-lg font-bold font-mono text-emerald-700">
                      {regionB.currentCarbonIntensity}{" "}
                      <span className="text-[11px] font-normal text-stone-500">g/kWh</span>
                    </span>
                  </div>
                </div>

                {/* Visual Intensity Bar */}
                <div className="mt-3">
                  <div className="flex justify-between text-[11px] text-stone-500 mb-1">
                    <span>Grid Carbon Intensity</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {regionB.currentCarbonIntensity} gCO2/kWh
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        regionB.currentCarbonIntensity < 100
                          ? "bg-emerald-500"
                          : regionB.currentCarbonIntensity > 300
                          ? "bg-red-500"
                          : "bg-amber-500"
                      }`}
                      style={{
                        width: `${Math.min(
                          100,
                          (regionB.currentCarbonIntensity / maxIntensity) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Workload Emissions Breakdown */}
                <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-emerald-200/70 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-stone-400 block">Workload Emissions</span>
                      {comparison.percentSavings > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 font-mono">
                          -{comparison.percentSavings}%
                        </span>
                      )}
                    </div>
                    <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                      {comparison.totalCarbonB}{" "}
                      <span className="text-[11px] font-normal text-stone-500">kg CO2e</span>
                    </div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-emerald-200">
                    <span className="text-[10px] text-stone-400 block">Energy Power Cost</span>
                    <div className="text-base font-bold font-mono text-stone-900 mt-0.5">
                      ${comparison.costB}
                    </div>
                  </div>
                </div>

                {/* Telemetry Details */}
                <div className="space-y-1.5 mt-3 text-xs text-stone-600">
                  <div className="flex justify-between items-center py-1 border-b border-stone-200/50">
                    <span className="text-stone-500 flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      Clean Energy Share
                    </span>
                    <span className="font-bold text-stone-800">{regionB.renewablePercent}%</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-200/50">
                    <span className="text-stone-500 flex items-center gap-1">
                      <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                      Ambient & PUE
                    </span>
                    <span className="font-mono text-stone-800">
                      {regionB.ambientTempC}°C (PUE {regionB.pue.toFixed(2)})
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-stone-200/50">
                    <span className="text-stone-500">Cooling System</span>
                    <span className="text-stone-700 truncate max-w-[180px]" title={regionB.coolingMode}>
                      {regionB.coolingMode}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-stone-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      Payload Ingress Latency
                    </span>
                    <span className="font-mono text-stone-800">
                      {regionB.id === currentRegion.id
                        ? "0 min (Local Storage)"
                        : `${comparison.transferTimeMinutes}m sync (${workload.dataSizeGb}GB)`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Select button */}
              <button
                type="button"
                onClick={() => onSelectTargetRegion(regionB)}
                className="mt-4 w-full py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-xs"
              >
                Migrate Workload to Region B
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: FULL REGIONAL MATRIX GRID (All 6 Data Centers) */
        /* ========================================================================= */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {regions.map((region) => {
            const isOrigin = region.id === currentRegion.id;
            const transferMinutes = Math.max(
              1,
              Math.round((workload.dataSizeGb / 70) * 10) / 10
            );
            const isClean = region.currentCarbonIntensity < 100;
            const isDirty = region.currentCarbonIntensity > 350;

            return (
              <div
                key={region.id}
                id={`region-card-${region.id}`}
                onClick={() => onSelectTargetRegion(region)}
                className={`rounded-xl border p-4 transition-all cursor-pointer flex flex-col justify-between ${
                  isOrigin
                    ? "bg-emerald-50/40 border-emerald-300 ring-1 ring-emerald-400/30"
                    : "bg-stone-50/70 border-stone-200 hover:border-stone-300 hover:bg-white"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl" role="img" aria-label="flag">
                        {region.flag}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-stone-900 leading-tight">
                          {region.name}
                        </h4>
                        <span className="text-[10px] font-mono text-stone-500">
                          {region.code} • {region.provider}
                        </span>
                      </div>
                    </div>

                    {isOrigin && (
                      <span className="text-[10px] font-semibold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                        Current Origin
                      </span>
                    )}
                  </div>

                  {/* Carbon & Clean Energy */}
                  <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-stone-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400">Carbon Intensity</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isClean
                              ? "text-emerald-700"
                              : isDirty
                              ? "text-red-700"
                              : "text-amber-700"
                          }`}
                        >
                          {region.currentCarbonIntensity}
                        </span>
                        <span className="text-[10px] text-stone-500">g/kWh</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] text-stone-400">Clean Energy</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="font-mono font-bold text-sm text-stone-800">
                          {region.renewablePercent}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Climate & Cooling */}
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-[10px] text-stone-400">Ambient / PUE</span>
                      <div className="text-[11px] font-mono text-stone-700 mt-0.5">
                        {region.ambientTempC}°C (PUE {region.pue.toFixed(2)})
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-400">Cooling Method</span>
                      <div className="text-[11px] text-stone-700 mt-0.5 truncate" title={region.coolingMode}>
                        {region.coolingMode}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ingress / Migration Cost & Compare shortcut */}
                <div className="mt-3 pt-2.5 border-t border-stone-200/60 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-stone-500">
                    {isOrigin
                      ? "Local storage (0ms sync)"
                      : `${transferMinutes}m sync (${workload.dataSizeGb}GB)`}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setRegionBId(region.id);
                        setIsAbMode(true);
                      }}
                      className="text-[11px] text-stone-500 hover:text-stone-800 flex items-center gap-0.5"
                    >
                      <Scale className="w-3 h-3" />
                      <span>Compare</span>
                    </button>

                    <button
                      type="button"
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                    >
                      {isOrigin ? "Active" : "Migrate"}
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
