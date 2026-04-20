import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { Loader2, ArrowRight, RotateCcw } from 'lucide-react';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError]   = useState('');
  const [isLoading, setIsLoading]   = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const { login } = useAuth();
  const navigate  = useNavigate();

  // Redirect if no email param
  useEffect(() => {
    if (!email) navigate('/signup');
  }, [email, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const handleDigitChange = (idx: number, val: string) => {
    const char = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = char;
    setDigits(next);
    setError('');
    if (char && idx < 5) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) {
      setError('Please enter the full 6-digit code.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const res = await api.post('/verify-email', { email, code });
      login(res.data.name, res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed. Try again.');
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setIsResending(true);
    try {
      await api.post('/resend-code', { email });
      setResendCooldown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to resend code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#08080f' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="/fashion_tryon_hero_1774032392003.png"
          alt="Fashion"
          className="absolute inset-0 w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(135deg,rgba(8,8,15,0.5) 0%,rgba(139,92,246,0.35) 50%,rgba(217,70,239,0.2) 100%)' }}
        />
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(to right,transparent 60%,#08080f 100%)' }}
        />
        <div className="absolute top-8 left-8 flex items-center gap-2.5">
          <span className="text-white font-black text-xl tracking-tight">
            Try<span className="text-transparent bg-clip-text"
              style={{ backgroundImage: 'linear-gradient(135deg,#d946ef,#f472b6)' }}>And</span>Buy
          </span>
        </div>
        <div className="absolute bottom-12 left-8 right-8">
          <p className="text-white/80 text-2xl font-black leading-snug mb-3">
            "One step away<br />from your wardrobe."
          </p>
          <p className="text-white/40 text-sm font-medium tracking-wider uppercase">
            Verify · Explore · Transform
          </p>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 sm:px-12 py-12 relative">
        {/* Glow */}
        <div className="absolute top-1/4 right-0 w-80 h-80 opacity-20 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse,rgba(139,92,246,0.5) 0%,transparent 70%)' }} />

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10 self-start">
          
          <span className="text-white font-black text-lg">TryAndBuy</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-sm relative z-10"
        >
          {/* Icon */}
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8 mx-auto"
            style={{ background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.3)' }}>
            <span className="text-2xl">✉️</span>
          </div>

          <div className="mb-8 text-center">
            <h1 className="text-3xl font-black text-white mb-2 tracking-tight">Check your email</h1>
            <p className="text-white/40 font-medium text-sm leading-relaxed">
              We sent a 6-digit code to<br />
              <span className="text-white/70 font-bold">{email}</span>
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold flex items-center gap-2.5"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#fca5a5' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse flex-shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            {/* 6-digit code boxes */}
            <div className="flex gap-2.5 justify-center mb-8" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  className="w-12 h-14 text-center text-xl font-black rounded-xl outline-none transition-all"
                  style={{
                    background: d ? 'rgba(217,70,239,0.12)' : 'rgba(255,255,255,0.05)',
                    border: d ? '1.5px solid rgba(217,70,239,0.6)' : '1.5px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    caretColor: '#d946ef',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.border = '1.5px solid rgba(217,70,239,0.6)';
                    e.currentTarget.style.background = 'rgba(217,70,239,0.1)';
                  }}
                  onBlur={e => {
                    if (!d) {
                      e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.1)';
                      e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                    }
                  }}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={isLoading || digits.join('').length < 6}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-white text-sm transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
              style={{
                background: 'linear-gradient(135deg,#c084fc 0%,#d946ef 50%,#f472b6 100%)',
                boxShadow: '0 0 32px rgba(217,70,239,0.35)',
              }}
            >
              {isLoading
                ? <Loader2 className="w-5 h-5 animate-spin" />
                : <><span>Verify Account</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
            <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.25)' }}>
              Didn't receive it?
            </span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.07)' }} />
          </div>

          <button
            onClick={handleResend}
            disabled={isResending || resendCooldown > 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all duration-300 disabled:opacity-40"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }}
          >
            {isResending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RotateCcw className="w-4 h-4" />
            }
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : 'Resend Code'
            }
          </button>

          <p className="text-center mt-5">
            <Link to="/signup"
              className="text-xs font-medium transition-colors"
              style={{ color: 'rgba(255,255,255,0.2)' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.2)')}
            >
              ← Wrong email? Sign up again
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
