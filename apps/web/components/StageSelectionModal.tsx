// Stage selection modal component
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Switch } from './ui/switch';

export interface ScanStage {
    id: string;
    name: string;
    description: string;
    category: 'reconnaissance' | 'vulnerability' | 'advanced';
    estimatedTime: string;
    recommended: boolean;
}

const SCAN_STAGES: ScanStage[] = [
    // Reconnaissance
    {
        id: 'waf-detection',
        name: 'WAF Detection',
        description: 'Identify web application firewalls (Cloudflare, Akamai)',
        category: 'reconnaissance',
        estimatedTime: '~10s',
        recommended: true
    },
    {
        id: 'tech-stack',
        name: 'Technology Stack Detection',
        description: 'Identify CMS, frameworks, libraries using WhatWeb',
        category: 'reconnaissance',
        estimatedTime: '~15s',
        recommended: true
    },
    {
        id: 'subdomain-enum',
        name: 'Subdomain Enumeration',
        description: 'Discover subdomains using Subfinder',
        category: 'reconnaissance',
        estimatedTime: '~30s',
        recommended: true
    },
    {
        id: 'web-crawling',
        name: 'Deep Web Crawling (Katana)',
        description: 'Map website URLs - Resource intensive, may timeout',
        category: 'reconnaissance',
        estimatedTime: '~1-5min',
        recommended: false
    },

    // Vulnerability Scanning
    {
        id: 'directory-fuzzing',
        name: 'Directory Fuzzing (FFUF)',
        description: 'Find hidden paths and directories',
        category: 'vulnerability',
        estimatedTime: '~2min',
        recommended: true
    },
    {
        id: 'ssl-assessment',
        name: 'SSL/TLS Assessment',
        description: 'Check cipher suites and TLS configurations',
        category: 'vulnerability',
        estimatedTime: '~30s',
        recommended: true
    },
    {
        id: 'nuclei-scan',
        name: 'Vulnerability Validation (Nuclei)',
        description: 'Run 5000+ vulnerability templates',
        category: 'vulnerability',
        estimatedTime: '~3min',
        recommended: true
    },
    {
        id: 'port-scan',
        name: 'Port Scanning (Nmap)',
        description: 'Discover exposed services and open ports',
        category: 'vulnerability',
        estimatedTime: '~2min',
        recommended: true
    },

    // Advanced Testing
    {
        id: 'xss-testing',
        name: 'XSS Testing',
        description: 'Cross-site scripting detection',
        category: 'advanced',
        estimatedTime: '~1min',
        recommended: false
    },
    {
        id: 'xxe-testing',
        name: 'XXE Testing',
        description: 'XML external entity injection',
        category: 'advanced',
        estimatedTime: '~30s',
        recommended: false
    },
    {
        id: 'ssrf-testing',
        name: 'SSRF Testing',
        description: 'Server-side request forgery detection',
        category: 'advanced',
        estimatedTime: '~30s',
        recommended: false
    },
    {
        id: 'deserialization-testing',
        name: 'Deserialization Testing',
        description: 'Object injection vulnerability detection',
        category: 'advanced',
        estimatedTime: '~30s',
        recommended: false
    },
    {
        id: 'business-logic-testing',
        name: 'Business Logic Testing',
        description: 'Application-specific logic flaws',
        category: 'advanced',
        estimatedTime: '~1min',
        recommended: false
    },
    {
        id: 'cloud-security',
        name: 'Cloud Security Testing',
        description: 'AWS/Azure misconfiguration detection',
        category: 'advanced',
        estimatedTime: '~1min',
        recommended: false
    },
    {
        id: 'auth-testing',
        name: 'Authentication Testing',
        description: 'Auth bypass and session management flaws',
        category: 'advanced',
        estimatedTime: '~1min',
        recommended: false
    }
];

interface StageSelectionModalProps {
    open: boolean;
    onClose: () => void;
    onStart: (selectedStages: string[], destructive: boolean) => void;
    jobId: string;
    target: string;
}

