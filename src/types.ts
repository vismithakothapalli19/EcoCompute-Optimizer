export type WorkloadType =
  | "ai_training"
  | "fine_tuning"
  | "batch_inference"
  | "scientific_sim"
  | "data_pipeline";

export type UrgencyLevel =
  | "immediate" // SLA: Must run now (< 1h)
  | "moderate"  // SLA: Flexible within 6-12h
  | "flexible"  // SLA: Flexible within 24h
  | "batch_spot"; // SLA: Flexible within 48h / can be interrupted

export type AcceleratorType =
  | "NVIDIA H100"
  | "NVIDIA A100"
  | "NVIDIA L4"
  | "Google TPU v5e"
  | "Google TPU v5p"
  | "CPU High-Mem";

export interface WorkloadConfig {
  id: string;
  name: string;
  type: WorkloadType;
  description: string;
  accelerator: AcceleratorType;
  gpuCount: number;
  durationHours: number;
  basePowerKwPerNode: number; // e.g. 0.7 kW per H100 GPU node
  dataSizeGb: number;
  urgency: UrgencyLevel;
  maxDelayHours: number; // allowed delay to wait for clean grid
  datasetLocationRegionId: string;
}

export interface GridRegion {
  id: string;
  name: string;
  code: string;
  flag: string;
  provider: "GCP" | "AWS" | "Azure";
  lat: number;
  lng: number;
  currentCarbonIntensity: number; // gCO2eq / kWh
  averageCarbonIntensity: number;
  renewablePercent: number;
  solarPercent: number;
  windPercent: number;
  hydroPercent: number;
  gridDemandMw: number;
  gridCapacityMw: number;
  demandStress: "Low" | "Moderate" | "High" | "Critical";
  ambientTempC: number;
  pue: number; // Power Usage Effectiveness (e.g. 1.08 to 1.35)
  coolingMode: "Free Air Economizer" | "Direct Liquid Cooling" | "Mechanical Chiller" | "Evaporative Tower";
  electricityPriceUsdKwh: number;
  networkLatencyMsFromOrigin: number;
}

export interface HourlyForecast {
  hour: number; // 0..23
  timeLabel: string;
  carbonIntensity: number; // gCO2/kWh (projected)
  historicalCarbonIntensity?: number; // gCO2/kWh (historical 7-day average baseline for this hour)
  renewablePercent: number;
  ambientTempC: number;
  pue: number;
  gridDemandMw: number;
  electricityPriceUsd: number;
  isOptimalWindow: boolean;
  confidenceLower?: number;
  confidenceUpper?: number;
}

export interface HistoricalTelemetryPoint {
  hour: number;
  timeLabel: string;
  relativeHours: number; // -12 .. -1
  carbonIntensity: number;
  renewablePercent: number;
  ambientTempC: number;
  pue: number;
  gridDemandMw: number;
  isPeakSpike?: boolean;
}

export interface DispatchDecision {
  id: "run_now" | "temporal_shift" | "spatial_shift" | "eco_hybrid";
  title: string;
  headline: string;
  description: string;
  when: {
    scheduledTime: string;
    delayHours: number;
    windowDescription: string;
    isImmediate: boolean;
  };
  where: {
    regionId: string;
    regionName: string;
    flag: string;
    locationDescription: string;
    dataTransferTimeMinutes: number;
    dataTransferCarbonKg: number;
    isLocal: boolean;
  };
  how: {
    accelerator: string;
    precisionMode: "FP32" | "BF16 Mixed" | "FP8 Quantized";
    powerCapTdpPercent: number; // e.g. 80% TDP
    coolingThermodynamics: string;
    spotPreemptible: boolean;
    dvfsEcoTuning: boolean;
  };
  metrics: {
    carbonFootprintKg: number;
    carbonSavingsPercent: number;
    totalEnergyKwh: number;
    computeEnergyKwh: number;
    coolingEnergyKwh: number;
    energySavingsPercent: number;
    financialCostUsd: number;
    costSavingsPercent: number;
    effectiveDurationHours: number;
    slaCompliance: "Compliant" | "Exceeds SLA" | "Warning";
  };
  keyAdvantages: string[];
  tradeoffs: string[];
  recommendedBadge?: string;
  isRecommended: boolean;
}

export interface CarbonEquivalents {
  kgCo2Saved: number;
  milesDrivenEquivalent: number;
  treesYearEquivalent: number;
  smartphoneCharges: number;
  dollarSaved: number;
}
