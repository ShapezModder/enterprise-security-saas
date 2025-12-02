"use client";

import FeatureLayout from "@/components/FeatureLayout";
import { Lock, Search, Key, FileCode, AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";

export default function SecretHuntingPage() {
  return (
    <FeatureLayout
      title="Secret Hunting 2.0"
      subtitle="Entropy-Based Detection"
      description="We don't just grep for 'password'. Our engine decompiles JavaScript bundles, parses source maps, and scans public repositories to find high-entropy strings that indicate leaked API keys, database credentials, and private tokens."
      icon={<Lock size={18} />}
      color="yellow"
    >
      <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 to-orange-600"></div>
        <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Visualizer */}
            <div className="col-span-1 md:col-span-1 bg-black rounded-xl border border-white/5 p-4 font-mono text-xs text-gray-500">
                <div className="mb-2 text-green-500">$ scanning app.a28f.js...</div>
                <div className="mb-2">Found variable: <span className="text-blue-400">STRIPE_KEY</span></div>
                <div className="mb-2">Entropy Score: <span className="text-red-500">8.9 (CRITICAL)</span></div>
                <div className="p-2 bg-red-900/20 border border-red-900 rounded text-red-300 mt-4">
                    MATCH: sk_live_...
                </div>
            </div>

            <div className="col-span-1 md:col-span-2 space-y-6">
                <h3 className="text-2xl font-bold text-white">Why Regex Isn't Enough</h3>
                <p className="text-gray-400">
                    Developers often hide secrets in minified code or commit history. Simple pattern matching misses these. Our engine calculates <strong>Shannon Entropy</strong> to detect random strings (like keys) even if they are named "variable_x".
                </p>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-lg">
                        <Key className="text-yellow-500 mb-2"/>
                        <h4 className="font-bold text-white">API Keys</h4>
                        <p className="text-xs text-gray-500">AWS, Stripe, Google Cloud</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-lg">
                        <FileCode className="text-yellow-500 mb-2"/>
                        <h4 className="font-bold text-white">Private Keys</h4>
                        <p className="text-xs text-gray-500">RSA, SSH, PGP Blocks</p>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </FeatureLayout>
  );
}