'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sparkles } from 'lucide-react';
import { getRandomFunFact, type GlobalStats } from '@/lib/lobby-fun-facts';

const ROTATION_INTERVAL = 8000; // Rotate every 8 seconds

export function LobbyFunFacts() {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [currentFact, setCurrentFact] = useState<string>('');
  const [isAnimating, setIsAnimating] = useState(false);

  // Fetch global stats once on mount
  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch global stats:', error);
      }
    }
    fetchStats();
  }, []);

  // Get a new random fact with animation
  const rotateFact = useCallback(() => {
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentFact(getRandomFunFact(stats));
      setIsAnimating(false);
    }, 300);
  }, [stats]);

  // Set initial fact and start rotation
  useEffect(() => {
    setCurrentFact(getRandomFunFact(stats));

    const interval = setInterval(rotateFact, ROTATION_INTERVAL);
    return () => clearInterval(interval);
  }, [stats, rotateFact]);

  return (
    <div
      className="px-4 py-3 bg-gradient-to-r from-purple-500/10 via-amber-500/5 to-purple-500/10 border-t border-amber-500/10 cursor-pointer hover:bg-amber-500/5 transition-colors"
      onClick={rotateFact}
      title="Click for another fact"
    >
      <div className="flex items-start gap-3 max-w-lg mx-auto">
        <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <p
          className={`text-sm text-amber-200/70 italic transition-all duration-300 ${
            isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
        >
          {currentFact}
        </p>
      </div>
    </div>
  );
}
