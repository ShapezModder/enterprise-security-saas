"use client";

import FeatureLayout from "@/components/FeatureLayout";
import { Cpu, Activity, BrainCircuit, Target, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function AIAnalystPage() {
  return (
    <FeatureLayout
      title="Autonomous AI Analyst"
      subtitle="Heuristic Anomaly Detection"
      description="Our proprietary AI engine moves beyond static signatures. It learns the baseline behavior of your infrastructure and identifies zero-day anomalies, logic flaws, and sophisticated attack patterns that traditional scanners miss."
      icon={<BrainCircuit size={18} />}
      color="purple"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Card 1: The Problem */}
        <div className="bg-white/5 border border-white/10 p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3"><Activity className="text-red-500"/> The Limitation of Scanners</h3>
            <p className="text-gray-400 leading-relaxed">
                Standard tools like Nmap or Nessus only look for "known bads" (CVEs). They fail to detect <strong>Business Logic Vulnerabilities</strong> (e.g., an IDOR allowing User A to delete User B's data) because the request looks technically valid.
            </p>
        </div>

        {/* Card 2: Our Solution */}
        <div className="bg-purple-900/10 border border-purple-500/30 p-8 rounded-2xl">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center gap-3"><Cpu className="text-purple-400"/> The AI Advantage</h3>
            <p className="text-gray-300 leading-relaxed">
                Our engine uses <strong>Heuristic Analysis</strong>. It observes traffic flow, understands object relationships, and flags actions that deviate from standard user behavior, catching logic flaws instantly.
            </p>
        </div>

      </div>

      {/* Deep Technical Breakdown */}
      <div className="bg-black/40 border border-white/10 rounded-2xl p-10 mt-8">
        <h2 className="text-3xl font-bold text-white mb-8">Technical Capabilities</h2>
        <div className="space-y-6">
            {[
                { title: "Behavioral Baselining", desc: "Maps normal API usage patterns (frequency, payload size, sequence) to identify anomalies." },
                { title: "Context-Aware Fuzzing", desc: "Generates payloads dynamically based on the target technology stack (e.g., specific Node.js injection vectors)." },
                { title: "False Positive Reduction", desc: "AI verifies findings by attempting safe exploitation (e.g., DNS callback) before reporting." }
            ].map((item, i) => (
                <motion.div 
                    key={i} 
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-start gap-4 p-4 hover:bg-white/5 rounded-lg transition-colors"
                >
                    <div className="bg-purple-500/20 p-2 rounded text-purple-400"><Target size={20}/></div>
                    <div>
                        <h4 className="text-lg font-bold text-white">{item.title}</h4>
                        <p className="text-gray-400 text-sm mt-1">{item.desc}</p>
                    </div>
                </motion.div>
            ))}
        </div>
      </div>
    </FeatureLayout>
  );
}