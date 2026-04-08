import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const SLIDES = [
  {
    id: 0,
    label: 'Smart Fitting',
    tagline: 'Perfect size, every time',
    overlayClass: 'bg-violet-950/55',
    glowColor: 'rgba(139,92,246,0.55)',
    accentColor: '#8b5cf6',
  },
  {
    id: 1,
    label: 'Virtual Try-On',
    tagline: 'See yourself in any style',
    overlayClass: '',
    glowColor: 'rgba(217,70,239,0.65)',
    accentColor: '#d946ef',
  },
  {
    id: 2,
    label: 'AI Powered',
    tagline: 'Neural fashion intelligence',
    overlayClass: 'bg-rose-950/45',
    glowColor: 'rgba(244,63,94,0.55)',
    accentColor: '#f43f5e',
  },
];

const TOTAL = SLIDES.length;

function getCardStyle(index: number, active: number) {
  const diff = (index - active + TOTAL) % TOTAL;

  if (diff === 0) {
    // Center — front and center
    return {
      transform: 'perspective(1100px) rotateY(0deg) translateX(0px) translateZ(0px) scale(1)',
      zIndex: 20,
      opacity: 1,
      pointerEvents: 'none' as const,
    };
  }
  if (diff === 1) {
    // Right card
    return {
      transform: 'perspective(1100px) rotateY(-48deg) translateX(72%) translateZ(-80px) scale(0.82)',
      zIndex: 10,
      opacity: 0.72,
      pointerEvents: 'auto' as const,
    };
  }
  // Left card (diff === TOTAL - 1 === 2)
  return {
    transform: 'perspective(1100px) rotateY(48deg) translateX(-72%) translateZ(-80px) scale(0.82)',
    zIndex: 10,
    opacity: 0.72,
    pointerEvents: 'auto' as const,
  };
}

