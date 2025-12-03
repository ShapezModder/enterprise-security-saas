"use client";

import FeatureLayout from "@/components/FeatureLayout";
import { Layers, GitBranch, ShieldAlert, CheckCircle } from "lucide-react";

export default function CICDPage() {
  return (
    <FeatureLayout
      title="CI/CD Pipeline Guard"
      subtitle="DevSecOps Integration"
      description="Shift security left. We integrate directly into your GitHub, GitLab, and Jenkins pipelines. If a developer commits vulnerable code, we block the deployment before it ever reaches production."
      icon={<Layers size={18} />}
      color="green"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[
          {
            title: "Pre-Commit Hooks",
            desc: "Scans code on the developer's machine before they even push to git.",
            icon: <GitBranch className="text-green-500" />
          },
          {
            title: "Build-Time Analysis",
            desc: "Scans dependencies (SCA) and static code (SAST) during the build process.",
            icon: <ShieldAlert className="text-green-500" />
          },
          {
            title: "Deployment Gate",
            desc: "The final checkpoint. If critical vulns exist, the deploy is hard-blocked.",
            icon: <CheckCircle className="text-green-500" />
          }
        ].map((card, i) => (
          <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-colors">
            <div className="mb-4 bg-black/50 w-fit p-3 rounded-lg">{card.icon}</div>
            <h3 className="text-xl font-bold text-white mb-2">{card.title}</h3>
            <p className="text-gray-400 text-sm">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-[#050505] border border-green-900/30 p-8 rounded-2xl mt-10">
        <h3 className="text-green-400 font-mono text-sm mb-4">PIPELINE_CONFIG.YAML</h3>
        <pre className="font-mono text-xs text-gray-300 overflow-x-auto">
          {`steps:
  - name: fortress Security Scan
    uses: fortress-ai/action@v1
    with:
      target: prod-build
      fail-on: critical, high
    
  - name: Deploy to Production
    if: success()  # Only runs if scan passes
    run: ./deploy.sh`}
        </pre>
      </div>
    </FeatureLayout>
  );
}