"use client";

import React, { useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function SynapseLandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    gsap.to(".fast-loader", {
      opacity: 0,
      duration: 1,
      delay: 1.5,
      display: "none",
      ease: "power2.inOut",
    });

    gsap.fromTo(
      ".hero-anim",
      { y: 30, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, stagger: 0.2, delay: 1.8, ease: "power3.out" }
    );
  }, { scope: containerRef });

  return (
    <div ref={containerRef} className="min-h-screen bg-[#05050A] text-white font-sans overflow-x-hidden">
      
      {/* FAST LOADER */}
      <div className="fast-loader fixed inset-0 z-[100] bg-[#05050A] flex flex-col items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#00F0FF] to-blue-600 animate-pulse shadow-[0_0_40px_rgba(0,240,255,0.6)] mb-6"></div>
        <div className="text-[#00F0FF] font-mono text-sm tracking-[0.3em]">INITIALIZING SYNAPSE...</div>
      </div>

      {/* NAVBAR - STRICTLY SPACED */}
      <nav className="fixed top-0 w-full z-50 bg-[#05050A]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Left: Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#compare" className="hover:text-white transition-colors">Compare</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#about" className="hover:text-white transition-colors">About</a>
            <a href="#docs" className="hover:text-white transition-colors">Docs</a>
          </div>

          {/* Center: Brand Logo */}
          <div className="flex items-center gap-3 absolute left-1/2 -translate-x-1/2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#00F0FF] to-blue-500 shadow-[0_0_15px_rgba(0,240,255,0.6)]"></div>
            <span className="text-xl font-bold tracking-widest text-white">SYNAPSE</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-gray-400 hover:text-white transition-colors hidden sm:block">Log In</a>
            <a href="#" className="text-sm font-semibold bg-white text-black px-5 py-2.5 rounded-full hover:bg-gray-200 transition-all shadow-[0_0_15px_rgba(255,255,255,0.2)]">Get Started Free</a>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 min-h-screen flex items-center justify-center">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#00F0FF] opacity-10 blur-[120px] animate-[spin_10s_linear_infinite]"></div>

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="hero-anim inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono uppercase tracking-wider mb-8">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse"></span>
            V1.0 Deployed & Live
          </div>
          
          <h1 className="hero-anim text-6xl md:text-8xl font-bold tracking-tighter leading-[1.1] mb-6">
            The Deterministic <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Multi-Agent OS.</span>
          </h1>
          
          <p className="hero-anim text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 font-light leading-relaxed">
            Design, deploy, and scale infinite autonomous swarms. No hallucinations. Absolute cryptographic certainty. Replace legacy software with intelligent infrastructure.
          </p>
          
          <div className="hero-anim flex flex-col sm:flex-row items-center justify-center gap-6">
            <a href="/dashboard" className="bg-[#00F0FF] hover:bg-[#00d0dd] text-black px-8 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_30px_rgba(0,240,255,0.4)]">
              Launch Console
            </a>
            <a href="#demo" className="text-white px-8 py-4 rounded-full font-semibold text-lg border border-white/20 hover:bg-white/5 transition-all">
              Watch Demo
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
