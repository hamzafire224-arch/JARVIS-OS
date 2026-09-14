import React, { useState, useRef, useLayoutEffect, useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Safely register GSAP
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

// Reusable SVG Icons to avoid external dependencies
const Icons = {
  Terminal: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 17l6-6-6-6m12 14h-6" />
    </svg>
  ),
  Network: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  Shield: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Database: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  CheckCircle: () => (
    <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  ArrowRight: () => (
    <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  )
};

export default function App() {
  const mainRef = useRef<HTMLDivElement>(null);
  const visualsRef = useRef<HTMLDivElement>(null);
  const [terminalText, setTerminalText] = useState("");
  
  // Terminal typing effect logic
  const fullText = "synapse deploy --swarm=revenue-cycle --strict --zkp-verify";
  useEffect(() => {
    let currentText = "";
    let i = 0;
    const interval = setInterval(() => {
      if (i < fullText.length) {
        currentText += fullText[i];
        setTerminalText(currentText);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // Hero Entrance
      gsap.fromTo(
        ".hero-element",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.2, stagger: 0.15, ease: "power3.out" }
      );

      // Pinned Scroll Sequence for the Product Tour
      ScrollTrigger.create({
        trigger: "#product-tour",
        start: "top top",
        end: "+=2400",
        pin: visualsRef.current,
        scrub: true,
      });

      const steps = gsap.utils.toArray(".tour-step") as HTMLElement[];
      steps.forEach((step, i) => {
        ScrollTrigger.create({
          trigger: step,
          start: "top center",
          end: "bottom center",
          onEnter: () => gsap.to(`.ui-mockup-${i}`, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }),
          onLeave: () => gsap.to(`.ui-mockup-${i}`, { opacity: 0, y: -20, duration: 0.4 }),
          onEnterBack: () => gsap.to(`.ui-mockup-${i}`, { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }),
          onLeaveBack: () => gsap.to(`.ui-mockup-${i}`, { opacity: 0, y: 20, duration: 0.4 }),
        });
      });

      // Fade up elements on scroll
      const fadeElements = gsap.utils.toArray(".fade-up");
      fadeElements.forEach((el: any) => {
        gsap.fromTo(el,
          { opacity: 0, y: 40 },
          {
            opacity: 1, y: 0, duration: 1, ease: "power2.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
            }
          }
        );
      });

    }, mainRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={mainRef} className="bg-[#050505] text-[#EDEDED] font-sans overflow-x-hidden selection:bg-[#EDEDED] selection:text-[#050505]">
      
      {/* 
        HEADER
        Clean, minimalist, strictly structured. No messy gradients.
      */}
      <nav className="fixed top-0 w-full z-50 bg-[#050505]/80 backdrop-blur-lg border-b border-[#27272A] transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-12">
            {/* Brand */}
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-5 h-5 bg-[#EDEDED] rounded-sm"></div>
              <span className="text-lg font-bold tracking-wide text-[#EDEDED] uppercase">Synapse</span>
            </div>

            {/* Links */}
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#A1A1AA]">
              <a href="#platform" className="hover:text-[#EDEDED] transition-colors">Platform</a>
              <a href="#solutions" className="hover:text-[#EDEDED] transition-colors">Solutions</a>
              <a href="#security" className="hover:text-[#EDEDED] transition-colors">Security</a>
              <a href="#customers" className="hover:text-[#EDEDED] transition-colors">Customers</a>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-6">
            <a href="/login" className="text-sm font-medium text-[#A1A1AA] hover:text-[#EDEDED] transition-colors hidden sm:block cursor-pointer">Sign In</a>
            <a href="/contact" className="text-sm font-medium bg-[#EDEDED] text-[#050505] px-5 py-2 rounded-md hover:bg-white transition-all cursor-pointer">
              Book Demo
            </a>
          </div>
        </div>
      </nav>

      {/* 
        HERO SECTION
        Outcome-focused. Enterprise-grade typography. No "AI" glowing orbs.
      */}
      <main className="relative pt-48 pb-32 flex flex-col items-center text-center px-6">
        <div className="hero-element inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#27272A] bg-[#111111] text-[#A1A1AA] text-xs font-mono tracking-wide mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          Synapse Core V1.0 is now generally available
        </div>
        
        <h1 className="hero-element text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05] max-w-5xl mb-6">
          Intelligent infrastructure <br className="hidden md:block" />
          <span className="text-[#A1A1AA]">for the modern enterprise.</span>
        </h1>
        
        <p className="hero-element text-lg md:text-xl text-[#A1A1AA] max-w-2xl mb-12 leading-relaxed">
          Design, deploy, and scale deterministic multi-agent swarms. Cryptographically verifiable outputs. Built for engineering teams who demand mathematical certainty.
        </p>
        
        <div className="hero-element flex flex-col sm:flex-row items-center gap-4">
          <a href="/start" className="bg-[#EDEDED] text-[#050505] px-8 py-3.5 rounded-md font-medium text-base hover:bg-white transition-colors flex items-center gap-2">
            Start Building Free <Icons.ArrowRight />
          </a>
          <a href="#tour" className="bg-[#111111] text-[#EDEDED] border border-[#27272A] px-8 py-3.5 rounded-md font-medium text-base hover:bg-[#1A1A1A] transition-colors">
            Read the Whitepaper
          </a>
        </div>
      </main>

      {/* TRUST LOGOS */}
      <section className="py-12 border-y border-[#27272A] bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-xs font-mono text-[#71717A] uppercase tracking-widest mb-8">Powering mission-critical infrastructure at</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-50 grayscale">
            {/* Minimalist typographic logo placeholders */}
            <span className="text-xl font-bold tracking-tighter">ACME Corp</span>
            <span className="text-xl font-serif italic">GlobalBank</span>
            <span className="text-xl font-black uppercase tracking-widest">Nexus</span>
            <span className="text-xl font-medium tracking-tight">HealthGroup</span>
            <span className="text-xl font-bold">Stark Ind.</span>
          </div>
        </div>
      </section>

      {/* 
        TERMINAL TO CANVAS DEMO (Scroll Sequence)
        A high-fidelity representation of the actual product workflow.
      */}
      <section id="product-tour" className="relative w-full bg-[#050505] py-32 border-b border-[#27272A]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-16 relative">
          
          {/* Left: Sticky Text Blocks */}
          <div className="w-full md:w-5/12 z-10 pb-[40vh]">
            
            <div className="tour-step h-[80vh] flex flex-col justify-center">
              <div className="w-10 h-10 rounded-lg bg-[#111111] border border-[#27272A] flex items-center justify-center mb-6 text-[#EDEDED]">
                <Icons.Terminal />
              </div>
              <h2 className="text-3xl font-semibold mb-4">CLI-First Deployment</h2>
              <p className="text-[#A1A1AA] leading-relaxed text-lg">
                Engineers shouldn't have to point and click. Define your entire multi-agent swarm architecture using strict YAML configurations and deploy instantly via the Synapse CLI.
              </p>
            </div>

            <div className="tour-step h-[80vh] flex flex-col justify-center">
              <div className="w-10 h-10 rounded-lg bg-[#111111] border border-[#27272A] flex items-center justify-center mb-6 text-[#EDEDED]">
                <Icons.Network />
              </div>
              <h2 className="text-3xl font-semibold mb-4">Spatial State Visualization</h2>
              <p className="text-[#A1A1AA] leading-relaxed text-lg">
                Once deployed, monitor your swarms in real-time. Synapse automatically maps your declarative configurations into an interactive, spatial DAG for forensic observability.
              </p>
            </div>

            <div className="tour-step h-[80vh] flex flex-col justify-center">
              <div className="w-10 h-10 rounded-lg bg-[#111111] border border-[#27272A] flex items-center justify-center mb-6 text-[#EDEDED]">
                <Icons.Shield />
              </div>
              <h2 className="text-3xl font-semibold mb-4">Cryptographic Audit Trails</h2>
              <p className="text-[#A1A1AA] leading-relaxed text-lg">
                Every decision made by the swarm is signed with a Zero-Knowledge Proof. Trace any output exactly back to the source vector, context, and reasoning step. Total deterministic safety.
              </p>
            </div>
          </div>

          {/* Right: Pinned Realistic UI Mockups */}
          <div className="hidden md:block w-7/12 relative">
            <div 
              ref={visualsRef} 
              className="sticky top-40 w-full h-[550px] rounded-xl border border-[#27272A] bg-[#0A0A0A] shadow-2xl overflow-hidden"
            >
              {/* Window Header */}
              <div className="h-10 border-b border-[#27272A] bg-[#111111] flex items-center px-4 gap-2">
                <div className="w-3 h-3 rounded-full bg-[#3F3F46]"></div>
                <div className="w-3 h-3 rounded-full bg-[#3F3F46]"></div>
                <div className="w-3 h-3 rounded-full bg-[#3F3F46]"></div>
              </div>

              {/* Step 0: Terminal */}
              <div className="ui-mockup-0 absolute inset-0 top-10 p-6 bg-[#050505] font-mono text-sm opacity-100">
                <div className="text-[#A1A1AA] mb-4">~/<span className="text-[#EDEDED]">enterprise-stack</span>$ {terminalText}</div>
                {terminalText.length === fullText.length && (
                  <div className="animate-fade-in mt-4 space-y-2 text-[#A1A1AA]">
                    <div>&gt; Validating strict schemas... <span className="text-green-500">OK</span></div>
                    <div>&gt; Compiling Rust ZKP modules... <span className="text-green-500">OK</span></div>
                    <div>&gt; Provisioning MoE nodes... <span className="text-green-500">OK</span></div>
                    <div className="text-[#EDEDED] mt-4 font-bold border-l-2 border-green-500 pl-3">
                      Swarm deployed successfully. <br/>
                      Live Dashboard: https://synapse.local/ui/revenue-cycle
                    </div>
                  </div>
                )}
              </div>

              {/* Step 1: Canvas UI */}
              <div className="ui-mockup-1 absolute inset-0 top-10 bg-[#0A0A0A] opacity-0" style={{ backgroundImage: 'radial-gradient(#27272A 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full p-8">
                  {/* Mock Node 1 */}
                  <div className="absolute top-16 left-12 w-48 bg-[#111111] border border-[#27272A] rounded-lg p-3 shadow-lg">
                    <div className="text-xs font-mono text-[#A1A1AA] mb-2 flex justify-between">Ingestion <span>✓</span></div>
                    <div className="font-medium text-sm">Kafka Stream A</div>
                  </div>
                  {/* Connection Line */}
                  <svg className="absolute top-24 left-[240px] w-24 h-20" fill="none" stroke="#3F3F46" strokeWidth="2"><path d="M0,0 C40,0 40,60 100,60"></path></svg>
                  {/* Mock Node 2 */}
                  <div className="absolute top-36 left-80 w-56 bg-[#111111] border border-blue-500/30 rounded-lg p-3 shadow-lg ring-1 ring-blue-500/20">
                    <div className="text-xs font-mono text-blue-400 mb-2 flex justify-between">MoE Router <span className="animate-pulse">●</span></div>
                    <div className="font-medium text-sm">Decision Engine</div>
                    <div className="mt-2 h-1 w-full bg-[#27272A] rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[60%]"></div></div>
                  </div>
                </div>
              </div>

              {/* Step 2: Audit Logs */}
              <div className="ui-mockup-2 absolute inset-0 top-10 bg-[#050505] p-6 opacity-0 flex flex-col">
                <div className="border-b border-[#27272A] pb-4 mb-4 flex justify-between text-sm">
                  <span className="font-medium">Forensic Lineage Inspector</span>
                  <span className="text-[#A1A1AA] font-mono">Tx: 0x9f8a...3b2c</span>
                </div>
                <div className="flex-1 space-y-4">
                  <div className="p-3 bg-[#111111] border border-[#27272A] rounded-md">
                    <div className="text-xs text-[#A1A1AA] mb-1 font-mono">Source Input</div>
                    <div className="text-sm">"Process patient claim #49281"</div>
                  </div>
                  <div className="flex justify-center"><svg width="16" height="16" fill="none" stroke="#3F3F46" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m0 0l-4-4m4 4l4-4" /></svg></div>
                  <div className="p-3 bg-[#111111] border border-green-500/20 rounded-md">
                    <div className="text-xs text-green-500 mb-1 font-mono flex items-center gap-2"><Icons.Shield /> ZKP Verified Output</div>
                    <div className="text-sm font-mono text-[#A1A1AA]">
                      CPT Code: 99214<br/>
                      Confidence: 99.9%<br/>
                      Proof Hash: a8f7...c19d
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 
        FEATURE GRID
        Clean, structural bento-box design.
      */}
      <section className="py-32 bg-[#050505]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="fade-up mb-16 text-center">
            <h2 className="text-3xl md:text-4xl font-semibold mb-4">Architecture without compromise</h2>
            <p className="text-[#A1A1AA] text-lg max-w-2xl mx-auto">Synapse is built from the ground up for scale, security, and strict data governance. No wrappers. No black boxes.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="fade-up p-8 rounded-xl bg-[#0A0A0A] border border-[#27272A] hover:border-[#3F3F46] transition-colors">
              <div className="mb-6 text-[#EDEDED]"><Icons.Database /></div>
              <h3 className="text-xl font-medium mb-3">Real-time CDC Sync</h3>
              <p className="text-[#A1A1AA] text-sm leading-relaxed">Native PostgreSQL logical replication. State changes sync across your fleet in milliseconds without heavy WebSocket overhead.</p>
            </div>
            <div className="fade-up p-8 rounded-xl bg-[#0A0A0A] border border-[#27272A] hover:border-[#3F3F46] transition-colors delay-100">
              <div className="mb-6 text-[#EDEDED]"><Icons.Network /></div>
              <h3 className="text-xl font-medium mb-3">Durable Execution</h3>
              <p className="text-[#A1A1AA] text-sm leading-relaxed">Powered by a robust state machine. Long-running tasks survive serverless limits with automatic retries and exponential backoff.</p>
            </div>
            <div className="fade-up p-8 rounded-xl bg-[#0A0A0A] border border-[#27272A] hover:border-[#3F3F46] transition-colors delay-200">
              <div className="mb-6 text-[#EDEDED]"><Icons.Shield /></div>
              <h3 className="text-xl font-medium mb-3">Enterprise Security</h3>
              <p className="text-[#A1A1AA] text-sm leading-relaxed">SOC 2 Type II and HIPAA compliant. Row-Level Security (RLS) ensures absolute data isolation between multi-tenant swarms.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 
        FINAL CTA 
      */}
      <section className="py-32 bg-[#0A0A0A] border-t border-[#27272A]">
        <div className="max-w-4xl mx-auto px-6 text-center fade-up">
          <h2 className="text-4xl md:text-5xl font-semibold mb-6">Ready to upgrade your infrastructure?</h2>
          <p className="text-[#A1A1AA] text-lg mb-10">Join the engineering teams building the next generation of autonomous software.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <a href="/signup" className="bg-[#EDEDED] text-[#050505] px-8 py-3.5 rounded-md font-medium hover:bg-white transition-colors">
              Deploy Synapse Free
            </a>
            <a href="/contact" className="bg-transparent text-[#EDEDED] border border-[#27272A] px-8 py-3.5 rounded-md font-medium hover:bg-[#111111] transition-colors">
              Contact Sales
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-[#71717A] font-mono">
             <span className="flex items-center gap-2"><Icons.CheckCircle /> No credit card required</span>
             <span className="flex items-center gap-2"><Icons.CheckCircle /> Open Source Core</span>
          </div>
        </div>
      </section>

      {/* 
        FAT FOOTER
        Highly structured, enterprise standard.
      */}
      <footer className="bg-[#050505] border-t border-[#27272A] pt-20 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-5 h-5 bg-[#EDEDED] rounded-sm"></div>
                <span className="text-lg font-bold tracking-wide text-[#EDEDED] uppercase">Synapse</span>
              </div>
              <p className="text-[#A1A1AA] text-sm leading-relaxed max-w-xs mb-6">
                The deterministic multi-agent operating system. Built for engineering teams demanding mathematical certainty.
              </p>
              <div className="flex gap-4">
                {/* Social icons placeholders */}
                <div className="w-8 h-8 rounded bg-[#111111] border border-[#27272A] flex items-center justify-center text-[#A1A1AA] hover:text-[#EDEDED] cursor-pointer">X</div>
                <div className="w-8 h-8 rounded bg-[#111111] border border-[#27272A] flex items-center justify-center text-[#A1A1AA] hover:text-[#EDEDED] cursor-pointer">In</div>
                <div className="w-8 h-8 rounded bg-[#111111] border border-[#27272A] flex items-center justify-center text-[#A1A1AA] hover:text-[#EDEDED] cursor-pointer">Gh</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Platform</h4>
              <ul className="space-y-3 text-sm text-[#A1A1AA]">
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">Architecture</a></li>
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">Deterministic Engine</a></li>
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">Observability</a></li>
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">Pricing</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Developers</h4>
              <ul className="space-y-3 text-sm text-[#A1A1AA]">
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">GitHub Repository</a></li>
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">Community Forum</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-[#A1A1AA]">
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-[#EDEDED] transition-colors">Contact</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-[#27272A] pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-[#71717A]">
              &copy; {new Date().getFullYear()} Synapse Systems Inc. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm text-[#71717A]">
              <a href="#" className="hover:text-[#A1A1AA] transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-[#A1A1AA] transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-[#A1A1AA] transition-colors flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-500"></span> All systems operational
              </a>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
