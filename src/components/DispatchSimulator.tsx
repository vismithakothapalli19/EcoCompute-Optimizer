import React, { useState, useEffect } from "react";
import {
  DispatchDecision,
  WorkloadConfig,
  GridRegion,
  CarbonEquivalents,
} from "../types";
import {
  CheckCircle2,
  X,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Download,
  Terminal,
  Leaf,
  Clock,
  Cpu,
  Zap,
} from "lucide-react";

interface DispatchSimulatorProps {
  decision: DispatchDecision;
  workload: WorkloadConfig;
  equivalents: CarbonEquivalents;
  onClose: () => void;
}

export const DispatchSimulator: React.FC<DispatchSimulatorProps> = ({
  decision,
  workload,
  equivalents,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [simulatedProgress, setSimulatedProgress] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"live" | "k8s" | "slurm">("live");
  const [copied, setCopied] = useState<boolean>(false);

  // Simulation steps
  const steps = [
    { title: "Pre-Flight & Grid Verification", desc: "Validating renewable threshold and current grid carbon intensity" },
    {
      title: decision.where.isLocal ? "Local Storage Cache Validation" : "Cross-Region Dataset Synchronization",
      desc: decision.where.isLocal
        ? "Fast local NVMe caching, 0ms transfer latency"
        : `Transferring ${workload.dataSizeGb} GB payload via cloud backbone (${decision.where.dataTransferTimeMinutes}m estimate)`,
    },
    {
      title: `Silicon Power Capping (${decision.how.powerCapTdpPercent}% TDP)`,
      desc: `Setting DVFS clocks to ${decision.how.powerCapTdpPercent}% TDP and enabling ${decision.how.precisionMode} precision`,
    },
    { title: "Workload Execution & Thermal Tracking", desc: "Training job running with dynamic temperature and chiller telemetry" },
    { title: "Completion & Carbon Certificate", desc: "Model weights saved. Final carbon reduction verified." },
  ];

  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setSimulatedProgress((prev) => {
        if (prev >= 100) {
          setIsRunning(false);
          setCurrentStep(4);
          return 100;
        }
        const next = prev + 5;
        if (next < 20) setCurrentStep(0);
        else if (next < 40) setCurrentStep(1);
        else if (next < 60) setCurrentStep(2);
        else if (next < 95) setCurrentStep(3);
        else setCurrentStep(4);
        return next;
      });
    }, 450);

    return () => clearInterval(interval);
  }, [isRunning]);

  const k8sManifest = `apiVersion: batch.volcano.sh/v1alpha1
kind: Job
metadata:
  name: ${workload.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-dispatch
  labels:
    ecocompute.io/policy: "${decision.id}"
    ecocompute.io/region: "${decision.where.regionName}"
    ecocompute.io/max-carbon: "150gCO2/kWh"
spec:
  minAvailable: ${workload.gpuCount}
  schedulerName: volcano-carbon-aware
  queue: green-priority
  tasks:
    - replicas: ${Math.max(1, Math.round(workload.gpuCount / 8))}
      name: worker
      policies:
        - event: PodFailed
          action: RestartJob
      template:
        spec:
          nodeSelector:
            topology.kubernetes.io/region: ${decision.where.regionId}
            power.accelerator/power-cap-tdp: "${decision.how.powerCapTdpPercent}%"
          containers:
            - name: trainer
              image: enterprise-ml/train-engine:v3.2
              env:
                - name: ECO_PRECISION
                  value: "${decision.how.precisionMode}"
                - name: SPOT_INTERRUPTIBLE
                  value: "${decision.how.spotPreemptible}"
              resources:
                limits:
                  nvidia.com/gpu: ${Math.min(8, workload.gpuCount)}`;

  const slurmScript = `#!/bin/bash
#SBATCH --job-name=${workload.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}
#SBATCH --nodes=${Math.max(1, Math.round(workload.gpuCount / 8))}
#SBATCH --gpus-per-node=8
#SBATCH --time=${workload.durationHours}:00:00
#SBATCH --qos=carbon-aware-preemptible
#SBATCH --partition=${decision.where.regionId}

# EcoCompute Silicon DVFS Power Capping Directive
echo "Setting GPU TDP limit to ${decision.how.powerCapTdpPercent}%..."
nvidia-smi -pl $((${decision.how.powerCapTdpPercent} * 700 / 100))

# Execute training with mixed precision
python -m torch.distributed.run \\
    --nproc_per_node=8 \\
    train.py \\
    --precision ${decision.how.precisionMode.toLowerCase().replace(" ", "_")} \\
    --data-path /mnt/datasets/${workload.id}
`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-stone-200 shadow-2xl max-w-2xl w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-emerald-600 text-white shadow-xs">
            <Leaf className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-stone-900">
              Live Workload Dispatch Controller
            </h3>
            <p className="text-xs text-stone-500">
              Plan: <span className="font-semibold text-stone-700">{decision.title}</span> •{" "}
              {decision.where.flag} {decision.where.regionName}
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-stone-200 pb-2 mb-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab("live")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "live"
                ? "bg-emerald-600 text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            Live Execution Telemetry
          </button>
          <button
            onClick={() => setActiveTab("k8s")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "k8s"
                ? "bg-emerald-600 text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            Kubernetes YAML Spec
          </button>
          <button
            onClick={() => setActiveTab("slurm")}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              activeTab === "slurm"
                ? "bg-emerald-600 text-white"
                : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            SLURM Cluster Script
          </button>
        </div>

        {activeTab === "live" && (
          <div className="space-y-4">
            {/* Progress Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-stone-700">
                  Execution State: {steps[currentStep]?.title}
                </span>
                <span className="font-mono font-bold text-emerald-700">{simulatedProgress}%</span>
              </div>
              <div className="w-full h-2.5 bg-stone-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-600 rounded-full transition-all duration-300"
                  style={{ width: `${simulatedProgress}%` }}
                />
              </div>
            </div>

            {/* Stepper */}
            <div className="space-y-2.5 bg-stone-50 rounded-xl p-3.5 border border-stone-200/70">
              {steps.map((s, idx) => {
                const isPassed = idx < currentStep;
                const isCurrent = idx === currentStep;
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold mt-0.5 shrink-0 ${
                        isPassed
                          ? "bg-emerald-600 text-white"
                          : isCurrent
                          ? "bg-emerald-500 text-white ring-2 ring-emerald-500/20"
                          : "bg-stone-200 text-stone-500"
                      }`}
                    >
                      {isPassed ? "✓" : idx + 1}
                    </div>
                    <div>
                      <div className={`text-xs font-semibold ${isCurrent ? "text-stone-900" : "text-stone-600"}`}>
                        {s.title}
                      </div>
                      <div className="text-[11px] text-stone-400">{s.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Carbon & Power Impact Summary */}
            <div className="grid grid-cols-3 gap-3 bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200/70 text-center">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                  CO2e Avoided
                </div>
                <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                  {equivalents.kgCo2Saved} kg
                </div>
                <div className="text-[10px] text-emerald-600">vs Run Now baseline</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                  Cost Saved
                </div>
                <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                  ${equivalents.dollarSaved}
                </div>
                <div className="text-[10px] text-emerald-600">Off-peak & DVFS</div>
              </div>
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-800">
                  Trees Equivalent
                </div>
                <div className="text-base font-bold font-mono text-emerald-700 mt-0.5">
                  {equivalents.treesYearEquivalent} yrs
                </div>
                <div className="text-[10px] text-emerald-600">Carbon absorption</div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 flex items-center gap-1.5"
                >
                  {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  <span>{isRunning ? "Pause Telemetry" : "Resume"}</span>
                </button>
                <button
                  onClick={() => {
                    setSimulatedProgress(0);
                    setCurrentStep(0);
                    setIsRunning(true);
                  }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-100 text-stone-700 hover:bg-stone-200 flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restart</span>
                </button>
              </div>

              <button
                onClick={onClose}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
              >
                Close & Return
              </button>
            </div>
          </div>
        )}

        {/* Code tabs */}
        {(activeTab === "k8s" || activeTab === "slurm") && (
          <div>
            <div className="flex items-center justify-between bg-stone-900 text-stone-300 px-3 py-2 rounded-t-xl text-xs">
              <span className="flex items-center gap-1.5 font-mono">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                {activeTab === "k8s" ? "volcano-job.yaml" : "batch-submit.slurm"}
              </span>
              <button
                onClick={() => copyToClipboard(activeTab === "k8s" ? k8sManifest : slurmScript)}
                className="flex items-center gap-1 text-stone-300 hover:text-white transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? "Copied!" : "Copy Spec"}</span>
              </button>
            </div>
            <pre className="bg-stone-950 text-emerald-400 p-4 rounded-b-xl text-[11px] font-mono overflow-x-auto max-h-[320px] leading-relaxed border border-stone-800">
              {activeTab === "k8s" ? k8sManifest : slurmScript}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
