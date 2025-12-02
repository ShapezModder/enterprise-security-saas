"use client";
import { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { Terminal, XCircle, Minimize2, Maximize2 } from 'lucide-react';

// Connect to your Enterprise API Gateway
const SOCKET_URL = 'http://localhost:3001';

export default function LiveTerminal({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [logs, setLogs] = useState<string[]>(["[SYSTEM] Initializing Secure Uplink...", "[SYSTEM] Connected to Enterprise Gateway."]);
  const [isMaximized, setIsMaximized] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.emit('subscribe_job', jobId);

    socket.on('log', (msg) => {
        setLogs((prev) => [...prev, msg]);
    });

    return () => { socket.disconnect(); };
  }, [jobId]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className={`fixed z-50 bg-black/95 border border-green-900 shadow-[0_0_50px_rgba(0,255,0,0.2)] backdrop-blur-md transition-all duration-300 flex flex-col font-mono text-xs ${isMaximized ? 'inset-4' : 'bottom-4 right-4 w-[600px] h-[400px] rounded-lg'}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-green-900 bg-green-900/10">
        <div className="flex items-center gap-2 text-green-500">
            <Terminal size={14} />
            <span className="font-bold tracking-wider">GOD_MODE_CONSOLE // JOB: {jobId.split('-')[0]}</span>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setIsMaximized(!isMaximized)} className="text-green-700 hover:text-green-400">
                {isMaximized ? <Minimize2 size={14}/> : <Maximize2 size={14}/>}
            </button>
            <button onClick={onClose} className="text-red-700 hover:text-red-400">
                <XCircle size={14}/>
            </button>
        </div>
      </div>

      {/* Terminal Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-green-900 scrollbar-track-transparent">
        {logs.map((log, i) => (
          <div key={i} className="break-all">
            <span className="text-green-600 mr-2">➜</span>
            <span className={log.includes('[OPSEC]') ? 'text-yellow-500' : log.includes('[ERROR]') ? 'text-red-500' : 'text-gray-300'}>
                {log}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
        {/* Blinking Cursor */}
        <div className="animate-pulse bg-green-500 w-2 h-4 inline-block ml-1 align-middle"></div>
      </div>
    </div>
  );
}