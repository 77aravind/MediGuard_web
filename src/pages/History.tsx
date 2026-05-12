import React, { useEffect, useState } from 'react';
import { History as HistoryIcon, Pill, ShieldCheck, ChevronRight, Trash2, Calendar } from 'lucide-react';
import { motion } from 'motion/react';
import { getSafetyChecks, getPrescriptions, deleteSafetyCheck } from '../services/api';
import { cn } from '../lib/utils';

export default function History() {
  const [safetyChecks, setSafetyChecks] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('mediguard_token');
      if (!token) return;

      try {
        const [checks, meds] = await Promise.all([
          getSafetyChecks(),
          getPrescriptions()
        ]);
        setSafetyChecks(Array.isArray(checks) ? checks : []);
        setPrescriptions(Array.isArray(meds) ? meds : []);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleDeleteCheck = async (id: string) => {
    try {
      await deleteSafetyCheck(id);
      setSafetyChecks(prev => Array.isArray(prev) ? prev.filter(c => (c._id || c.id) !== id) : []);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-12 px-4 sm:px-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pt-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-6 border border-primary/20">
            <HistoryIcon className="w-3 h-3" />
            <span>Archive Logs</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Activity History</h1>
          <p className="text-slate-500 text-sm md:text-lg mt-3 font-medium max-w-xl">A complete record of your medication intake and safety analyses.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 md:gap-16">
        {/* Safety Checks History */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-primary">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Safety Diagnostics</h2>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{(Array.isArray(safetyChecks) ? safetyChecks.length : 0)} Records</span>
          </div>
          
          <div className="grid gap-4">
            {isLoading ? (
              <div className="bg-white border border-slate-200 p-12 flex flex-col items-center justify-center rounded-xl">
                <ShieldCheck className="w-8 h-8 text-primary animate-pulse" />
                <p className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Loading history...</p>
              </div>
            ) : (!Array.isArray(safetyChecks) || safetyChecks.length === 0) ? (
              <div className="bg-white border border-slate-200 p-12 text-center rounded-xl border-dashed">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No safety results yet</p>
              </div>
            ) : (
              safetyChecks.map((check) => (
                <div 
                  key={check._id || check.id}
                  className="bg-white border border-slate-200 p-6 rounded-xl hover:bg-slate-50 transition-all group flex items-center gap-6 cursor-pointer"
                >
                  <div className={cn(
                    "w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-lg border",
                    check.status === 'Safe' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    check.status === 'Warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-red-50 text-red-600 border-red-100'
                  )}>
                    {check.safetyScore}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 text-lg truncate tracking-tight mb-1">{check.medicineName}</h4>
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-slate-400 font-bold uppercase">{new Date(check.date).toLocaleDateString()}</span>
                       <span className={cn(
                         "text-[10px] font-bold uppercase",
                         check.status === 'Safe' ? 'text-emerald-500' :
                         check.status === 'Warning' ? 'text-amber-500' :
                         'text-red-500'
                       )}>{check.status}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteCheck(check._id || check.id)}
                    className="p-3 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Prescription Logs */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center justify-center text-blue-600">
                <Pill className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Medication Intake</h2>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-black tracking-widest">{(Array.isArray(prescriptions) ? prescriptions.length : 0)} Logs</span>
          </div>
          
          <div className="grid gap-4">
            {isLoading ? (
              <div className="bg-white border border-slate-200 p-12 flex flex-col items-center justify-center rounded-xl">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading history...</p>
              </div>
            ) : (!Array.isArray(prescriptions) || prescriptions.length === 0) ? (
              <div className="bg-white border border-slate-200 p-12 text-center rounded-xl border-dashed">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No logs yet</p>
              </div>
            ) : (
              prescriptions.map((med) => (
                <div 
                  key={med._id || med.id}
                  className="bg-white border border-slate-200 p-6 flex items-center gap-5 rounded-xl hover:bg-slate-50 transition-all"
                >
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
                    <Pill className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="font-bold text-slate-900 text-lg truncate mb-1">{med.medicineName}</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-slate-500">{med.dosage}</span>
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                            med.status === 'taken' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100 border' 
                              : 'bg-amber-50 text-amber-600 border-amber-100 border'
                          )}>{med.status}</span>
                        </div>
                      </div>
                      <div className="text-right sm:border-l sm:border-slate-100 sm:pl-4">
                        <p className="text-[10px] font-bold text-slate-400 flex items-center sm:justify-end gap-1 uppercase">
                          {new Date(med.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        </p>
                        <p className="text-sm font-bold text-slate-900">{med.timeSlot}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
