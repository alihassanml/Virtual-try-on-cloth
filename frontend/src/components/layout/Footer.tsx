import React from 'react';
import { Scissors, Github, Twitter, Linkedin } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-100 bg-[#fdfaff] py-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
          
          {/* Brand and Catchphrase */}
          <div className="flex flex-col items-center lg:items-start gap-4 flex-1">
            <Link to="/" className="flex items-center gap-2">
              <div className="bg-primary/10 p-2 rounded-xl text-primary shadow-sm">
                <Scissors className="w-4 h-4" />
              </div>
              <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">
                Try<span className="text-primary">And</span>Buy
              </span>
            </Link>
            <p className="text-slate-400 text-xs font-medium max-w-[280px] text-center lg:text-left leading-relaxed">
              Redefining online fashion through AI-driven neural rendering.
            </p>
          </div>

          {/* Quick Links Group */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Link to="/dashboard" className="hover:text-primary transition-all">Virtual Studio</Link>
            <Link to="/" className="hover:text-primary transition-all">Support</Link>
            <Link to="/" className="hover:text-primary transition-all">Privacy</Link>
            <Link to="/" className="hover:text-primary transition-all">Terms</Link>
          </div>

          {/* Socials & Group Information */}
          <div className="flex flex-col items-center lg:items-end gap-5 flex-1">
             <div className="flex gap-5">
                <a href="#" className="text-slate-400 hover:text-primary transition-all duration-300">
                  <Twitter className="w-4 h-4" />
                </a>
                <a href="#" className="text-slate-400 hover:text-primary transition-all duration-300">
                  <Github className="w-4 h-4" />
                </a>
                <a href="#" className="text-slate-400 hover:text-primary transition-all duration-300">
                  <Linkedin className="w-4 h-4" />
                </a>
             </div>
             <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-300">
                <span>© 2026 TECHNOLOGY GROUP</span>
                <div className="w-1 h-1 rounded-full bg-primary/30"></div>
                <span>POWERED BY LGU</span>
             </div>
          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;
