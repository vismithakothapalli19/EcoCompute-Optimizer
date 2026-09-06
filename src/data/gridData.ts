import { GridRegion, HourlyForecast, HistoricalTelemetryPoint, WorkloadConfig } from "../types";

export const GLOBAL_REGIONS: GridRegion[] = [
  {
    id: "us-east",
    name: "US East (N. Virginia)",
    code: "us-east4",
    flag: "🇺🇸",
    provider: "GCP",
    lat: 39.0438,
    lng: -77.4874,
    currentCarbonIntensity: 415, // gCO2eq/kWh (high gas/coal peak)
    averageCarbonIntensity: 385,
    renewablePercent: 21,
    solarPercent: 12,
    windPercent: 6,
    hydroPercent: 3,
    gridDemandMw: 31200,
    gridCapacityMw: 36000,
    demandStress: "High",
    ambientTempC: 30,
    pue: 1.29,
    coolingMode: "Mechanical Chiller",
    electricityPriceUsdKwh: 0.138,
    networkLatencyMsFromOrigin: 0, // Reference local origin
  },
  {
    id: "europe-north",
    name: "Europe North (Sweden / Finland)",
    code: "europe-north1",
    flag: "🇸🇪",
    provider: "GCP",
    lat: 60.5693,
    lng: 27.1878,
    currentCarbonIntensity: 18, // 100% hydro & wind
    averageCarbonIntensity: 22,
    renewablePercent: 96,
    solarPercent: 3,
    windPercent: 48,
    hydroPercent: 45,
    gridDemandMw: 14200,
    gridCapacityMw: 24000,
    demandStress: "Low",
    ambientTempC: 8,
    pue: 1.08,
    coolingMode: "Free Air Economizer",
    electricityPriceUsdKwh: 0.062,
    networkLatencyMsFromOrigin: 85,
  },
  {
    id: "us-west",
    name: "US West (Oregon - Hydro & Wind)",
    code: "us-west1",
    flag: "🇺🇸",
    provider: "GCP",
    lat: 45.5946,
    lng: -121.1787,
    currentCarbonIntensity: 84, // Bonneville power hydro
    averageCarbonIntensity: 92,
    renewablePercent: 82,
    solarPercent: 15,
    windPercent: 32,
    hydroPercent: 35,
    gridDemandMw: 11500,
    gridCapacityMw: 18000,
    demandStress: "Low",
    ambientTempC: 15,
    pue: 1.13,
    coolingMode: "Direct Liquid Cooling",
    electricityPriceUsdKwh: 0.078,
    networkLatencyMsFromOrigin: 58,
  },
  {
    id: "europe-west",
    name: "Europe West (Frankfurt)",
    code: "europe-west3",
    flag: "🇩🇪",
    provider: "GCP",
    lat: 50.1109,
    lng: 8.6821,
    currentCarbonIntensity: 295,
    averageCarbonIntensity: 270,
    renewablePercent: 44,
    solarPercent: 28,
    windPercent: 14,
    hydroPercent: 2,
    gridDemandMw: 42000,
    gridCapacityMw: 49000,
    demandStress: "Moderate",
    ambientTempC: 22,
    pue: 1.22,
    coolingMode: "Evaporative Tower",
    electricityPriceUsdKwh: 0.175,
    networkLatencyMsFromOrigin: 75,
  },
  {
    id: "southamerica-west",
    name: "South America (Chile - Solar)",
    code: "southamerica-west1",
    flag: "🇨🇱",
    provider: "GCP",
    lat: -33.4489,
    lng: -70.6693,
    currentCarbonIntensity: 92,
    averageCarbonIntensity: 110,
    renewablePercent: 78,
    solarPercent: 58,
    windPercent: 12,
    hydroPercent: 8,
    gridDemandMw: 9200,
    gridCapacityMw: 14500,
    demandStress: "Low",
    ambientTempC: 19,
    pue: 1.16,
    coolingMode: "Direct Liquid Cooling",
    electricityPriceUsdKwh: 0.082,
    networkLatencyMsFromOrigin: 110,
  },
  {
    id: "asia-south",
    name: "Asia South (Mumbai)",
    code: "asia-south1",
    flag: "🇮🇳",
    provider: "GCP",
    lat: 19.076,
    lng: 72.8777,
    currentCarbonIntensity: 640,
    averageCarbonIntensity: 610,
    renewablePercent: 18,
    solarPercent: 11,
    windPercent: 5,
    hydroPercent: 2,
    gridDemandMw: 26000,
    gridCapacityMw: 27500,
    demandStress: "Critical",
    ambientTempC: 34,
    pue: 1.38,
    coolingMode: "Mechanical Chiller",
    electricityPriceUsdKwh: 0.145,
    networkLatencyMsFromOrigin: 165,
  },
];

/**
 * Generate 24-hour diurnal forecast for a region
 * Incorporates solar curve (noon peak), wind curve, grid demand curve, and night temperature drop
 */
