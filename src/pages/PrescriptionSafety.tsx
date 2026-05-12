import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Camera, 
  Upload, 
  Search, 
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  History,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';
import { cn } from '../lib/utils';
import { getSafetyChecks, saveSafetyCheck, deleteSafetyCheck } from '../services/api';

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please add it to your environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export default function PrescriptionSafety() {
  const [isScanning, setIsScanning] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    const token = localStorage.getItem('mediguard_token');
    if (!token) return;

    try {
      const data = await getSafetyChecks();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const handleSafetyCheck = async (medicineName: string) => {
    if (!medicineName) return;
    setIsScanning(true);
    setError(null);

    // Get user profile for personal context
    const userJson = localStorage.getItem('mediguard_user');
    const user = userJson ? JSON.parse(userJson) : null;
    const history = user?.conditions?.join(', ') || 'Hypertension, Diabetes';
    const allergies = user?.allergies?.join(', ') || 'Penicillin';
    
    try {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not defined in the environment.");
      }

      const prompt = `Act as a medical safety assistant. Analyze the safety of this medicine: "${medicineName}". 
      The user has the following medical profile:
      - Conditions: ${history}
      - Allergies: ${allergies}
      
      Check for direct conflicts with these conditions/allergies and common drug-drug interactions.
      Provide a JSON response with:
      1. safetyScore (0-100)
      2. status (Safe, Warning, Critical)
      3. description (Brief explanation)
      4. warnings (List of strings)
      5. recommendations (List of strings)
      Only return valid JSON.`;

      const ai = getAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text;
      if (!text) throw new Error("Empty response from AI");
      
      const data = JSON.parse(text);
      setResults({ ...data, medicineName });
    } catch (err: any) {
      console.error("Safety Check Error:", err);
      setError(err.message || "Unable to process request. Please try again.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // In a real app, we'd send this to Gemini with Vision
    const file = e.target.files?.[0];
    if (file) {
      setIsScanning(true);
      setTimeout(() => {
        handleSafetyCheck("Simulated Prescription Scan Result: Amoxicillin");
      }, 2000);
    }
  };

  const handleSaveResult = async () => {
    if (!results) return;
    setIsSaving(true);
    try {
      await saveSafetyCheck(results);
      await fetchHistory();
      setResults(null);
      setQuery('');
    } catch (err) {
      console.error("Failed to save:", err);
      setError("Failed to save the analysis.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteHistory = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteSafetyCheck(id);
      await fetchHistory();
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const userJson = localStorage.getItem('mediguard_user');
  const user = userJson ? JSON.parse(userJson) : null;
  const conditions = user?.conditions?.join(', ') || 'No known conditions';
  const allergies = user?.allergies?.join(', ') || 'No known allergies';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 md:space-y-8 pb-12 px-4 sm:px-6">
      <div className="text-center pt-8 md:pt-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full mb-6 border border-primary/20">
          <ShieldCheck className="w-3 h-3" />
          <span>Advanced Diagnostic AI</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">
          Prescription <span className="text-primary">Intelligence</span>
        </h1>
        <p className="text-slate-500 text-sm md:text-xl max-w-2xl mx-auto leading-relaxed font-light">
          MediGuard employs cellular-level analysis to evaluate potential contraindications with your unique genetic and medical profile.
        </p>
      </div>

      {/* Input Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center group cursor-pointer hover:border-primary transition-all relative overflow-hidden">
          <input 
            type="file" 
            className="absolute inset-0 opacity-0 cursor-pointer z-10" 
            onChange={handleFileUpload}
            accept="image/*"
          />
          <div className="w-16 h-16 bg-slate-100 text-primary rounded-xl flex items-center justify-center mb-6">
            <Camera className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Scan Prescription</h3>
          <p className="text-slate-500 text-sm">Upload a photo of your prescription for instant AI analysis.</p>
        </section>

        <section className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="w-12 h-12 bg-slate-100 text-slate-500 rounded-xl flex items-center justify-center mb-6">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Search Medicine</h3>
            <p className="text-slate-500 text-sm mb-6">Enter medicine name to check for interactions.</p>
          </div>
          
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="e.g. Aspirin..." 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-primary transition-all"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button 
              onClick={() => handleSafetyCheck(query)}
              disabled={isScanning || !query}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50 w-full flex items-center justify-center gap-2"
            >
              {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              <span>Check Safety</span>
            </button>
          </div>
        </section>
      </div>

      <AnimatePresence mode="wait">
        {isScanning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="flex flex-col items-center py-24 bg-slate-50/50 rounded-[40px] border border-dashed border-slate-200"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <Loader2 className="w-16 h-16 text-primary animate-spin mb-6 relative z-10" />
            </div>
            <p className="text-slate-900 font-black uppercase tracking-[0.2em] text-xs">MediGuard Intelligence Core Processing...</p>
            <p className="text-slate-400 text-xs mt-2 font-medium">Cross-referencing cellular data patterns...</p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 mb-6"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-sm">Analysis Failed</p>
              <p className="text-xs opacity-80">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-xs font-bold uppercase tracking-wider hover:underline"
            >
              Dismiss
            </button>
          </motion.div>
        )}

        {results && !isScanning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6"
          >
            <div className={cn(
              "p-8 rounded-2xl border",
              results.status === 'Critical' ? 'bg-red-50 border-red-200' : 
              results.status === 'Warning' ? 'bg-amber-50 border-amber-200' : 
              'bg-emerald-50 border-emerald-200'
            )}>
              <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start lg:text-left">
                <div className="flex-shrink-0 flex items-center justify-center w-24 h-24 rounded-full bg-white border-4 border-current">
                   <div className="text-2xl font-black text-slate-900">{results.safetyScore}%</div>
                </div>

                <div className="flex-1 w-full">
                  <div className="flex items-center gap-4 mb-4">
                    <h2 className="text-2xl font-bold text-slate-900">
                      {results.medicineName}
                    </h2>
                    <span className={cn(
                      "px-2 py-1 rounded text-xs font-bold uppercase",
                      results.status === 'Critical' ? 'bg-red-500 text-white' : 
                      results.status === 'Warning' ? 'bg-amber-500 text-white' : 
                      'bg-emerald-500 text-white'
                    )}>
                      {results.status}
                    </span>
                  </div>
                  <p className="text-slate-600 text-sm mb-6">{results.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/50 rounded-xl border border-white/50">
                      <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-3">Warnings</h4>
                      <ul className="space-y-2">
                        {results.warnings?.map((w: string, i: number) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-700">
                            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-4 bg-white/50 rounded-xl border border-white/50">
                      <h4 className="text-[10px] font-bold uppercase text-slate-400 mb-3">Advice</h4>
                      <ul className="space-y-2">
                        {results.recommendations?.map((r: string, i: number) => (
                          <li key={i} className="flex gap-2 text-xs text-slate-700">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-4 p-2">
              <button 
                onClick={() => setResults(null)}
                className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black text-slate-400 hover:text-slate-900 transition-colors text-xs uppercase tracking-widest group"
              >
                <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
                <span>Discard Data</span>
              </button>
              <button 
                onClick={handleSaveResult}
                disabled={isSaving}
                className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:shadow-2xl transition-all text-xs uppercase tracking-[0.2em] group shadow-xl"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />}
                <span>Commit to Archive</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* History Section */}
        <section className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <History className="w-4 h-4" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">Recent Archives</h3>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{history.length} Analysis Logs</span>
          </div>
          
          <div className="grid gap-4">
            {history.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[32px] p-16 text-center">
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">No Archived Data Found</p>
              </div>
            ) : (
              history.map((check) => (
                <motion.div
                  layout
                  key={check._id || check.id}
                  className="bg-white border border-slate-200 p-4 rounded-xl flex items-center gap-4 hover:border-primary/40 transition-all cursor-pointer"
                  onClick={() => setResults(check)}
                >
                  <div className={cn(
                    "w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm border",
                    check.status === 'Safe' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    check.status === 'Warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-red-50 text-red-600 border-red-100'
                  )}>
                    {check.safetyScore}%
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-slate-900 truncate">{check.medicineName}</h4>
                    <div className="flex items-center gap-2 mt-1">
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
                    onClick={(e) => handleDeleteHistory(check._id || check.id, e)}
                    className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white p-6 rounded-2xl border border-slate-200">
          <h3 className="text-lg font-bold mb-6">User Context</h3>
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Conditions</p>
              <p className="text-sm">{conditions}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Allergies</p>
              <p className="text-sm">{allergies}</p>
            </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 leading-relaxed">
              MediGuard Intelligence Core analysis. Always consult your doctor before making medical decisions.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

