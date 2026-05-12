import React from 'react';
import { Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  ArrowRight, 
  Activity, 
  AlertCircle, 
  ScanLine, 
  CloudLightning
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 md:px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-primary font-bold text-xl md:text-2xl">
          <ShieldCheck className="w-8 h-8" />
          <span>MediGuard AI</span>
        </div>
        <div className="flex items-center gap-4 md:gap-8">
          <Link to="/auth" className="text-slate-600 font-medium hover:text-primary transition-colors text-sm md:text-base">Login</Link>
          <Link to="/auth" className="bg-primary text-white px-4 py-2 md:px-6 md:py-2.5 rounded-full font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all text-sm md:text-base">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 md:px-8 pt-10 md:pt-20 pb-20 md:pb-32 max-w-7xl mx-auto overflow-hidden">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center lg:text-left"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-slate-900 mb-6 px-2 lg:px-0">
              Your Personalized <span className="text-primary">AI Healthcare</span> Shield
            </h1>
            <p className="text-base md:text-lg lg:text-xl text-slate-500 mb-10 leading-relaxed max-w-lg mx-auto lg:mx-0">
              Manage prescriptions, detect medicine conflicts, and secure your medical history with world-class AI safety checks.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link to="/dashboard" className="bg-primary text-white px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-xl shadow-primary/20">
                Go to Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white border border-slate-200 text-slate-700 px-8 py-4 rounded-full font-bold hover:bg-slate-50 transition-colors"
              >
                How it works
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1 }}
            className="relative hidden sm:block"
          >
            <div className="bg-white border border-slate-200 p-8 shadow-xl rounded-2xl relative">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Drug Conflict Detected!</h3>
                    <p className="text-sm text-slate-500">Ibuprofen + Warfarin</p>
                  </div>
                </div>
                <div className="px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold uppercase">
                  Critical
                </div>
              </div>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 flex items-center gap-4 mb-4">
                <Activity className="w-10 h-10 text-primary" />
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="w-3/4 h-full bg-primary" />
                </div>
              </div>
              <p className="text-sm text-slate-400 italic">"Checking your heart rate and medical alerts..."</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-slate-50 py-20 md:py-32 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20">
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4 px-4">Everything You Need To Stay Safe</h2>
            <p className="text-sm md:text-base text-slate-500 max-w-2xl mx-auto px-4">MediGuard uses advanced machine learning to analyze your medical history and keep your health journey on track.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {[
              { icon: ScanLine, title: "OCR Upload", desc: "Just snap a photo of your prescription and let our AI extract the medicines automatically." },
              { icon: ShieldCheck, title: "Conflict Detection", desc: "Instantly check if your new medications conflict with existing conditions or allergies." },
              { icon: CloudLightning, title: "Live Sync", desc: "Access your medical history securely from any device, anywhere in the world." }
            ].map((feature, i) => (
              <div key={i} className="bg-white p-8 md:p-10 rounded-3xl border border-slate-100 hover:border-primary/30 transition-all group shadow-sm">
                <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                  <feature.icon className="w-7 h-7 md:w-8 md:h-8" />
                </div>
                <h3 className="text-xl md:text-2xl font-bold text-slate-900 mb-4">{feature.title}</h3>
                <p className="text-sm md:text-base text-slate-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
