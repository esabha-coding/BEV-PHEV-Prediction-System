import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { 
  Activity, 
  Car, 
  Cpu, 
  TrendingUp, 
  Gauge, 
  Layers, 
  Server, 
  ShieldCheck, 
  AlertTriangle, 
  Play, 
  ArrowUpRight, 
  BarChart3, 
  Settings 
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const MOCK_META = {
  metrics: {
    train_accuracy: 0.7645,
    test_accuracy: 0.7582,
    baseline_accuracy: 0.6120,
    confusion_matrix: [
      [22045, 7812],
      [4210, 15480]
    ],
    total_samples: 178234,
    bev_count: 112450,
    phev_count: 65784,
    avg_vehicle_age: 4.2
  },
  makes: ["TESLA", "NISSAN", "CHEVROLET", "BMW", "TOYOTA", "FORD", "KIA"],
  models_by_make: {
    "TESLA": ["MODEL 3", "MODEL Y", "MODEL S", "MODEL X"],
    "NISSAN": ["LEAF", "ARIYA"],
    "CHEVROLET": ["BOLT EV", "VOLT", "SPARK"],
    "BMW": ["I3", "X5", "I4", "I8", "330E"],
    "TOYOTA": ["PRIUS PRIME", "RAV4 PRIME"],
    "FORD": ["MUSTANG MACH-E", "F-150 LIGHTNING", "FUSION ENERGI"],
    "KIA": ["EV6", "NIRO", "SOUL"]
  },
  counties: ["King", "Snohomish", "Pierce", "Kitsap", "Thurston", "Spokane", "Yakima", "Whatcom", "Clark"]
};

const formatUrl = (url) => {
  if (!url) return "";
  let clean = url.trim();
  if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
    clean = `https://${clean}`;
  }
  return clean;
};

