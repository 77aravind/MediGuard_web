import React, { useEffect, useState, useMemo } from 'react';
import { 
  Plus, 
  AlertTriangle, 
  Calendar, 
  Pill, 
  TrendingUp, 
  CheckCircle2,
  ChevronRight,
  Stethoscope,
  Heart,
  Bell,
  Loader2,
  X,
  Target,
  Activity,
  Trash2,
  Edit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';
import { getPrescriptions, togglePrescriptionStatus, savePrescription, getSafetyChecks, getProfile, deletePrescription, updatePrescription } from '../services/api';

interface Medication {
  _id: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  timeSlot: string;
  reminderTime?: string; // e.g. "08:00"
  status: 'taken' | 'pending';
}

import { scheduleNotifications, showNotification, requestNotificationPermission } from '../services/notificationService';

export default function Dashboard() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [safetyChecks, setSafetyChecks] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOverviewOpen, setIsOverviewOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [notificationStatus, setNotificationStatus] = useState<NotificationPermission>(Notification.permission);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [nextAlert, setNextAlert] = useState<{ name: string; time: string; diff: number; countdown: string } | null>(null);

  useEffect(() => {
    // Initial fetch
    const token = localStorage.getItem('mediguard_token');
    if (token) {
      fetchData();
    }

    // Load logs initially
    const logs = JSON.parse(localStorage.getItem('mediguard_notification_logs') || '[]');
    setNotificationLogs(logs);

    // Monitor permission status & logs
    const checkStatus = () => {
      if (Notification.permission !== notificationStatus) {
        setNotificationStatus(Notification.permission);
      }
      const currentLogs = JSON.parse(localStorage.getItem('mediguard_notification_logs') || '[]');
      if (currentLogs.length !== notificationLogs.length) {
        setNotificationLogs(currentLogs);
      }
    };
    const interval = setInterval(checkStatus, 5000); // Check every 5s instead of 2s
    return () => clearInterval(interval);
  }, []);
  
  const [newMed, setNewMed] = useState({
    medicineName: '',
    dosage: '',
    frequency: 'Daily',
    timeSlot: 'Morning' as any,
    reminderTime: '08:00',
    status: 'pending' as const,
    date: new Date()
  });

  const [timeSelection, setTimeSelection] = useState({
    hour: new Date().getHours() === 0 ? '12' : (new Date().getHours() > 12 ? (new Date().getHours() - 12).toString().padStart(2, '0') : new Date().getHours().toString().padStart(2, '0')),
    minute: new Date().getMinutes().toString().padStart(2, '0'),
    period: new Date().getHours() >= 12 ? 'PM' : 'AM'
  });

  // Keep newMed.reminderTime in sync with timeSelection
  useEffect(() => {
    let hh = parseInt(timeSelection.hour);
    if (timeSelection.period === 'PM' && hh < 12) hh += 12;
    if (timeSelection.period === 'AM' && hh === 12) hh = 0;
    const formattedTime = `${hh.toString().padStart(2, '0')}:${timeSelection.minute}`;
    setNewMed(prev => ({ ...prev, reminderTime: formattedTime }));
  }, [timeSelection]);
  
  const userJson = localStorage.getItem('mediguard_user');
  let parsedUser = null;
  try {
    parsedUser = userJson ? JSON.parse(userJson) : null;
  } catch (e) {
    console.error("Failed to parse user data", e);
  }
  const user = userData || parsedUser;

  useEffect(() => {
    if (Array.isArray(meds) && meds.length > 0) {
      scheduleNotifications(meds, user?.nextVisit);
    }
    
    const interval = setInterval(() => {
      if (Array.isArray(meds) && meds.length > 0) {
        scheduleNotifications(meds, user?.nextVisit);
        
        // Calculate next alert for UI
        const now = new Date();
        const futureAlerts = meds
          .filter(m => m.status !== 'taken') // Skip medicines already taken
          .map(m => {
            const timeToNotify = m.reminderTime;
            if (!timeToNotify) return null;
            const [h, min] = timeToNotify.split(':').map(Number);
            const scheduled = new Date();
            scheduled.setHours(h, min, 0, 0);
            if (scheduled < now) scheduled.setDate(now.getDate() + 1);
            return { name: m.medicineName, time: formatDisplayTime(timeToNotify), diff: scheduled.getTime() - now.getTime() };
          })
          .filter(a => a !== null)
          .sort((a, b) => a!.diff - b!.diff);
        
        if (futureAlerts.length > 0) {
          const next = futureAlerts[0]!;
          const mins = Math.floor(next.diff / 60000);
          const secs = Math.floor((next.diff % 60000) / 1000);
          const countdown = mins > 60 
            ? `${Math.floor(mins / 60)}h ${mins % 60}m` 
            : (mins > 0 ? `${mins}m ${secs}s` : `${secs}s`);
          setNextAlert({ ...next, countdown });
        } else {
          setNextAlert(null); // Clear if no future alerts
        }
      } else {
        setNextAlert(null); // Clear if no meds
      }
    }, 5000); // Check every 5 seconds for precision

    return () => clearInterval(interval);
  }, [meds]); // Only depend on meds, fetchData is moved to mount effect

  const fetchData = async () => {
    const token = localStorage.getItem('mediguard_token');
    if (!token) return;
    
    setIsLoading(true);
    try {
      const [medData, safetyData, profileData] = await Promise.all([
        getPrescriptions(),
        getSafetyChecks(),
        getProfile()
      ]);
      setMeds(Array.isArray(medData) ? medData : []);
      setSafetyChecks(Array.isArray(safetyData) ? safetyData : []);
      setUserData(profileData);
      localStorage.setItem('mediguard_user', JSON.stringify(profileData));
      if (profileData.notificationsEnabled !== undefined) {
        localStorage.setItem('mediguard_notifications_enabled', profileData.notificationsEnabled.toString());
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMeds = async () => {
    try {
      const data = await getPrescriptions();
      setMeds(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch meds", err);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await togglePrescriptionStatus(id);
      setMeds(prev => prev.map(m => m._id === id ? { ...m, status: m.status === 'taken' ? 'pending' : 'taken' } : m));
    } catch (err) {
      console.error("Toggle failed", err);
    }
  };

  const handleDeleteMed = async (id: string) => {
    console.log("[Dashboard] Attempting to delete med with ID:", id);
    const medToDelete = meds.find(m => m._id === id);
    setDeletingIds(prev => new Set(prev).add(id));
    
    try {
      await deletePrescription(id);
      console.log("[Dashboard] Delete successful for ID:", id);
      setMeds(prev => prev.filter(m => m._id !== id));
      
      // Also remove logs related to this medication if they exist
      if (medToDelete) {
        const name = medToDelete.medicineName;
        const currentLogs = JSON.parse(localStorage.getItem('mediguard_notification_logs') || '[]');
        const filteredLogs = currentLogs.filter((log: any) => !log.body.includes(name));
        localStorage.setItem('mediguard_notification_logs', JSON.stringify(filteredLogs));
        setNotificationLogs(filteredLogs);
      }
      
      // Refresh safety checks as removing a med might resolve conflicts
      const safetyData = await getSafetyChecks();
      setSafetyChecks(safetyData);
    } catch (err) {
      console.error("[Dashboard] Delete failed for ID:", id, err);
      alert("Failed to delete medication. Please try again.");
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleEditClick = (med: Medication) => {
    setEditingMed(med);
    const [h, m] = (med.reminderTime || '08:00').split(':');
    const hh = parseInt(h);
    const period = hh >= 12 ? 'PM' : 'AM';
    const displayH = hh % 12 || 12;
    
    setTimeSelection({
      hour: displayH.toString().padStart(2, '0'),
      minute: m,
      period
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateMed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMed) return;
    
    setIsSaving(true);
    try {
      // Re-use savePrescription but we need an update API
      // Since I don't have a specific update API yet, I'll add one or use a PATCH route
      // For now, let's assume savePrescription handles updates if ID is present or I'll add updatePrescription
      await updatePrescription(editingMed._id, {
        medicineName: editingMed.medicineName,
        dosage: editingMed.dosage,
        frequency: editingMed.frequency,
        timeSlot: editingMed.timeSlot,
        reminderTime: newMed.reminderTime, // This is kept in sync with timeSelection by the effect
      });
      
      await fetchData();
      setIsEditModalOpen(false);
      setEditingMed(null);
    } catch (err) {
      console.error("Failed to update med", err);
      alert("Failed to update medication.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMed = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await savePrescription(newMed);
      await fetchData();
      setIsAddModalOpen(false);
      setNewMed({
        medicineName: '',
        dosage: '',
        frequency: 'Daily',
        timeSlot: 'Morning',
        reminderTime: '08:00',
        status: 'pending',
        date: new Date()
      });
    } catch (err) {
      console.error("Failed to add med", err);
    } finally {
      setIsSaving(false);
    }
  };

  const formatDisplayTime = (time24?: string) => {
    if (!time24 || !time24.includes(':')) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hours12 = h % 12 || 12;
    return `${hours12}:${m.toString().padStart(2, '0')} ${period}`;
  };

  const activeMedsCount = Array.isArray(meds) ? meds.length : 0;
  const takenMeds = Array.isArray(meds) ? meds.filter(m => m.status === 'taken').length : 0;
  const totalMeds = Array.isArray(meds) ? meds.length : 0;
  const adherenceScore = totalMeds > 0 ? Math.round((takenMeds / totalMeds) * 100) : 100;
  const healthScore = Math.min(100, Math.max(0, adherenceScore - ((Array.isArray(safetyChecks) ? safetyChecks.filter(s => s.status === 'Critical').length : 0) * 10)));
  
  const greeting = useMemo(() => {
    const greetings = ['Hello', 'Hi', 'How u doin', 'Welcome back', 'Great to see you', 'Hey there', 'Greetings'];
    return greetings[Math.floor(Math.random() * greetings.length)];
  }, []);

  const alerts = Array.isArray(safetyChecks) ? safetyChecks.filter(s => s.status !== 'Safe').slice(0, 3) : [];

  const formatDate = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return 'N/A';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }
    return new Date(dateStr).toLocaleDateString();
  };

  const stats = [
    { label: 'Active Prescriptions', value: activeMedsCount.toString(), icon: Pill, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Health Score', value: `${healthScore}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { label: 'Alerts', value: (Array.isArray(safetyChecks) ? safetyChecks.filter(s => s.status === 'Critical').length : 0).toString(), icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-100' },
    { label: 'Next Visit', value: user?.nextVisit ? formatDate(user.nextVisit) : 'N/A', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  const getPersonalizedInsight = () => {
    if (Array.isArray(safetyChecks) && safetyChecks.some(s => s.status === 'Critical')) {
      return "URGENT: Critical drug conflicts detected. Please review your safety alerts before taking any more medication and consult your healthcare provider.";
    }

    const conditions = user?.conditions || [];
    const conditionAdvice = conditions.length > 0 
      ? `Given your ${conditions[0].toLowerCase()}, maintaining a strict medication schedule is vital to prevent health fluctuations.`
      : "Excellent work! Keeping your medication schedule consistent is the best way to support your long-term health.";

    if (healthScore >= 90) {
      return `Outstanding adherence! ${conditionAdvice} Your vitals are showing extremely positive trends.`;
    } else if (healthScore >= 70) {
      return `Good progress. You've missed a few doses recently. Consistency is crucial for managing ${conditions.length > 0 ? conditions[0] : 'your health'}.`;
    } else {
      return "Attention required. Low adherence score detected. Let's get back on track to ensure your medical conditions are properly managed.";
    }
  };

  const healthInsight = getPersonalizedInsight();

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 md:space-y-8 px-4 sm:px-6">
      {/* Notification Status Banner */}
      <AnimatePresence>
        {notificationStatus !== 'granted' && localStorage.getItem('mediguard_notifications_enabled') === 'true' && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                  <AlertTriangle className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <p className="text-xs font-bold text-red-900">Notifications Blocked by Browser</p>
                  <p className="text-[10px] text-red-700 leading-tight">Please click "Allow" in your browser settings to receive medication alerts.</p>
                </div>
              </div>
              <button 
                onClick={async () => {
                  const granted = await requestNotificationPermission();
                  if (granted) setNotificationStatus('granted');
                }}
                className="bg-red-900 text-white px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-black transition-colors shrink-0"
              >
                Enable Now
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full Report Modal */}
      <AnimatePresence>
        {isReportOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-3xl md:rounded-[32px] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 md:p-10 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                <div className="min-w-0">
                  <h2 className="text-xl md:text-3xl font-bold text-slate-900 truncate">Health Intelligence Report</h2>
                  <p className="text-slate-500 mt-1 text-xs md:text-sm">Status as of {new Date().toLocaleDateString()}</p>
                </div>
                <button 
                  onClick={() => setIsReportOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors shrink-0 ml-4"
                >
                  <X className="w-5 h-5 md:w-6 md:h-6 text-slate-400" />
                </button>
              </div>

              <div className="p-4 md:p-6 mb-8 overflow-y-auto flex-grow custom-scrollbar">
                <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8">
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Consistency</p>
                      <p className="text-2xl md:text-3xl font-bold text-emerald-900">{adherenceScore}%</p>
                    </div>
                    <p className="text-[10px] md:text-xs text-emerald-700 mt-2 font-medium">Adherence Score</p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest mb-1">Safety Risk</p>
                       <p className="text-2xl md:text-3xl font-bold text-amber-900">
                        {(Array.isArray(safetyChecks) && safetyChecks.filter((s: any) => s.status === 'Critical').length > 0) ? 'High' : 'Low'}
                      </p>
                    </div>
                    <p className="text-[10px] md:text-xs text-amber-700 mt-2 font-medium">Conflict Analysis</p>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-sm md:text-base border-b border-slate-50 pb-2">
                      <Activity className="w-4 h-4 text-primary" /> Personalized Analysis
                    </h4>
                    <div className="space-y-4">
                      <div className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                          <Stethoscope className="w-5 h-5 text-primary" />
                        </div>
                        <div className="pt-1">
                          <p className="text-sm text-slate-600 leading-relaxed">
                            Based on your profile, you are managing <b>{user?.conditions?.length || 0} conditions</b> with <b>{activeMedsCount} active medications</b>.
                          </p>
                          {user?.height && user?.weight && (
                            <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-widest">
                              BMI: {(parseFloat(user.weight) / Math.pow(parseFloat(user.height) / 100, 2)).toFixed(1)} | {user.age} Years Old
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0">
                          <Activity className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="pt-1">
                          <p className="text-sm text-slate-600 leading-relaxed font-medium">
                            Physical Recommendation
                          </p>
                          <p className="text-xs text-slate-500 leading-relaxed mt-1">
                            {user?.height && user?.weight ? (
                              `Your BMI is ${(parseFloat(user.weight) / Math.pow(parseFloat(user.height) / 100, 2)).toFixed(1)}. ${
                                parseFloat(user.weight) / Math.pow(parseFloat(user.height) / 100, 2) < 25 
                                ? "This is a healthy range. Keep up your current activity levels." 
                                : "Focusing on a balanced diet and regular walks can help optimize your medication effectiveness."
                              }`
                            ) : "Complete your physical profile to receive personalized BMI-based insights."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-900 rounded-xl text-white shadow-xl relative overflow-hidden">
                    <h4 className="font-bold mb-4 flex items-center gap-2 relative z-10">
                      <Bell className="w-4 h-4 text-amber-400" /> AI Recommendations
                    </h4>
                    <div className="text-sm text-white/70 leading-relaxed space-y-4 relative z-10">
                      <div className="flex gap-3">
                        <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center shrink-0 text-xs">1</span>
                        <p>{healthInsight}</p>
                      </div>
                      {user?.conditions?.some((c: string) => c.toLowerCase().includes('hypertension')) && (
                        <div className="flex gap-4">
                          <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">2</span>
                          <p>Monitoring your sodium intake alongside your blood pressure medication is highly recommended for cardiovascular stability.</p>
                        </div>
                      )}
                      {user?.conditions?.some((c: string) => c.toLowerCase().includes('diabetes')) && (
                        <div className="flex gap-4">
                          <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">3</span>
                          <p>Consistent timing of doses is crucial for maintaining stable blood sugar levels and preventing A1C spikes.</p>
                        </div>
                      )}
                      {user?.weight && parseFloat(user.weight) > 90 && (
                        <div className="flex gap-4">
                          <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">4</span>
                          <p>Maintaining a balanced diet and regular light exercise is recommended to support your metabolic health given your weight profile.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 border-t border-slate-100 bg-white">
                <button 
                  onClick={() => setIsReportOpen(false)}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" /> Confirm & Close Report
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Welcome Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pt-8 pb-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
            {greeting}, <span className="text-primary">{user?.name?.split(' ')?.[0] || 'User'}</span>
          </h1>
          <div className="text-slate-500 flex items-center gap-2 mt-2 text-sm md:text-lg">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-200">
              <Calendar className="w-4 h-4 text-primary" />
            </div>
            Today is <span className="font-bold text-slate-700">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <button 
            onClick={() => setIsOverviewOpen(true)}
            className="flex items-center justify-center gap-3 bg-white border border-slate-200 px-6 py-3 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-all text-sm flex-1 sm:flex-none"
          >
            <TrendingUp className="w-4 h-4" /> 
            <span>View Pulse</span>
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-3 bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all text-sm flex-1 sm:flex-none"
          >
            <Plus className="w-5 h-5" /> 
            <span>Add Medication</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, i) => (
          <div 
            key={i}
            className="bg-white border border-slate-200 p-4 md:p-6 rounded-xl"
          >
            <div className={`p-2.5 rounded-lg w-fit ${stat.bg} ${stat.color} mb-3`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-slate-500 text-[10px] md:text-xs font-bold uppercase tracking-widest truncate">{stat.label}</p>
              <p className="text-xl md:text-3xl font-bold text-slate-900 mt-0.5 tracking-tight">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-10">
        {/* Daily Schedule */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white border border-slate-200 p-6 md:p-8 rounded-xl shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Pill className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Today's Schedule</h2>
            </div>
            
            <div className="space-y-3">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              ) : meds.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Pill className="w-10 h-10 mb-3 opacity-20" />
                  <p className="text-sm font-medium">No medications scheduled yet.</p>
                </div>
              ) : meds.map((med) => (
                <div key={med._id} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-all">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-base truncate">{med.medicineName}</h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{med.dosage}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">
                          {med.reminderTime ? formatDisplayTime(med.reminderTime) : med.timeSlot}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 relative z-20">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditClick(med);
                      }}
                      className="w-10 h-10 rounded-full border border-slate-200 text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 flex items-center justify-center transition-all cursor-pointer"
                      title="Edit Medication"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      disabled={deletingIds.has(med._id)}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Removed window.confirm because it's often blocked in iframes
                        handleDeleteMed(med._id);
                      }}
                      className={cn(
                        "w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center transition-all group cursor-pointer",
                        deletingIds.has(med._id) 
                          ? "bg-slate-50 text-slate-300 border-slate-100" 
                          : "text-slate-500 hover:border-red-400 hover:text-red-600 hover:bg-red-50"
                      )}
                      title="Remove Medication"
                    >
                      {deletingIds.has(med._id) ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(med._id);
                      }} 
                      className={cn(
                        "w-10 h-10 rounded-full border flex items-center justify-center transition-all cursor-pointer",
                        med.status === 'taken' 
                          ? "bg-emerald-500 border-emerald-500 text-white shadow-sm" 
                          : "border-slate-200 text-slate-400 hover:border-primary hover:text-primary bg-white"
                      )}
                    >
                      {med.status === 'taken' ? <CheckCircle2 className="w-5 h-5" /> : <div className="w-2 h-2 rounded-full bg-current" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white border border-slate-200 p-6 md:p-8 rounded-xl shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100">
                <Activity className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Biometric Profile</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Physical Index Analysis</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                 <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-tight">Current BMI Index</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                      user?.height && user?.weight && (parseFloat(user.weight) / Math.pow(parseFloat(user.height) / 100, 2)) < 25 
                      ? "bg-emerald-100 text-emerald-700" 
                      : "bg-amber-100 text-amber-700"
                    )}>
                      {user?.height && user?.weight 
                        ? (parseFloat(user.weight) / Math.pow(parseFloat(user.height) / 100, 2)) < 25 ? "Optimal" : "Monitor" 
                        : "No Data"}
                    </span>
                 </div>
                 <div className="text-4xl font-black text-slate-900">
                   {user?.height && user?.weight 
                     ? (parseFloat(user.weight) / Math.pow(parseFloat(user.height) / 100, 2)).toFixed(1) 
                     : "--"}
                 </div>
                 <div className="mt-4 flex gap-1 h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-400" style={{ width: '20%' }} />
                    <div className="h-full bg-emerald-400" style={{ width: '40%' }} />
                    <div className="h-full bg-amber-400" style={{ width: '20%' }} />
                    <div className="h-full bg-red-400" style={{ width: '20%' }} />
                 </div>
                 <div className="flex justify-between mt-1 opacity-40">
                   <span className="text-[8px] font-bold">18.5</span>
                   <span className="text-[8px] font-bold">25.0</span>
                   <span className="text-[8px] font-bold">30.0</span>
                 </div>
              </div>

              <div className="flex flex-col justify-center">
                 <div className="flex items-center gap-2 mb-2">
                   <Target className="w-3 h-3 text-primary" />
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Clinical Insight</p>
                 </div>
                 <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-primary/20 pl-4">
                   {user?.height && user?.weight ? (
                     `Your BMI of ${(parseFloat(user.weight) / Math.pow(parseFloat(user.height) / 100, 2)).toFixed(1)} suggests ${
                       parseFloat(user.weight) / Math.pow(parseFloat(user.height) / 100, 2) < 25 
                       ? "optimal metabolic efficiency. Your current physiological state supports high drug efficacy." 
                       : "a need for increased metabolic activity to help your body process high-potency prescriptions."
                     }`
                   ) : "Please update your height and weight in your profile to enable personalized biometric reviews."}
                 </p>
              </div>
            </div>
          </section>

          <section className="bg-white border border-slate-200 p-6 md:p-8 rounded-xl relative overflow-hidden group shadow-sm">
            <div className="relative z-10">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                  <Activity className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900">AI Health Assistant</h3>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Status: Active Analysis</p>
                </div>
              </div>
              
              <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl mb-6">
                <p className="text-slate-700 text-sm md:text-base leading-relaxed italic">
                  "{healthInsight}"
                </p>
              </div>

              <button 
                onClick={() => setIsReportOpen(true)}
                className="bg-primary text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-all text-sm w-full sm:w-auto"
              >
                <TrendingUp className="w-4 h-4" />
                <span>View Full Report</span>
              </button>
            </div>
          </section>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-6 md:space-y-10">
          {/* Recent Alerts */}
          <section className="bg-white border border-slate-200 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-emerald-500" /> Alert History
                </h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Status: Monitoring {meds.length} Meds</p>
                {nextAlert && (
                  <div className="text-[9px] text-emerald-600 font-bold uppercase mt-1 animate-pulse flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Next: {nextAlert.name} @ {nextAlert.time} (in {nextAlert.countdown})
                  </div>
                )}
                <div className="text-[8px] text-slate-300 font-mono mt-0.5">
                  Engine: Active | {new Date().toLocaleTimeString()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => {
                    localStorage.removeItem('mediguard_notification_logs');
                    setNotificationLogs([]);
                  }}
                  className="text-[10px] font-bold text-slate-400 uppercase hover:text-slate-600"
                >
                  Clear
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {notificationLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No recent alerts</p>
                </div>
              ) : (
                notificationLogs.map((log: any, i: number) => (
                  <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{log.title}</p>
                      <span className="text-[9px] font-bold text-slate-400">{log.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight line-clamp-2">{log.body}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Recent Alerts (Original Safety Alerts) */}
          <section className="bg-white border border-slate-200 p-6 rounded-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Safety Risks
              </h3>
            </div>
            
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">System Clear</p>
                </div>
              ) : (
                alerts.map((alert, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "p-4 rounded-xl border",
                      alert.status === 'Critical' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                    )}
                  >
                    <p className={cn("text-xs font-bold uppercase", alert.status === 'Critical' ? 'text-red-800' : 'text-amber-800')}>
                      {alert.medicineName}
                    </p>
                    <p className={cn("text-xs mt-1 leading-relaxed opacity-80", alert.status === 'Critical' ? 'text-red-700' : 'text-amber-700')}>
                      {alert.description.substring(0, 80)}...
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <Link to="/profile" className="block">
            <section className="bg-slate-900 p-6 rounded-xl text-white hover:bg-slate-800 transition-colors">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-xl">
                  🩺
                </div>
                <div>
                  <h3 className="font-bold text-lg">Guardian ID</h3>
                  <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    {user?.bloodType || '--'} • {user?.age || '--'} Years
                  </p>
                </div>
              </div>

              {user?.nextVisit && (
                <div className="mb-6 p-4 bg-primary/10 rounded-xl border border-primary/20">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Next Appointment</span>
                  </div>
                  <p className="text-lg font-bold text-white">
                    {formatDate(user.nextVisit)}
                  </p>
                  {new Date(user.nextVisit) < new Date() && (
                    <p className="text-[10px] text-red-400 font-bold mt-1 uppercase tracking-tight flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> Missed Appointment?
                    </p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mb-1">Weight</p>
                  <p className="text-lg font-bold">{user?.weight || '--'}kg</p>
                </div>
                <div className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mb-1">Height</p>
                  <p className="text-lg font-bold">{user?.height || '--'}cm</p>
                </div>
                {user?.height && user?.weight && (
                  <div className="bg-white/5 p-3 rounded-lg border border-white/5 col-span-2">
                    <p className="text-white/20 text-[10px] font-bold uppercase tracking-widest mb-1">BMI Index</p>
                    <div className="flex items-center justify-between">
                      <p className="text-lg font-bold">{(parseFloat(user.weight) / Math.pow(parseFloat(user.height) / 100, 2)).toFixed(1)}</p>
                      <span className="text-[10px] font-bold uppercase text-primary">
                        {parseFloat(user.weight) / Math.pow(parseFloat(user.height) / 100, 2) < 25 ? 'Healthy' : 'Monitor'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-primary uppercase tracking-widest">Update Data</span>
                <ChevronRight className="w-4 h-4 text-white/40" />
              </div>
            </section>
          </Link>
        </div>
      </div>



      {/* Modals */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8 sticky top-0 bg-white z-10 pb-2">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Add New Medication</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Current System Time: {new Date().toLocaleTimeString()}</p>
                  </div>
                  <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleAddMed} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Medicine Name</label>
                    <input 
                      required
                      type="text" 
                      value={newMed.medicineName}
                      onChange={e => setNewMed({...newMed, medicineName: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all"
                      placeholder="e.g. Paracetamol"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest pl-1">Exact Reminder Time (12hr Format)</label>
                    <p className="text-[8px] text-slate-400 mb-2 italic px-1">Ensure AM/PM matches your current system time for testing.</p>
                    <div className="flex items-center gap-3">
                      <select 
                        value={timeSelection.hour}
                        onChange={e => setTimeSelection(prev => ({ ...prev, hour: e.target.value }))}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all font-bold"
                      >
                        {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="font-bold text-slate-400">:</span>
                      <select 
                        value={timeSelection.minute}
                        onChange={e => setTimeSelection(prev => ({ ...prev, minute: e.target.value }))}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all font-bold"
                      >
                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select 
                        value={timeSelection.period}
                        onChange={e => setTimeSelection(prev => ({ ...prev, period: e.target.value }))}
                        className="w-24 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all font-bold"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Dosage</label>
                      <input 
                        required
                        type="text" 
                        value={newMed.dosage}
                        onChange={e => setNewMed({...newMed, dosage: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all"
                        placeholder="e.g. 500mg"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Time Slot</label>
                      <select 
                        value={newMed.timeSlot}
                        onChange={e => {
                          const slot = e.target.value;
                          setNewMed({...newMed, timeSlot: slot as any});
                          // Suggest times based on slot
                          if (slot === 'Morning') setTimeSelection({ hour: '08', minute: '00', period: 'AM' });
                          else if (slot === 'Afternoon') setTimeSelection({ hour: '01', minute: '00', period: 'PM' });
                          else if (slot === 'Evening') setTimeSelection({ hour: '06', minute: '00', period: 'PM' });
                          else if (slot === 'Night') setTimeSelection({ hour: '09', minute: '00', period: 'PM' });
                        }}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all"
                      >
                        <option>Morning</option>
                        <option>Afternoon</option>
                        <option>Evening</option>
                        <option>Night</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Frequency</label>
                    <select 
                      value={newMed.frequency}
                      onChange={e => setNewMed({...newMed, frequency: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all"
                    >
                      <option>Daily</option>
                      <option>Twice Daily</option>
                      <option>Weekly</option>
                      <option>As needed</option>
                    </select>
                  </div>

                  <button 
                    disabled={isSaving}
                    type="submit" 
                    className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                    Add Medication
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {isEditModalOpen && editingMed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-8 sticky top-0 bg-white z-10 pb-2">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Edit Medication</h3>
                    <p className="text-[10px] text-slate-400 font-mono mt-1">Current System Time: {new Date().toLocaleTimeString()}</p>
                  </div>
                  <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <form onSubmit={handleUpdateMed} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Medicine Name</label>
                    <input 
                      required
                      type="text" 
                      value={editingMed.medicineName}
                      onChange={e => setEditingMed({...editingMed, medicineName: e.target.value})}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-widest pl-1">Exact Reminder Time (12hr Format)</label>
                    <p className="text-[8px] text-slate-400 mb-2 italic px-1">Ensure AM/PM matches your current system time for testing.</p>
                    <div className="flex items-center gap-3">
                      <select 
                        value={timeSelection.hour}
                        onChange={e => setTimeSelection(prev => ({ ...prev, hour: e.target.value }))}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all font-bold"
                      >
                        {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(h => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                      <span className="font-bold text-slate-400">:</span>
                      <select 
                        value={timeSelection.minute}
                        onChange={e => setTimeSelection(prev => ({ ...prev, minute: e.target.value }))}
                        className="flex-1 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all font-bold"
                      >
                        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                      <select 
                        value={timeSelection.period}
                        onChange={e => setTimeSelection(prev => ({ ...prev, period: e.target.value }))}
                        className="w-24 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all font-bold"
                      >
                        <option value="AM">AM</option>
                        <option value="PM">PM</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Dosage</label>
                      <input 
                        required
                        type="text" 
                        value={editingMed.dosage}
                        onChange={e => setEditingMed({...editingMed, dosage: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">Time Slot</label>
                      <select 
                        value={editingMed.timeSlot}
                        onChange={e => setEditingMed({...editingMed, timeSlot: e.target.value as any})}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 outline-none focus:border-primary focus:bg-white transition-all"
                      >
                        <option>Morning</option>
                        <option>Afternoon</option>
                        <option>Evening</option>
                        <option>Night</option>
                      </select>
                    </div>
                  </div>

                  <button 
                    disabled={isSaving}
                    type="submit" 
                    className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                    Update Medication
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}

        {isOverviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOverviewOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 md:p-8">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-2xl font-bold text-slate-900">Health Overview</h3>
                  <button onClick={() => setIsOverviewOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                    <X className="w-6 h-6 text-slate-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                          <Target className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-blue-900">Adherence Goal</h4>
                      </div>
                      <div className="space-y-4">
                        <div className="flex justify-between items-end">
                          <span className="text-blue-700 text-sm font-bold">Monthly Progress</span>
                          <span className="text-blue-900 text-2xl font-bold">88%</span>
                        </div>
                        <div className="w-full h-2 bg-blue-200/50 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '88%' }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className="h-full bg-blue-600 rounded-full" 
                          />
                        </div>
                      </div>
                    </div>
 
                    <div className="bg-emerald-50 p-6 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                          <Activity className="w-5 h-5" />
                        </div>
                        <h4 className="font-bold text-emerald-900">Health Trends</h4>
                      </div>
                      <p className="text-emerald-700 text-sm leading-relaxed font-medium">
                        Consistency in medication timing has improved by <span className="text-emerald-800 font-bold">14%</span> over the last 14 days. This correlates with more stable health metrics across your profile.
                      </p>
                    </div>
                  </div>
 
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Stats</h4>
                    </div>
                    <div className="grid gap-2">
                      {stats.map((stat, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                              <stat.icon className="w-4 h-4" />
                            </div>
                            <span className="text-xs text-slate-600 font-bold">{stat.label}</span>
                          </div>
                          <span className="text-slate-900 font-bold text-base">{stat.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-8 border-t border-slate-100">
                  <button 
                    onClick={() => setIsOverviewOpen(false)}
                    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-colors"
                  >
                    Close Report
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