const LandingPage: React.FC = () => {
  const [active, setActive] = useState(1);
  const [paused, setPaused] = useState(false);

  const next = useCallback(() => setActive(p => (p + 1) % TOTAL), []);
  const prev = useCallback(() => setActive(p => (p - 1 + TOTAL) % TOTAL), []);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 3800);
    return () => clearInterval(t);
  }, [paused, next]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden select-none"
      style={{ background: 'linear-gradient(160deg, #08080f 0%, #0d0818 50%, #090912 100%)' }}
    >
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] opacity-30"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.35) 0%, transparent 70%)' }}
        />
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[300px] opacity-20"
          style={{ background: 'radial-gradient(ellipse, rgba(244,114,182,0.4) 0%, transparent 70%)' }}
        />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] opacity-15"
          style={{ background: 'radial-gradient(ellipse, rgba(217,70,239,0.3) 0%, transparent 70%)' }}
        />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Logo top-left */}
      <div className="absolute top-6 left-6 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #d946ef, #f472b6)' }}
          >
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-black text-lg tracking-tight">
            Try<span className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #d946ef, #f472b6)' }}>And</span>Buy
          </span>
        </div>
      </div>

      {/* Sign in top-right */}
      <div className="absolute top-6 right-6 z-30">
        <Link to="/login"
          className="text-sm font-bold text-white/50 hover:text-white/80 transition-colors tracking-wider uppercase"
        >
          Sign In
        </Link>
      </div>

      {/* ── Headline ── */}
      <motion.div
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative z-20 text-center mb-10 px-4"
      >
     

        <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-black text-white leading-[1.0] tracking-tight">
          Try Before<br />
          <span className="text-transparent bg-clip-text"
            style={{ backgroundImage: 'linear-gradient(135deg, #c084fc 0%, #e879f9 40%, #f472b6 100%)' }}
          >
            You Buy
          </span>
        </h1>

        <p className="mt-5 text-white/45 text-base sm:text-lg max-w-md mx-auto leading-relaxed font-medium">
          Upload your photo. Pick any garment.&nbsp;
          Our AI places it on you in seconds.
        </p>
      </motion.div>

      {/* ── 3D Carousel ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.15, ease: 'easeOut' }}
        className="relative z-10 flex items-center justify-center"
        style={{ width: '100%', height: '520px' }}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {SLIDES.map((slide, index) => {
          const style = getCardStyle(index, active);
          const isActive = index === active;

          return (
            <div
              key={slide.id}
              onClick={() => !isActive && setActive(index)}
              className="absolute"
              style={{
                ...style,
                width: '340px',
                height: '480px',
                transition: 'all 0.65s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                cursor: isActive ? 'default' : 'pointer',
              }}
            >
              {/* Card glow behind */}
              {isActive && (
                <div
                  className="absolute -inset-5 -z-10 rounded-[2.5rem] blur-2xl"
                  style={{ background: `radial-gradient(ellipse, ${slide.glowColor} 0%, transparent 70%)` }}
                />
              )}

              {/* Card body */}
              <div className="relative w-full h-full rounded-[1.75rem] overflow-hidden border"
                style={{
                  borderColor: isActive ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.07)',
                  boxShadow: isActive
                    ? `0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)`
                    : `0 16px 40px rgba(0,0,0,0.5)`,
                }}
              >
                {/* Fashion image */}
                <img
                  src="/fashion_tryon_hero_1774032392003.png"
                  alt="Virtual Try-On"
                  className="w-full h-full object-cover object-top"
                  draggable={false}
                />

                {/* Color overlay per slide */}
                {slide.overlayClass && (
                  <div className={`absolute inset-0 ${slide.overlayClass}`} />
                )}

                {/* Bottom gradient */}
                <div className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)' }}
                />

                {/* Card label */}
                <div className="absolute bottom-5 left-5 right-5">
                  {isActive && (
                    <div className="flex items-center gap-1.5 mb-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-white/60 text-[10px] font-bold uppercase tracking-[0.2em]">
                        Live Preview
                      </span>
                    </div>
                  )}
                  <p className="text-white text-xs font-bold uppercase tracking-[0.18em] opacity-60 mb-1">
                    {slide.label}
                  </p>
                  <p className="text-white font-black text-xl leading-tight">
                    {slide.tagline}
                  </p>
                </div>

                {/* Active — scanning line */}
                {isActive && (
                  <motion.div
                    initial={{ top: '0%' }}
                    animate={{ top: '100%' }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'linear' }}
                    className="absolute left-0 w-full h-[2px] z-10"
                    style={{
                      background: `linear-gradient(90deg, transparent, ${slide.accentColor}80, transparent)`,
                    }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* ── Dots + Arrows ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-20 flex items-center gap-5 mt-6"
      >
        <button
          onClick={prev}
          className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === active ? '28px' : '8px',
                height: '8px',
                background: i === active
                  ? 'linear-gradient(90deg, #c084fc, #f472b6)'
                  : 'rgba(255,255,255,0.2)',
              }}
            />
          ))}
        </div>

        <button
          onClick={next}
          className="w-9 h-9 rounded-full flex items-center justify-center border transition-all duration-200 hover:scale-110 active:scale-95"
          style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </motion.div>

      {/* ── CTA Buttons ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="relative z-20 flex flex-col sm:flex-row items-center gap-4 mt-10 px-4"
      >
        <Link
          to="/signup"
          className="group flex items-center justify-center gap-2.5 px-9 py-4 rounded-2xl font-black text-white text-base transition-all duration-300 hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #c084fc 0%, #d946ef 50%, #f472b6 100%)',
            boxShadow: '0 0 40px rgba(217,70,239,0.45), 0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          Get Started Free
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to="/login"
          className="flex items-center justify-center px-9 py-4 rounded-2xl font-bold text-white/70 text-base border transition-all duration-300 hover:scale-105 active:scale-95 hover:text-white"
          style={{
            borderColor: 'rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.04)',
            backdropFilter: 'blur(8px)',
          }}
        >
          Sign In
        </Link>
      </motion.div>

      {/* Fine print */}
      
    </div>
  );
};

export default LandingPage;
