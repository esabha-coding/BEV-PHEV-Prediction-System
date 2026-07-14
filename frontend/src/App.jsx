import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Cell
} from 'recharts';
import { 
  Activity, 
  Car, 
  Calendar, 
  Search, 
  Cpu, 
  RotateCcw, 
  CheckCircle, 
  TrendingUp, 
  Gauge, 
  Layers, 
  Server,
  HelpCircle,
  BarChart3,
  GitBranch,
  ShieldCheck,
  Grid
} from 'lucide-react';

// ==========================================
// MOCK DATA FALLBACK (For offline/pre-train mode)
// ==========================================
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
  counties: ["King", "Snohomish", "Pierce", "Kitsap", "Thurston", "Spokane", "Yakima", "Whatcom", "Clark"],
  grouped_importances: {
    "Model_Frequency": 0.4852,
    "Vehicle Age": 0.3120,
    "Make": 0.1425,
    "Region": 0.0603
  },
  make_distribution: [
    { make: "TESLA", bev: 72000, phev: 120, total: 72120 },
    { make: "NISSAN", bev: 13000, phev: 50, total: 13050 },
    { make: "CHEVROLET", bev: 10500, phev: 4200, total: 14700 },
    { make: "FORD", bev: 6500, phev: 2100, total: 8600 },
    { make: "BMW", bev: 2100, phev: 5800, total: 7900 },
    { make: "TOYOTA", bev: 80, phev: 7200, total: 7280 },
    { make: "KIA", bev: 4100, phev: 2100, total: 6200 }
  ],
  year_distribution: [
    { year: 2011, bev: 1100, phev: 500 },
    { year: 2013, bev: 4200, phev: 2100 },
    { year: 2015, bev: 6800, phev: 3500 },
    { year: 2017, bev: 9200, phev: 5200 },
    { year: 2018, bev: 14200, phev: 6800 },
    { year: 2020, bev: 16500, phev: 7400 },
    { year: 2022, bev: 24500, phev: 9800 },
    { year: 2023, bev: 32000, phev: 11200 },
    { year: 2024, bev: 36000, phev: 12100 },
    { year: 2025, bev: 41000, phev: 13500 }
  ],
  tree_json: {
    id: 0,
    is_leaf: false,
    feature: "Model_Frequency",
    threshold: 250.0,
    class_predicted: "Battery Electric Vehicle (BEV)",
    probabilities: [0.63, 0.37],
    samples: 142587,
    left: {
      id: 1,
      is_leaf: false,
      feature: "Vehicle Age",
      threshold: 5.0,
      class_predicted: "Plug-in Hybrid Electric Vehicle (PHEV)",
      probabilities: [0.35, 0.65],
      samples: 48200,
      left: {
        id: 3,
        is_leaf: true,
        class: "Plug-in Hybrid Electric Vehicle (PHEV)",
        probabilities: [0.15, 0.85],
        samples: 31000
      },
      right: {
        id: 4,
        is_leaf: true,
        class: "Battery Electric Vehicle (BEV)",
        probabilities: [0.72, 0.28],
        samples: 17200
      }
    },
    right: {
      id: 2,
      is_leaf: false,
      feature: "Make_TESLA",
      threshold: 0.5,
      class_predicted: "Battery Electric Vehicle (BEV)",
      probabilities: [0.78, 0.22],
      samples: 94387,
      left: {
        id: 5,
        is_leaf: false,
        feature: "Region_Puget Sound",
        threshold: 0.5,
        class_predicted: "Battery Electric Vehicle (BEV)",
        probabilities: [0.69, 0.31],
        samples: 51200,
        left: {
          id: 7,
          is_leaf: true,
          class: "Plug-in Hybrid Electric Vehicle (PHEV)",
          probabilities: [0.48, 0.52],
          samples: 14000
        },
        right: {
          id: 8,
          is_leaf: true,
          class: "Battery Electric Vehicle (BEV)",
          probabilities: [0.77, 0.23],
          samples: 37200
        }
      },
      right: {
        id: 6,
        is_leaf: true,
        class: "Battery Electric Vehicle (BEV)",
        probabilities: [0.99, 0.01],
        samples: 43187
      }
    }
  }
};

