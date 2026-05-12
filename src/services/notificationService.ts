
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.error('This browser does not support notifications');
    return false;
  }

  if (Notification.permission === 'granted') return true;

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const showNotification = (title: string, options?: NotificationOptions) => {
  const log = {
    title,
    body: options?.body || '',
    time: new Date().toLocaleTimeString(),
    status: 'Sent'
  };
  
  const existingLogs = JSON.parse(localStorage.getItem('mediguard_notification_logs') || '[]');
  localStorage.setItem('mediguard_notification_logs', JSON.stringify([log, ...existingLogs].slice(0, 5)));

  if (Notification.permission === 'granted') {
    new Notification(title, {
      icon: '/vite.svg', // Default icon
      ...options
    });
  } else {
    console.warn('Notification permission not granted');
  }
};

export const scheduleNotifications = (meds: any[], nextVisit?: string) => {
  const notificationsEnabled = localStorage.getItem('mediguard_notifications_enabled') !== 'false';
  if (!notificationsEnabled) {
    console.log('[Notification Engine] Notifications are disabled in settings.');
    return;
  }

  const now = new Date();
  
  // 1. Check Medications
  meds.forEach(med => {
    let timeToNotify = med.reminderTime || med.time;

    // Fallback for timeSlot if specific time is missing
    if (!timeToNotify && med.timeSlot) {
      const slot = med.timeSlot.toLowerCase();
      if (slot === 'morning') timeToNotify = '08:00';
      else if (slot === 'afternoon') timeToNotify = '13:00';
      else if (slot === 'evening') timeToNotify = '18:00';
      else if (slot === 'night') timeToNotify = '21:00';
    }

    if (timeToNotify && typeof timeToNotify === 'string' && timeToNotify.includes(':')) {
      const [hours, minutes] = timeToNotify.split(':').map(Number);
      
      const now = new Date();
      const scheduledTime = new Date();
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      const scheduledMs = scheduledTime.getTime();
      const nowMs = now.getTime();
      const diff = scheduledMs - nowMs;

      // Low-level debugging (optional, disabled to reduce noise)
      // const diffSec = Math.round(diff / 1000);
      // const diffMin = Math.round(diff / 60000);
      // console.log(`[Engine] Med: ${med.medicineName} | Target: ${scheduledTime.toLocaleTimeString()} | Now: ${now.toLocaleTimeString()} | In: ${diffMin}m (${diffSec}s)`);

      // Early Reminder: Exactly 1 minute before (check window 15s-105s)
      if (diff >= 15000 && diff <= 105000 && med.status !== 'taken') {
        const lastNotifiedEarly = localStorage.getItem(`notified_med_early_${med._id}_${scheduledMs}`);
        if (!lastNotifiedEarly) {
          console.log(`[Engine] TRIGGER EARLY: ${med.medicineName}`);
          showNotification('Upcoming Medication', {
            body: `Gentle Reminder: It's almost time for your ${med.medicineName} (${med.dosage}) in 1 minute.`,
            tag: `med_early_${med._id}`
          });
          localStorage.setItem(`notified_med_early_${med._id}_${scheduledMs}`, 'true');
        }
      }

      // Main Reminder: At the timing (check window -5 mins to +5 mins)
      // Widened to 5 minutes to catch any latencies
      if (diff >= -300000 && diff <= 300000 && med.status !== 'taken') {
        const lastNotifiedMain = localStorage.getItem(`notified_med_main_${med._id}_${scheduledMs}`);
        if (!lastNotifiedMain) {
          console.log(`[Engine] ALERT TRIGGERED for ${med.medicineName} at ${now.toLocaleTimeString()}`);
          showNotification('Medication Time!', {
            body: `It is now time to take your ${med.medicineName} (${med.dosage}).`,
            tag: `med_main_${med._id}`
          });
          localStorage.setItem(`notified_med_main_${med._id}_${scheduledMs}`, 'true');
        }
      }

      // Missed: 30 minutes after if not taken
      const missedDiff = nowMs - scheduledMs;
      if (missedDiff > 1800000 && med.status !== 'taken') {
         const lastNotifiedMissed = localStorage.getItem(`missed_med_${med._id}_${scheduledMs}`);
         if (!lastNotifiedMissed) {
           showNotification('Missed Medication Alert', {
             body: `You might have missed your dose of ${med.medicineName}. Please check your schedule.`,
             tag: `missed_${med._id}`
           });
           localStorage.setItem(`missed_med_${med._id}_${scheduledMs}`, 'true');
         }
      }
    }
  });

  // 2. Check Appointment
  if (nextVisit) {
    const appointmentDate = new Date(nextVisit);
    const timeDiff = appointmentDate.getTime() - now.getTime();
    
    // Notify 1 day before
    if (timeDiff > 0 && timeDiff < 86400000) {
      const lastNotifiedVisit = localStorage.getItem(`notified_visit_${nextVisit}`);
      if (!lastNotifiedVisit) {
        showNotification('Upcoming Appointment', {
          body: 'You have a doctor visit scheduled for tomorrow.',
          tag: 'appointment'
        });
        localStorage.setItem(`notified_visit_${nextVisit}`, 'true');
      }
    }
    
    // Missed notification (if today is past the date)
    if (timeDiff < -3600000 && timeDiff > -86400000) { // Within 24 hours after
      const lastNotifiedMissedVisit = localStorage.getItem(`missed_visit_${nextVisit}`);
      if (!lastNotifiedMissedVisit) {
        showNotification('Missed Appointment?', {
          body: 'You had a doctor visit scheduled earlier. Did you attend?',
          tag: 'missed_appointment'
        });
        localStorage.setItem(`missed_visit_${nextVisit}`, 'true');
      }
    }
  }
};
