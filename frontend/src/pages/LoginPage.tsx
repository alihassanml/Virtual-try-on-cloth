import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { motion } from 'framer-motion';
import { Mail, Lock, Loader2, ArrowRight, Sparkles } from 'lucide-react';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await api.post('/login', { email, password });
      login(response.data.name, response.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden"
      style={{ background: '#08080f' }}
    >
      {/* ── Left panel: fashion image ── */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="/fashion_tryon_hero_1774032392003.png"
          alt="Virtual Try-On"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg, rgba(8,8,15,0.55) 0%, rgba(139,92,246,0.35) 50%, rgba(217,70,239,0.25) 100%)' }}
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right, transparent 60%, #08080f 100%)' }}
        />

        {/* Brand */}
        <div className="absolute top-8 left-8 flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #d946ef, #f472b6)' }}
          >
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="text-white font-black text-xl tracking-tight">
            Try<span className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg, #d946ef, #f472b6)' }}>And</span>Buy
          </span>
        </div>

        {/* Quote */}
        <div className="absolute bottom-12 left-8 right-8">
          <p className="text-white/80 text-2xl font-black leading-snug mb-3">
            "Style is a way to say<br />who you are."
          </p>
          <p className="text-white/40 text-sm font-medium tracking-wider uppercase">
            Virtual Try-On · AI Powered · FYP
          </p>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="flex-1 lg:w-1/2 flex flex-col items-center justify-center px-6 sm:px-12 py-12 relative">
        {/* Ambient glow */}
        <div className="absolute top-1/4 right-0 w-80 h-80 opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(217,70,239,0.5) 0%, transparent 70%)' }}
        />
        <div className="absolute bottom-1/4 left-0 w-64 h-64 opacity-15 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, rgba(139,92,246,0.4) 0%, transparent 70%)' }}
        />

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10 self-start">
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

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Welcome back</h1>
            <p className="text-white/40 font-medium">
              Sign in to your fitting room
            </p>
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-6 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2.5"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              {error}
            </motion.div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.9)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)';
                    e.currentTarget.style.background = 'rgba(217,70,239,0.06)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl py-3.5 pl-11 pr-4 text-sm font-medium outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.9)',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.border = '1px solid rgba(217,70,239,0.5)';
                    e.currentTarget.style.background = 'rgba(217,70,239,0.06)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-white text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none mt-2"
              style={{
                background: 'linear-gradient(135deg, #c084fc 0%, #d946ef 50%, #f472b6 100%)',
                boxShadow: '0 0 32px rgba(217,70,239,0.4), 0 4px 16px rgba(0,0,0,0.3)',
              }}
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>OR</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <p className="text-center text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            New here?{' '}
            <Link to="/signup"
              className="font-bold transition-colors hover:opacity-100"
              style={{ color: '#d946ef' }}
            >
              Create an account
            </Link>
          </p>

          <p className="text-center mt-4">
            <Link to="/"
              className="text-xs font-medium transition-colors"
              style={{ color: 'rgba(255,255,255,0.2)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
            >
              ← Back to home
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default LoginPage;