export default function App() {
  // Config & State
  const [backendUrl, setBackendUrl] = useState(API_BASE_URL);
  const [meta, setMeta] = useState(MOCK_META);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [apiError, setApiError] = useState(null);

  // Live Classifier Form Inputs
  const [make, setMake] = useState('TESLA');
  const [model, setModel] = useState('MODEL 3');
  const [county, setCounty] = useState('King');
  const [year, setYear] = useState(2022);

  // Adoption Simulator Inputs
  const [targetYear, setTargetYear] = useState(2032);
  const [chargingDensity, setChargingDensity] = useState(65); // 0-100%
  const [fuelPrice, setFuelPrice] = useState(4.85); // $3.00 - $6.00
  const [taxCredits, setTaxCredits] = useState(true);
  const [hovAccess, setHovAccess] = useState(false);
  const [carbonTax, setCarbonTax] = useState(true);

  // Outputs / Simulated State
  const [baselinePrediction, setBaselinePrediction] = useState(null);
  const [simulatedKPIs, setSimulatedKPIs] = useState({
    bevMarketShare: 0,
    growthRate: 0,
    confidenceScore: 0,
    simulatedVolume: 0
  });
  const [trendData, setTrendData] = useState([]);
  const [comparisonData, setComparisonData] = useState([]);

  // Fetch meta-information from backend on mount
  useEffect(() => {
    console.log("VITE_API_URL from env:", import.meta.env.VITE_API_URL);
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    setLoading(true);
    setApiError(null);

    // In production, we ONLY target the manual backendUrl or configured env URL.
    // In development, we can test local fallbacks.
    const candidates = import.meta.env.PROD
      ? [backendUrl, import.meta.env.VITE_API_URL].filter(Boolean)
      : [
          backendUrl,
          import.meta.env.VITE_API_URL,
          "http://127.0.0.1:8000",
          "http://localhost:8000"
        ].filter(Boolean);

    // De-duplicate candidates and format with http/https prefix
    const uniqueCandidates = [...new Set(candidates.map(formatUrl))];
    
    let successUrl = null;
    let successData = null;

    for (const url of uniqueCandidates) {
      try {
        // Attempt health check or root response with a short timeout
        try {
          await axios.get(`${url}/health`, { timeout: 2000 });
        } catch {
          await axios.get(`${url}/`, { timeout: 2000 });
        }
        
        // Load metadata from working endpoint
        const res = await axios.get(`${url}/meta`, { timeout: 3000 });
        successUrl = url;
        successData = res.data;
        break;
      } catch (err) {
        console.warn(`Connection to candidate ${url} failed:`, err.message);
      }
    }

    if (successUrl) {
      setBackendUrl(successUrl);
      setMeta(successData);
      setIsOffline(false);
      setApiError(null);
    } else {
      console.error("All backend connection candidates failed. Activating offline mode.");
      setIsOffline(true);
      setMeta(MOCK_META);
      setApiError("Backend API unreachable. Running simulation using local model fallback.");
    }
    setLoading(false);
  };

  const handleReconnect = () => {
    fetchMetadata();
  };

  // Run Forecast calculation combining classifier outputs with simulation variables
  const generateForecast = async () => {
    setPredicting(true);
    setApiError(null);

    const payload = {
      make,
      model,
      county,
      model_year: parseInt(year)
    };

    let baseBEVProb = 0.65;
    let basePHEVProb = 0.35;
    let classifierAccuracy = meta?.metrics?.test_accuracy || 0.7582;
    let baselineLabel = "Battery Electric Vehicle (BEV)";

    try {
      const cleanUrl = formatUrl(backendUrl);
      // Fetch from local / Railway backend (Explicit POST and JSON header)
      const res = await axios.post(`${cleanUrl}/predict`, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      const prediction = res.data;
      setBaselinePrediction(prediction);

      // Extract probabilities
      const probs = prediction.probabilities;
      baselineLabel = prediction.prediction;
      
      const bevKey = Object.keys(probs).find(k => k.includes("BEV")) || "Battery Electric Vehicle (BEV)";
      const phevKey = Object.keys(probs).find(k => k.includes("PHEV")) || "Plug-in Hybrid Electric Vehicle (PHEV)";
      
      baseBEVProb = probs[bevKey] !== undefined ? probs[bevKey] : 0.65;
      basePHEVProb = probs[phevKey] !== undefined ? probs[phevKey] : 0.35;
    } catch (err) {
      console.warn("Prediction endpoint failed. Simulating local fallback.", err);
      setApiError("Railway API unreachable. Running simulation using local model fallback.");
      
      // Local fallback calculation based on vehicle attributes
      const isPugetSound = ["King", "Snohomish", "Pierce", "Kitsap", "Thurston"].includes(county);
      const age = new Date().getFullYear() - year;
      
      let frequencyMultiplier = 1;
      if (make === 'TESLA') frequencyMultiplier = 3.5;
      else if (make === 'BMW') frequencyMultiplier = 1.8;
      else if (make === 'CHEVROLET') frequencyMultiplier = 1.2;

      baseBEVProb = Math.max(0.1, Math.min(0.95, 0.4 + (isPugetSound ? 0.15 : -0.1) - (age * 0.02) + (frequencyMultiplier * 0.05)));
      basePHEVProb = 1 - baseBEVProb;
      baselineLabel = baseBEVProb > 0.5 ? "Battery Electric Vehicle (BEV)" : "Plug-in Hybrid Electric Vehicle (PHEV)";

      setBaselinePrediction({
        prediction: baselineLabel,
        probabilities: {
          "Battery Electric Vehicle (BEV)": baseBEVProb,
          "Plug-in Hybrid Electric Vehicle (PHEV)": basePHEVProb
        },
        decision_path: [0, 1, 4],
        preprocessed_inputs: {
          make,
          region: isPugetSound ? "Puget Sound" : "Other WA",
          vehicle_age: age,
          model_frequency: Math.round(frequencyMultiplier * 500)
        }
      });
    }

    // Build Simulation Over Years
    const simulatedTrends = [];
    const baseYear = 2026;
    const finalYear = Math.max(2027, targetYear);
    
    // Factors
    const chargingFactor = (chargingDensity - 50) * 0.0025;
    const fuelFactor = (fuelPrice - 4.20) * 0.045;
    const policyFactor = (taxCredits ? 0.08 : 0) + (hovAccess ? 0.03 : 0) + (carbonTax ? 0.05 : 0);

    for (let yr = baseYear; yr <= finalYear; yr++) {
      const yearDiff = yr - baseYear;
      const timeFactor = yearDiff * 0.022; // Natural technology curve growth

      const totalShift = timeFactor + chargingFactor + fuelFactor + policyFactor;
      
      // Calculate share
      const bevShare = Math.max(10, Math.min(95, (baseBEVProb + totalShift) * 100));
      const phevShare = 100 - bevShare;

      // Project absolute volume
      const baseVolume = 8500 + (yr - baseYear) * 750 + (chargingDensity * 35);
      const bevVolume = Math.round(baseVolume * (bevShare / 100));
      const phevVolume = Math.round(baseVolume * (phevShare / 100));

      simulatedTrends.push({
        year: yr,
        BEV: bevVolume,
        PHEV: phevVolume,
        BEV_Share: parseFloat(bevShare.toFixed(1)),
        PHEV_Share: parseFloat(phevShare.toFixed(1))
      });
    }

    setTrendData(simulatedTrends);

    // Build Sensitivity Comparison (Baseline vs. Current Simulation vs. Aggressive Goals)
    const baseBEVShare = baseBEVProb * 100;
    const finalBEVShare = simulatedTrends[simulatedTrends.length - 1].BEV_Share;
    
    // Max policy shift calculation
    const maxPolicyShift = ((finalYear - baseYear) * 0.022) + ((90 - 50) * 0.0025) + ((5.50 - 4.20) * 0.045) + (0.08 + 0.04 + 0.06);
    const maxPolicyBEVShare = Math.max(10, Math.min(98, (baseBEVProb + maxPolicyShift) * 100));

    setComparisonData([
      { name: "Model Baseline", BEV: parseFloat(baseBEVShare.toFixed(1)), PHEV: parseFloat((100 - baseBEVShare).toFixed(1)) },
      { name: "Active Simulation", BEV: finalBEVShare, PHEV: parseFloat((100 - finalBEVShare).toFixed(1)) },
      { name: "Aggressive Policy", BEV: parseFloat(maxPolicyBEVShare.toFixed(1)), PHEV: parseFloat((100 - maxPolicyBEVShare).toFixed(1)) }
    ]);

    // Update KPIs
    const cagr = (((finalBEVShare / baseBEVShare) ** (1 / Math.max(1, finalYear - baseYear))) - 1) * 100;
    setSimulatedKPIs({
      bevMarketShare: finalBEVShare,
      growthRate: parseFloat(cagr.toFixed(2)),
      confidenceScore: parseFloat((classifierAccuracy * 100).toFixed(1)),
      simulatedVolume: simulatedTrends[simulatedTrends.length - 1].BEV + simulatedTrends[simulatedTrends.length - 1].PHEV
    });

    setPredicting(false);
  };

  // Trigger default forecast on load
  useEffect(() => {
    if (!loading) {
      generateForecast();
    }
  }, [loading]);

  const handleMakeChange = (e) => {
    const selectedMake = e.target.value;
    setMake(selectedMake);
    const models = meta.models_by_make[selectedMake] || [];
    if (models.length > 0) {
      setModel(models[0]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white pb-12">
      {/* HEADER NAVBAR */}
      <header className="border-b border-slate-900 bg-slate-950/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/10 p-2 rounded-xl border border-blue-500/20 text-blue-400">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-md font-bold tracking-tight text-white flex items-center gap-2">
                BEVPHEV Prediction System
                <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 font-normal px-2 py-0.5 rounded-full">v1.1</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">Corporate Fleet Analytics & Adoption Modeler</p>
            </div>
          </div>

          {/* Connection URL Selector / Status Badge */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="api-status-bar flex items-center gap-2 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-xl" style={{ display: 'none' }}>
              <Settings className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] text-slate-400 font-mono">API:</span>
              <input 
                type="text"
                value={backendUrl}
                onChange={(e) => setBackendUrl(e.target.value)}
                className="bg-transparent text-[10px] text-slate-300 font-mono border-none outline-none focus:ring-0 w-64"
                placeholder="Railway API URL"
              />
              <button 
                onClick={handleReconnect}
                className="text-[9px] text-blue-400 hover:text-blue-300 font-bold ml-1 uppercase"
                title="Reload backend metadata config"
              >
                RECONNECT
              </button>
            </div>

            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold ${
              isOffline 
                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}>
              <Server className="w-3.5 h-3.5" />
              <span>{isOffline ? `Offline Mode (Fallback: ${backendUrl})` : `Backend Connected (${backendUrl})`}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8">
        {/* Offline Warning banner if API fails */}
        <AnimatePresence>
          {apiError && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2.5 shadow-lg"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-bold">System Status Warning: </strong>
                <span>{apiError}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* METRICS / KPI GRID */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {loading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-slate-900/50 border border-slate-900 p-5 rounded-xl h-24 animate-pulse flex flex-col justify-between">
                <div className="w-1/2 h-3 bg-slate-800 rounded"></div>
                <div className="w-3/4 h-6 bg-slate-800 rounded"></div>
              </div>
            ))
          ) : (
            <>
              {/* KPI 1: Predicted BEV Share */}
              <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-xl flex items-center justify-between hover:border-slate-800 transition-colors shadow-premium">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">BEV Market Share (Target)</p>
                  <h3 className="text-3xl font-black text-white mt-1">
                    {simulatedKPIs.bevMarketShare}%
                  </h3>
                  <p className="text-[9px] text-slate-500 mt-1 flex items-center gap-1">
                    Baseline: {(baselinePrediction?.probabilities["Battery Electric Vehicle (BEV)"] * 100).toFixed(0)}%
                  </p>
                </div>
                <div className="bg-blue-600/10 p-2.5 rounded-lg border border-blue-500/20 text-blue-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
              </div>

              {/* KPI 2: CAGR */}
              <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-xl flex items-center justify-between hover:border-slate-800 transition-colors shadow-premium">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Simulated Growth (CAGR)</p>
                  <h3 className="text-3xl font-black text-emerald-400 mt-1">
                    {simulatedKPIs.growthRate > 0 ? `+${simulatedKPIs.growthRate}` : simulatedKPIs.growthRate}%
                  </h3>
                  <p className="text-[9px] text-slate-500 mt-1">Compound annual growth rate</p>
                </div>
                <div className="bg-emerald-600/10 p-2.5 rounded-lg border border-emerald-500/20 text-emerald-400">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>

              {/* KPI 3: Model Accuracy */}
              <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-xl flex items-center justify-between hover:border-slate-800 transition-colors shadow-premium">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Classifier Confidence</p>
                  <h3 className="text-3xl font-black text-blue-400 mt-1">
                    {simulatedKPIs.confidenceScore}%
                  </h3>
                  <p className="text-[9px] text-slate-500 mt-1">Decision tree test set accuracy</p>
                </div>
                <div className="bg-blue-600/10 p-2.5 rounded-lg border border-blue-500/20 text-blue-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
              </div>

              {/* KPI 4: Target Year volume */}
              <div className="bg-slate-900/40 border border-slate-900 p-5 rounded-xl flex items-center justify-between hover:border-slate-800 transition-colors shadow-premium">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Simulated Fleet Size</p>
                  <h3 className="text-3xl font-black text-white mt-1">
                    {simulatedKPIs.simulatedVolume.toLocaleString()}
                  </h3>
                  <p className="text-[9px] text-slate-500 mt-1">Projected total registrations</p>
                </div>
                <div className="bg-slate-800 p-2.5 rounded-lg border border-slate-700 text-slate-400">
                  <Layers className="w-5 h-5" />
                </div>
              </div>
            </>
          )}
        </section>

        {/* WORKSPACE GRID */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* CONTROLS COLUMN (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Live Model Input parameters */}
            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl shadow-premium">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-4 pb-2.5 border-b border-slate-800">
                <Car className="w-4 h-4 text-blue-400" />
                Classifier Base Inputs
              </h3>
              
              <div className="space-y-4">
                {/* Make Selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Manufacturer (Make)</label>
                  <select 
                    value={make}
                    onChange={handleMakeChange}
                    className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-100"
                  >
                    {meta.makes.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Model Selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Model</label>
                  <select 
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-100"
                  >
                    {(meta.models_by_make[make] || []).map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* County Selector */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">County Zone</label>
                  <select 
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    className="w-full mt-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-100"
                  >
                    {meta.counties.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Year Slider */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Model Year</span>
                    <span className="text-blue-400 font-mono">{year}</span>
                  </div>
                  <input 
                    type="range"
                    min="2012"
                    max="2026"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="w-full mt-2 accent-blue-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Adoption Simulator factors */}
            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl shadow-premium">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-4 pb-2.5 border-b border-slate-800">
                <Gauge className="w-4 h-4 text-emerald-400" />
                Adoption Simulator
              </h3>

              <div className="space-y-5">
                {/* Target Year Slider */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Target Forecast Year</span>
                    <span className="text-emerald-400 font-mono">{targetYear}</span>
                  </div>
                  <input 
                    type="range"
                    min="2026"
                    max="2036"
                    value={targetYear}
                    onChange={(e) => setTargetYear(parseInt(e.target.value))}
                    className="w-full mt-2 accent-emerald-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Charging Density Slider */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Charging Infra Density</span>
                    <span className="text-emerald-400 font-mono">{chargingDensity}%</span>
                  </div>
                  <input 
                    type="range"
                    min="10"
                    max="100"
                    value={chargingDensity}
                    onChange={(e) => setChargingDensity(parseInt(e.target.value))}
                    className="w-full mt-2 accent-emerald-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Fuel Price Slider */}
                <div>
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Fuel Price (USD/Gal)</span>
                    <span className="text-emerald-400 font-mono">${fuelPrice.toFixed(2)}</span>
                  </div>
                  <input 
                    type="range"
                    min="3.00"
                    max="6.50"
                    step="0.05"
                    value={fuelPrice}
                    onChange={(e) => setFuelPrice(parseFloat(e.target.value))}
                    className="w-full mt-2 accent-emerald-500 h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Policy toggles */}
                <div className="pt-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Policy Incentives</label>
                  <div className="space-y-2">
                    <label className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 cursor-pointer hover:border-slate-800">
                      <span className="text-xs text-slate-300">EV Tax Credits ($7,500)</span>
                      <input 
                        type="checkbox"
                        checked={taxCredits}
                        onChange={(e) => setTaxCredits(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-950"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 cursor-pointer hover:border-slate-800">
                      <span className="text-xs text-slate-300">HOV Lane Access</span>
                      <input 
                        type="checkbox"
                        checked={hovAccess}
                        onChange={(e) => setHovAccess(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-950"
                      />
                    </label>

                    <label className="flex items-center justify-between bg-slate-950/60 p-2.5 rounded-xl border border-slate-900 cursor-pointer hover:border-slate-800">
                      <span className="text-xs text-slate-300">Carbon Emission Tax</span>
                      <input 
                        type="checkbox"
                        checked={carbonTax}
                        onChange={(e) => setCarbonTax(e.target.checked)}
                        className="rounded border-slate-800 bg-slate-950 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-950"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Run button */}
            <button
              onClick={generateForecast}
              disabled={predicting}
              className="w-full bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-3.5 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-blue-500/10 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
            >
              {predicting ? (
                <span className="text-xs animate-pulse">Running Calculations...</span>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>Generate Forecast</span>
                </>
              )}
            </button>
          </div>

          {/* VISUALIZATION/RESULTS COLUMN (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Inference summary card */}
            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl shadow-premium">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-4 pb-2.5 border-b border-slate-800">
                <Activity className="w-4 h-4 text-blue-400" />
                Live Model Inference
              </h3>

              {predicting ? (
                <div className="py-8 animate-pulse flex flex-col items-center justify-center space-y-3">
                  <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-xs text-slate-500">Querying Railway prediction API...</p>
                </div>
              ) : baselinePrediction ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Dial */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center py-2">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle 
                          cx="50" cy="50" r="40" 
                          fill="transparent" 
                          stroke="#1E293B" 
                          strokeWidth="8"
                        />
                        <circle 
                          cx="50" cy="50" r="40" 
                          fill="transparent" 
                          stroke={baselinePrediction.prediction.includes("BEV") ? "#2563EB" : "#3B82F6"} 
                          strokeWidth="8"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * (baselinePrediction.probabilities["Battery Electric Vehicle (BEV)"] || 0.5))}
                          strokeLinecap="round"
                          className="transition-all duration-700 ease-out"
                        />
                      </svg>
                      
                      <div className="absolute text-center">
                        <span className="text-2xl font-black text-white">
                          {((baselinePrediction.probabilities["Battery Electric Vehicle (BEV)"] || 0) * 100).toFixed(0)}%
                        </span>
                        <p className="text-[8px] text-slate-500 font-extrabold uppercase mt-0.5">BEV Probability</p>
                      </div>
                    </div>
                  </div>

                  {/* Results Text */}
                  <div className="md:col-span-7 space-y-3">
                    <div>
                      <span className="text-[9px] font-bold tracking-widest text-slate-500 uppercase">Baseline Prediction</span>
                      <h4 className="text-xl font-extrabold text-white mt-0.5">
                        {baselinePrediction.prediction.includes("BEV") ? 'Battery Electric Vehicle (BEV)' : 'Plug-in Hybrid Vehicle (PHEV)'}
                      </h4>
                    </div>

                    <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-900 text-xs text-slate-400 space-y-1.5 font-mono">
                      <div className="flex justify-between">
                        <span>Vehicle Age:</span>
                        <span className="text-slate-300 font-semibold">{baselinePrediction.preprocessed_inputs.vehicle_age} Yrs</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Region Filter:</span>
                        <span className="text-slate-300 font-semibold">{baselinePrediction.preprocessed_inputs.region}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Model Frequency:</span>
                        <span className="text-slate-300 font-semibold">{baselinePrediction.preprocessed_inputs.model_frequency}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Configure inputs and click Generate Forecast to run the model.
                </div>
              )}
            </div>

            {/* CHART 1: Longitudinal adoption trend */}
            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl shadow-premium">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-6 pb-2.5 border-b border-slate-800">
                <BarChart3 className="w-4 h-4 text-blue-400" />
                Longitudinal Adoption Trend (Stacked Volume)
              </h3>

              {loading ? (
                <div className="h-[300px] w-full bg-slate-900/20 animate-pulse rounded-xl"></div>
              ) : (
                <div className="h-[300px] w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trendData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="colorBEV" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0}/>
                        </linearGradient>
                        <linearGradient id="colorPHEV" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1E40AF" stopOpacity={0.15}/>
                          <stop offset="95%" stopColor="#1E40AF" stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.3} />
                      <XAxis dataKey="year" stroke="#475569" />
                      <YAxis stroke="#475569" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC' }}
                        itemStyle={{ color: '#94A3B8' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Area type="monotone" dataKey="BEV" name="BEV Registrations" stroke="#2563EB" fillOpacity={1} fill="url(#colorBEV)" strokeWidth={2} />
                      <Area type="monotone" dataKey="PHEV" name="PHEV Registrations" stroke="#3B82F6" opacity={0.7} fillOpacity={1} fill="url(#colorPHEV)" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* CHART 2: Scenario Comparison stacked bar chart */}
            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl shadow-premium">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2 mb-6 pb-2.5 border-b border-slate-800">
                <Layers className="w-4 h-4 text-emerald-400" />
                Scenario Sensitivity Comparison (Share %)
              </h3>

              {loading ? (
                <div className="h-[250px] w-full bg-slate-900/20 animate-pulse rounded-xl"></div>
              ) : (
                <div className="h-[250px] w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={comparisonData}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      barSize={40}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" opacity={0.3} />
                      <XAxis dataKey="name" stroke="#475569" />
                      <YAxis stroke="#475569" unit="%" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC' }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar dataKey="BEV" name="BEV %" stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="PHEV" name="PHEV %" stackId="a" fill="#1E40AF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="max-w-7xl mx-auto px-6 mt-16 pt-6 border-t border-slate-900 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-slate-500 font-mono">
        <p>© {new Date().getFullYear()} BEVPHEV Prediction System. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-slate-300">System Logs</a>
          <span>•</span>
          <a href="#" className="hover:text-slate-300">Model Specs</a>
          <span>•</span>
          <a href="#" className="hover:text-slate-300">API Documentation</a>
        </div>
      </footer>
    </div>
  );
}
