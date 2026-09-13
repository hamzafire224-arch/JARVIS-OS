import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// ── POST /api/swarm/nodes/[id]/ingest ───────────────────────────
// Handles asset ingestion onto an agent node.
// Accepts: { assetType, assetName, content?, refId?, clusters? }
// Creates lineage entries for the ingested asset.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: nodeId } = await params;
    const body = await request.json();
    const {
      assetType,
      assetName,
      content,
      refId,
      clusters,
    } = body as {
      assetType: 'document' | 'skill' | 'memory' | 'url';
      assetName: string;
      content?: string;
      refId?: string;
      clusters?: Array<{ label: string; weight: number }>;
    };

    if (!assetType || !assetName) {
      return NextResponse.json(
        { error: 'assetType and assetName are required' },
        { status: 400 },
      );
    }

    // Verify node ownership
    const { data: node, error: nodeErr } = await supabase
      .from('swarm_nodes')
      .select('id, workspace_id, label, config')
      .eq('id', nodeId)
      .eq('user_id', user.id)
      .single();

    if (nodeErr || !node) {
      return NextResponse.json({ error: 'Node not found' }, { status: 404 });
    }

    // Map assetType → lineage source_type
    const sourceTypeMap: Record<string, string> = {
      document: 'document',
      skill: 'marketplace_skill',
      memory: 'vector_memory',
      url: 'scraped_url',
    };
    const sourceType = sourceTypeMap[assetType] ?? 'document';

    // Update node config with ingested asset metadata
    const currentConfig = (node.config as Record<string, unknown>) ?? {};
    const ingestedAssets = (currentConfig.ingestedAssets as Array<Record<string, unknown>>) ?? [];

    ingestedAssets.push({
      type: assetType,
      name: assetName,
      refId: refId ?? null,
      clusters: clusters ?? [],
      ingestedAt: new Date().toISOString(),
    });

    const { error: updateErr } = await supabase
      .from('swarm_nodes')
      .update({
        config: { ...currentConfig, ingestedAssets },
        updated_at: new Date().toISOString(),
      })
      .eq('id', nodeId);

    if (updateErr) {
      return NextResponse.json(
        { error: 'Failed to update node config' },
        { status: 500 },
      );
    }

    // Find the most recent execution step for this node (if any active execution exists)
    // to attach lineage entries to
    const { data: recentStep } = await supabase
      .from('swarm_execution_steps')
      .select('id')
      .eq('node_id', nodeId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let lineageEntry = null;

    if (recentStep) {
      // Create a lineage entry linked to the execution step
      const { data: lineage, error: lineageErr } = await supabase
        .from('lineage_entries')
        .insert({
          execution_step_id: recentStep.id,
          user_id: user.id,
          source_type: sourceType,
          source_ref: refId ?? assetName,
          source_snippet: content
            ? content.substring(0, 500)
            : `Ingested ${assetType}: ${assetName}`,
          relevance_score: 1.0, // Direct ingestion = max relevance
        })
        .select()
        .single();

      if (!lineageErr) {
        lineageEntry = lineage;
      }
    }

    return NextResponse.json({
      success: true,
      nodeId,
      assetType,
      assetName,
      lineageEntry,
      totalAssets: ingestedAssets.length,
    });
  } catch (err) {
    console.error('[swarm/nodes/ingest] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
