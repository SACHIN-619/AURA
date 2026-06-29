import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAura, API } from '../context/AuraContext';
import { COLOR, FONT } from '../utils/tokens';

export default function NotificationCenter() {
  const { user } = useAura();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const popoverRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch or construct dynamic scheduling reminders & system notifications
  useEffect(() => {
    if (!user) {
      setNotifications([
        { id: 'welcome', title: 'Welcome to AURA', body: 'Log in or create a free account to schedule salon bookings and set automated appointment reminders.', time: 'Just now', type: 'info' },
        { id: 'ai-tip', title: '✦ AI Concierge Live', body: 'Ask the AI assistant for custom grooming advice or regional luxury recommendations across Hyderabad.', time: 'System', type: 'ai' }
      ]);
      return;
    }

    // If user is logged in, fetch active bookings for reminders
    const fetchReminders = async () => {
      try {
        const token = localStorage.getItem('aura_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const res = await fetch(`${API}/api/users/profile`, { headers });
        if (res.ok) {
          const data = await res.json();
          const list = [];
          if (data.bookings && data.bookings.length > 0) {
            data.bookings.slice(0, 3).forEach((b, idx) => {
              list.push({
                id: `booking-${b._id || idx}`,
                title: `📅 Upcoming Booking: ${b.salonName || 'Salon'}`,
                body: `Scheduled for ${b.date || 'Soon'} around ${b.timeSlot || 'Flexible time'}. Service: ${b.service || 'Grooming'}.`,
                time: 'Scheduled Reminder',
                type: 'booking'
              });
            });
            list.push({
              id: 'ai-traffic',
              title: '✦ AI Travel Reminder',
              body: `Hyderabad weekend traffic peak is expected near Jubilee Hills & Banjara Hills. Allow 15–20 minutes extra travel time before your appointment.`,
              time: 'AI Smart Alert',
              type: 'ai'
            });
          } else {
            list.push({
              id: 'no-booking',
              title: 'Ready for a Refresh?',
              body: 'You have no active scheduled bookings. Browse our verified top salons to lock in your next luxury appointment.',
              time: 'Suggestion',
              type: 'info'
            });
          }
          if (user.role === 'owner' || user.shopClaimStatus === 'pending' || user.shopClaimStatus === 'approved') {
            list.push({
              id: 'shop-status',
              title: '🏪 Shop Claim Status',
              body: user.shopClaimStatus === 'approved' ? 'Your shop claim is Approved! You can manage your salon listings from My Account.' : 'Your shop claim is currently under active review by AURA verification administrators.',
              time: 'Admin Update',
              type: 'status'
            });
          }
          setNotifications(list);
        }
      } catch {
        // Fallback notifications if fetch fails
        setNotifications([
          { id: 'fb-1', title: '📅 Active Account Reminders', body: 'Check your Bookings tab in My Account to track your scheduled appointments and WhatsApp confirmations.', time: 'Reminder', type: 'booking' }
        ]);
      }
    };

    fetchReminders();
  }, [user, open]);

  const activeNotifs = notifications.filter(n => !dismissed.includes(n.id));
  const unreadCount = activeNotifs.length;

  return (
    <div ref={popoverRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: open ? 'rgba(212,175,55,0.2)' : 'rgba(26,26,26,0.6)',
          border: '1px solid rgba(212,175,55,0.4)',
          borderRadius: '50px',
          padding: '0.4rem 0.8rem',
          color: COLOR.gold,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          fontSize: '0.85rem',
          fontFamily: FONT.sans,
          transition: 'all 0.2s',
        }}
        title="Notifications & Schedules"
      >
        <span style={{ fontSize: '1rem' }}>🔔</span>
        {unreadCount > 0 && (
          <span style={{
            background: COLOR.gold,
            color: '#000',
            fontWeight: 'bold',
            borderRadius: '12px',
            padding: '0.1rem 0.45rem',
            fontSize: '0.7rem',
            lineHeight: 1,
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: '320px',
              maxWidth: '90vw',
              background: 'rgba(18, 18, 18, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(212,175,55,0.3)',
              borderRadius: '16px',
              padding: '1rem',
              boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
              zIndex: 9999,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.6rem', marginBottom: '0.8rem' }}>
              <span style={{ color: COLOR.gold, fontWeight: 'bold', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                🔔 Notifications & Reminders
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={() => setDismissed(notifications.map(n => n.id))}
                  style={{ background: 'none', border: 'none', color: '#999', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Clear all
                </button>
              )}
            </div>

            {activeNotifs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#888', fontSize: '0.85rem' }}>
                ✨ You're all caught up! No new notifications or scheduled alerts.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '350px', overflowY: 'auto', paddingRight: '0.2rem' }}>
                {activeNotifs.map(n => (
                  <div key={n.id} style={{
                    padding: '0.75rem',
                    borderRadius: '10px',
                    background: n.type === 'ai' ? 'linear-gradient(135deg, rgba(212,175,55,0.12), rgba(138,43,226,0.1))' : 'rgba(255,255,255,0.04)',
                    borderLeft: `3px solid ${n.type === 'ai' ? '#ba55d3' : n.type === 'booking' ? COLOR.gold : '#4caf50'}`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.3rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <strong style={{ color: '#fff', fontSize: '0.82rem', lineHeight: 1.3 }}>{n.title}</strong>
                      <span style={{ color: '#aaa', fontSize: '0.65rem', whiteSpace: 'nowrap', marginLeft: '0.5rem' }}>{n.time}</span>
                    </div>
                    <p style={{ color: '#ddd', fontSize: '0.78rem', margin: 0, lineHeight: 1.4 }}>{n.body}</p>
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: '0.8rem', paddingTop: '0.6rem', borderTop: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#777' }}>
                ✦ Powered by AURA Smart AI Scheduling
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