export function generate24HourForecast(region: GridRegion): HourlyForecast[] {
  const currentHour = new Date().getHours();
  const forecast: HourlyForecast[] = [];

  for (let i = 0; i < 24; i++) {
    const targetHour = (currentHour + i) % 24;
    const hourLabel = `${targetHour.toString().padStart(2, "0")}:00`;

    // Diurnal temperature swing: coldest at 05:00, hottest at 14:00
    const tempOffset = Math.sin(((targetHour - 9) / 24) * 2 * Math.PI) * 6;
    const ambientTemp = Math.round((region.ambientTempC + tempOffset) * 10) / 10;

    // Thermodynamic PUE model
    let pue = 1.08;
    if (ambientTemp > 28) {
      pue = 1.28 + (ambientTemp - 28) * 0.015;
    } else if (ambientTemp > 18) {
      pue = 1.14 + (ambientTemp - 18) * 0.012;
    }

    // Solar multiplier (peak between 10:00 and 15:00)
    const isDaylight = targetHour >= 7 && targetHour <= 18;
    const solarFactor = isDaylight ? Math.sin(((targetHour - 7) / 11) * Math.PI) : 0;

    // Grid demand curve (lowest between 01:00 and 05:00; highest at 17:00 to 21:00)
    const demandRatio =
      0.68 +
      0.25 * Math.sin(((targetHour - 6) / 18) * Math.PI) +
      (targetHour >= 17 && targetHour <= 20 ? 0.22 : 0);

    // Carbon intensity calculation
    // Off-peak night (02:00) drops carbon by ~35-45% due to baseload hydro/wind or curtailed off-peak renewables
    let carbonMod = 1.0;
    if (targetHour >= 1 && targetHour <= 4) {
      carbonMod = 0.62; // 38% reduction at 2 AM! Matches prompt example
    } else if (targetHour >= 11 && targetHour <= 14 && region.solarPercent > 20) {
      carbonMod = 0.68; // Midday solar plunge
    } else if (targetHour >= 17 && targetHour <= 21) {
      carbonMod = 1.18; // Evening peaker gas spike
    }

    const calculatedCarbon = Math.max(12, Math.round(region.currentCarbonIntensity * carbonMod));
    
    // Historical 7-day average baseline for this same diurnal hour
    const historicalBaseline = Math.max(
      14,
      Math.round(region.averageCarbonIntensity * (carbonMod * 0.95 + 0.05))
    );

    const renewablePct = Math.min(
      99,
      Math.max(5, Math.round(region.renewablePercent * (1 + (1 - carbonMod) * 0.8) + solarFactor * 15))
    );

    const price =
      targetHour >= 1 && targetHour <= 5
        ? region.electricityPriceUsdKwh * 0.65 // Off-peak tariff
        : targetHour >= 17 && targetHour <= 21
        ? region.electricityPriceUsdKwh * 1.35 // Peak tariff
        : region.electricityPriceUsdKwh;

    // Projection confidence interval (widens slightly with forecast distance i)
    const uncertaintySpread = Math.max(6, Math.round(calculatedCarbon * (0.04 + i * 0.003)));

    forecast.push({
      hour: targetHour,
      timeLabel: hourLabel,
      carbonIntensity: calculatedCarbon,
      historicalCarbonIntensity: historicalBaseline,
      renewablePercent: renewablePct,
      ambientTempC: ambientTemp,
      pue: Math.round(pue * 100) / 100,
      gridDemandMw: Math.round(region.gridDemandMw * demandRatio),
      electricityPriceUsd: Math.round(price * 1000) / 1000,
      isOptimalWindow: targetHour >= 1 && targetHour <= 4,
      confidenceLower: Math.max(10, calculatedCarbon - uncertaintySpread),
      confidenceUpper: calculatedCarbon + uncertaintySpread,
    });
  }

  return forecast;
}

/**
 * Generate historical recorded telemetry for the past N hours (e.g. 12 hours) leading up to now
 */
export function generateHistoricalTelemetry(region: GridRegion, hoursBack: number = 12): HistoricalTelemetryPoint[] {
  const currentHour = new Date().getHours();
  const historical: HistoricalTelemetryPoint[] = [];

  for (let i = hoursBack; i >= 1; i--) {
    const targetHour = (currentHour - i + 24) % 24;
    const hourLabel = `${targetHour.toString().padStart(2, "0")}:00`;

    // Past diurnal curve with realistic recorded variance
    let carbonMod = 1.0;
    if (targetHour >= 1 && targetHour <= 4) {
      carbonMod = 0.64;
    } else if (targetHour >= 11 && targetHour <= 14 && region.solarPercent > 20) {
      carbonMod = 0.70;
    } else if (targetHour >= 17 && targetHour <= 21) {
      carbonMod = 1.22; // Peaker plant spike in past evening
    }

    // Add slight random deterministic jitter based on hour for realistic sensor telemetry
    const jitter = ((targetHour * 7) % 11) - 5;
    const carbon = Math.max(15, Math.round(region.averageCarbonIntensity * carbonMod + jitter));

    const tempOffset = Math.sin(((targetHour - 9) / 24) * 2 * Math.PI) * 6;
    const temp = Math.round((region.ambientTempC + tempOffset) * 10) / 10;

    let pue = 1.09;
    if (temp > 28) {
      pue = 1.29 + (temp - 28) * 0.015;
    } else if (temp > 18) {
      pue = 1.15 + (temp - 18) * 0.012;
    }

    const demandRatio =
      0.70 +
      0.24 * Math.sin(((targetHour - 6) / 18) * Math.PI) +
      (targetHour >= 17 && targetHour <= 20 ? 0.24 : 0);

    historical.push({
      hour: targetHour,
      timeLabel: hourLabel,
      relativeHours: -i,
      carbonIntensity: carbon,
      renewablePercent: Math.max(5, Math.min(95, Math.round(region.renewablePercent * (1 + (1 - carbonMod) * 0.7)))),
      ambientTempC: temp,
      pue: Math.round(pue * 100) / 100,
      gridDemandMw: Math.round(region.gridDemandMw * demandRatio),
      isPeakSpike: targetHour >= 17 && targetHour <= 20,
    });
  }

  return historical;
}
