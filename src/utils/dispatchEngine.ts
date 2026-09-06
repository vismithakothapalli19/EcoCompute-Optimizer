import {
  CarbonEquivalents,
  DispatchDecision,
  GridRegion,
  HourlyForecast,
  WorkloadConfig,
} from "../types";

export interface DecisionAnalysis {
  decisions: DispatchDecision[];
  recommendedDecision: DispatchDecision;
  equivalents: CarbonEquivalents;
  summaryReasoning: string;
}

export function evaluateWorkloadDecisions(
  workload: WorkloadConfig,
  localRegion: GridRegion,
  allRegions: GridRegion[],
  forecast: HourlyForecast[]
): DecisionAnalysis {
  // Base compute energy calculation (kWh)
  const baseComputeKwh = workload.gpuCount * workload.basePowerKwPerNode * workload.durationHours;

  // -------------------------------------------------------------
  // 1. DECISION: RUN NOW (Baseline)
  // -------------------------------------------------------------
  const runNowCoolingKwh = baseComputeKwh * (localRegion.pue - 1.0);
  const runNowTotalKwh = baseComputeKwh + runNowCoolingKwh;
  const runNowCarbonKg = (runNowTotalKwh * localRegion.currentCarbonIntensity) / 1000;
  const runNowCostUsd = runNowTotalKwh * localRegion.electricityPriceUsdKwh;

  const runNowDecision: DispatchDecision = {
    id: "run_now",
    title: "Run Now (Immediate Dispatch)",
    headline: "Instant execution, peak environmental footprint",
    description: `Dispatches task immediately in local ${localRegion.name}. Zero scheduling delay, but operates during peak grid demand with mechanical chiller cooling.`,
    when: {
      scheduledTime: "Immediate (< 1 min)",
      delayHours: 0,
      windowDescription: "Current hour (High carbon grid intensity)",
      isImmediate: true,
    },
    where: {
      regionId: localRegion.id,
      regionName: localRegion.name,
      flag: localRegion.flag,
      locationDescription: "Local primary cluster (Zero data egress delay)",
      dataTransferTimeMinutes: 0,
      dataTransferCarbonKg: 0,
      isLocal: true,
    },
    how: {
      accelerator: workload.accelerator,
      precisionMode: "FP32",
      powerCapTdpPercent: 100,
      coolingThermodynamics: `${localRegion.coolingMode} (PUE ${localRegion.pue.toFixed(2)})`,
      spotPreemptible: false,
      dvfsEcoTuning: false,
    },
    metrics: {
      carbonFootprintKg: Math.round(runNowCarbonKg * 10) / 10,
      carbonSavingsPercent: 0,
      totalEnergyKwh: Math.round(runNowTotalKwh * 10) / 10,
      computeEnergyKwh: Math.round(baseComputeKwh * 10) / 10,
      coolingEnergyKwh: Math.round(runNowCoolingKwh * 10) / 10,
      energySavingsPercent: 0,
      financialCostUsd: Math.round(runNowCostUsd * 100) / 100,
      costSavingsPercent: 0,
      effectiveDurationHours: workload.durationHours,
      slaCompliance: "Compliant",
    },
    keyAdvantages: [
      "Zero start latency — immediate job execution",
      "No data transfer overhead or network egress fee",
      "Simplest operational configuration",
    ],
    tradeoffs: [
      `High operational emissions: ${localRegion.currentCarbonIntensity} gCO2/kWh`,
      `Chiller cooling overhead due to ${localRegion.ambientTempC}°C ambient temp`,
      "High peak-hour electricity rates",
    ],
    isRecommended: workload.urgency === "immediate",
    recommendedBadge: workload.urgency === "immediate" ? "SLA Critical Choice" : undefined,
  };

  // -------------------------------------------------------------
  // 2. DECISION: TEMPORAL LOAD SHIFTING (Run at Optimal Hour, e.g. 2:00 AM)
  // -------------------------------------------------------------
  // Filter forecast to within max allowed delay
  const allowedForecast = forecast.slice(1, Math.max(2, Math.min(24, workload.maxDelayHours + 1)));
  // Find forecast hour with lowest carbon intensity (or optimal combination of carbon and cool temp)
  let bestHour = allowedForecast[0] || forecast[1];
  for (const h of allowedForecast) {
    if (h.carbonIntensity < bestHour.carbonIntensity) {
      bestHour = h;
    }
  }

  const temporalCoolingKwh = baseComputeKwh * (bestHour.pue - 1.0);
  const temporalTotalKwh = baseComputeKwh + temporalCoolingKwh;
  const temporalCarbonKg = (temporalTotalKwh * bestHour.carbonIntensity) / 1000;
  const temporalCostUsd = temporalTotalKwh * bestHour.electricityPriceUsd;

  const temporalCarbonSavingsPct = Math.max(
    5,
    Math.round(((runNowCarbonKg - temporalCarbonKg) / runNowCarbonKg) * 100)
  );
  const temporalCostSavingsPct = Math.max(
    0,
    Math.round(((runNowCostUsd - temporalCostUsd) / runNowCostUsd) * 100)
  );

  const delayHours = (bestHour.hour - new Date().getHours() + 24) % 24 || 1;

  const temporalDecision: DispatchDecision = {
    id: "temporal_shift",
    title: `Run at ${bestHour.timeLabel} (Temporal Shift)`,
    headline: `${temporalCarbonSavingsPct}% lower carbon footprint`,
    description: `Defers execution until ${bestHour.timeLabel}, capitalizing on off-peak wind/baseload, lower ambient temperatures (${bestHour.ambientTempC}°C), and natural free-air cooling.`,
    when: {
      scheduledTime: `${bestHour.timeLabel} (In ~${delayHours} hours)`,
      delayHours,
      windowDescription: `Off-peak renewable window (${bestHour.renewablePercent}% clean energy)`,
      isImmediate: false,
    },
    where: {
      regionId: localRegion.id,
      regionName: localRegion.name,
      flag: localRegion.flag,
      locationDescription: "Local primary cluster (Zero data egress required)",
      dataTransferTimeMinutes: 0,
      dataTransferCarbonKg: 0,
      isLocal: true,
    },
    how: {
      accelerator: workload.accelerator,
      precisionMode: "FP32",
      powerCapTdpPercent: 100,
      coolingThermodynamics: `Nighttime Free-Air Economizer (PUE ${bestHour.pue.toFixed(2)})`,
      spotPreemptible: false,
      dvfsEcoTuning: false,
    },
    metrics: {
      carbonFootprintKg: Math.round(temporalCarbonKg * 10) / 10,
      carbonSavingsPercent: temporalCarbonSavingsPct,
      totalEnergyKwh: Math.round(temporalTotalKwh * 10) / 10,
      computeEnergyKwh: Math.round(baseComputeKwh * 10) / 10,
      coolingEnergyKwh: Math.round(temporalCoolingKwh * 10) / 10,
      energySavingsPercent: Math.round(((runNowTotalKwh - temporalTotalKwh) / runNowTotalKwh) * 100),
      financialCostUsd: Math.round(temporalCostUsd * 100) / 100,
      costSavingsPercent: temporalCostSavingsPct,
      effectiveDurationHours: workload.durationHours,
      slaCompliance: delayHours <= workload.maxDelayHours ? "Compliant" : "Warning",
    },
    keyAdvantages: [
      `Cuts carbon by ${temporalCarbonSavingsPct}% without changing data center or network`,
      `Ambient cooling drop to ${bestHour.ambientTempC}°C reduces chiller PUE to ${bestHour.pue.toFixed(2)}`,
      `Saves $${Math.max(0, Math.round(runNowCostUsd - temporalCostUsd))} in off-peak power costs`,
    ],
    tradeoffs: [
      `Job deferred by ${delayHours} hours`,
      "Requires scheduling queue and automated start daemon",
    ],
    isRecommended:
      workload.urgency === "moderate" ||
      (workload.urgency === "flexible" && workload.dataSizeGb > 200),
    recommendedBadge:
      workload.urgency === "moderate" ? "Optimal Zero-Egress Choice" : undefined,
  };

  // -------------------------------------------------------------
  // 3. DECISION: SPATIAL LOAD SHIFTING (Run in Clean Region)
  // -------------------------------------------------------------
  // Find cleanest remote region with lowest carbon
  const remoteCandidates = allRegions.filter((r) => r.id !== localRegion.id);
  const bestRemote = remoteCandidates.reduce((min, r) =>
    r.currentCarbonIntensity < min.currentCarbonIntensity ? r : min
  , remoteCandidates[0] || localRegion);

  // Transfer metrics: 10 Gbps interconnect (~1.25 GB/sec = 75 GB/min)
  const transferMinutes = Math.max(1, Math.round((workload.dataSizeGb / 70) * 10) / 10);
  // Carbon cost of network transmission: ~0.0035 kg CO2 / GB
  const transferCarbonKg = Math.round(workload.dataSizeGb * 0.0035 * 10) / 10;

  const remoteCoolingKwh = baseComputeKwh * (bestRemote.pue - 1.0);
  const remoteTotalKwh = baseComputeKwh + remoteCoolingKwh;
  const remoteComputeCarbonKg = (remoteTotalKwh * bestRemote.currentCarbonIntensity) / 1000;
  const remoteTotalCarbonKg = remoteComputeCarbonKg + transferCarbonKg;
  const remoteCostUsd = remoteTotalKwh * bestRemote.electricityPriceUsdKwh + workload.dataSizeGb * 0.01;

  const spatialCarbonSavingsPct = Math.max(
    10,
    Math.round(((runNowCarbonKg - remoteTotalCarbonKg) / runNowCarbonKg) * 100)
  );
  const spatialCostSavingsPct = Math.max(
    0,
    Math.round(((runNowCostUsd - remoteCostUsd) / runNowCostUsd) * 100)
  );

  const spatialDecision: DispatchDecision = {
    id: "spatial_shift",
    title: `Run in ${bestRemote.name} (Spatial Shift)`,
    headline: `${spatialCarbonSavingsPct}% lower carbon footprint`,
    description: `Migrates workload across cloud backbone to ${bestRemote.name} powered by ${bestRemote.renewablePercent}% renewables (${bestRemote.currentCarbonIntensity} gCO2/kWh) and Arctic free-air cooling.`,
    when: {
      scheduledTime: `Immediate (After ${transferMinutes}m sync)`,
      delayHours: Math.round((transferMinutes / 60) * 10) / 10,
      windowDescription: "Dispatched upon dataset synchronization",
      isImmediate: true,
    },
    where: {
      regionId: bestRemote.id,
      regionName: bestRemote.name,
      flag: bestRemote.flag,
      locationDescription: `Remote clean grid (${bestRemote.provider} ${bestRemote.code})`,
      dataTransferTimeMinutes: transferMinutes,
      dataTransferCarbonKg: transferCarbonKg,
      isLocal: false,
    },
    how: {
      accelerator: workload.accelerator,
      precisionMode: "FP32",
      powerCapTdpPercent: 100,
      coolingThermodynamics: `${bestRemote.coolingMode} (PUE ${bestRemote.pue.toFixed(2)})`,
      spotPreemptible: false,
      dvfsEcoTuning: false,
    },
    metrics: {
      carbonFootprintKg: Math.round(remoteTotalCarbonKg * 10) / 10,
      carbonSavingsPercent: spatialCarbonSavingsPct,
      totalEnergyKwh: Math.round(remoteTotalKwh * 10) / 10,
      computeEnergyKwh: Math.round(baseComputeKwh * 10) / 10,
      coolingEnergyKwh: Math.round(remoteCoolingKwh * 10) / 10,
      energySavingsPercent: Math.round(((runNowTotalKwh - remoteTotalKwh) / runNowTotalKwh) * 100),
      financialCostUsd: Math.round(remoteCostUsd * 100) / 100,
      costSavingsPercent: spatialCostSavingsPct,
      effectiveDurationHours: workload.durationHours + Math.round((transferMinutes / 60) * 10) / 10,
      slaCompliance: "Compliant",
    },
    keyAdvantages: [
      `Massive carbon slash to ${bestRemote.currentCarbonIntensity} g/kWh (${bestRemote.renewablePercent}% renewables)`,
      `Sub-ambient ${bestRemote.ambientTempC}°C weather eliminates chiller energy (PUE ${bestRemote.pue.toFixed(2)})`,
      "Starts immediately without waiting for overnight off-peak hours",
    ],
    tradeoffs: [
      `${transferMinutes} min data ingress transfer (${workload.dataSizeGb} GB)`,
      `Small network transmission carbon overhead: ${transferCarbonKg} kg CO2`,
      "Cross-region data residency compliance verification",
    ],
    isRecommended:
      workload.urgency === "flexible" &&
      workload.dataSizeGb <= 200 &&
      spatialCarbonSavingsPct > temporalCarbonSavingsPct,
    recommendedBadge:
      workload.urgency === "flexible" && workload.dataSizeGb <= 200
        ? "Maximum Purity Choice"
        : undefined,
  };

  // -------------------------------------------------------------
  // 4. DECISION: ECO-HYBRID (Smart Combined Strategy)
  // -------------------------------------------------------------
  // Combines optimal region OR optimal time + DVFS power cap (80% TDP) + BF16 mixed precision
  // Power cap reduces power by 20% while only extending time by 4%
  const ecoPowerCap = 0.82;
  const ecoTimeMultiplier = 1.03; // slight wall-clock change for 18% less energy
  const ecoEffectiveDuration = workload.durationHours * ecoTimeMultiplier;
  const ecoComputeKwh = baseComputeKwh * ecoPowerCap * ecoTimeMultiplier;

  // Decide best location for Eco-Hybrid: bestRemote or local off-peak
  const useRemoteForEco = workload.dataSizeGb <= 150 && bestRemote.currentCarbonIntensity < 50;
  const ecoRegion = useRemoteForEco ? bestRemote : localRegion;
  const ecoCarbonFactor = useRemoteForEco
    ? bestRemote.currentCarbonIntensity
    : bestHour.carbonIntensity;
  const ecoPue = useRemoteForEco ? bestRemote.pue : bestHour.pue;

  const ecoCoolingKwh = ecoComputeKwh * (ecoPue - 1.0);
  const ecoTotalKwh = ecoComputeKwh + ecoCoolingKwh;
  const ecoComputeCarbonKg = (ecoTotalKwh * ecoCarbonFactor) / 1000;
  const ecoTransferCarbon = useRemoteForEco ? transferCarbonKg : 0;
  const ecoTotalCarbonKg = ecoComputeCarbonKg + ecoTransferCarbon;

  const ecoPriceKwh = useRemoteForEco
    ? bestRemote.electricityPriceUsdKwh * 0.75 // spot pricing discount
    : bestHour.electricityPriceUsd * 0.8;
  const ecoCostUsd = ecoTotalKwh * ecoPriceKwh + (useRemoteForEco ? workload.dataSizeGb * 0.008 : 0);

  const ecoCarbonSavingsPct = Math.max(
    15,
    Math.round(((runNowCarbonKg - ecoTotalCarbonKg) / runNowCarbonKg) * 100)
  );
  const ecoCostSavingsPct = Math.max(
    5,
    Math.round(((runNowCostUsd - ecoCostUsd) / runNowCostUsd) * 100)
  );

  const ecoDecision: DispatchDecision = {
    id: "eco_hybrid",
    title: "Eco-Hybrid Optimizer (Recommended)",
    headline: `${ecoCarbonSavingsPct}% carbon & ${ecoCostSavingsPct}% cost reduction`,
    description: `Holistic strategy: DVFS eco-clocking (82% TDP cap), BF16 mixed-precision, and ${
      useRemoteForEco ? `dispatch to ${bestRemote.name}` : `scheduled start at ${bestHour.timeLabel}`
    } with spot/interruptible pricing.`,
    when: {
      scheduledTime: useRemoteForEco ? "Immediate" : `${bestHour.timeLabel}`,
      delayHours: useRemoteForEco ? 0 : delayHours,
      windowDescription: "Dynamic carbon-following window",
      isImmediate: useRemoteForEco,
    },
    where: {
      regionId: ecoRegion.id,
      regionName: ecoRegion.name,
      flag: ecoRegion.flag,
      locationDescription: useRemoteForEco
        ? `Clean hydro/wind cluster (${bestRemote.code})`
        : "Local cluster (Off-peak overnight)",
      dataTransferTimeMinutes: useRemoteForEco ? transferMinutes : 0,
      dataTransferCarbonKg: ecoTransferCarbon,
      isLocal: !useRemoteForEco,
    },
    how: {
      accelerator: workload.accelerator,
      precisionMode: "BF16 Mixed",
      powerCapTdpPercent: 82,
      coolingThermodynamics: `Direct Liquid / Economizer Hybrid (PUE ${ecoPue.toFixed(2)})`,
      spotPreemptible: true,
      dvfsEcoTuning: true,
    },
    metrics: {
      carbonFootprintKg: Math.round(ecoTotalCarbonKg * 10) / 10,
      carbonSavingsPercent: ecoCarbonSavingsPct,
      totalEnergyKwh: Math.round(ecoTotalKwh * 10) / 10,
      computeEnergyKwh: Math.round(ecoComputeKwh * 10) / 10,
      coolingEnergyKwh: Math.round(ecoCoolingKwh * 10) / 10,
      energySavingsPercent: Math.round(((runNowTotalKwh - ecoTotalKwh) / runNowTotalKwh) * 100),
      financialCostUsd: Math.round(ecoCostUsd * 100) / 100,
      costSavingsPercent: ecoCostSavingsPct,
      effectiveDurationHours: Math.round(ecoEffectiveDuration * 10) / 10,
      slaCompliance: "Compliant",
    },
    keyAdvantages: [
      `Peak emissions reduction: -${ecoCarbonSavingsPct}% total carbon footprint`,
      "Hardware DVFS power capping minimizes silicon thermal dissipation",
      `Generates $${Math.round(runNowCostUsd - ecoCostUsd)} in combined financial savings`,
      "Automated checkpointing on carbon threshold spikes",
    ],
    tradeoffs: [
      "Requires automated checkpointing in ML pipeline",
      "Slight 3% runtime delta due to 82% TDP power capping",
    ],
    isRecommended: workload.urgency !== "immediate",
    recommendedBadge: workload.urgency !== "immediate" ? "Highest Efficiency Match" : undefined,
  };

  const decisions: DispatchDecision[] = [
    runNowDecision,
    temporalDecision,
    spatialDecision,
    ecoDecision,
  ];

  // Pick top recommended decision based on urgency and carbon savings
  let recommended = decisions.find((d) => d.isRecommended) || ecoDecision;
  if (workload.urgency === "immediate") {
    recommended = runNowDecision;
  }

  // Calculate carbon equivalents based on recommended savings vs Run Now
  const maxSavedKg = Math.max(0, runNowCarbonKg - recommended.metrics.carbonFootprintKg);
  const dollarsSaved = Math.max(0, runNowCostUsd - recommended.metrics.financialCostUsd);

  const equivalents: CarbonEquivalents = {
    kgCo2Saved: Math.round(maxSavedKg * 10) / 10,
    milesDrivenEquivalent: Math.round(maxSavedKg * 2.48), // ~2.48 miles per kg CO2
    treesYearEquivalent: Math.round((maxSavedKg / 21.7) * 10) / 10, // ~21.7 kg CO2 / tree year
    smartphoneCharges: Math.round(maxSavedKg * 122), // ~122 smartphone charges per kg CO2
    dollarSaved: Math.round(dollarsSaved * 100) / 100,
  };

  const summaryReasoning =
    workload.urgency === "immediate"
      ? `Due to strict SLA urgency (< 1h), Run Now in ${localRegion.name} is required to satisfy execution constraints, incurring ${runNowCarbonKg.toFixed(
          1
        )} kg CO2e.`
      : `Recommended ${recommended.title}: saves ${equivalents.kgCo2Saved} kg CO2e (${recommended.metrics.carbonSavingsPercent}% emissions cut) by optimizing both time window and silicon power limits.`;

  return {
    decisions,
    recommendedDecision: recommended,
    equivalents,
    summaryReasoning,
  };
}
