'use client';

import { create } from 'zustand';

// ── Types ───────────────────────────────────────────────────────
export interface ConsoleEntry {
  id: string;
  timestamp: string;
  type: 'task' | 'recheck' | 'approval' | 'delegation' | 'error' | 'output' | 'system';
  agentName: string;
  message: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  data?: Record<string, unknown>;
}

interface ConsoleState {
  entries: ConsoleEntry[];
  maxEntries: number;
  isOpen: boolean;

  // Actions
  addEntry: (entry: ConsoleEntry) => void;
  addEntries: (entries: ConsoleEntry[]) => void;
  clear: () => void;
  toggle: () => void;
  setOpen: (open: boolean) => void;
}

// ── Ring Buffer Size ────────────────────────────────────────────
const MAX_CONSOLE_ENTRIES = 500;

// ── Store ───────────────────────────────────────────────────────
export const useConsoleStore = create<ConsoleState>((set) => ({
  entries: [],
  maxEntries: MAX_CONSOLE_ENTRIES,
  isOpen: false,

  addEntry: (entry) =>
    set((state) => {
      const newEntries = [...state.entries, entry];
      // Ring buffer: drop oldest if over limit
      if (newEntries.length > state.maxEntries) {
        return { entries: newEntries.slice(-state.maxEntries) };
      }
      return { entries: newEntries };
    }),

  addEntries: (entries) =>
    set((state) => {
      const newEntries = [...state.entries, ...entries];
      if (newEntries.length > state.maxEntries) {
        return { entries: newEntries.slice(-state.maxEntries) };
      }
      return { entries: newEntries };
    }),

  clear: () => set({ entries: [] }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  setOpen: (open) => set({ isOpen: open }),
}));
