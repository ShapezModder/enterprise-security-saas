"use client";
import { useEffect, useRef } from "react";

export default function NeuralWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let frame = 0;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);

    // Configuration for the "Neural Lines"
    const lines = [
      { color: "rgba(34, 197, 94, 0.15)", speed: 0.002, amplitude: 150, frequency: 0.002, offset: 0 },
      { color: "rgba(16, 185, 129, 0.15)", speed: 0.003, amplitude: 120, frequency: 0.003, offset: 100 },
      { color: "rgba(5, 150, 105, 0.1)", speed: 0.004, amplitude: 100, frequency: 0.004, offset: 200 },
      { color: "rgba(0, 255, 127, 0.05)", speed: 0.005, amplitude: 80, frequency: 0.005, offset: 300 },
      // High frequency "noise" line for tech feel
      { color: "rgba(255, 255, 255, 0.05)", speed: 0.01, amplitude: 20, frequency: 0.02, offset: 0 }, 
    ];

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      frame++;

      lines.forEach((line) => {
        ctx.beginPath();
        // Start from middle-left
        ctx.moveTo(0, height / 2);

        for (let x = 0; x < width; x++) {
          // Complex Wave Math: Combine Sine waves for "organic" look
          const y =
            height / 2 +
            Math.sin(x * line.frequency + frame * line.speed + line.offset) * line.amplitude * Math.sin(x / width * Math.PI) + // Main Wave
            Math.sin(x * 0.01 + frame * 0.02) * 10; // Micro jitter

          ctx.lineTo(x, y);
        }

        // Create Gradient Stroke
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(0.5, line.color);
        gradient.addColorStop(1, "transparent");
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      requestAnimationFrame(animate);
    };

    animate();
    return () => window.removeEventListener("resize", resize);
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
      style={{ filter: "blur(1px)" }} // Adds depth/glow
    />
  );
}