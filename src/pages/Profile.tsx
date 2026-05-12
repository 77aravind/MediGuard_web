import React, { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  Mail, 
  ShieldAlert, 
  Stethoscope, 
  Plus, 
  X, 
  Save, 
  Loader2,
  CheckCircle2,
  Droplets,
  Ruler,
  Activity,
  Calendar,
  ChevronLeft,
  Bell
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getProfile, updateProfile } from '../services/api';

import { requestNotificationPermission, showNotification } from '../services/notificationService';

export default function Profile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const [newName, setNewName] = useState('');
  const [bloodType, setBloodType] = useState('');
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [phone, setPhone] = useState('');
  const [nextVisit, setNextVisit] = useState('');
  const [conditions, setConditions] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  const [newCondition, setNewCondition] = useState('');
  const [newAllergy, setNewAllergy] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('mediguard_notifications_enabled');
    if (stored !== null) {
      setNotificationsEnabled(stored === 'true');
    }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const token = localStorage.getItem('mediguard_token');
    if (!token) return;

    try {
      const data = await getProfile();
      setProfile(data);
      setNewName(data.name || '');
      setBloodType(data.bloodType || '');
      setHeight(data.height || '');
      setWeight(data.weight || '');
      setGender(data.gender || '');
      setAge(data.age || '');
      setPhone(data.phone || '');
      setNextVisit(data.nextVisit || '');
      setConditions(data.conditions || []);
      setAllergies(data.allergies || []);
      if (data.notificationsEnabled !== undefined) {
        setNotificationsEnabled(data.notificationsEnabled);
        localStorage.setItem('mediguard_notifications_enabled', data.notificationsEnabled.toString());
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccess(false);

    if (nextVisit) {
      const selectedDate = new Date(nextVisit);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        alert("The next visit date cannot be in the past.");
        setIsSaving(false);
        return;
      }
    }

    try {
      const updated = await updateProfile({
        name: newName,
        bloodType,
        height,
        weight,
        gender,
        age: age ? parseInt(age.toString()) : undefined,
        phone,
        nextVisit,
        notificationsEnabled,
        conditions,
        allergies
      });
      setProfile(updated);
      localStorage.setItem('mediguard_user', JSON.stringify(updated));
      localStorage.setItem('mediguard_notifications_enabled', notificationsEnabled.toString());
      setSuccess(true);
      
      // Auto-redirect after a short delay
      setTimeout(() => {
        setSuccess(false);
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const addCondition = () => {
    if (newCondition.trim() && !conditions.includes(newCondition.trim())) {
      setConditions([...conditions, newCondition.trim()]);
      setNewCondition('');
    }
  };

  const removeCondition = (c: string) => {
    setConditions(conditions.filter(item => item !== c));
  };

  const addAllergy = () => {
    if (newAllergy.trim() && !allergies.includes(newAllergy.trim())) {
      setAllergies([...allergies, newAllergy.trim()]);
      setNewAllergy('');
    }
  };

  const removeAllergy = (a: string) => {
    setAllergies(allergies.filter(item => item !== a));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto space-y-12 px-4 sm:px-6 pb-24">
      <div className="pt-12">
        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-slate-400 hover:text-primary transition-all text-xs font-bold uppercase tracking-widest mb-8">
          <ChevronLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full mb-4 border border-primary/20">
              <UserIcon className="w-3 h-3" />
              <span>Personal Health Profile</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight">Health Profile</h1>
            <p className="text-slate-500 text-sm md:text-lg mt-3 font-medium max-w-xl">Update your physical information to help the AI provide accurate safety checks.</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleUpdate} className="space-y-12">
        {/* Basic Info */}
        <section className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <UserIcon className="w-5 h-5" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Basic Information</h3>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
              <input 
                type="text" 
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-900"
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Email Address</label>
              <input 
                type="email" 
                disabled
                value={profile?.email || ''}
                className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-400 cursor-not-allowed font-medium"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Blood Type</label>
              <input 
                type="text" 
                value={bloodType}
                onChange={(e) => setBloodType(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-900"
                placeholder="e.g. O+"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Height (cm)</label>
              <input 
                type="text" 
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-900"
                placeholder="e.g. 175"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Weight (kg)</label>
              <input 
                type="text" 
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-900"
                placeholder="e.g. 70"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Age</label>
              <input 
                type="number" 
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-900"
                placeholder="Years"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Gender</label>
              <select 
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-900"
              >
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Phone Number</label>
              <div className="relative">
                <Activity className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-900"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Next Doctor Visit</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="date" 
                  value={nextVisit}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNextVisit(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-primary focus:bg-white transition-all font-bold text-slate-900"
                />
              </div>
            </div>
          </div>
          
          {height && weight && (
            <div className="mt-10 p-6 bg-slate-50 border border-slate-100 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-slate-100 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculated BMI</p>
                  <p className="text-2xl font-black text-slate-900">
                    {(parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)}
                  </p>
                </div>
              </div>
              <div className="flex-1 max-w-md">
                <p className="text-xs text-slate-500 leading-relaxed italic">
                  AI Suggestion: Based on your BMI of {(parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)}, 
                  {parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2) < 18.5 ? " adding nutrient-dense foods to your diet is recommended." : 
                   parseFloat(weight) / Math.pow(parseFloat(height) / 100, 2) < 25 ? " you are in the healthy range. Maintain your current active lifestyle." :
                   " incorporating regular cardiovascular exercise could improve your metabolic health."}
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 pt-8 border-t border-slate-100">
            <div className="flex flex-col gap-4">
              <button
                type="button"
                id="push-notification-toggle"
                onClick={async () => {
                  const newValue = !notificationsEnabled;
                  
                  // Immediate state update for responsiveness
                  setNotificationsEnabled(newValue);
                  localStorage.setItem('mediguard_notifications_enabled', newValue.toString());

                  // Attempt permission in background if enabling
                  if (newValue) {
                    requestNotificationPermission().then(granted => {
                      if (granted) {
                        showNotification("MediGuard Active", { body: "You'll now receive timely health reminders." });
                      } else {
                        console.warn("Notifications blocked by browser.");
                        // We keep the state 'true' in app so they see it's "enabled" in their settings
                        // but they might need to fix browser settings.
                      }
                    }).catch(err => console.error("Notification error:", err));
                  }
                  
                  // Sync with database
                  try {
                    const updated = await updateProfile({ notificationsEnabled: newValue });
                    localStorage.setItem('mediguard_user', JSON.stringify(updated));
                    setProfile(updated);
                  } catch (err) {
                    console.error("Failed to sync notification setting:", err);
                  }
                }}
                className={cn(
                  "w-full flex items-center justify-between p-6 rounded-2xl border transition-all duration-300 active:scale-[0.98] group",
                  notificationsEnabled 
                    ? "bg-primary/5 border-primary shadow-sm shadow-primary/10" 
                    : "bg-slate-50 border-slate-100 hover:bg-slate-100/80"
                )}
              >
                <div className="flex items-center gap-4 text-left">
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                    notificationsEnabled ? "bg-primary text-white scale-110 shadow-lg shadow-primary/30" : "bg-white text-slate-400 border border-slate-100"
                  )}>
                    <Bell className={cn("w-6 h-6", notificationsEnabled && "animate-pulse")} />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className={cn("font-bold transition-colors", notificationsEnabled ? "text-slate-900" : "text-slate-700")}>
                      Push Reminders
                    </h4>
                    <p className="text-xs text-slate-500 font-medium tracking-tight">Active medication & appointment alerts</p>
                  </div>
                </div>
                
                <div className={cn(
                  "relative inline-flex h-8 w-14 items-center rounded-full transition-all duration-500 shadow-inner",
                  notificationsEnabled ? "bg-primary" : "bg-slate-300"
                )}>
                  <div
                    className={cn(
                      "inline-block h-6 w-6 transform rounded-full bg-white shadow-xl transition-transform duration-500 ease-spring",
                      notificationsEnabled ? "translate-x-7" : "translate-x-1"
                    )}
                  />
                </div>
              </button>
              
              {notificationsEnabled && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-2 pl-2"
                >
                  <div className="flex flex-col gap-2">
                    <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      System Preference Set to Active
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-400 font-medium italic">
                    Note: If you don't receive alerts, ensure browser permissions are granted. Notifications work best outside of iframes.
                  </p>
                </motion.div>
              )}
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Health Conditions */}
          <section className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold">Health Conditions</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 min-h-[50px] p-4 bg-slate-50 rounded-xl">
                {conditions.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold m-auto">No conditions added</p>
                ) : (
                  conditions.map((c) => (
                    <span 
                      key={c}
                      className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold uppercase tracking-tight"
                    >
                      {c} <X onClick={() => removeCondition(c)} className="w-3 h-3 cursor-pointer hover:text-red-400" />
                    </span>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newCondition}
                  onChange={(e) => setNewCondition(e.target.value)}
                  placeholder="Add condition..."
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <button 
                  type="button" 
                  onClick={addCondition}
                  className="bg-blue-600 text-white p-2 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </section>

          {/* Allergies */}
          <section className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold">Allergies</h3>
            </div>
            
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 min-h-[50px] p-4 bg-slate-50 rounded-xl">
                {allergies.length === 0 ? (
                  <p className="text-xs text-slate-400 font-bold m-auto">No allergies added</p>
                ) : (
                  allergies.map((a) => (
                    <span 
                      key={a}
                      className="flex items-center gap-2 px-3 py-1.5 bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-tight"
                    >
                      {a} <X onClick={() => removeAllergy(a)} className="w-3 h-3 cursor-pointer hover:text-amber-200" />
                    </span>
                  ))
                )}
              </div>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newAllergy}
                  onChange={(e) => setNewAllergy(e.target.value)}
                  placeholder="Add allergy..."
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <button 
                  type="button" 
                  onClick={addAllergy}
                  className="bg-amber-500 text-white p-2 rounded-lg"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-8 justify-end pt-8">
          <AnimatePresence>
            {success && (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 text-emerald-600 font-black text-xs uppercase tracking-widest"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                Database Synchronized
              </motion.div>
            )}
          </AnimatePresence>
          <button 
            type="submit"
            disabled={isSaving}
            className="w-full sm:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
          >
            {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
