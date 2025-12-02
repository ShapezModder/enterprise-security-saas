"use client";
import { motion } from "framer-motion";
import { Search, AlertCircle, CheckCircle } from "lucide-react";
import Link from "next/link";

// --- GRAPHIC 1: AI BRAIN ---
const GraphicAI = () => (
  <div className="relative w-full h-64 bg-black/80 rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-purple-900/40 to-transparent"></div>
    <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px', opacity: 0.3 }}></div>
    <motion.div animate={{ top: ["0%", "100%", "0%"] }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="absolute left-0 w-full h-[2px] bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.8)] z-10" />
    <div className="grid grid-cols-4 gap-4 z-0">
      {[1, 2, 3, 4].map(i => <motion.div key={i} animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ duration: 2, delay: i * 0.2, repeat: Infinity }} className="w-12 h-12 bg-purple-500/20 rounded-lg border border-purple-500/50 flex items-center justify-center text-xs font-mono text-purple-300">DATA</motion.div>)}
    </div>
    <div className="absolute bottom-4 right-4 bg-red-500/20 border border-red-500 px-3 py-1 rounded text-red-400 text-xs font-mono animate-pulse">ANOMALY DETECTED</div>
  </div>
);

// --- GRAPHIC 2: SECRETS ---
const GraphicSecrets = () => (
  <div className="relative w-full h-64 bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden p-6 font-mono text-xs">
    <div className="text-gray-500">// aws-config.json</div>
    <div className="pl-4">access_key: <span className="text-green-400">"AKIA..."</span></div>
    <div className="pl-4 relative">secret: <span className="text-red-400">"wJalr..."</span>
      <motion.div animate={{ x: [0, 150], opacity: [1, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} className="absolute top-0 left-10 w-4 h-6 -mt-2"><div className="w-3 h-3 bg-red-500 rounded-full opacity-50 blur-sm"></div><Search className="w-4 h-4 text-white" /></motion.div>
    </div>
    <motion.div initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 1 }} className="absolute bottom-4 left-4 right-4 bg-red-900/80 border border-red-500 p-3 rounded flex items-center gap-3"><AlertCircle className="text-red-500" size={16} /><span className="text-red-200">CRITICAL: Key Leaked</span></motion.div>
  </div>
);

// --- GRAPHIC 3: CI/CD ---
const GraphicCICD = () => (
  <div className="relative w-full h-64 bg-[#050505] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center gap-2">
    {["BUILD", "TEST", "SCAN", "DEPLOY"].map((stage, i) => (
      <div key={stage} className="flex items-center">
        <motion.div initial={{ backgroundColor: "#333", borderColor: "#555" }} whileInView={{ backgroundColor: i === 2 ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)", borderColor: i === 2 ? "rgb(239,68,68)" : "rgb(34,197,94)" }} transition={{ delay: i * 0.5, duration: 0.5 }} className="w-14 h-14 rounded-lg border-2 flex items-center justify-center text-[9px] font-bold text-gray-300">{stage}</motion.div>
        {i < 3 && <div className="w-6 h-1 bg-gray-700"></div>}
      </div>
    ))}
    <motion.div initial={{ scale: 0 }} whileInView={{ scale: 1 }} transition={{ delay: 2, type: "spring" }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-600 text-white px-4 py-2 rounded-full font-bold shadow-[0_0_30px_rgba(220,38,38,0.6)] z-20">BLOCKED</motion.div>
  </div>
);

// --- GRAPHIC 4: API SECURITY ---
const GraphicAPI = () => (
  <div className="relative w-full h-64 bg-[#050505] rounded-xl border border-white/10 overflow-hidden flex flex-col p-4 font-mono text-xs">
    <div className="flex justify-between border-b border-white/10 pb-2 mb-2"><span className="text-blue-400">GET /api/users/1</span><span className="text-green-500">200 OK</span></div>
    <div className="flex justify-between border-b border-white/10 pb-2 mb-2"><span className="text-blue-400">GET /api/users/2</span><span className="text-green-500">200 OK</span></div>
    <div className="relative">
      <div className="flex justify-between text-red-400"><span className="text-red-400">GET /api/admin</span><span>403 FORBIDDEN</span></div>
      <motion.div animate={{ width: ["0%", "100%"] }} transition={{ duration: 1, repeat: Infinity }} className="absolute top-0 left-0 h-full bg-red-500/20" />
    </div>
    <div className="mt-auto bg-orange-900/30 border border-orange-600 p-2 rounded text-orange-200">
      ⚠ BOLA Vulnerability Detected
    </div>
  </div>
);

// --- GRAPHIC 5: INTERNAL NETWORK (Fixed for hydration) ---
const GraphicNetwork = () => {
  const nodePositions = [
    { top: 25, left: 30 },
    { top: 45, left: 65 },
    { top: 70, left: 40 },
    { top: 35, left: 75 },
    { top: 60, left: 55 }
  ];

  return (
    <div className="relative w-full h-64 bg-black rounded-xl border border-white/10 overflow-hidden flex items-center justify-center">
      {nodePositions.map((pos, i) => (
        <motion.div key={i} className="absolute w-2 h-2 bg-blue-500 rounded-full"
          style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
          animate={{ scale: [1, 2, 1], boxShadow: ["0 0 0px blue", "0 0 20px blue", "0 0 0px blue"] }}
          transition={{ duration: 2, delay: i * 0.5, repeat: Infinity }}
        />
      ))}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
        <line x1="30%" y1="40%" x2="70%" y2="60%" stroke="white" strokeWidth="1" />
        <line x1="70%" y1="30%" x2="40%" y2="80%" stroke="white" strokeWidth="1" />
      </svg>
      <div className="absolute top-4 left-4 text-xs font-mono text-blue-400">MAPPING INTERNAL NODES...</div>
    </div>
  );
};

// --- GRAPHIC 6: COMPLIANCE ---
const GraphicCompliance = () => (
  <div className="relative w-full h-64 bg-[#050505] rounded-xl border border-white/10 overflow-hidden flex items-center justify-center gap-4">
    <div className="flex flex-col gap-3">
      {['PCI-DSS', 'ISO 27001', 'HIPAA', 'GDPR'].map((std, i) => (
        <motion.div key={std} initial={{ x: -50, opacity: 0 }} whileInView={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.2 }} className="flex items-center gap-3 bg-white/5 p-2 rounded border border-white/10 w-40">
          <CheckCircle className="text-green-500" size={16} />
          <span className="text-gray-300 text-xs font-bold">{std}</span>
        </motion.div>
      ))}
    </div>
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 10, repeat: Infinity, ease: "linear" }} className="w-24 h-24 border-4 border-dashed border-green-500/30 rounded-full flex items-center justify-center">
      <div className="text-xl font-bold text-green-500">100%</div>
    </motion.div>
  </div>
);

