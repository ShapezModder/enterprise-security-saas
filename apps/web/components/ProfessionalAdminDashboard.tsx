// Professional Admin Dashboard Component - Replaces the amateur "hacking simulator" UI
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Play, XCircle, CheckCircle, Clock, Settings, Shield, ChevronDown, ChevronUp } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface ScanStage {
    id: string;
    name: string;
    description: string;
    category: 'reconnaissance' | 'vulnerability' | 'advanced';
    estimatedTime: string;
    recommended: boolean;
    enabled: boolean;
}

const AVAILABLE_STAGES: ScanStage[] = [
    { id: 'waf-detection', name: 'WAF Detection', description: 'Identify web application firewalls', category: 'reconnaissance', estimatedTime: '10s', recommended: true, enabled: true },
    { id: 'tech-stack', name: 'Technology Stack', description: 'CMS & framework identification', category: 'reconnaissance', estimatedTime: '15s', recommended: true, enabled: true },
    { id: 'subdomain-enum', name: 'Subdomain Enumeration', description: 'Subfinder subdomain discovery', category: 'reconnaissance', estimatedTime: '30s', recommended: true, enabled: true },
    { id: 'web-crawling', name: 'Web Crawling', description: 'Deep URL mapping (resource intensive)', category: 'reconnaissance', estimatedTime: '1-5min', recommended: false, enabled: false },
    { id: 'directory-fuzzing', name: 'Directory Fuzzing', description: 'Hidden path discovery', category: 'vulnerability', estimatedTime: '2min', recommended: true, enabled: true },
    { id: 'ssl-assessment', name: 'SSL/TLS Assessment', description: 'Cipher suite analysis', category: 'vulnerability', estimatedTime: '30s', recommended: true, enabled: true },
    { id: 'nuclei-scan', name: 'Nuclei Validation', description: '5000+ vulnerability templates', category: 'vulnerability', estimatedTime: '3min', recommended: true, enabled: true },
    { id: 'port-scan', name: 'Port Scanning', description: 'Network service discovery', category: 'vulnerability', estimatedTime: '2min', recommended: true, enabled: true },
    { id: 'xss-testing', name: 'XSS Testing', description: 'Cross-site scripting detection', category: 'advanced', estimatedTime: '1min', recommended: false, enabled: false },
    { id: 'xxe-testing', name: 'XXE Testing', description: 'XML injection vectors', category: 'advanced', estimatedTime: '30s', recommended: false, enabled: false },
    { id: 'ssrf-testing', name: 'SSRF Testing', description: 'Server-side request forgery', category: 'advanced', estimatedTime: '30s', recommended: false, enabled: false },
    { id: 'deserialization-testing', name: 'Deserialization', description: 'Object injection testing', category: 'advanced', estimatedTime: '30s', recommended: false, enabled: false },
    { id: 'business-logic-testing', name: 'Business Logic', description: 'Application logic flaws', category: 'advanced', estimatedTime: '1min', recommended: false, enabled: false },
    { id: 'cloud-security', name: 'Cloud Security', description: 'AWS/Azure misconfigurations', category: 'advanced', estimatedTime: '1min', recommended: false, enabled: false },
    { id: 'auth-testing', name: 'Authentication', description: 'Auth bypass & session flaws', category: 'advanced', estimatedTime: '1min', recommended: false, enabled: false }
];

