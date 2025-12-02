"use client";

import FeatureLayout from "@/components/FeatureLayout";
import { CheckCircle, FileText, Shield, Award } from "lucide-react";

export default function CompliancePage() {
  return (
    <FeatureLayout
      title="Compliance Automation"
      subtitle="Audit Ready Reports"
      description="Stop spending weeks on manual audit prep. We automatically map every technical finding to PCI-DSS, ISO 27001, HIPAA, and GDPR requirements, generating auditor-ready PDFs in seconds."
      icon={<Shield size={18} />}
      color="teal"
    >
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-white/10 pb-8">
            <div>
                <h3 className="text-2xl font-bold text-white">Real-Time Compliance Score</h3>
                <p className="text-gray-400">Updated automatically with every scan.</p>
            </div>
            <div className="text-6xl font-bold text-teal-500">94<span className="text-2xl text-gray-500">%</span></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
                { std: "PCI-DSS v4.0", status: "PASS", desc: "Payment Card Industry Data Security Standard" },
                { std: "ISO 27001", status: "PASS", desc: "Information Security Management" },
                { std: "HIPAA", status: "WARN", desc: "Health Insurance Portability and Accountability Act" },
                { std: "GDPR", status: "PASS", desc: "General Data Protection Regulation" },
            ].map((item, i) => (
                <div key={i} className="bg-black/40 p-4 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <h4 className="font-bold text-white">{item.std}</h4>
                            {item.status === 'PASS' ? <CheckCircle size={14} className="text-green-500"/> : <AlertTriangle size={14} className="text-yellow-500"/>}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                    </div>
                    <div className={`px-3 py-1 rounded text-xs font-bold ${item.status === 'PASS' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {item.status}
                    </div>
                </div>
            ))}
        </div>
      </div>
    </FeatureLayout>
  );
}

// Helper icon for HIPAA warning
import { AlertTriangle } from "lucide-react";