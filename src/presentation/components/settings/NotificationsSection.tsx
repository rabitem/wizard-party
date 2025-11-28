'use client';

import { Bell } from 'lucide-react';

interface NotificationsSectionProps {
  enabled: boolean;
  onToggle: () => void;
}

export function NotificationsSection({ enabled, onToggle }: NotificationsSectionProps) {
  return (
    <section>
      <h3 className="flex items-center gap-2 text-xs font-medium text-amber-400/60 uppercase tracking-widest mb-4">
        <Bell className="w-4 h-4" />
        Notifications
      </h3>
      <div className="flex items-center justify-between p-3 rounded-xl bg-[#0a0a15]/50 border border-amber-500/10">
        <div>
          <span className="text-amber-100 block">Turn Alerts</span>
          <span className="text-xs text-amber-400/40">Get notified when it&apos;s your turn</span>
        </div>
        <button
          onClick={onToggle}
          className={`relative w-12 h-6 rounded-full transition-all cursor-pointer ${
            enabled ? 'bg-gradient-to-r from-amber-500 to-amber-600' : 'bg-[#15152a] border border-amber-500/20'
          }`}
        >
          <div
            className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow-md ${
              enabled ? 'translate-x-7' : 'translate-x-1'
            }`}
          />
        </button>
      </div>
    </section>
  );
}
