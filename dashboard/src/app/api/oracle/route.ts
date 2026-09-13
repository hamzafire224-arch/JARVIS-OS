import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/oracle — Ask the oracle about system state
 * Body: { query: string }
 *
 * Uses keyword matching to determine what data to fetch,
 * then formats it into a natural language response.
 *
 * Supported query categories:
 *   agent, session/usage/stat, error, memory, skill/marketplace,
 *   license, plan/subscription, message/inbox, competitor/research/market,
 *   voice/audio, and general system summary.
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query } = await request.json();

        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return NextResponse.json({ error: 'Query is required' }, { status: 400 });
        }

        const q = query.toLowerCase();
        let response = '';
        let data: unknown = null;

        // ── Agent queries ──────────────────────────────────────────────────
        if (q.includes('agent')) {
            const { data: agents, error } = await supabase
                .from('custom_agents')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                response = 'I had trouble retrieving your agents. Please try again.';
                data = { error: error.message };
            } else {
                const count = agents?.length ?? 0;
                const training = agents?.filter(a => a.status === 'training').length ?? 0;
                const active = agents?.filter(a => a.status === 'active').length ?? 0;

                if (count === 0) {
                    response = 'You have no custom agents yet. Create one from the Agents page to get started.';
                } else {
                    response = `You have ${count} custom agent${count !== 1 ? 's' : ''}. ${active} active, ${training} in training.`;
                    if (agents && agents.length > 0) {
                        const names = agents.slice(0, 5).map(a => `${a.avatar_emoji} ${a.name}`).join(', ');
                        response += ` Recent: ${names}.`;
                    }
                }
                data = { agents, count, active, training };
            }
        }
        // ── Session / Usage / Stats queries ────────────────────────────────
        else if (q.includes('session') || q.includes('usage') || q.includes('stat')) {
            const counts = await Promise.all([
                supabase.from('telemetry_events').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id).eq('event_type', 'session_start'),
                supabase.from('telemetry_events').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id).eq('event_type', 'task_completed'),
                supabase.from('telemetry_events').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id).eq('event_type', 'tool_used'),
            ]);

            const sessions = counts[0].count ?? 0;
            const tasks = counts[1].count ?? 0;
            const tools = counts[2].count ?? 0;

            response = `Usage summary: ${sessions} sessions, ${tasks} tasks completed, ${tools} tool invocations.`;
            data = { sessions, tasks, tools };
        }
        // ── Error queries ──────────────────────────────────────────────────
        else if (q.includes('error')) {
            const { data: errors, error: fetchError } = await supabase
                .from('telemetry_events')
                .select('*')
                .eq('user_id', user.id)
                .eq('event_type', 'error')
                .order('created_at', { ascending: false })
                .limit(10);

            if (fetchError) {
                response = 'Could not retrieve error logs.';
                data = { error: fetchError.message };
            } else {
                const count = errors?.length ?? 0;
                response = count === 0
                    ? 'No recent errors found. Systems are running cleanly.'
                    : `Found ${count} recent error${count !== 1 ? 's' : ''}. Review the data for details.`;
                data = { errors, count };
            }
        }
        // ── Memory queries ─────────────────────────────────────────────────
        else if (q.includes('memory') || q.includes('memories')) {
            const { count, error: countError } = await supabase
                .from('memory_vectors')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id);

            if (countError) {
                response = 'Could not access memory store.';
                data = { error: countError.message };
            } else {
                const total = count ?? 0;
                response = total === 0
                    ? 'Your memory store is empty. JARVIS will build memories as you interact.'
                    : `You have ${total} memory vector${total !== 1 ? 's' : ''} stored in the cloud.`;
                data = { memory_count: total };
            }
        }
        // ── Skill / Marketplace queries ────────────────────────────────────
        else if (q.includes('skill') || q.includes('marketplace')) {
            const { count, error: countError } = await supabase
                .from('marketplace_skills')
                .select('id', { count: 'exact', head: true });

            if (countError) {
                response = 'Could not access the marketplace.';
                data = { error: countError.message };
            } else {
                const total = count ?? 0;
                response = `The marketplace has ${total} community-published skill${total !== 1 ? 's' : ''}, plus 8 featured skills built-in.`;
                data = { marketplace_count: total, featured_count: 8 };
            }
        }
        // ── License queries ────────────────────────────────────────────────
        else if (q.includes('license')) {
            const { data: licenses, error: licError } = await supabase
                .from('licenses')
                .select('license_key, variant, is_active, last_validated_at')
                .eq('user_id', user.id);

            if (licError) {
                response = 'Could not retrieve license information.';
                data = { error: licError.message };
            } else {
                const count = licenses?.length ?? 0;
                const active = licenses?.filter(l => l.is_active).length ?? 0;
                response = count === 0
                    ? 'No license keys found for your account.'
                    : `You have ${count} license key${count !== 1 ? 's' : ''} (${active} active).`;
                data = { licenses, count, active };
            }
        }
        // ── Plan / Subscription queries ────────────────────────────────────
        else if (q.includes('plan') || q.includes('subscription')) {
            const { data: sub, error: subError } = await supabase
                .from('subscriptions')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (subError || !sub) {
                response = 'You are on the free Balanced plan. Upgrade to Productivity for $20/mo.';
                data = { plan: 'balanced', status: 'free' };
            } else {
                response = `You are on the ${sub.plan} plan (status: ${sub.status}).`;
                if (sub.current_period_end) {
                    response += ` Current period ends ${new Date(sub.current_period_end).toLocaleDateString()}.`;
                }
                data = sub;
            }
        }
        // ── Message / Inbox / Omnichannel queries ──────────────────────────
        else if (q.includes('message') || q.includes('inbox') || q.includes('omnichannel')) {
            const [whatsappRes, instagramRes, webRes, recentRes] = await Promise.all([
                supabase.from('omnichannel_messages').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id).eq('channel', 'whatsapp'),
                supabase.from('omnichannel_messages').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id).eq('channel', 'instagram'),
                supabase.from('omnichannel_messages').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id).eq('channel', 'web'),
                supabase.from('omnichannel_messages').select('channel, body, sender_name, created_at')
                    .eq('user_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5),
            ]);

            const whatsapp = whatsappRes.count ?? 0;
            const instagram = instagramRes.count ?? 0;
            const web = webRes.count ?? 0;
            const total = whatsapp + instagram + web;
            const recent = recentRes.data || [];

            response = total === 0
                ? 'No omnichannel messages yet. Connect your WhatsApp or Instagram to start receiving messages.'
                : `Inbox: ${total} total messages — ${whatsapp} WhatsApp, ${instagram} Instagram, ${web} web.`;

            if (recent.length > 0) {
                response += ` Latest from: ${recent.slice(0, 3).map(m => m.sender_name || m.channel).join(', ')}.`;
            }

            data = { total, whatsapp, instagram, web, recent };
        }
        // ── Competitor / Research / Market queries ──────────────────────────
        else if (q.includes('competitor') || q.includes('research') || q.includes('market')) {
            const [competitorRes, gapRes, reportRes] = await Promise.all([
                supabase.from('competitors').select('id, name, industry', { count: 'exact' })
                    .eq('user_id', user.id),
                supabase.from('market_gaps').select('id, title, priority', { count: 'exact' })
                    .eq('user_id', user.id),
                supabase.from('research_reports').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id),
            ]);

            const competitors = competitorRes.data || [];
            const gaps = gapRes.data || [];
            const reportCount = reportRes.count ?? 0;

            const criticalGaps = gaps.filter(g => g.priority === 'critical').length;

            response = `Market Intelligence: ${competitors.length} competitor${competitors.length !== 1 ? 's' : ''} tracked, ${gaps.length} gap${gaps.length !== 1 ? 's' : ''} identified${criticalGaps > 0 ? ` (${criticalGaps} critical)` : ''}, ${reportCount} report${reportCount !== 1 ? 's' : ''} generated.`;

            if (competitors.length > 0) {
                response += ` Tracking: ${competitors.slice(0, 3).map(c => c.name).join(', ')}.`;
            }

            data = { competitors, gaps, reportCount, criticalGaps };
        }
        // ── Voice / Audio queries ──────────────────────────────────────────
        else if (q.includes('voice') || q.includes('audio')) {
            const { count } = await supabase
                .from('telemetry_events')
                .select('id', { count: 'exact', head: true })
                .eq('user_id', user.id)
                .eq('event_type', 'voice_interaction');

            const voiceCount = count ?? 0;
            response = voiceCount === 0
                ? 'No voice interactions recorded yet. Use the microphone to talk to JARVIS.'
                : `You have ${voiceCount} voice interaction${voiceCount !== 1 ? 's' : ''} on record.`;
            data = { voice_interactions: voiceCount };
        }
        // ── Default: General system summary ────────────────────────────────
        else {
            const [agentResult, sessionResult, subResult, msgResult] = await Promise.all([
                supabase.from('custom_agents').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id),
                supabase.from('telemetry_events').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id).eq('event_type', 'session_start'),
                supabase.from('subscriptions').select('plan, status')
                    .eq('user_id', user.id).single(),
                supabase.from('omnichannel_messages').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id),
            ]);

            const agentCount = agentResult.count ?? 0;
            const sessionCount = sessionResult.count ?? 0;
            const plan = subResult.data?.plan ?? 'balanced';
            const status = subResult.data?.status ?? 'free';
            const messageCount = msgResult.count ?? 0;

            response = `JARVIS System Summary: ${agentCount} custom agent${agentCount !== 1 ? 's' : ''}, ${sessionCount} session${sessionCount !== 1 ? 's' : ''} logged, ${messageCount} omnichannel message${messageCount !== 1 ? 's' : ''}. Plan: ${plan} (${status}).`;
            data = { agents: agentCount, sessions: sessionCount, messages: messageCount, plan, status };
        }

        return NextResponse.json({ response, data });
    } catch (err) {
        console.error('[Oracle] POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
