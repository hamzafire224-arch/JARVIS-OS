import React, { useState, useRef, useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const mainRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    // Loader Exit Animation
    const timer = setTimeout(() => {
      gsap.to(".fast-loader", {
        opacity: 0,
        duration: 0.8,
        ease: "power2.inOut",
        onComplete: () => setIsLoading(false)
      });
    }, 1500);

    // Initial Hero Entrance
    gsap.fromTo(
      ".hero-anim",
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1, stagger: 0.15, delay: 1.8, ease: "power3.out" }
    );

    return () => clearTimeout(timer);
  }, []);

  useLayoutEffect(() => {
    if (isLoading) return;

    // Pinned Scroll Sequence
    let ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: "#scroll-sequence",
        start: "top top",
        end: "+=2000",
        pin: ".right-visuals",
        scrub: true,
      });

      const sections = gsap.utils.toArray(".text-step") as HTMLElement[];
      sections.forEach((step, i) => {
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
  }, [isLoading]);

  return (
    <div ref={mainRef} className="bg-[#05050A] text-white font-sans overflow-x-hidden selection:bg-[#00F0FF] selection:text-black">
      
      {/* FAST LOADER (Unmounts to fix clickability) */}
      {isLoading && (
        <div className="fast-loader fixed inset-0 z-[100] bg-[#05050A] flex flex-col items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[radial-gradient(circle_at_30%_30%,#00F0FF,#001A88)] animate-pulse shadow-[0_0_50px_rgba(0,240,255,0.6)] mb-6"></div>
          <div className="text-[#00F0FF] font-mono text-sm tracking-[0.4em]">INITIALIZING SYNAPSE...</div>
        </div>
      )}

      {/* NAVBAR */}
      <nav className="fixed top-0 w-full z-50 bg-[#05050A]/70 backdrop-blur-xl border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          {/* Left: Navigation Links */}
          <div className="hidden md:flex items-center gap-10 text-sm font-medium text-gray-400">
            <a href="#platform" className="hover:text-white transition-colors cursor-pointer">Platform</a>
            <a href="#features" className="hover:text-white transition-colors cursor-pointer">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors cursor-pointer">Enterprise</a>
            <a href="#docs" className="hover:text-white transition-colors cursor-pointer">Docs</a>
          </div>

          {/* Center: Brand Logo */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[radial-gradient(circle_at_30%_30%,#00F0FF,#001A88)] shadow-[0_0_20px_rgba(0,240,255,0.5)]"></div>
            <span className="text-2xl font-bold tracking-widest text-white">SYNAPSE</span>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-6">
            <a href="/login" className="text-sm font-medium text-gray-400 hover:text-white transition-colors hidden sm:block cursor-pointer">Log In</a>
            <a href="/dashboard" className="text-sm font-bold bg-white text-black px-6 py-2.5 rounded-full hover:bg-gray-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] cursor-pointer">
              Launch Console
            </a>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <main className="relative pt-40 pb-32 min-h-screen flex items-center justify-center overflow-hidden">
        {/* Massive Background Glowing Orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-[#00F0FF] to-blue-900 opacity-20 blur-[150px] animate-[spin_15s_linear_infinite] pointer-events-none"></div>

        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="hero-anim inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#00F0FF]/30 bg-[#00F0FF]/10 text-[#00F0FF] text-xs font-mono uppercase tracking-wider mb-8">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-pulse"></span>
            V1.0 Deployed & Live
          </div>
          
          <h1 className="hero-anim text-6xl md:text-8xl font-extrabold tracking-tighter leading-[1.05] mb-8">
            The Deterministic <br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Multi-Agent OS.</span>
          </h1>
          
          <p className="hero-anim text-lg md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 font-light leading-relaxed">
            Design, deploy, and scale infinite autonomous swarms. No hallucinations. Absolute cryptographic certainty. Replace legacy software with intelligent infrastructure.
          </p>
          
          <div className="hero-anim flex flex-col sm:flex-row items-center justify-center gap-6">
            <a href="/dashboard" className="bg-[#00F0FF] hover:bg-[#00d0dd] text-black px-10 py-4 rounded-full font-bold text-lg transition-all shadow-[0_0_40px_rgba(0,240,255,0.4)] hover:shadow-[0_0_60px_rgba(0,240,255,0.6)] cursor-pointer">
              Enter Workspace
            </a>
            <a href="#scroll-sequence" className="text-white px-10 py-4 rounded-full font-semibold text-lg border border-white/20 hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer">
              Watch Demo
            </a>
          </div>
        </div>
      </main>

      {/* DASHBOARD PREVIEW IMAGE */}
      <section className="relative z-20 -mt-20 pb-32 px-6 max-w-7xl mx-auto">
        <div className="hero-anim rounded-2xl border border-white/10 p-2 bg-white/5 backdrop-blur-md shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="rounded-xl overflow-hidden bg-[#0A0A0F] border border-white/5 relative aspect-video flex flex-col">
                <div className="h-10 bg-white/5 border-b border-white/5 flex items-center px-4 gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div><div className="w-3 h-3 rounded-full bg-yellow-500"></div><div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <div className="mx-auto text-xs text-gray-500 font-mono tracking-widest">SYNAPSE WORKSPACE</div>
                </div>
                {/* CSS Mockup of Canvas */}
                <div className="flex-1 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] relative overflow-hidden">
                    <div className="absolute top-20 left-32 w-64 p-4 rounded-xl border border-[#00F0FF]/50 bg-[#00F0FF]/10 shadow-[0_0_30px_rgba(0,240,255,0.2)] backdrop-blur-md">
                        <div className="flex items-center gap-3 mb-2"><div className="w-3 h-3 rounded-full bg-[#00F0FF] animate-pulse"></div><span className="font-bold">Main Routing Agent</span></div>
                        <div className="text-xs text-gray-400 font-mono">Status: Processing 3 streams</div>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* PINNED SCROLL SEQUENCE (PRODUCT DEMO) */}
      <section id="scroll-sequence" className="relative max-w-7xl mx-auto px-6 py-32 flex gap-16 items-start">
        {/* Left Side: Text Blocks */}
        <div className="w-1/2 pb-[50vh]">
          <div className="text-step h-screen flex flex-col justify-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#00F0FF]">Infinite Swarm Workspace</h2>
            <p className="text-xl text-gray-400 leading-relaxed">Drag and drop intelligent agents onto a spatial HTML5 canvas. Visually wire ingestion nodes directly into specialized Mixture-of-Expert (MoE) models to orchestrate complex tasks.</p>
          </div>
          <div className="text-step h-screen flex flex-col justify-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#00F0FF]">Forensic Lineage</h2>
            <p className="text-xl text-gray-400 leading-relaxed">Cryptographic transparency. Click any agent output to trace its exact lineage back to vector memories, source URLs, or specific prompt constraints.</p>
          </div>
          <div className="text-step h-screen flex flex-col justify-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-[#00F0FF]">Durable Execution</h2>
            <p className="text-xl text-gray-400 leading-relaxed">Powered by Inngest. Tasks survive serverless timeouts. Fan-out execution with automatic retries, guardrails, and pause/resume logic.</p>
          </div>
        </div>

        {/* Right Side: Pinned Visuals */}
        <div className="right-visuals w-1/2 h-[80vh] top-[10vh] relative hidden md:block">
          <div className="w-full h-full rounded-2xl border border-white/10 bg-[#0A0A0F] shadow-[0_0_50px_rgba(0,240,255,0.1)] overflow-hidden relative">
            {/* Visual 0 */}
            <div className="mockup-0 absolute inset-0 bg-[#0A0A0F] p-8 opacity-0">
               <div className="w-full h-full border border-[#00F0FF]/30 rounded-xl flex items-center justify-center flex-col gap-4">
                  <div className="w-20 h-20 rounded-full bg-[#00F0FF]/20 flex items-center justify-center"><span className="text-3xl">🤖</span></div>
                  <h3 className="text-xl font-bold text-white">Agent Topology Active</h3>
               </div>
            </div>
            {/* Visual 1 */}
            <div className="mockup-1 absolute inset-0 bg-[#0A0A0F] p-8 opacity-0">
               <div className="w-full h-full border border-purple-500/30 rounded-xl flex items-center justify-center flex-col gap-4">
                  <div className="w-20 h-20 rounded-full bg-purple-500/20 flex items-center justify-center"><span className="text-3xl">🔎</span></div>
                  <h3 className="text-xl font-bold text-white">Audit Trail Verified</h3>
               </div>
            </div>
            {/* Visual 2 */}
            <div className="mockup-2 absolute inset-0 bg-[#0A0A0F] p-8 opacity-0">
               <div className="w-full h-full border border-green-500/30 rounded-xl flex items-center justify-center flex-col gap-4">
                  <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"><span className="text-3xl">⚡</span></div>
                  <h3 className="text-xl font-bold text-white">Durable State Secured</h3>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 bg-[#020204] py-16 relative overflow-hidden mt-20">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[300px] bg-[#00F0FF]/5 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-[radial-gradient(circle_at_30%_30%,#00F0FF,#001A88)]"></div>
                <span className="text-xl font-bold tracking-widest text-white">SYNAPSE</span>
            </div>
            <div className="flex gap-8 text-sm font-medium text-gray-500">
                <a href="#" className="hover:text-white transition-colors">Privacy</a>
                <a href="#" className="hover:text-white transition-colors">Terms</a>
                <a href="#" className="hover:text-white transition-colors">System Status</a>
            </div>
            <div className="text-sm text-gray-600 font-mono tracking-widest uppercase">
                Engineered for the Enterprise
            </div>
        </div>
      </footer>

    </div>
  );
}
