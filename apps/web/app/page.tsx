"use client";

import { useState } from "react";
import React from "react";
import axios from "axios";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Zap, Lock, FileText, CheckCircle, ArrowRight, ChevronRight, Key, UploadCloud, RefreshCw, LayoutDashboard, Terminal } from "lucide-react";
import NeuralWave from "@/components/NeuralWave";
import DeepDiveFeatures from "@/components/DeepDiveFeatures";
import { ProfessionalAdminDashboard } from "@/components/ProfessionalAdminDashboard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export default function EnterprisePlatform() {
    const [view, setView] = useState<"landing" | "client" | "login" | "admin">("landing");

    // Client State
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: "",
        company: "",
        scope: "",
        authHeader: "",
        gdriveLink: ""
    });
    const [showAuth, setShowAuth] = useState(false);
    const [jobId, setJobId] = useState("");

    // Admin State
    const [adminPass, setAdminPass] = useState("");

    const handleLogin = () => { if (adminPass === "anupmeena") setView("admin"); else alert("ACCESS DENIED"); };

    const submitJob = async () => {
        setLoading(true);
        try {
            const payload = {
                target: formData.scope,
                scanProfile: 'aggressive',
                authHeader: formData.authHeader || null,
                scope: {},
                options: {
                    aggressive: true,
                    destructive: false,
                    maxBulkTargets: 10
                },
                email: formData.email,
                company: formData.company,
                consentDocument: formData.gdriveLink || null
            };
            const res = await axios.post(`${API_URL}/scan`, payload);
            if (res.data.jobId) {
                setJobId(res.data.jobId);
                setStep(3);
            }
        } catch (e: any) {
            console.error('Scan submission error:', e);
            alert(`Submission Failed: ${e.response?.data?.error || e.message}`);
        }
        setLoading(false);
    };

    return (
        <main className="min-h-screen bg-[#050505] text-gray-200 font-sans selection:bg-green-900 selection:text-white relative">

            {/* 1. THE NEURAL WAVE (Background Layer) */}
            <div className="fixed inset-0 z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/10 via-[#050505] to-[#050505]"></div>
                <NeuralWave />
                <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-[#050505] to-transparent"></div>
            </div>

            {/* 2. NAVIGATION (Sticky) */}
            <nav className="sticky top-0 z-50 flex items-center justify-between px-8 py-6 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
                <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView("landing")}>
                    <img src="/logo.png" alt="fortress" className="h-10 w-auto" />
                </div>
                <div className="flex gap-4">
                    {view === 'admin' ? (
                        <button onClick={() => setView("landing")} className="text-red-400 hover:text-red-300 font-mono text-sm">EXIT_CONSOLE</button>
                    ) : (
                        <button onClick={() => setView("login")} className="px-4 py-2 rounded-lg text-xs font-medium border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-2">
                            <Lock size={12} /> PARTNER LOGIN
                        </button>
                    )}
                </div>
            </nav>

            {/* 3. MAIN CONTENT */}
            <div className="relative z-10 w-full">
                <AnimatePresence mode="wait">

                    {/* --- LANDING VIEW --- */}
                    {view === "landing" && (
                        <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <div className="min-h-screen flex flex-col justify-center items-center text-center px-6 pt-20 pb-40">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-green-500/10 border border-green-500/20 text-xs text-green-400 font-mono mb-8 animate-pulse">
                                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                    ENTERPRISE SECURITY INTELLIGENCE PLATFORM
                                </div>
                                <h1 className="text-7xl md:text-9xl font-bold text-white tracking-tighter mb-8 leading-tight drop-shadow-2xl">
                                    Security <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-emerald-500 to-teal-600">Evolved.</span>
                                </h1>
                                <p className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-12">
                                    The world's first autonomous adversarial emulation platform. <br />
                                    We combine 12+ offensive engines, AI-driven heuristics, and stealth logic.
                                </p>
                                <div className="flex justify-center gap-6">
                                    <button onClick={() => setView("client")} className="group px-10 py-5 bg-white text-black font-bold rounded-xl hover:bg-gray-100 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)] flex items-center gap-2">
                                        Launch Assessment <ChevronRight className="group-hover:translate-x-1 transition-transform" size={18} />
                                    </button>
                                </div>
                            </div>
                            <div className="bg-[#050505] border-t border-white/5 relative z-20">
                                <DeepDiveFeatures />
                            </div>
                            <div className="py-32 text-center border-t border-white/5 bg-[#050505]">
                                <h2 className="text-4xl font-bold text-white mb-6">Ready to secure your infrastructure?</h2>
                                <button onClick={() => setView("client")} className="text-green-500 font-mono hover:text-green-400 text-xl">INITIATE_PROTOCOL_Start_Scan()</button>
                            </div>
                        </motion.div>
                    )}

                    {/* --- LOGIN VIEW --- */}
                    {view === "login" && (
                        <motion.div key="login" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="min-h-[80vh] flex items-center justify-center px-6">
                            <div className="bg-[#0A0A0A] border border-white/10 rounded-2xl p-8 shadow-2xl relative overflow-hidden w-full max-w-md">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
                                <div className="text-center mb-6">
                                    <h1 className="text-3xl font-bold text-green-500">fortress</h1>
                                </div>
                                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2"><Lock className="text-green-500" /> Restricted Access</h2>
                                <input type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} className="w-full bg-black border border-white/10 rounded-lg p-4 text-white focus:border-green-500 outline-none mt-6 font-mono text-lg" placeholder="ENTER_ACCESS_KEY" />
                                <button onClick={handleLogin} className="w-full mt-6 py-4 bg-green-900/30 text-green-400 border border-green-800 font-bold rounded-lg hover:bg-green-900/50 transition-all">AUTHENTICATE</button>
                                <button onClick={() => setView("landing")} className="w-full mt-4 text-gray-500 text-xs hover:text-white">Return Home</button>
                            </div>
                        </motion.div>
                    )}

                    {/* --- CLIENT INTAKE --- */}
                    {view === "client" && (
                        <motion.div key="client" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-[80vh] flex items-center justify-center px-6 mt-10">
                            <div className="bg-[#0A0A0A]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl w-full max-w-2xl">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-2xl font-bold text-white">New Assessment</h2>
                                    <div className="flex gap-2"><div className={`w-2 h-2 rounded-full ${step >= 1 ? 'bg-green-500' : 'bg-gray-700'}`} /><div className={`w-2 h-2 rounded-full ${step >= 2 ? 'bg-green-500' : 'bg-gray-700'}`} /></div>
                                </div>
                                {step === 1 && (
                                    <div className="space-y-5">
                                        <div><label className="text-xs text-gray-500 uppercase font-bold">Email Address</label><input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg p-4 text-white mt-2 focus:border-green-500 outline-none" placeholder="your@email.com" required /></div>
                                        <div><label className="text-xs text-gray-500 uppercase font-bold">Target Scope</label><input type="text" value={formData.scope} onChange={e => setFormData({ ...formData, scope: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg p-4 text-white mt-2 focus:border-green-500 outline-none" placeholder="example.com" /></div>
                                        <div><label className="text-xs text-gray-500 uppercase font-bold">Company</label><input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} className="w-full bg-black border border-white/10 rounded-lg p-4 text-white mt-2 focus:border-green-500 outline-none" placeholder="Acme Corp" /></div>
                                        <button onClick={() => setStep(2)} className="w-full py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-200 mt-4">Continue</button>
                                    </div>
                                )}
                                {step === 2 && (
                                    <div className="space-y-5">
                                        <div className="p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
                                            <div className="flex items-center gap-2 text-yellow-500 font-bold mb-2 cursor-pointer" onClick={() => setShowAuth(!showAuth)}><Key size={18} /> Enable Authenticated Scanning</div>
                                            {showAuth && <textarea value={formData.authHeader} onChange={e => setFormData({ ...formData, authHeader: e.target.value })} className="w-full h-24 bg-black border border-white/10 rounded-lg p-3 text-yellow-500 font-mono text-xs mt-2" placeholder="Cookie: session_id=..." />}
                                        </div>
                                        <div>
                                            <label className="text-xs text-gray-500 uppercase font-bold">Google Drive Link (RoE Documents)</label>
                                            <input
                                                type="url"
                                                value={formData.gdriveLink}
                                                onChange={e => setFormData({ ...formData, gdriveLink: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-lg p-4 text-white mt-2 focus:border-green-500 outline-none"
                                                placeholder="https://drive.google.com/..."
                                            />
                                            <p className="text-xs text-gray-500 mt-2">Share your Rules of Engagement documents via Google Drive</p>
                                        </div>
                                        <button onClick={submitJob} disabled={loading} className="w-full py-4 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 mt-4 flex justify-center">{loading ? <RefreshCw className="animate-spin" /> : "Launch Scan"}</button>
                                    </div>
                                )}
                                {step === 3 && (
                                    <div className="text-center py-10">
                                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle className="text-green-500" size={40} /></div>
                                        <h3 className="text-2xl font-bold text-white mb-2">Assessment Queued</h3>
                                        <p className="text-gray-400 mb-6">Job ID: <span className="font-mono text-green-400">{jobId}</span></p>
                                        <button onClick={() => window.location.reload()} className="text-sm text-gray-500 hover:text-white underline">Start New</button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* --- ADMIN VIEW --- */}
                    {view === "admin" && (
                        <ProfessionalAdminDashboard onLogout={() => setView("landing")} />
                    )}

                </AnimatePresence>
            </div>
        </main>
    );
}