// --- MAIN DATA ---
const features = [
  {
    slug: "ai-analyst",
    title: "Autonomous AI Analyst",
    subtitle: "HEURISTIC ANOMALY DETECTION",
    desc: "Our engine learns your infrastructure's baseline and detects 0-day anomalies that standard scanners miss.",
    graphic: <GraphicAI />,
    color: "purple"
  },
  {
    slug: "secret-hunting",
    title: "Secret Hunting 2.0",
    subtitle: "ENTROPY-BASED SCANNING",
    desc: "We parse compiled JavaScript and HTML to find hardcoded AWS keys and database credentials.",
    graphic: <GraphicSecrets />,
    color: "yellow"
  },
  {
    slug: "cicd-guard",
    title: "CI/CD Pipeline Guard",
    subtitle: "DEVSECOPS INTEGRATION",
    desc: "We integrate into GitHub/GitLab. If a developer commits vulnerable code, we block the deployment.",
    graphic: <GraphicCICD />,
    color: "green"
  },
  {
    slug: "api-security",
    title: "API Logic Testing",
    subtitle: "BOLA & BROKEN AUTH",
    desc: "We map your entire API surface (REST/GraphQL) and fuzz parameters to find logic flaws.",
    graphic: <GraphicAPI />,
    color: "orange"
  },
  {
    slug: "network-map",
    title: "Internal Network Map",
    subtitle: "LATERAL MOVEMENT",
    desc: "Our agent maps internal nodes, finding exposed SMB shares and unpatched internal servers.",
    graphic: <GraphicNetwork />,
    color: "blue"
  },
  {
    slug: "compliance",
    title: "Compliance Automation",
    subtitle: "AUDIT READY REPORTS",
    desc: "Automatically map every technical finding to PCI-DSS, ISO 27001, and HIPAA requirements.",
    graphic: <GraphicCompliance />,
    color: "teal"
  }
];

export default function DeepDiveFeatures() {
  return (
    <div className="py-20 px-6 max-w-7xl mx-auto space-y-32">
      {features.map((f, i) => (
        <motion.div key={i} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ margin: "-100px" }} transition={{ duration: 0.8 }} className={`flex flex-col md:flex-row items-center gap-12 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}>
          <div className="w-full md:w-3/5 group">
            <div className={`relative p-1 rounded-2xl bg-gradient-to-br from-${f.color}-500/20 via-transparent to-transparent transition-all duration-500 group-hover:from-${f.color}-500/50`}>
              {f.graphic}
            </div>
          </div>
          <div className="w-full md:w-2/5 space-y-6">
            <div className={`text-${f.color}-500 font-mono text-xs tracking-widest uppercase flex items-center gap-2`}><span className={`w-2 h-2 rounded-full bg-${f.color}-500 animate-pulse`}></span>{f.subtitle}</div>
            <h3 className="text-4xl font-bold text-white leading-tight">{f.title}</h3>
            <p className="text-lg text-gray-400 leading-relaxed border-l-2 border-white/10 pl-6">{f.desc}</p>
            <Link href={`/features/${f.slug}`} className="text-white text-sm font-bold hover:underline underline-offset-8 flex items-center gap-2 w-fit">
              Deep Dive <div className="w-4 h-4 bg-white/10 rounded-full flex items-center justify-center text-[10px]">➜</div>
            </Link>
          </div>
        </motion.div>
      ))}
    </div>
  );
}