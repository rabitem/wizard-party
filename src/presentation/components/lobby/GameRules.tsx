'use client';

import { Info, ChevronDown } from 'lucide-react';

export function GameRules() {
  return (
    <div className="px-6 pb-6 pt-2 border-t border-amber-500/10">
      <details className="group">
        <summary className="flex items-center justify-between cursor-pointer text-sm text-amber-200/60 hover:text-amber-200 transition-colors list-none">
          <span className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            Game Rules
          </span>
          <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" />
        </summary>
        <ul className="mt-3 space-y-1.5 text-xs text-amber-200/40 pl-6">
          <li>• 60 cards: 4 suits (1-13) + 4 Wizards + 4 Jesters</li>
          <li>• Bid how many tricks you&apos;ll win each round</li>
          <li>• Wizards always win, Jesters always lose</li>
          <li>• Exact bid: +20 + 10/trick. Miss: -10/trick off</li>
        </ul>
      </details>
    </div>
  );
}