export function ProfessionalAdminDashboard({ onLogout }: { onLogout: () => void }) {
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<any | null>(null);
    const [stages, setStages] = useState<ScanStage[]>(AVAILABLE_STAGES);
    const [destructive, setDestructive] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        reconnaissance: true,
        vulnerability: true,
        advanced: false
    });

    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 5000);
        return () => clearInterval(interval);
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await axios.get(`${API_URL}/admin/jobs`);
            setJobs(res.data.jobs || []);
        } catch (e) {
            console.error('Failed to fetch jobs:', e);
        }
    };

    const toggleStage = (stageId: string) => {
        setStages(stages.map(s => s.id === stageId ? { ...s, enabled: !s.enabled } : s));
    };

    const selectPreset = (preset: 'recommended' | 'full' | 'quick' | 'clear') => {
        setStages(stages.map(s => ({
            ...s,
            enabled: preset === 'recommended' ? s.recommended :
                preset === 'full' ? true :
                    preset === 'quick' ? (s.category === 'reconnaissance' && s.recommended) :
                        false
        })));
    };

    const startScan = async () => {
        if (!selectedJob) return;

        const selectedStages = stages.filter(s => s.enabled).map(s => s.id);

        try {
            await axios.post(`${API_URL}/admin/start-job`, {
                jobId: selectedJob.id,
                selectedStages,
                destructive
            });
            alert(`✓ Scan started with ${selectedStages.length} stages`);
            setSelectedJob(null);
            fetchJobs();
        } catch (e: any) {
            alert(`Failed: ${e.response?.data?.error || e.message}`);
        }
    };

    const declineJob = async (job: any) => {
        const reason = prompt('Decline reason (optional):');
        if (confirm(`Decline scan request for ${job.target}?`)) {
            try {
                await axios.post(`${API_URL}/admin/decline-job`, { jobId: job.id, reason });
                alert('✓ Request declined');
                fetchJobs();
            } catch (e: any) {
                alert(`Failed: ${e.response?.data?.error || e.message}`);
            }
        }
    };

    const terminateJob = async (job: any) => {
        if (confirm(`Terminate running scan for ${job.target}?`)) {
            try {
                await axios.post(`${API_URL}/admin/terminate-job`, { jobId: job.id });
                alert('✓ Scan terminated');
                fetchJobs();
            } catch (e: any) {
                alert(`Failed: ${e.response?.data?.error || e.message}`);
            }
        }
    };

    const pendingJobs = jobs.filter(j => j.status === 'QUEUED');
    const runningJobs = jobs.filter(j => j.status === 'RUNNING');
    const completedJobs = jobs.filter(j => j.status === 'COMPLETED');

    const groupedStages = {
        reconnaissance: stages.filter(s => s.category === 'reconnaissance'),
        vulnerability: stages.filter(s => s.category === 'vulnerability'),
        advanced: stages.filter(s => s.category === 'advanced')
    };

    const selectedStagesCount = stages.filter(s => s.enabled).length;
    const totalTimeEstimate = stages.filter(s => s.enabled)
        .reduce((acc, s) => acc + (parseInt(s.estimatedTime) || 1), 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
            <div className="max-w-[1800px] mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                                    <Shield className="text-white" size={24} />
                                </div>
                                Security Operations Center
                            </h1>
                            <p className="text-slate-500 mt-1">Enterprise Security Assessment Platform</p>
                        </div>
                        <button onClick={onLogout} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors">
                            Sign Out
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left Column - Job Queue */}
                    <div className="xl:col-span-2 space-y-6">
                        {/* Pending Jobs */}
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Clock className="text-amber-500" size={20} />
                                    Pending Assessments
                                    <span className="ml-2 px-2.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                                        {pendingJobs.length}
                                    </span>
                                </h2>
                            </div>

                            <div className="space-y-3 max-h-[600px] overflow-y-auto">
                                {pendingJobs.length === 0 && (
                                    <p className="text-slate-400 text-center py-8">No pending requests</p>
                                )}
                                {pendingJobs.map(job => (
                                    <motion.div
                                        key={job.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`border-2 rounded-lg p-5 transition-all cursor-pointer ${selectedJob?.id === job.id
                                                ? 'border-emerald-500 bg-emerald-50'
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        onClick={() => setSelectedJob(job)}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex-1">
                                                <div className="text-xs text-slate-400 font-mono mb-1">
                                                    ID: {job.id.substring(0, 12)}...
                                                </div>
                                                <h3 className="text-lg font-bold text-slate-900">{job.target}</h3>
                                                <p className="text-sm text-slate-600">Client: {job.user.email}</p>
                                            </div>
                                            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                                                PENDING
                                            </span>
                                        </div>

                                        <div className="flex gap-2 mt-4">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSelectedJob(job); }}
                                                className="flex-1 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Settings size={16} />
                                                Configure & Start
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); declineJob(job); }}
                                                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg font-semibold transition-colors"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* Running & Completed Jobs */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Running */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                                    <Play className="text-blue-500 fill-blue-500" size={18} />
                                    Running
                                    <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                                        {runningJobs.length}
                                    </span>
                                </h2>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {runningJobs.map(job => (
                                        <div key={job.id} className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-semibold text-slate-900 text-sm">{job.target}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{job.id.substring(0, 8)}...</p>
                                                </div>
                                                <button
                                                    onClick={() => terminateJob(job)}
                                                    className="text-red-600 hover:text-red-700 text-xs font-medium"
                                                >
                                                    Stop
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {runningJobs.length === 0 && (
                                        <p className="text-slate-400 text-sm text-center py-4">No active scans</p>
                                    )}
                                </div>
                            </div>

                            {/* Completed */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 mb-4">
                                    <CheckCircle className="text-green-500" size={18} />
                                    Completed
                                    <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                                        {completedJobs.length}
                                    </span>
                                </h2>
                                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                    {completedJobs.slice(0, 10).map(job => (
                                        <div key={job.id} className="border border-green-200 rounded-lg p-3 bg-green-50">
                                            <p className="font-semibold text-slate-900 text-sm">{job.target}</p>
                                            <p className="text-xs text-slate-500">
                                                {job.findings?.length || 0} findings
                                            </p>
                                        </div>
                                    ))}
                                    {completedJobs.length === 0 && (
                                        <p className="text-slate-400 text-sm text-center py-4">No completed scans</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Scan Configuration */}
                    <div className="xl:col-span-1">
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
                            <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                                <Settings className="text-slate-700" size={20} />
                                Scan Configuration
                            </h2>

                            {!selectedJob ? (
                                <div className="text-center py-12">
                                    <Settings className="mx-auto text-slate-300 mb-3" size={48} />
                                    <p className="text-slate-400">Select a pending job to configure scan parameters</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Selected Target */}
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                        <p className="text-xs text-emerald-600 font-semibold mb-1">SELECTED TARGET</p>
                                        <p className="font-bold text-slate-900 text-lg">{selectedJob.target}</p>
                                        <p className="text-sm text-slate-600 mt-1">{selectedJob.user.email}</p>
                                    </div>

                                    {/* Quick Presets */}
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700 mb-3">QUICK PRESETS</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button onClick={() => selectPreset('recommended')} className="px-3 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg text-sm font-semibold transition-colors">
                                                ✓ Recommended
                                            </button>
                                            <button onClick={() => selectPreset('full')} className="px-3 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-sm font-semibold transition-colors">
                                                🔍 Full Scan
                                            </button>
                                            <button onClick={() => selectPreset('quick')} className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-sm font-semibold transition-colors">
                                                ⚡ Quick
                                            </button>
                                            <button onClick={() => selectPreset('clear')} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-semibold transition-colors">
                                                ✕ Clear All
                                            </button>
                                        </div>
                                    </div>

                                    {/* Destructive Mode */}
                                    <div className="border border-amber-200 rounded-lg p-4 bg-amber-50">
                                        <label className="flex items-center justify-between cursor-pointer">
                                            <div>
                                                <p className="font-semibold text-slate-900 text-sm">Destructive Testing</p>
                                                <p className="text-xs text-slate-600">Enable SQL injection & command injection</p>
                                            </div>
                                            <input
                                                type="checkbox"
                                                checked={destructive}
                                                onChange={(e) => setDestructive(e.target.checked)}
                                                className="w-5 h-5 rounded border-2 border-amber-400 text-amber-600 focus:ring-2 focus:ring-amber-500"
                                            />
                                        </label>
                                    </div>

                                    {/* Test Selection */}
                                    <div>
                                        <p className="text-sm font-semibold text-slate-700 mb-3">TEST SELECTION</p>
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                                            {Object.entries(groupedStages).map(([category, categoryStages]) => (
                                                <div key={category}>
                                                    <button
                                                        onClick={() => setExpandedCategories({
                                                            ...expandedCategories,
                                                            [category]: !expandedCategories[category]
                                                        })}
                                                        className="w-full flex items-center justify-between p-3 bg-slate-100 hover:bg-slate-200 rounded-lg mb-2 transition-colors"
                                                    >
                                                        <span className="font-semibold text-slate-900 capitalize text-sm">
                                                            {category} ({categoryStages.filter(s => s.enabled).length}/{categoryStages.length})
                                                        </span>
                                                        {expandedCategories[category] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>

                                                    {expandedCategories[category] && (
                                                        <div className="space-y-2 mb-3">
                                                            {categoryStages.map(stage => (
                                                                <label
                                                                    key={stage.id}
                                                                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${stage.enabled
                                                                            ? 'bg-emerald-50 border-emerald-300'
                                                                            : 'bg-white border-slate-200 hover:border-slate-300'
                                                                        }`}
                                                                >
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={stage.enabled}
                                                                        onChange={() => toggleStage(stage.id)}
                                                                        className="w-4 h-4 mt-0.5 rounded border-2 border-slate-300 text-emerald-600 focus:ring-2 focus:ring-emerald-500"
                                                                    />
                                                                    <div className="flex-1">
                                                                        <p className="font-semibold text-slate-900 text-sm">{stage.name}</p>
                                                                        <p className="text-xs text-slate-600 mt-0.5">{stage.description}</p>
                                                                        <p className="text-xs text-slate-400 mt-1">⏱️ {stage.estimatedTime}</p>
                                                                    </div>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Summary & Start */}
                                    <div className="border-t border-slate-200 pt-6">
                                        <div className="bg-slate-50 rounded-lg p-4 mb-4">
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-slate-600">Selected Tests</span>
                                                <span className="font-semibold text-slate-900">{selectedStagesCount} stages</span>
                                            </div>
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-slate-600">Estimated Time</span>
                                                <span className="font-semibold text-slate-900">~{totalTimeEstimate} min</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Destructive</span>
                                                <span className={`font-semibold ${destructive ? 'text-amber-600' : 'text-slate-400'}`}>
                                                    {destructive ? 'Enabled' : 'Disabled'}
                                                </span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={startScan}
                                            disabled={selectedStagesCount === 0}
                                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Play size={20} fill="white" />
                                            Start Scan ({selectedStagesCount} stages)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