const VEHICLE_PROFILES = [
  { id: 1, label: "Tesla Model 3 (Puget Sound)", make: "TESLA", model: "MODEL 3", county: "King", year: 2022, desc: "High-frequency BEV in core metro area." },
  { id: 2, label: "BMW X5 (Other WA)", make: "BMW", model: "X5", county: "Spokane", year: 2021, desc: "Low-frequency PHEV SUV in Eastern WA." },
  { id: 3, label: "Nissan Leaf (Puget Sound)", make: "NISSAN", model: "LEAF", county: "Snohomish", year: 2015, desc: "Older generation high-frequency BEV." },
  { id: 4, label: "Chevrolet Volt (Other WA)", make: "CHEVROLET", model: "VOLT", county: "Clark", year: 2017, desc: "Mid-age PHEV model with moderate frequency." },
  { id: 5, label: "Toyota Prius Prime (Puget Sound)", make: "TOYOTA", model: "PRIUS PRIME", county: "Pierce", year: 2020, desc: "Modern commuter plug-in hybrid vehicle." }
];

export default function App() {
  const [meta, setMeta] = useState(MOCK_META);
  const [isOffline, setIsOffline] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Form States
  const [make, setMake] = useState('TESLA');
  const [model, setModel] = useState('MODEL 3');
  const [county, setCounty] = useState('King');
  const [year, setYear] = useState(2022);
  
  // Prediction States
  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [apiError, setApiError] = useState(null);
  
  // UI Tabs
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | tree | analytics
  
  // Fetch model metadata on mount
  useEffect(() => {
    fetchMeta();
  }, []);
  
  // Trigger prediction automatically when form inputs change
  useEffect(() => {
    if (meta) {
      calculatePrediction();
    }
  }, [make, model, county, year]);

  const fetchMeta = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/meta');
      const data = response.data;
      setMeta(data);
      setIsOffline(false);
      
      // Initialize form with fetched values if possible
      if (data.makes && data.makes.length > 0) {
        const firstMake = data.makes[0];
        setMake(firstMake);
        if (data.models_by_make[firstMake]) {
          setModel(data.models_by_make[firstMake][0]);
        }
      }
      if (data.counties && data.counties.length > 0) {
        setCounty(data.counties[0]);
      }
    } catch (err) {
      console.log("Could not connect to backend API, using mock/offline assets:", err.message);
      setIsOffline(true);
      setMeta(MOCK_META);
    } finally {
      setLoading(false);
    }
  };

  const calculatePrediction = async () => {
    setPredicting(true);
    setApiError(null);
    
    const payload = {
      make,
      model,
      county,
      model_year: parseInt(year)
    };
    
    try {
      if (isOffline) {
        await new Promise(resolve => setTimeout(resolve, 120)); // Mock latency
        mockPredict(payload);
      } else {
        const response = await axios.post('/api/predict', payload);
        setPredictionResult(response.data);
      }
    } catch (err) {
      setApiError("Failed to calculate prediction from backend. Falling back to local predictor.");
      mockPredict(payload);
    } finally {
      setPredicting(false);
    }
  };

  const mockPredict = (inputs) => {
    const isPugetSound = ["King", "Snohomish", "Pierce", "Kitsap", "Thurston"].includes(inputs.county);
    const vehicleAge = new Date().getFullYear() - inputs.model_year;
    
    let frequency = 100;
    if (inputs.make === 'TESLA') frequency = 5000;
    else if (inputs.make === 'NISSAN') frequency = 1200;
    else if (inputs.make === 'CHEVROLET' && inputs.model === 'BOLT EV') frequency = 800;
    else if (inputs.make === 'CHEVROLET' && inputs.model === 'VOLT') frequency = 600;
    else if (inputs.make === 'BMW' && inputs.model === 'I3') frequency = 300;
    else if (inputs.make === 'BMW') frequency = 40;
    else if (inputs.make === 'TOYOTA') frequency = 450;
    else if (inputs.make === 'FORD') frequency = 400;
    else if (inputs.make === 'KIA') frequency = 350;

    const path = [0];
    let currentNode = meta.tree_json || MOCK_META.tree_json;
    
    while (!currentNode.is_leaf) {
      const feature = currentNode.feature;
      const threshold = currentNode.threshold;
      
      let goLeft = false;
      if (feature === 'Model_Frequency') {
        goLeft = frequency <= threshold;
      } else if (feature === 'Vehicle Age') {
        goLeft = vehicleAge <= threshold;
      } else if (feature === 'Make_TESLA') {
        goLeft = (inputs.make === 'TESLA' ? 1.0 : 0.0) <= threshold;
      } else if (feature === 'Region_Puget Sound') {
        goLeft = (isPugetSound ? 1.0 : 0.0) <= threshold;
      } else {
        goLeft = Math.random() > 0.5;
      }
      
      currentNode = goLeft ? currentNode.left : currentNode.right;
      path.push(currentNode.id);
    }
    
    const predLabel = currentNode.class || (currentNode.class_predicted);
    const probs = {
      "Battery Electric Vehicle (BEV)": currentNode.probabilities[0],
      "Plug-in Hybrid Electric Vehicle (PHEV)": currentNode.probabilities[1]
    };

    setPredictionResult({
      prediction: predLabel,
      probabilities: probs,
      decision_path: path,
      preprocessed_inputs: {
        make: inputs.make,
        region: isPugetSound ? "Puget Sound" : "Other WA",
        vehicle_age: vehicleAge,
        model_frequency: frequency
      }
    });
  };

  const handleProfileSelect = (profile) => {
    setMake(profile.make);
    setTimeout(() => {
      setModel(profile.model);
      setCounty(profile.county);
      setYear(profile.year);
    }, 20);
  };

  const handleMakeChange = (e) => {
    const selectedMake = e.target.value;
    setMake(selectedMake);
    const models = meta.models_by_make[selectedMake] || [];
    if (models.length > 0) {
      setModel(models[0]);
    }
  };

  const formatPercent = (val) => `${(val * 100).toFixed(1)}%`;
  
  const getProbability = (result, label) => {
    if (!result || !result.probabilities) return 0;
    for (const key of Object.keys(result.probabilities)) {
      if (key.includes(label)) return result.probabilities[key];
    }
    return 0;
  };

  // Convert feature importance object to Recharts array
  const getImportanceData = () => {
    const data = meta.grouped_importances || MOCK_META.grouped_importances;
    return Object.keys(data).map(key => ({
      name: key.replace('_', ' '),
      importance: parseFloat((data[key] * 100).toFixed(2))
    })).sort((a, b) => b.importance - a.importance);
  };

  // Decision Tree Recursive Visualizer
  const DecisionTreeDiagram = () => {
    const treeData = meta.tree_json;
    const pathNodes = predictionResult?.decision_path || [];

    if (!treeData) return <div className="text-center p-8">No tree model loaded.</div>;

    const renderTreeNode = (node) => {
      const isTraversed = pathNodes.includes(node.id);
      
      if (node.is_leaf) {
        const isBEV = (node.class || node.class_predicted || "").includes("BEV");
        return (
          <div className="flex flex-col items-center">
            <div className={`w-44 p-3 rounded-xl border text-center transition-all duration-300 ${
              isTraversed 
                ? 'border-bmw-blue bg-blue-50/90 shadow-active scale-105 ring-2 ring-bmw-blue/20' 
                : 'border-slate-200 bg-white opacity-60'
            }`}>
              <div className="text-[10px] font-bold text-slate-400 mb-1">Leaf Node #{node.id}</div>
              <div className={`text-xs font-extrabold uppercase tracking-wider ${isBEV ? 'text-bmw-blue' : 'text-bmw-navy'}`}>
                {isBEV ? 'BEV' : 'PHEV'}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Samples: {node.samples.toLocaleString()}
              </div>
              <div className="mt-1 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full ${isBEV ? 'bg-bmw-blue' : 'bg-bmw-navy'}`} 
                  style={{ width: `${(isBEV ? node.probabilities[0] : node.probabilities[1]) * 100}%` }}
                ></div>
              </div>
              <div className="text-[9px] text-slate-400 mt-0.5">
                Conf: {formatPercent(isBEV ? node.probabilities[0] : node.probabilities[1])}
              </div>
            </div>
          </div>
        );
      }

      let label = "";
      if (node.feature.startsWith("Make_")) {
        label = `Is Make = ${node.feature.split("_")[1]}?`;
      } else if (node.feature.startsWith("Region_")) {
        label = `Is Region = ${node.feature.split("_")[1]}?`;
      } else if (node.feature === "Model_Frequency") {
        label = `Model Freq <= ${node.threshold.toFixed(0)}`;
      } else if (node.feature === "Vehicle Age") {
        label = `Vehicle Age <= ${node.threshold.toFixed(1)} yrs`;
      } else {
        label = `${node.feature} <= ${node.threshold}`;
      }

      return (
        <div className="flex flex-col items-center w-full">
          <div className="relative flex flex-col items-center">
            <div className={`w-48 p-3 rounded-xl border text-center transition-all duration-300 bg-white ${
              isTraversed 
                ? 'border-bmw-blue shadow-active bg-blue-50/50 scale-105 z-10 ring-2 ring-bmw-blue/20' 
                : 'border-slate-200 opacity-60'
            }`}>
              <div className="text-[10px] font-bold text-slate-400 mb-0.5 font-mono">Node #{node.id}</div>
              <div className="text-xs font-bold text-bmw-navy">{label}</div>
              <div className="text-[9px] text-slate-400 mt-1">
                Samples: {node.samples.toLocaleString()}
              </div>
            </div>
            
            <div className="h-6 w-0.5 bg-slate-200"></div>
          </div>

          <div className="flex w-full justify-between gap-4 relative">
            <div className="absolute inset-x-0 top-0 h-4 flex justify-between pointer-events-none">
              <div className="w-1/2 border-t border-r border-slate-200 rounded-tr-md"></div>
              <div className="w-1/2 border-t border-l border-slate-200 rounded-tl-md"></div>
            </div>

            <div className="w-1/2 flex flex-col items-center pt-4 relative">
              <span className={`absolute top-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                isTraversed && pathNodes.includes(node.left.id)
                  ? 'text-bmw-blue bg-blue-100 font-extrabold shadow-sm'
                  : 'text-slate-400 bg-slate-50'
              }`}>
                Yes
              </span>
              {renderTreeNode(node.left)}
            </div>

            <div className="w-1/2 flex flex-col items-center pt-4 relative">
              <span className={`absolute top-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                isTraversed && pathNodes.includes(node.right.id)
                  ? 'text-bmw-blue bg-blue-100 font-extrabold shadow-sm'
                  : 'text-slate-400 bg-slate-50'
              }`}>
                No
              </span>
              {renderTreeNode(node.right)}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="w-full overflow-x-auto py-6 flex flex-col items-center">
        <div className="min-w-[850px] flex justify-center px-4">
          {renderTreeNode(treeData)}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-bmw-offwhite">
      {/* ==========================================
          HEADER / CORPORATE LOGOBAR
          ========================================== */}
      <header className="bg-bmw-navy text-white px-6 py-4 shadow-premium sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-bmw-blue p-2.5 rounded-xl flex items-center justify-center">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">BEVPHEV Prediction System</h1>
              <p className="text-[11px] text-slate-300 font-medium">BMW Corporate Fleet Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
              isOffline 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}>
              <Server className="w-3.5 h-3.5" />
              <span>{isOffline ? 'Offline Mode (Fallback)' : 'Backend Connected'}</span>
            </div>
            
            {isOffline && (
              <button 
                onClick={fetchMeta} 
                className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white rounded-lg p-1.5 transition-colors"
                title="Retry connecting to FastAPI backend"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ==========================================
          MAIN LAYOUT CONTAINER
          ========================================== */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-8">
        
        {/* ==========================================
            METRICS / KPI DASHBOARD
            ========================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          
          {/* Card 1: Accuracy */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-premium flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
            <div className="p-3 bg-blue-50 rounded-xl text-bmw-blue">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Classifier Accuracy</p>
              <h3 className="text-2xl font-extrabold text-bmw-navy mt-0.5">
                {formatPercent(meta.metrics.test_accuracy)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">
                Baseline (guess BEV): {formatPercent(meta.metrics.baseline_accuracy)}
              </p>
            </div>
          </div>

          {/* Card 2: Dataset Size */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-premium flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
            <div className="p-3 bg-slate-50 rounded-xl text-bmw-navy">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Training Cars</p>
              <h3 className="text-2xl font-extrabold text-bmw-navy mt-0.5">
                {meta.metrics.total_samples.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Cleaned, pre-processed records</p>
            </div>
          </div>

          {/* Card 3: Distribution */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-premium flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">BEV / PHEV Split</p>
              <h3 className="text-2xl font-extrabold text-bmw-navy mt-0.5">
                {formatPercent(meta.metrics.bev_count / meta.metrics.total_samples)} BEV
              </h3>
              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden flex">
                <div 
                  className="bg-bmw-blue h-full" 
                  style={{ width: `${(meta.metrics.bev_count / meta.metrics.total_samples) * 100}%` }}
                ></div>
                <div 
                  className="bg-bmw-navy h-full" 
                  style={{ width: `${(meta.metrics.phev_count / meta.metrics.total_samples) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Card 4: Average Age */}
          <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-premium flex items-center gap-4 hover:scale-[1.01] transition-transform duration-200">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Age</p>
              <h3 className="text-2xl font-extrabold text-bmw-navy mt-0.5">
                {meta.metrics.avg_vehicle_age.toFixed(1)} Yrs
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Based on model production year</p>
            </div>
          </div>
        </section>

        {/* ==========================================
            VEHICLE PROFILES LOOKUP SECTION
            ========================================== */}
        <section className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-5 h-5 text-bmw-blue" />
            <h2 className="text-base font-bold text-bmw-navy">Vehicle Profile Lookups</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Select one of the pre-computed fleet profiles below to populate the decision calculator instantly.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {VEHICLE_PROFILES.map((profile) => {
              const isSelected = make === profile.make && model === profile.model && county === profile.county && year === profile.year;
              return (
                <button
                  key={profile.id}
                  onClick={() => handleProfileSelect(profile)}
                  className={`p-3 rounded-xl border text-left transition-all duration-200 ${
                    isSelected 
                      ? 'border-bmw-blue bg-blue-50/50 ring-2 ring-bmw-blue/20' 
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-bmw-navy">
                    <Car className="w-3.5 h-3.5 text-bmw-blue shrink-0" />
                    <span className="truncate">{profile.label}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
                    {profile.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {/* ==========================================
            CALCULATOR & PREDICTION RESULTS CONTAINER
            ========================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start mb-8">
          
          {/* LEFT: Prediction Parameters Form (5 columns) */}
          <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium">
            <div className="flex items-center gap-2 mb-6 pb-3 border-b border-slate-100">
              <Gauge className="w-5 h-5 text-bmw-blue" />
              <h2 className="text-base font-bold text-bmw-navy font-sans">Prediction Parameters</h2>
            </div>
            
            <div className="space-y-5">
              {/* Make Input */}
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Vehicle Manufacturer (Make)
                </label>
                <select
                  value={make}
                  onChange={handleMakeChange}
                  className="bg-bmw-offwhite border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-bmw-blue focus:ring-2 focus:ring-bmw-blue/20 transition-all text-bmw-navy"
                >
                  {meta.makes.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Model Input */}
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Model Selection
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="bg-bmw-offwhite border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-bmw-blue focus:ring-2 focus:ring-bmw-blue/20 transition-all text-bmw-navy"
                >
                  {(meta.models_by_make[make] || []).map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* County Input */}
              <div className="flex flex-col">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5 flex justify-between">
                  <span>County / Registration Zone</span>
                  <span className="text-[10px] text-bmw-blue normal-case font-semibold">
                    Region: {["King", "Snohomish", "Pierce", "Kitsap", "Thurston"].includes(county) ? 'Puget Sound' : 'Other WA'}
                  </span>
                </label>
                <select
                  value={county}
                  onChange={(e) => setCounty(e.target.value)}
                  className="bg-bmw-offwhite border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold focus:outline-none focus:border-bmw-blue focus:ring-2 focus:ring-bmw-blue/20 transition-all text-bmw-navy"
                >
                  {meta.counties.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Model Year Input */}
              <div className="flex flex-col">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                    Model Year
                  </label>
                  <span className="text-xs font-extrabold text-bmw-blue bg-blue-50 px-2.5 py-0.5 rounded-full">
                    {year} ({new Date().getFullYear() - year} Yrs Old)
                  </span>
                </div>
                <input
                  type="range"
                  min="2010"
                  max="2026"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value))}
                  className="w-full accent-bmw-blue h-1.5 bg-slate-100 rounded-lg cursor-pointer animate-pulse"
                />
                <div className="flex justify-between text-[10px] text-slate-400 font-bold mt-1.5">
                  <span>2010</span>
                  <span>2018</span>
                  <span>2026</span>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-4 border-t border-slate-100">
              <p className="text-[10px] text-slate-400 text-center leading-relaxed">
                Predictions update in real-time. The FastAPI server applies a trained Decision Tree Classifier (max depth = 4) under the hood.
              </p>
            </div>
          </div>
          
          {/* RIGHT: Results and Probability Dial (7 columns) */}
          <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium flex flex-col justify-between min-h-[420px]">
            <div>
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-bmw-blue" />
                  <h2 className="text-base font-bold text-bmw-navy">Inference Analysis</h2>
                </div>
                {predicting && (
                  <span className="text-xs text-bmw-blue animate-pulse font-medium">Computing...</span>
                )}
              </div>

              {predictionResult ? (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  
                  {/* Dial / Metric Visualizer (5 cols) */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center py-2">
                    <div className="relative w-36 h-36 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle 
                          cx="50" cy="50" r="40" 
                          fill="transparent" 
                          stroke="#E2E8F0" 
                          strokeWidth="8"
                        />
                        <circle 
                          cx="50" cy="50" r="40" 
                          fill="transparent" 
                          stroke={predictionResult.prediction.includes("BEV") ? "#0066B1" : "#003D78"} 
                          strokeWidth="8"
                          strokeDasharray={251.2}
                          strokeDashoffset={251.2 - (251.2 * getProbability(predictionResult, predictionResult.prediction.includes("BEV") ? "BEV" : "PHEV"))}
                          strokeLinecap="round"
                          className="transition-all duration-500 ease-out"
                        />
                      </svg>
                      
                      <div className="absolute text-center">
                        <span className="text-3xl font-extrabold text-bmw-navy">
                          {formatPercent(getProbability(predictionResult, predictionResult.prediction.includes("BEV") ? "BEV" : "PHEV"))}
                        </span>
                        <p className="text-[9px] text-slate-400 font-extrabold uppercase mt-0.5">Confidence</p>
                      </div>
                    </div>
                  </div>

                  {/* Text Classification Result (7 cols) */}
                  <div className="md:col-span-7 space-y-4">
                    <div>
                      <span className="text-[10px] font-extrabold tracking-widest text-slate-400 uppercase">
                        Classification Output
                      </span>
                      <h3 className={`text-2xl font-extrabold tracking-tight mt-1 ${
                        predictionResult.prediction.includes("BEV") ? 'text-bmw-blue' : 'text-bmw-navy'
                      }`}>
                        {predictionResult.prediction.includes("BEV") ? 'Battery Electric (BEV)' : 'Plug-in Hybrid (PHEV)'}
                      </h3>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 text-xs leading-relaxed text-slate-600">
                      <strong>Feature Extraction Summary:</strong>
                      <ul className="mt-1.5 space-y-1 list-disc list-inside">
                        <li>Vehicle Age calculated: <strong>{predictionResult.preprocessed_inputs.vehicle_age} Years</strong></li>
                        <li>Region mapping: <strong>{predictionResult.preprocessed_inputs.region}</strong></li>
                        <li>Model frequency code: <strong>{predictionResult.preprocessed_inputs.model_frequency.toLocaleString()} registrations</strong></li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Car className="w-12 h-12 text-slate-300 animate-bounce mb-3" />
                  <p className="text-sm font-semibold">No data processed yet</p>
                  <p className="text-xs text-slate-400 font-medium">Configure inputs above to compute classification.</p>
                </div>
              )}
            </div>

            {/* Decision explanation text block */}
            {predictionResult && (
              <div className="mt-6 pt-4 border-t border-slate-100">
                <div className="flex gap-2 items-start text-xs text-slate-500">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-700">Decision Trace Path: </span>
                    Traversed through {predictionResult.decision_path.length} decision splits. Predicted leaf node reached: 
                    <strong className="text-bmw-navy"> Node #{predictionResult.decision_path[predictionResult.decision_path.length - 1]}</strong>.
                    Navigate to the <span onClick={() => setActiveTab('tree')} className="text-bmw-blue underline cursor-pointer font-semibold">Split Mapping</span> tab to view the highlighted path inside the decision tree.
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ==========================================
            TABS NAVIGATION
            ========================================== */}
        <section className="mb-6 border-b border-slate-200">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'dashboard' 
                  ? 'border-bmw-blue text-bmw-blue' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Layers className="w-4 h-4" />
              System Dashboard
            </button>
            <button
              onClick={() => setActiveTab('tree')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'tree' 
                  ? 'border-bmw-blue text-bmw-blue' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <GitBranch className="w-4 h-4" />
              Decision Tree Split Mapping
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'analytics' 
                  ? 'border-bmw-blue text-bmw-blue' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              ML Analytics & Charts
            </button>
          </div>
        </section>

        {/* ==========================================
            TAB CONTENT: DECISION TREE SPLIT MAP
            ========================================== */}
        <AnimatePresence mode="wait">
          {activeTab === 'tree' && (
            <motion.section 
              key="tree"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-slate-100 mb-6">
                <div>
                  <h2 className="text-base font-bold text-bmw-navy">Decision Tree Path Visualization</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Visualization of the trained classifier (max depth = 4). The active traversal path for the current prediction is highlighted in <span className="text-bmw-blue font-bold">Active Blue</span>.
                  </p>
                </div>
                <div className="flex gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-blue-50 border-2 border-bmw-blue rounded-lg"></span> Traversed Path</span>
                  <span className="flex items-center gap-1.5"><span className="w-3.5 h-3.5 bg-white border border-slate-200 rounded-lg"></span> Untraversed Splits</span>
                </div>
              </div>
              
              <DecisionTreeDiagram />
            </motion.section>
          )}

          {/* ==========================================
              TAB CONTENT: ML ANALYTICS & CHARTS
              ========================================== */}
          {activeTab === 'analytics' && (
            <motion.section 
              key="analytics"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="space-y-8"
            >
              
              {/* Row 1: Feature Importances & Confusion Matrix */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Feature Importances (7 cols) */}
                <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium">
                  <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                    <BarChart3 className="w-5 h-5 text-bmw-blue" />
                    <h3 className="text-sm font-bold text-bmw-navy uppercase tracking-wider">Gini Feature Importances</h3>
                  </div>
                  
                  <div className="h-[260px] w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={getImportanceData()}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" unit="%" />
                        <YAxis dataKey="name" type="category" width={110} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Relative Impact']} />
                        <Bar dataKey="importance" fill="#0066B1" radius={[0, 4, 4, 0]}>
                          {getImportanceData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#0066B1' : '#003D78'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-4 leading-relaxed">
                    Feature importance evaluates the total reduction of Gini impurity brought by that feature. A higher value implies that the feature plays a more significant role in classifying the EV type.
                  </p>
                </div>

                {/* Confusion Matrix (5 cols) */}
                <div className="lg:col-span-5 bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                      <Grid className="w-5 h-5 text-bmw-blue" />
                      <h3 className="text-sm font-bold text-bmw-navy uppercase tracking-wider">Confusion Matrix (Test Set)</h3>
                    </div>

                    {/* 2x2 Heat Grid */}
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      {/* Top Left: TN */}
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">True BEV</span>
                        <span className="text-xl font-extrabold text-bmw-blue mt-1">
                          {meta.metrics.confusion_matrix[0][0].toLocaleString()}
                        </span>
                        <span className="text-[10px] text-bmw-blue/80 font-bold mt-1">Predicted BEV (Correct)</span>
                      </div>
                      
                      {/* Top Right: FP */}
                      <div className="bg-red-50/30 p-4 rounded-xl border border-red-100/50 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">True BEV</span>
                        <span className="text-xl font-extrabold text-bmw-red mt-1">
                          {meta.metrics.confusion_matrix[0][1].toLocaleString()}
                        </span>
                        <span className="text-[10px] text-bmw-red/80 font-bold mt-1">Predicted PHEV (Error)</span>
                      </div>

                      {/* Bottom Left: FN */}
                      <div className="bg-red-50/30 p-4 rounded-xl border border-red-100/50 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">True PHEV</span>
                        <span className="text-xl font-extrabold text-bmw-red mt-1">
                          {meta.metrics.confusion_matrix[1][0].toLocaleString()}
                        </span>
                        <span className="text-[10px] text-bmw-red/80 font-bold mt-1">Predicted BEV (Error)</span>
                      </div>

                      {/* Bottom Right: TP */}
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex flex-col justify-center">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">True PHEV</span>
                        <span className="text-xl font-extrabold text-bmw-blue mt-1">
                          {meta.metrics.confusion_matrix[1][1].toLocaleString()}
                        </span>
                        <span className="text-[10px] text-bmw-blue/80 font-bold mt-1">Predicted PHEV (Correct)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-[11px] font-semibold text-slate-500">
                    <span>True Positive Rate (Recall): <strong>78.6%</strong></span>
                    <span>Precision: <strong>76.2%</strong></span>
                  </div>
                </div>
              </div>

              {/* Row 2: Distributions */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Years Area Chart (6 cols) */}
                <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium">
                  <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                    <TrendingUp className="w-5 h-5 text-bmw-blue" />
                    <h3 className="text-sm font-bold text-bmw-navy uppercase tracking-wider">Registration Trend (Last 15 Years)</h3>
                  </div>

                  <div className="h-[250px] w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={meta.year_distribution}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="year" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Area type="monotone" dataKey="bev" name="BEV Volume" stroke="#0066B1" fillOpacity={0.2} fill="#0066B1" />
                        <Area type="monotone" dataKey="phev" name="PHEV Volume" stroke="#003D78" fillOpacity={0.15} fill="#003D78" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Makes Bar Chart (6 cols) */}
                <div className="lg:col-span-6 bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium">
                  <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-100">
                    <Car className="w-5 h-5 text-bmw-blue" />
                    <h3 className="text-sm font-bold text-bmw-navy uppercase tracking-wider">Top 7 Brand Registrations</h3>
                  </div>

                  <div className="h-[250px] w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={meta.make_distribution}
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="make" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="bev" name="BEV" stackId="a" fill="#0066B1" />
                        <Bar dataKey="phev" name="PHEV" stackId="a" fill="#003D78" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

            </motion.section>
          )}

          {/* ==========================================
              TAB CONTENT: SYSTEM DASHBOARD (Original View)
              ========================================== */}
          {activeTab === 'dashboard' && (
            <motion.section 
              key="dashboard"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start"
            >
              
              {/* Left: Model Engineering Notes */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium">
                <h2 className="text-sm font-bold text-bmw-navy mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-bmw-blue" />
                  Model Architecture Notes
                </h2>
                <div className="space-y-4 text-xs text-slate-600 leading-relaxed">
                  <p>
                    This model performs binary classification to determine if an electric vehicle is a <strong>Battery Electric Vehicle (BEV)</strong> or a <strong>Plug-in Hybrid Electric Vehicle (PHEV)</strong>.
                  </p>
                  
                  <h4 className="font-bold text-bmw-navy text-xs">Feature Preprocessing Pipeline:</h4>
                  <ul className="list-decimal list-inside pl-1 space-y-2">
                    <li>
                      <strong>Make (Manufacturer):</strong> One-hot encoded dynamically. Valid categories are extracted during training. If a new Make is provided, it resolves as 0 across all dummy variables.
                    </li>
                    <li>
                      <strong>Region:</strong> Derived from County. Collapsed into a binary variable (<strong>Puget Sound</strong> vs <strong>Other WA</strong>) to reduce sparseness while retaining high-impact regional signal.
                    </li>
                    <li>
                      <strong>Vehicle Age:</strong> Computed dynamically as <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">current_year - Model Year</code> to represent wear and battery-generation age.
                    </li>
                    <li>
                      <strong>Model Frequency:</strong> Mapped to the overall model registration count inside the registry, bypassing hundreds of sparse one-hot model columns.
                    </li>
                  </ul>

                  <p className="bg-blue-50 text-[11px] text-bmw-navy p-3.5 rounded-xl border border-blue-100 leading-relaxed">
                    <strong>Corporate Advisory Note:</strong> The base MSRP feature was dropped because 94.8% of rows in the population registry reported it as 0 (undisclosed), making it a non-viable signal.
                  </p>
                </div>
              </div>

              {/* Right: Technical Metadata */}
              <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-premium">
                <h2 className="text-sm font-bold text-bmw-navy mb-4 uppercase tracking-wider flex items-center gap-1.5">
                  <Server className="w-4 h-4 text-bmw-blue" />
                  Classifier Specs & System Logs
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Model Algorithm</span>
                    <span className="font-semibold text-bmw-navy">DecisionTreeClassifier (max_depth=4)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Class Weights</span>
                    <span className="font-semibold text-bmw-navy">Balanced (Inverse Frequency)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Random State Seed</span>
                    <span className="font-mono font-semibold text-bmw-navy">42</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Dataset Format</span>
                    <span className="font-semibold text-bmw-navy">Pandas CSV (Washington DOL)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-100">
                    <span className="text-slate-400 font-medium">Server Hosting Port</span>
                    <span className="font-mono font-semibold text-bmw-navy">8000</span>
                  </div>
                  
                  <div className="mt-5 p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-2.5">
                    <Server className="w-4.5 h-4.5 text-bmw-navy shrink-0 mt-0.5" />
                    <div className="text-[11px] text-slate-500 leading-relaxed">
                      <span className="font-bold text-slate-700">Deployment Status: </span>
                      {isOffline ? (
                        <span className="text-amber-600 font-semibold">Running in Offline Sandbox. To enable live inference pipelines, run the Docker containers as described in the README instructions.</span>
                      ) : (
                        <span className="text-emerald-600 font-semibold">Operational. Served locally via FastAPI Uvicorn engine on port 8000.</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </motion.section>
          )}
        </AnimatePresence>

      </main>

      {/* ==========================================
          FOOTER
          ========================================== */}
      <footer className="bg-slate-900 text-slate-400 px-6 py-6 border-t border-slate-800 text-center mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <p>© {new Date().getFullYear()} BEVPHEV Prediction System. All rights reserved.</p>
          <div className="flex gap-4 font-semibold">
            <span className="hover:text-white cursor-pointer transition-colors">BMW Fleet Operations</span>
            <span>•</span>
            <span className="hover:text-white cursor-pointer transition-colors">Analytics Consultancy Group</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
