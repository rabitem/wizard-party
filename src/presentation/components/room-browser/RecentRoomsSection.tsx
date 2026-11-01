'use client';

import { motion } from 'motion/react';
import { Clock, Users, ChevronRight } from 'lucide-react';
import type { RecentRoom } from './utils';

interface RecentRoomsSectionProps {
  recentRooms: RecentRoom[];
  canPlay: boolean;
  onJoinRoom: (roomId: string) => void;
}

export function RecentRoomsSection({ recentRooms, canPlay, onJoinRoom }: RecentRoomsSectionProps) {
  if (recentRooms.length === 0) {
    return null;
  }

  return (
    <motion.section
      className="mb-6 sm:mb-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center gap-2 mb-3 px-1">
        <Clock className="w-3.5 h-3.5 text-amber-500/50" />
        <h2 className="text-amber-400/60 text-xs uppercase tracking-wider" style={{ fontFamily: 'Georgia, serif' }}>
          Recent
        </h2>
      </div>

      <div className="space-y-2">
        {recentRooms.slice(0, 3).map((room) => (
          <button
            key={room.id}
            onClick={() => onJoinRoom(room.id)}
            disabled={!canPlay}
            className="w-full group relative flex items-center gap-3 p-3 rounded border border-amber-800/20 hover:border-amber-700/40 hover:bg-amber-900/15 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all text-left active:scale-[0.99]"
            style={{
              background: 'linear-gradient(180deg, color-mix(in srgb, color-mix(in srgb, var(--surface), black 5%) 60%, transparent) 0%, color-mix(in srgb, color-mix(in srgb, var(--surface), black 31%) 60%, transparent) 100%)',
            }}
            suppressHydrationWarning
          >
            {/* Corner accents */}
            <div className="absolute top-0.5 left-0.5 w-1.5 h-1.5 border-t border-l border-amber-600/20 pointer-events-none" />
            <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 border-t border-r border-amber-600/20 pointer-events-none" />
            <div className="absolute bottom-0.5 left-0.5 w-1.5 h-1.5 border-b border-l border-amber-600/20 pointer-events-none" />
            <div className="absolute bottom-0.5 right-0.5 w-1.5 h-1.5 border-b border-r border-amber-600/20 pointer-events-none" />
            <div className="w-8 h-8 rounded-lg bg-amber-900/30 border border-amber-700/20 flex items-center justify-center flex-shrink-0 relative">
              <Users className="w-4 h-4 text-amber-500/60" />
            </div>
            <div className="flex-1 min-w-0 relative">
              <div className="text-amber-200/80 text-sm truncate" style={{ fontFamily: 'Georgia, serif' }}>
                {room.name}
              </div>
              <div className="text-amber-600/40 text-[10px] font-mono">
                {room.id}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-amber-600/30 group-hover:text-amber-400 transition-colors flex-shrink-0 relative" />
          </button>
        ))}
      </div>
    </motion.section>
  );
}
