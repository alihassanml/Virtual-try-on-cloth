import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Scissors, User as UserIcon, LogOut } from 'lucide-react';

const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed w-full z-50 top-6 left-0 right-0 pointer-events-none px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto pointer-events-auto bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.05)] border border-white/20">
        <div className="flex justify-between items-center h-16 px-6 sm:px-8">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-2 rounded-xl text-primary shadow-inner">
              <Scissors className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </div>
            <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 tracking-tight">
              Try<span className="text-primary">And</span>Buy
            </span>
          </Link>

          {/* Auth/Profile Actions */}
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <div className="flex items-center gap-6">
                <Link to="/dashboard" className="text-slate-500 hover:text-primary text-sm font-bold uppercase tracking-widest transition-all">
                  Dashboard
                </Link>
                <div className="h-4 w-px bg-slate-200 hidden sm:block"></div>
                
                <div className="flex items-center gap-3">
                  
                  <button 
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all border border-transparent hover:border-red-100 shadow-sm"
                    title="Logout"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link 
                  to="/login" 
                  className="text-xs font-black uppercase tracking-widest text-slate-500 hover:text-primary transition-all hidden sm:block"
                >
                  Log in
                </Link>
                <Link 
                  to="/signup" 
                  className="premium-button text-xs !px-6 !py-2.5 !rounded-full shadow-lg hover:shadow-primary/20"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;
