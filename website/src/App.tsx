import React, { useState, useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Safely register GSAP
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export default function App() {
  const [isReady, setIsReady] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const mainRef = useRef<HTMLDivElement>(null);
  const visualsRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // 1. Initial Loader Fade Out
    const timer = setTimeout(() => {
      gsap.to(".fast-loader", {
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => {
          setShowLoader(false); // Fully unmount to fix clickability
          setIsReady(true);
        }
      });
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    if (!isReady) return;

    // 2. Hero Entrance Animation
    gsap.fromTo(
      ".hero-anim",
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, stagger: 0.15, delay: 0.1, ease: "power3.out" }
    );

    // 3. Pinned Scroll Sequence Context
    const ctx = gsap.context(() => {
      // Pin the right-side visual container
      ScrollTrigger.create({
        trigger: "#scroll-sequence",
        start: "top top",
        end: "+=2400", // Matches the height of the 3 text steps
        pin: visualsRef.current,
        scrub: true,
      });

      // Animate mockups in and out based on which text step is active
      const steps = gsap.utils.toArray(".text-step") as HTMLElement[];
      steps.forEach((step, i) => {
        ScrollTrigger.create({
          trigger: step,
          start: "top center",
          end: "bottom center",
          onEnter: () => gsap.to(`.mockup-${i}`, { opacity: 1, scale: 1, duration: 0.5 }),
          onLeave: () => gsap.to(`.mockup-${i}`, { opacity: 0, scale: 0.95, duration: 0.5 }),
          onEnterBack: () => gsap.to(`.mockup-${i}`, { opacity: 1, scale: 1, duration: 0.5 }),
          onLeaveBack: () => gsap.to(`.mockup-${i}`, { opacity: 0, scale: 0.95, duration: 0.5 }),
        });
      });
    }, mainRef);

    return () => ctx.revert();
  }, [isReady]);

  return (
    <div ref={mainRef} className="bg-[#05050A] text-white font-sans overflow-x-hidden selection:bg-[#00F0FF] selection:text-black">
      
      {/* 
        FAST LOADER 
        Uses conditional rendering to guarantee it is removed from the DOM,
        preventing the "ghost shield" bug that makes buttons unclickable.
      */}
      {showLoader && (
        <div className="fast-loader fixed inset-0 z-[100] bg-[#05050A] flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#001A88] animate-pulse shadow-[0_0_50px_rgba(0,240,255,0.6)] mb-8"></div>
          <div className="text-[#00F0FF] font-mono text-sm tracking-[0.4em]">INITIALIZING SYNAPSE...</div>
        </div>
      )}

      {}
      <nav className="fixed top-0 w-full z-50 bg-[#05050A]/70 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Left: Navigation Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <a href="#platform" className="hover:text-white transition-colors cursor-pointer">Platform</a>
            <a href="#features" className="hover:text-white transition-colors cursor-pointer">Features</a>
            <a href="#enterprise" className="hover:text-white transition-colors cursor-pointer">Enterprise</a>
            <a href="#docs" className="hover:text-white transition-colors cursor-pointer">Docs</a>
          </div>

          {/* Center: Brand Logo (Deep Cyan to Dark Blue) */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#001A88] shadow-[0_0_20px_rgba(0,240,255,0.5)]"></div>
            <span className="text-xl font-bold tracking-widest text-white uppercase">Synapse</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-6">
            <a href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors hidden sm:block cursor-pointer">Log In</a>
            <a href="/dashboard" className="text-sm font-semibold bg-white text-black px-6 py-2.5 rounded-full hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer">
              Launch Console
            </a>
          </div>
        </div>
      </nav>

      {}
      <main className="relative pt-40 pb-20 min-h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Massive Background Glowing Orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-[#00F0FF]/20 to-[#001A88]/40 blur-[150px] animate-[spin_20s_linear_infinite] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10 flex-1 flex flex-col justify-center">
          <div className="hero-anim inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono uppercase tracking-wider mb-8 mx-auto">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse"></span>
            V1.0 Deployed & Live
          </div>
          
          <h1 className="hero-anim text-5xl md:text-8xl font-extrabold tracking-tighter leading-[1.05] mb-8">
            The Deterministic <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Multi-Agent OS.</span>
          </h1>
          
          <p className="hero-anim text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 font-light leading-relaxed">
            Design, deploy, and scale infinite autonomous swarms. No hallucinations. Absolute cryptographic certainty. Replace legacy software with intelligent infrastructure.
          </p>
          
          <div className="hero-anim flex flex-col sm:flex-row items-center justify-center gap-6">
            <a href="/dashboard" className="bg-[#00F0FF] text-black px-10 py-4 rounded-full font-bold text-lg hover:bg-[#00d0dd] transition-all shadow-[0_0_30px_rgba(0,240,255,0.4)] hover:shadow-[0_0_50px_rgba(0,240,255,0.6)] cursor-pointer">
              Enter Workspace
            </a>
            <a href="#scroll-sequence" className="text-white px-10 py-4 rounded-full font-semibold text-lg border border-white/20 hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer">
              Watch Demo
            </a>
          </div>
        </div>
      </main>

      {}
      <section id="scroll-sequence" className="relative w-full bg-[#020204] border-t border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-16 relative">
          
          {/* Left Side: Scrolling Text Blocks */}
          <div className="w-full md:w-1/2 z-10 pb-[50vh]">
            <div className="text-step h-[80vh] flex flex-col justify-center">
              <div className="w-12 h-12 rounded-xl bg-[#00F0FF]/10 flex items-center justify-center border border-[#00F0FF]/30 mb-6">
                <svg className="w-6 h-6 text-[#00F0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"></path></svg>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Infinite Swarm Workspace</h2>
              <p className="text-xl text-gray-400 leading-relaxed">
                Drag and drop intelligent agents onto a spatial HTML5 canvas. Visually wire ingestion nodes directly into specialized Mixture-of-Expert (MoE) models to orchestrate complex tasks simultaneously.
              </p>
            </div>

            <div className="text-step h-[80vh] flex flex-col justify-center">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/30 mb-6">
                <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Forensic Audit Lineage</h2>
              <p className="text-xl text-gray-400 leading-relaxed">
                Cryptographic transparency. Click any agent output to trace its exact lineage back to vector memories, source URLs, or specific prompt constraints that drove the decision.
              </p>
            </div>

            <div className="text-step h-[80vh] flex flex-col justify-center">
              <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center border border-green-500/30 mb-6">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">Durable Execution</h2>
              <p className="text-xl text-gray-400 leading-relaxed">
                Powered by Inngest. Tasks survive serverless timeouts. Fan-out execution across thousands of agents with automatic retries, guardrails, and pause/resume logic.
              </p>
            </div>
          </div>

          {/* Right Side: Pinned UI Frame */}
          <div className="hidden md:block w-1/2 relative">
            <div 
              ref={visualsRef} 
              className="sticky top-32 w-full h-[600px] rounded-2xl border border-white/10 bg-[#0A0A0F] shadow-[0_30px_60px_rgba(0,0,0,0.6)] overflow-hidden"
            >
              {/* Mac Window Header */}
              <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2 z-50 relative">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                <div className="mx-auto text-xs text-gray-500 font-mono">synapse-workspace-v1</div>
              </div>

              {}
              {/* UI 1: React Flow Canvas Mockup */}
              <div className="mockup-0 absolute inset-0 top-10 p-6 opacity-0" style={{ backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
                <div className="absolute top-20 left-10 w-48 p-3 rounded-xl border border-green-500/30 bg-green-500/10 backdrop-blur-md">
                   <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-xs font-bold text-white">WhatsApp Ingest</span></div>
                   <div className="text-[10px] text-gray-400 font-mono">Status: Listening</div>
                </div>
                {/* SVG Curve Connection */}
                <svg className="absolute top-24 left-56 w-32 h-20" fill="none" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.5"><path d="M0,10 C50,10 50,60 100,60"></path></svg>
                <div className="absolute top-32 left-80 w-56 p-4 rounded-xl border border-[#00F0FF]/50 bg-[#00F0FF]/10 backdrop-blur-md shadow-[0_0_20px_rgba(0,240,255,0.15)]">
                   <div className="flex items-center gap-2 mb-2"><div className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse"></div><span className="text-sm font-bold text-white">Main Routing Agent</span></div>
                   <div className="flex gap-1"><span className="px-2 py-0.5 rounded text-[9px] bg-white/10 text-[#00F0FF]">MoE Active</span><span className="px-2 py-0.5 rounded text-[9px] bg-white/10 text-[#00F0FF]">Running</span></div>
                </div>
              </div>

              {/* UI 2: Forensic Lineage Mockup */}
              <div className="mockup-1 absolute inset-0 top-10 bg-[#0A0A0F] p-8 opacity-0">
                <div className="text-sm font-bold text-white mb-6 border-b border-white/10 pb-4">Audit Trail: Output Generation</div>
                <div className="relative pl-6 border-l border-white/10 space-y-8">
                   <div className="relative">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-purple-500/20 border border-purple-500 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div></div>
                      <div className="text-xs font-mono text-purple-400 mb-1">Source: Vector Memory</div>
                      <div className="text-sm text-gray-300">"Competitor X raised Series B at $45M..."</div>
                      <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-purple-500 w-[94%]"></div></div>
                   </div>
                   <div className="relative">
                      <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-blue-500/20 border border-blue-500 flex items-center justify-center"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div></div>
                      <div className="text-xs font-mono text-blue-400 mb-1">Source: Web Scraper Skill</div>
                      <div className="text-sm text-gray-300">Extracted from techcrunch.com/2026/09...</div>
                      <div className="mt-2 h-1 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500 w-[82%]"></div></div>
                   </div>
                </div>
              </div>

              {/* UI 3: Terminal Console Mockup */}
              <div className="mockup-2 absolute inset-0 top-10 bg-[#05050A] p-6 opacity-0 font-mono text-xs text-gray-400">
                 <div className="flex items-center gap-2 mb-4 text-[#00F0FF]"><span className="animate-pulse">▶</span> <span>Executing Fan-out Protocol</span></div>
                 <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-gray-500">[14:02:01]</span> <span className="text-white">Agent_A_Task_Init</span> <span className="text-green-400">SUCCESS</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">[14:02:02]</span> <span className="text-white">Agent_B_Task_Init</span> <span className="text-green-400">SUCCESS</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">[14:02:05]</span> <span className="text-white">Supervisor_Recheck_Gate</span> <span className="text-amber-400">PENDING</span></div>
                 </div>
                 <div className="mt-8 p-4 border border-white/10 rounded-lg bg-white/5">
                    <div className="text-white font-bold mb-2">Durable State Guard:</div>
                    <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-green-500 w-full animate-pulse"></div></div>
                 </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {}
      <section id="features" className="py-24 bg-[#05050A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">The DeepTech Moat</h2>
            <p className="text-gray-400">Enterprise-grade architecture built natively.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-[#00F0FF]/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-6 text-2xl">⚡</div>
              <h3 className="text-xl font-bold mb-3 text-white">Realtime CDC</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Supabase PostgreSQL logical replication streams canvas updates instantly to your browser without WebSocket servers.</p>
            </div>
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-purple-500/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-6 text-2xl">🔐</div>
              <h3 className="text-xl font-bold mb-3 text-white">Zero-Knowledge Proofs</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Deterministic outputs verified mathematically. The rust-based gRPC server ensures strict protocol adherence.</p>
            </div>
            <div className="p-8 rounded-2xl bg-white/5 border border-white/10 hover:border-green-500/30 transition-colors">
              <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-6 text-2xl">🌐</div>
              <h3 className="text-xl font-bold mb-3 text-white">Omnichannel Mesh</h3>
              <p className="text-gray-400 text-sm leading-relaxed">Natively intercept and route payloads from WhatsApp, Instagram, and custom webhooks directly into the MoE.</p>
            </div>
          </div>
        </div>
      </section>

      {}
      <footer className="border-t border-white/10 bg-[#020204] pt-24 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[400px] bg-[#00F0FF]/5 blur-[150px] rounded-full pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-16 mb-12">
            <div>
              <h2 className="text-4xl md:text-6xl font-bold mb-6">Ready to deploy<br/>your swarm?</h2>
              <a href="/dashboard" className="inline-block bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-gray-200 transition-colors">
                Launch Console Today
              </a>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#00F0FF] to-[#001A88]"></div>
              <span className="text-xl font-bold tracking-widest text-white uppercase">Synapse</span>
            </div>
            <div className="text-sm font-mono text-gray-500 uppercase tracking-wider">
              Engineered for the Enterprise. &copy; {new Date().getFullYear()}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
