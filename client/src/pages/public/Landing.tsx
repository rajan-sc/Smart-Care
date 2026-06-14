import React from 'react';
import { Link } from 'react-router-dom';

// ─── ECG Line — the signature element ────────────────────────────────────────
// Draws itself on load. Encodes what Smart Care does: real-time monitoring.
const ECGLine: React.FC = () => (
  <div className="w-full" aria-hidden="true">
    <svg viewBox="0 0 900 120" fill="none" xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto" style={{ overflow: 'visible' }}>
      {/* Flat baseline → ECG spike → flat again → repeat */}
      <path
        className="ecg-line"
        d="M0,60 L120,60 L140,60 L155,20 L165,95 L178,10 L192,90 L205,60 L340,60
           L360,60 L375,20 L385,95 L398,10 L412,90 L425,60 L560,60
           L580,60 L595,20 L605,95 L618,10 L632,90 L645,60 L900,60"
        stroke="url(#ecgGradient)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        style={{ strokeDasharray: 1200, strokeDashoffset: 1200,
          animation: 'ecg-draw 2.4s cubic-bezier(0.4,0,0.2,1) forwards' }}
      />
      {/* Trailing pulse dot */}
      <circle r="3" fill="#0f3e17" opacity="0.8"
        style={{ animation: 'ecg-draw 2.4s cubic-bezier(0.4,0,0.2,1) forwards',
          offsetPath: 'path("M0,60 L120,60 L140,60 L155,20 L165,95 L178,10 L192,90 L205,60 L340,60 L360,60 L375,20 L385,95 L398,10 L412,90 L425,60 L560,60 L580,60 L595,20 L605,95 L618,10 L632,90 L645,60 L900,60")',
          offsetDistance: '100%' } as React.CSSProperties}
      />
      <defs>
        <linearGradient id="ecgGradient" x1="0" y1="0" x2="900" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0f3e17" stopOpacity="0.1" />
          <stop offset="40%" stopColor="#0f3e17" stopOpacity="0.5" />
          <stop offset="80%" stopColor="#0f3e17" stopOpacity="1" />
          <stop offset="100%" stopColor="#0f3e17" stopOpacity="1" />
        </linearGradient>
      </defs>
    </svg>
  </div>
);



