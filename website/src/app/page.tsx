'use client';

import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import './globals.css';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export default function Home() {
  const container = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  // 1. Fast Loader
  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 15) + 5;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(() => setLoading(false), 500);
      }
      setProgress(current);
    }, 150);
    return () => clearInterval(interval);
  }, []);

  // Sticky Nav Scroll detection
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // GSAP Animations
  useGSAP(() => {
    if (loading) return;

    // Hero Text Reveal
    gsap.from('.hero-text', {
      y: 50,
      opacity: 0,
      duration: 1.2,
      stagger: 0.2,
      ease: 'power3.out',
      delay: 0.2,
    });

    // Sticky Split Screen Scroll Sequence
    const panels = gsap.utils.toArray<HTMLElement>('.demo-panel');
    const uis = gsap.utils.toArray<HTMLElement>('.mock-ui');
    
    ScrollTrigger.create({
      trigger: '.split-sequence',
      start: 'top top',
      end: '+=300%',
      pin: true,
      scrub: true,
      animation: gsap.timeline()
        .to(uis[0] as HTMLElement, { opacity: 0, duration: 1 })
        .to(uis[1] as HTMLElement, { opacity: 1, duration: 1 }, "<")
        .to(uis[1] as HTMLElement, { opacity: 0, duration: 1 }, "+=1")
        .to(uis[2] as HTMLElement, { opacity: 1, duration: 1 }, "<")
    });

  }, { dependencies: [loading], scope: container });

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#05050A]">
        <div className="absolute w-[400px] h-[400px] glowing-orb" />
        <div className="relative z-10 flex flex-col items-center">
          <div className="text-[#00F0FF] font-mono text-5xl mb-4">{progress}%</div>
          <div className="text-gray-400 font-mono tracking-[0.3em] text-sm">INITIALIZING SYNAPSE...</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={container} className="relative w-full min-h-screen text-white bg-[#05050A] selection:bg-[#00F0FF] selection:text-black">
      
      {/* Navbar */}
      <nav className="fixed w-full top-0 z-50 bg-[#05050A]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex gap-8 text-sm font-medium text-gray-300">
            <a href="#" className="hover:text-white transition-colors">Features</a>
            <a href="#" className="hover:text-white transition-colors">Compare</a>
            <a href="#" className="hover:text-white transition-colors">Pricing</a>
            <a href="#" className="hover:text-white transition-colors">About</a>
            <a href="#" className="hover:text-white transition-colors">Docs</a>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[#00F0FF] to-[#0047FF] shadow-[0_0_15px_rgba(0,240,255,0.5)]"></div>
            <div className="font-bold text-xl tracking-widest text-white">SYNAPSE</div>
          </div>
          <div className="flex gap-4 items-center">
            <button className="text-sm font-medium text-gray-300 hover:text-white transition-colors">Log In</button>
            <button className="px-6 py-2 rounded-full bg-white text-black hover:bg-gray-200 transition-all text-sm font-medium">Get Started Free</button>
          </div>
        </div>
      </nav>

      {/* 2. Hero Section */}
      <section className="relative w-full h-screen flex flex-col items-center justify-center overflow-hidden pt-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] glowing-orb pointer-events-none opacity-60" />
        
        <div className="relative z-10 text-center max-w-4xl px-4">
          <h1 className="hero-text text-6xl md:text-8xl font-extrabold tracking-tight mb-8 leading-tight">
            The Deterministic <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00F0FF] to-[#0047FF]">Multi-Agent OS.</span>
          </h1>
          <p className="hero-text text-xl md:text-2xl text-gray-400 mb-12 font-light max-w-2xl mx-auto">
            Design, deploy, and scale infinite autonomous swarms. No hallucinations. Absolute cryptographic certainty.
          </p>
          <div className="hero-text">
            <button className="px-8 py-4 bg-white text-black font-semibold rounded-full text-lg hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] transition-all duration-300">
              Launch Console
            </button>
          </div>
        </div>
      </section>

      {/* 3. Product Demo Split Sequence */}
      <section className="split-sequence relative w-full h-screen flex bg-black">
        {/* Left: Scrolling Text */}
        <div className="w-1/2 h-full flex flex-col justify-center px-20">
          <div className="demo-panel h-screen flex flex-col justify-center">
            <h2 className="text-4xl font-bold text-[#00F0FF] mb-4">1. Infinite Swarm Workspace</h2>
            <p className="text-xl text-gray-400">Collaborate with thousands of specialized agents in a boundless, real-time infinite canvas powered by WebGL.</p>
          </div>
          <div className="demo-panel h-screen flex flex-col justify-center">
            <h2 className="text-4xl font-bold text-[#00F0FF] mb-4">2. Forensic Audit Lineage</h2>
            <p className="text-xl text-gray-400">Trace every decision mathematically. Visual DAGs map the origin of every token, guaranteeing deterministic safety.</p>
          </div>
          <div className="demo-panel h-screen flex flex-col justify-center">
            <h2 className="text-4xl font-bold text-[#00F0FF] mb-4">3. 3D Audio-Reactive Agents</h2>
            <p className="text-xl text-gray-400">Engage with hyper-realistic, low-latency vocal agents that react dynamically to your environment and tone.</p>
          </div>
        </div>

        {/* Right: Mock UI Crossfades */}
        <div className="w-1/2 h-full relative flex items-center justify-center bg-[#08080C] border-l border-[rgba(255,255,255,0.05)]">
          {/* Mock UI 1: Canvas */}
          <div className="mock-ui absolute w-[80%] h-[70%] glass rounded-2xl p-6 flex flex-col opacity-100 shadow-[0_0_50px_rgba(0,71,255,0.1)]">
            <div className="flex gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <div className="flex-1 border border-[rgba(255,255,255,0.1)] rounded-xl relative overflow-hidden bg-[url('https://placehold.co/800x600/05050A/00F0FF?text=Node+Canvas')] bg-cover bg-center" />
          </div>
          
          {/* Mock UI 2: Lineage */}
          <div className="mock-ui absolute w-[80%] h-[70%] glass rounded-2xl p-6 flex flex-col opacity-0 shadow-[0_0_50px_rgba(0,240,255,0.1)]">
            <div className="flex gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <div className="flex-1 border border-[rgba(255,255,255,0.1)] rounded-xl relative overflow-hidden bg-[url('https://placehold.co/800x600/05050A/0047FF?text=Audit+DAG')] bg-cover bg-center" />
          </div>

          {/* Mock UI 3: Audio */}
          <div className="mock-ui absolute w-[80%] h-[70%] glass rounded-2xl p-6 flex flex-col opacity-0 shadow-[0_0_50px_rgba(0,240,255,0.1)]">
            <div className="flex gap-2 mb-6">
              <div className="w-3 h-3 rounded-full bg-red-500/50" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
              <div className="w-3 h-3 rounded-full bg-green-500/50" />
            </div>
            <div className="flex-1 border border-[rgba(255,255,255,0.1)] rounded-xl relative overflow-hidden bg-[url('https://placehold.co/800x600/05050A/00F0FF?text=Audio+Visualizer')] bg-cover bg-center" />
          </div>
        </div>
      </section>

      {/* 4. Under the Hood Feature Slider */}
      <section className="relative w-full py-32 bg-[#05050A] overflow-hidden">
        <div className="px-12 mb-16">
          <h2 className="text-5xl font-bold">The DeepTech Moat.</h2>
          <p className="text-gray-400 mt-4 text-xl">Infrastructure built for monopolistic scale.</p>
        </div>
        
        <div className="flex overflow-x-auto no-scrollbar gap-8 px-12 pb-12 snap-x">
          {[
            { title: "Inngest Durable Execution", desc: "Serverless step functions guarantee task completion despite failures." },
            { title: "Supabase Realtime CDC", desc: "PostgreSQL change data capture streams state instantly to the client." },
            { title: "Meta Webhook Hub", desc: "Unified Omni-Channel integration with cryptographically secure payloads." },
            { title: "Zero-Knowledge Proofs", desc: "Mathematical verification of deterministic output without exposing data." }
          ].map((feature, i) => (
            <div key={i} className="snap-start shrink-0 w-[400px] h-[300px] glass p-8 rounded-3xl flex flex-col justify-end group hover:border-[#00F0FF]/50 transition-colors">
              <h3 className="text-2xl font-bold mb-4 group-hover:text-[#00F0FF] transition-colors">{feature.title}</h3>
              <p className="text-gray-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 5. Social Proof & Footer */}
      <footer className="relative w-full pt-32 pb-12 bg-black border-t border-[rgba(255,255,255,0.05)] overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] glowing-orb opacity-20 pointer-events-none translate-y-1/2" />
        
        <div className="relative z-10 max-w-6xl mx-auto px-8 flex flex-col items-center">
          <h2 className="text-4xl font-bold mb-12 text-center">Engineered for the Enterprise.</h2>
          <div className="flex gap-16 mb-24 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            {/* Logos represented by text for simulation */}
            <div className="text-2xl font-bold tracking-widest">VERCEL</div>
            <div className="text-2xl font-bold tracking-widest">SUPABASE</div>
            <div className="text-2xl font-bold tracking-widest">STRIPE</div>
          </div>
          
          <div className="w-full flex justify-between items-center border-t border-[rgba(255,255,255,0.1)] pt-12">
            <div className="font-bold text-2xl tracking-widest text-[#00F0FF]">SYNAPSE</div>
            <div className="flex gap-8 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Documentation</a>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
            </div>
            <div className="text-sm text-gray-500">&copy; 2026 Synapse Labs, Inc.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
