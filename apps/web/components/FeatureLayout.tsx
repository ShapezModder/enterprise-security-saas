"use client";

import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import NeuralWave from "./NeuralWave";

interface FeatureLayoutProps {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  children: React.ReactNode;
}

export default function FeatureLayout({ title, subtitle, description, icon, color, children }: FeatureLayoutProps) {
  return (
    <main className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-green-900 selection:text-white relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className={`fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-${color}-900/10 via-[#050505] to-[#050505] pointer-events-none`}></div>
      <NeuralWave />

      {/* Navigation */}
      <nav className="sticky top-0 z-50 px-8 py-6 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
            <ChevronLeft size={20} /> Back to Mission Control
        </Link>
      </nav>

      {/* Hero Section */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-20">
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="text-center"
        >
            <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-full bg-${color}-500/10 border border-${color}-500/20 text-${color}-400 font-mono text-sm mb-8`}>
                {icon}
                <span className="uppercase tracking-widest">{subtitle}</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter mb-6 leading-tight">
                {title}
            </h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
                {description}
            </p>
        </motion.div>

        {/* Main Content Area */}
        <div className="mt-20 grid gap-12">
            {children}
        </div>
      </div>
    </main>
  );
}