// ─── Landing Page ─────────────────────────────────────────────────────────────
export const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-linen-white">

      {/* ── HEADER ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-linen-white/90 backdrop-blur-md border-b border-hairline-gray">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-nav bg-mist-blue flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-forest-ink" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
              </svg>
            </div>
            <span className="font-bold tracking-tight text-forest-ink">Smart Care</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-ease-body-sm font-semibold text-charcoal tracking-wide">
            <a href="#features" className="hover:text-forest-ink transition-colors uppercase">Features</a>
            <Link to="/doctors" className="hover:text-forest-ink transition-colors uppercase">Find a doctor</Link>
            <a href="#how-it-works" className="hover:text-forest-ink transition-colors uppercase">How it works</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link to="/login"
              className="text-ease-body-sm font-semibold text-charcoal hover:text-forest-ink transition-colors uppercase tracking-wide">
              Log in
            </Link>
            <Link to="/register"
              className="btn-primary py-2 px-4 rounded-nav uppercase tracking-widest text-xs">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section className="pt-24 pb-16 px-6">
          <div className="max-w-4xl mx-auto flex flex-col items-center text-center">

            {/* Headline — large serif, the one moment we spend typographic boldness */}
            <h1 className="font-display text-6xl md:text-7xl lg:text-[90px] font-semibold tracking-tighter
              text-forest-ink leading-[1.05] mb-8 animate-fade-in animate-delay-75">
              Healthcare that<br />
              <span className="text-forest-ink opacity-60">works for you.</span>
            </h1>

            <p className="text-xl md:text-2xl text-charcoal leading-relaxed max-w-2xl mb-12 animate-fade-in animate-delay-150">
              Connect with specialists, track vitals in real time, and manage medications without friction. Built for patients, doctors, and caregivers.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4 animate-fade-in animate-delay-300 w-full sm:w-auto">
              <Link to="/register"
                className="btn-primary text-center py-4 px-10 text-base rounded-full hover:scale-[0.98] transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                Create a free account
              </Link>
              <Link to="/doctors"
                className="px-10 py-4 rounded-full text-sm font-bold text-charcoal uppercase tracking-widest
                  bg-linen-white border border-hairline-gray hover:bg-mist-blue/30 hover:border-mist-blue
                  transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] text-center">
                Browse doctors
              </Link>
            </div>

            {/* ECG — the signature element, drawn on page load */}
            <div className="mt-20 w-full max-w-3xl animate-fade-in animate-delay-500">
              <ECGLine />
            </div>
            <p className="font-mono text-xs text-center text-charcoal opacity-60">
              Real-time vitals monitoring
            </p>
          </div>
        </section>

        {/* ── FEATURES — BENTO GRID ────── */}
        <section id="features" className="py-20 px-6 bg-linen border-y border-hairline-gray">
          <div className="max-w-6xl mx-auto">
            <div className="mb-14 text-center flex flex-col items-center">
              <h2 className="font-display text-5xl md:text-6xl font-semibold tracking-tighter text-true-black mb-4">
                Every tool you need.
              </h2>
              <p className="text-charcoal text-xl max-w-2xl leading-relaxed">
                One platform for the full care journey — designed around the people, not the system.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {/* Card 1: Vitals (Col-Span-2) */}
              <div className="md:col-span-2 bg-linen-white p-8 md:p-12 rounded-[2rem] border border-hairline-gray relative overflow-hidden group hover:border-forest-ink transition-colors duration-500 flex flex-col justify-between min-h-[320px]">
                <div className="z-10 max-w-sm">
                  <h3 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-true-black mb-4 group-hover:translate-x-2 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                    Real-time Vitals Tracking
                  </h3>
                  <p className="text-charcoal text-lg leading-relaxed">
                    Log blood pressure, glucose, and weight. See trends instantly — share with your doctor before your next visit.
                  </p>
                </div>
                {/* Abstract Sparkline */}
                <svg className="absolute bottom-[-10%] right-[-10%] w-[80%] md:w-[60%] h-auto text-forest-ink opacity-20 group-hover:opacity-100 group-hover:-translate-y-4 group-hover:-translate-x-4 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]" viewBox="0 0 200 100" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M0,80 Q20,60 40,70 T80,50 T120,80 T160,30 T200,20" />
                  <path d="M0,80 Q20,60 40,70 T80,50 T120,80 T160,30 T200,20 L200,100 L0,100 Z" fill="currentColor" opacity="0.1" stroke="none" />
                </svg>
              </div>

              {/* Card 2: Medications (Col-Span-1) */}
              <div className="md:col-span-1 bg-[#d6dfd3] p-8 md:p-12 rounded-[2rem] border border-hairline-gray relative overflow-hidden group hover:border-forest-ink transition-colors duration-500 flex flex-col min-h-[320px]">
                <div className="mb-auto z-10">
                  <h3 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-true-black mb-4 group-hover:translate-x-2 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                    Medication Reminders
                  </h3>
                  <p className="text-charcoal text-lg leading-relaxed">
                    Never miss a dose. Build adherence streaks in one tap.
                  </p>
                </div>
                {/* Streak Badge */}
                <div className="mt-8 self-start inline-flex items-center gap-2 bg-linen-white border border-forest-ink/20 px-5 py-2.5 rounded-full shadow-sm group-hover:scale-105 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] z-10">
                  <span className="w-2.5 h-2.5 rounded-full bg-forest-ink opacity-80"></span>
                  <span className="text-sm font-bold text-forest-ink tracking-wide">7-Day Streak</span>
                </div>
              </div>

              {/* Card 3: Clinic Queue (Col-Span-1) */}
              <div className="md:col-span-1 bg-[#d6dfd3] p-8 md:p-12 rounded-[2rem] border border-hairline-gray relative overflow-hidden group hover:border-forest-ink transition-colors duration-500 flex flex-col min-h-[320px]">
                <div className="mb-auto z-10">
                  <h3 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-true-black mb-4 group-hover:translate-x-2 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                    Live Clinic Queue
                  </h3>
                  <p className="text-charcoal text-lg leading-relaxed">
                    See your position in line from your phone. No waiting room anxiety.
                  </p>
                </div>
                {/* Live Status Indicator */}
                <div className="mt-8 self-start inline-flex items-center gap-2.5 bg-mist-blue px-5 py-2.5 rounded-full border border-mist-blue group-hover:border-forest-ink/20 transition-colors duration-500 z-10">
                  <span className="relative flex h-3 w-3">
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-forest-ink"></span>
                  </span>
                  <span className="text-sm font-bold text-forest-ink tracking-wide">Live Updates</span>
                </div>
              </div>

              {/* Card 4: Caregiver Access (Col-Span-2) */}
              <div className="md:col-span-2 bg-mist-blue/80 p-8 md:p-12 rounded-[2rem] border border-hairline-gray relative overflow-hidden group hover:border-forest-ink transition-colors duration-500 flex flex-col justify-between min-h-[320px]">
                <div className="z-10 max-w-md mb-auto">
                  <h3 className="text-3xl md:text-4xl font-display font-semibold tracking-tight text-true-black mb-4 group-hover:translate-x-2 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]">
                    Caregiver Access
                  </h3>
                  <p className="text-charcoal text-lg leading-relaxed">
                    Securely share your health data with a family member or caregiver. They see exactly what they need to help — nothing more.
                  </p>
                </div>
                {/* Avatar Stack */}
                <div className="absolute bottom-8 right-8 flex -space-x-4 group-hover:space-x-2 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]">
                  {/* Male Silhouette */}
                  <div className="w-16 h-16 rounded-full bg-linen border-[3px] border-linen-white flex items-center justify-center text-forest-ink shadow-sm z-30">
                    <svg className="w-8 h-8 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  {/* Woman Silhouette (Softer features) */}
                  <div className="w-16 h-16 rounded-full bg-mint-veil border-[3px] border-linen-white flex items-center justify-center text-forest-ink shadow-sm z-20">
                    <svg className="w-8 h-8 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                  {/* Child Silhouette (Smaller proportions) */}
                  <div className="w-16 h-16 rounded-full bg-[#d6dfd3] border-[3px] border-linen-white flex items-center justify-center text-forest-ink shadow-sm z-10">
                    <svg className="w-5 h-5 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS & CTA ───────────────────────────────────────────── */}
        <section id="how-it-works" className="py-32 px-6 bg-mist-blue/30">
          <div className="max-w-4xl mx-auto text-center flex flex-col items-center">
            <h2 className="font-display text-5xl md:text-7xl font-semibold tracking-tighter text-forest-ink mb-10 leading-[1.1]">
              You record.<br />We track.<br />They treat.
            </h2>

            {/* Prominent ECG Pulse */}
            <div className="text-forest-ink opacity-40 mb-12 w-full" style={{ maxWidth: 400 }}>
              <ECGLine />
            </div>

            <p className="text-xl md:text-2xl mb-12 max-w-2xl mx-auto text-charcoal leading-relaxed font-light">
              Smart Care bridges the gap between clinic visits. Log your daily vitals. Keep your medication streaks. Let your doctor see the full picture, not just a snapshot.
            </p>
            <Link to="/register"
              className="btn-primary inline-flex items-center gap-2 px-8 py-4 text-sm hover:-translate-y-0.5">
              Create your free account
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </section>
      </main>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="bg-linen-white border-t border-hairline-gray">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-nav bg-mist-blue flex items-center justify-center">
                  <svg className="w-4 h-4 text-forest-ink" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                  </svg>
                </div>
                <span className="font-bold text-forest-ink">Smart Care</span>
              </div>
              <p className="text-ease-body-sm max-w-xs leading-relaxed text-charcoal">
                Making healthcare accessible, transparent, and seamless for everyone.
              </p>
            </div>
            <div>
              <h4 className="text-forest-ink text-xs font-bold uppercase tracking-widest mb-4">Product</h4>
              <ul className="space-y-2.5 text-ease-body-sm text-charcoal">
                <li><Link to="/doctors" className="hover:text-forest-ink transition-colors">Find a doctor</Link></li>
                <li><a href="#features" className="hover:text-forest-ink transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-forest-ink transition-colors">For providers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-forest-ink text-xs font-bold uppercase tracking-widest mb-4">Legal</h4>
              <ul className="space-y-2.5 text-ease-body-sm text-charcoal">
                <li><a href="#" className="hover:text-forest-ink transition-colors">Privacy policy</a></li>
                <li><a href="#" className="hover:text-forest-ink transition-colors">Terms of service</a></li>
                <li><a href="#" className="hover:text-forest-ink transition-colors">HIPAA compliance</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-8 text-xs text-center border-t border-hairline-gray text-charcoal font-mono">
            © {new Date().getFullYear()} Smart Care Technologies. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
