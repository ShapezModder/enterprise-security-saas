"use client";
import { Shield, Zap, Globe, Lock, Cpu, Layers } from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    title: "AI Anomaly Detection",
    desc: "Heuristic engines analyze traffic patterns to detect 0-day exploits before signatures exist.",
    icon: <Cpu className="text-purple-500" />,
  },
  {
    title: "CI/CD Pipeline Guard",
    desc: "Blocks risky deployments automatically via GitHub/GitLab integration hooks.",
    icon: <Layers className="text-blue-500" />,
  },
  {
    title: "Dark Web Recon",
    desc: "Scans leaked credential databases (BreachDirectory) to find compromised employee accounts.",
    icon: <Globe className="text-red-500" />,
  },
  {
    title: "Secret Detection 2.0",
    desc: "Entropy-based scanning for high-value secrets (AWS, Stripe, Private Keys) in compiled JS.",
    icon: <Lock className="text-yellow-500" />,
  },
  {
    title: "API Fuzzing Engine",
    desc: "Automated broken object level authorization (BOLA) testing for REST & GraphQL endpoints.",
    icon: <Zap className="text-orange-500" />,
  },
  {
    title: "Compliance Mapping",
    desc: "Real-time mapping of findings to ISO 27001, PCI-DSS, and HIPAA frameworks.",
    icon: <Shield className="text-green-500" />,
  },
];

export default function FeatureGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 relative z-10 px-6">
      {features.map((f, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          viewport={{ once: true }}
          className="p-6 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 hover:border-green-500/50 transition-all cursor-crosshair group"
        >
          <div className="mb-4 p-3 bg-black/50 rounded-lg w-fit group-hover:scale-110 transition-transform">
            {f.icon}
          </div>
          <h3 className="text-xl font-bold text-white mb-2">{f.title}</h3>
          <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
        </motion.div>
      ))}
    </div>
  );
}