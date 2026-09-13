'use client';

import React, { memo, useCallback } from 'react';
import { useErrorToast } from '@/components/ErrorToast';

interface NodePaletteProps {
  workspaceId: string;
  onNodeAdded?: () => void;
}

interface PaletteItem {
  type: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'agent', label: 'Agent', icon: '🤖', color: '#8b5cf6', description: 'Custom AI agent' },
  { type: 'ingest_whatsapp', label: 'WhatsApp', icon: '💬', color: '#10b981', description: 'WhatsApp channel' },
  { type: 'ingest_instagram', label: 'Instagram', icon: '📸', color: '#10b981', description: 'Instagram DMs' },
  { type: 'ingest_web', label: 'Web Scraper', icon: '🌐', color: '#10b981', description: 'Web data source' },
  { type: 'supervisor', label: 'Supervisor', icon: '🛡️', color: '#f59e0b', description: 'Recheck gate' },
  { type: 'output_response', label: 'Response', icon: '💬', color: '#3b82f6', description: 'Send response' },
  { type: 'output_email', label: 'Email', icon: '📧', color: '#3b82f6', description: 'Email output' },
  { type: 'output_webhook', label: 'Webhook', icon: '🔗', color: '#3b82f6', description: 'HTTP webhook' },
  { type: 'skill', label: 'Skill', icon: '⚡', color: '#ec4899', description: 'Marketplace skill' },
  { type: 'document', label: 'Document', icon: '📄', color: '#06b6d4', description: 'Knowledge base' },
];

function NodePaletteComponent({ workspaceId, onNodeAdded }: NodePaletteProps) {
  const { showError } = useErrorToast();
  const handleAddNode = useCallback(async (item: PaletteItem) => {
    // Place new node at a slightly randomized center position
    const posX = 200 + Math.random() * 400;
    const posY = 100 + Math.random() * 300;

    try {
      const res = await fetch('/api/swarm/nodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          nodeType: item.type,
          label: item.label,
          positionX: posX,
          positionY: posY,
        }),
      });

      if (res.ok) {
        const { node } = await res.json();
        // Add to Zustand store immediately for instant feedback
        const { useSwarmStore } = await import('@/lib/stores/swarm-store');
        useSwarmStore.getState().addNode(node);
        onNodeAdded?.();
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'An error occurred');
    }
  }, [workspaceId, onNodeAdded, showError]);

  return (
    <div className="node-palette">
      <div className="node-palette-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        Add Node
      </div>
      <div className="node-palette-grid">
        {PALETTE_ITEMS.map((item) => (
          <button
            key={item.type}
            className="node-palette-item"
            onClick={() => handleAddNode(item)}
            title={item.description}
          >
            <span
              className="node-palette-color"
              style={{ background: item.color }}
            />
            <span className="node-palette-icon">{item.icon}</span>
            <span className="node-palette-label">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export const NodePalette = memo(NodePaletteComponent);
