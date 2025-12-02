"use client";

import FeatureLayout from "@/components/FeatureLayout";
import { Globe, Share2, Network, ShieldAlert } from "lucide-react";

export default function NetworkMapPage() {
  return (
    <FeatureLayout
      title="Internal Network Map"
      subtitle="Lateral Movement Simulation"
      description="Security doesn't stop at the firewall. Our lightweight agent maps your internal network, identifying exposed SMB shares, unpatched internal servers, and cleartext credentials moving across the wire."
      icon={<Globe size={18} />}
      color="blue"
    >
      <div className="relative w-full h-96 bg-black rounded-2xl border border-white/10 overflow-hidden flex items-center justify-center">
        {/* Abstract Network Graph Visualization */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 to-transparent"></div>
        <div className="grid grid-cols-3 gap-20 z-10">
            {[1,2,3].map(i => (
                <div key={i} className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-blue-500/20 rounded-full border border-blue-500 flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                        <Network className="text-blue-400"/>
                    </div>
                    <div className="text-center">
                        <div className="text-white font-bold text-sm">Node {i}</div>
                        <div className="text-blue-500 text-xs">192.168.1.{10+i}</div>
                    </div>
                </div>
            ))}
        </div>
        <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <line x1="33%" y1="50%" x2="66%" y2="50%" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" className="opacity-50" />
        </svg>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div className="bg-white/5 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><Share2 className="text-blue-500"/> Lateral Movement</h3>
            <p className="text-gray-400 text-sm">
                We simulate how an attacker moves from a compromised laptop to the Domain Controller using techniques like Pass-the-Hash and Kerberoasting.
            </p>
        </div>
        <div className="bg-white/5 p-6 rounded-xl">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2"><ShieldAlert className="text-blue-500"/> Rogue Device Detection</h3>
            <p className="text-gray-400 text-sm">
                Identify unauthorized devices (Raspberry Pis, personal laptops) connected to your secure corporate network instantly.
            </p>
        </div>
      </div>
    </FeatureLayout>
  );
}