"use client";

import FeatureLayout from "@/components/FeatureLayout";
import { Zap, Server, Code, Lock } from "lucide-react";

export default function APISecurityPage() {
  return (
    <FeatureLayout
      title="API Logic Testing"
      subtitle="BOLA & Broken Auth"
      description="APIs are the modern attack surface. We map your entire API surface (REST, GraphQL, gRPC) and fuzz parameters to find Broken Object Level Authorization (BOLA), Mass Assignment, and Injection flaws."
      icon={<Zap size={18} />}
      color="orange"
    >
        <div className="flex flex-col gap-8">
            <div className="bg-orange-900/10 border border-orange-500/20 p-8 rounded-2xl flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-4">The BOLA Problem</h3>
                    <p className="text-gray-400">
                        A user is authorized to see their own data `GET /users/123`. 
                        But what happens if they change the ID to `GET /users/124`?
                        <br/><br/>
                        Most scanners miss this because it returns a "200 OK". 
                        <strong>Our engine detects that User A accessed User B's data.</strong>
                    </p>
                </div>
                <div className="w-full md:w-1/3 bg-black p-4 rounded-xl border border-white/10 font-mono text-xs">
                    <div className="text-green-500">✓ Auth Valid</div>
                    <div className="text-red-500 mt-2">⚠ Cross-Tenant Access Detected</div>
                    <div className="mt-2 text-gray-500">User_A -&gt; Record_B</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <Server className="text-orange-500 mb-4"/>
                    <h4 className="font-bold text-white">Shadow APIs</h4>
                    <p className="text-sm text-gray-400 mt-2">Discovering undocumented endpoints that developers forgot to secure.</p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <Code className="text-orange-500 mb-4"/>
                    <h4 className="font-bold text-white">GraphQL Introspection</h4>
                    <p className="text-sm text-gray-400 mt-2">Mapping the full schema to find hidden queries and mutations.</p>
                </div>
                <div className="bg-white/5 p-6 rounded-xl border border-white/10">
                    <Lock className="text-orange-500 mb-4"/>
                    <h4 className="font-bold text-white">Rate Limiting</h4>
                    <p className="text-sm text-gray-400 mt-2">Testing for DoS vulnerability by bypassing rate limits.</p>
                </div>
            </div>
        </div>
    </FeatureLayout>
  );
}