export function StageSelectionModal({ open, onClose, onStart, jobId, target }: StageSelectionModalProps) {
    const [selectedStages, setSelectedStages] = useState<string[]>(
        SCAN_STAGES.filter(s => s.recommended).map(s => s.id)
    );
    const [destructive, setDestructive] = useState(false);

    const handleStageToggle = (stageId: string) => {
        setSelectedStages(prev =>
            prev.includes(stageId)
                ? prev.filter(id => id !== stageId)
                : [...prev, stageId]
        );
    };

    const selectRecommended = () => {
        setSelectedStages(SCAN_STAGES.filter(s => s.recommended).map(s => s.id));
    };

    const selectAll = () => {
        setSelectedStages(SCAN_STAGES.map(s => s.id));
    };

    const clearAll = () => {
        setSelectedStages([]);
    };

    const groupedStages = {
        reconnaissance: SCAN_STAGES.filter(s => s.category === 'reconnaissance'),
        vulnerability: SCAN_STAGES.filter(s => s.category === 'vulnerability'),
        advanced: SCAN_STAGES.filter(s => s.category === 'advanced')
    };

    const handleSubmit = () => {
        onStart(selectedStages, destructive);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Select Scan Stages</DialogTitle>
                    <p className="text-sm text-gray-500">Choose which security tests to run on {target}</p>
                </DialogHeader>

                {/* Quick Actions */}
                <div className="flex gap-2 my-4 flex-wrap">
                    <Button onClick={selectRecommended} variant="outline" size="sm">
                        ✅ Recommended Only (Fast ~5min)
                    </Button>
                    <Button onClick={selectAll} variant="outline" size="sm">
                        🔍 Full Scan (Comprehensive ~10-15min)
                    </Button>
                    <Button onClick={clearAll} variant="outline" size="sm">
                        ❌ Clear All
                    </Button>
                </div>

                {/* Destructive Mode Toggle */}
                <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div>
                        <Label htmlFor="destructive" className="text-base font-semibold">
                            ⚠️ Destructive Mode
                        </Label>
                        <p className="text-sm text-gray-600">
                            Enable SQLMap and Commix for intrusive SQL/Command injection testing
                        </p>
                    </div>
                    <Switch
                        id="destructive"
                        checked={destructive}
                        onCheckedChange={setDestructive}
                    />
                </div>

                {/* Stages by Category */}
                {Object.entries(groupedStages).map(([category, stages]) => (
                    <div key={category} className="mb-6">
                        <h3 className="text-lg font-semibold capitalize mb-3 text-green-600">
                            {category === 'reconnaissance' && '🔍 '}
                            {category === 'vulnerability' && '🛡️ '}
                            {category === 'advanced' && '⚡ '}
                            {category}
                        </h3>
                        <div className="space-y-3">
                            {stages.map(stage => (
                                <div
                                    key={stage.id}
                                    className={`flex items-start space-x-3 p-3 rounded-lg border ${selectedStages.includes(stage.id)
                                            ? 'bg-green-50 border-green-200'
                                            : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <Checkbox
                                        id={stage.id}
                                        checked={selectedStages.includes(stage.id)}
                                        onCheckedChange={() => handleStageToggle(stage.id)}
                                        className="mt-1"
                                    />
                                    <div className="flex-1">
                                        <Label htmlFor={stage.id} className="font-medium cursor-pointer">
                                            {stage.name}
                                            {stage.recommended && (
                                                <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                    Recommended
                                                </span>
                                            )}
                                        </Label>
                                        <p className="text-sm text-gray-600 mt-1">{stage.description}</p>
                                        <p className="text-xs text-gray-500 mt-1">⏱️ {stage.estimatedTime}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                <DialogFooter className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        {selectedStages.length} stage{selectedStages.length !== 1 ? 's' : ''} selected
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={selectedStages.length === 0}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            Start Scan ({selectedStages.length} stages)
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
