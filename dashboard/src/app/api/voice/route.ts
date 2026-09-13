import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * POST /api/voice — Process voice audio input
 *
 * Accepts multipart form data with an audio file.
 * Transcribes via OpenAI Whisper, then routes the transcript
 * through the Oracle keyword engine for intelligent response.
 *
 * Returns: { transcript, response, data? }
 */
export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: 'Voice processing not configured. Set OPENAI_API_KEY.' },
                { status: 503 }
            );
        }

        // ── Step 1: Extract audio from multipart form ────────────
        const formData = await request.formData();
        const audioFile = formData.get('audio');

        if (!audioFile || !(audioFile instanceof Blob)) {
            return NextResponse.json(
                { error: 'Audio file is required. Send as multipart form with "audio" field.' },
                { status: 400 }
            );
        }

        // ── Step 2: Transcribe via Whisper ───────────────────────
        const whisperForm = new FormData();
        whisperForm.append('file', audioFile, 'audio.webm');
        whisperForm.append('model', 'whisper-1');
        whisperForm.append('response_format', 'text');

        const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: whisperForm,
        });

        if (!whisperRes.ok) {
            const errText = await whisperRes.text();
            console.error('[Voice] Whisper error:', whisperRes.status, errText);
            return NextResponse.json(
                { error: 'Transcription failed' },
                { status: 502 }
            );
        }

        const transcript = (await whisperRes.text()).trim();

        if (!transcript) {
            return NextResponse.json({
                transcript: '',
                response: 'I could not detect any speech in the audio. Please try again.',
            });
        }

        // ── Step 3: Route through Oracle keyword engine ──────────
        const q = transcript.toLowerCase();
        let response = '';
        let data: unknown = null;

        if (q.includes('agent')) {
            const { data: agents, error } = await supabase
                .from('custom_agents')
                .select('id, name, status, avatar_emoji, skills')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) {
                response = 'I had trouble retrieving your agents.';
            } else {
                const count = agents?.length ?? 0;
                const active = agents?.filter(a => a.status === 'active').length ?? 0;
                response = count === 0
                    ? 'You have no custom agents yet.'
                    : `You have ${count} agent${count !== 1 ? 's' : ''}, ${active} active.`;
                data = { agents, count, active };
            }
        } else if (q.includes('session') || q.includes('usage') || q.includes('stat')) {
            const counts = await Promise.all([
                supabase.from('telemetry_events').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id).eq('event_type', 'session_start'),
                supabase.from('telemetry_events').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id).eq('event_type', 'task_completed'),
            ]);

            const sessions = counts[0].count ?? 0;
            const tasks = counts[1].count ?? 0;
            response = `Usage summary: ${sessions} sessions, ${tasks} tasks completed.`;
            data = { sessions, tasks };
        } else if (q.includes('error')) {
            const { data: errors } = await supabase
                .from('telemetry_events')
                .select('event_type, payload, created_at')
                .eq('user_id', user.id)
                .eq('event_type', 'error')
                .order('created_at', { ascending: false })
                .limit(5);

            const count = errors?.length ?? 0;
            response = count === 0
                ? 'No recent errors. Systems are clean.'
                : `Found ${count} recent error${count !== 1 ? 's' : ''}.`;
            data = { errors, count };
        } else {
            // Default system summary
            const [agentRes, sessionRes] = await Promise.all([
                supabase.from('custom_agents').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id),
                supabase.from('telemetry_events').select('id', { count: 'exact', head: true })
                    .eq('user_id', user.id).eq('event_type', 'session_start'),
            ]);

            const agentCount = agentRes.count ?? 0;
            const sessionCount = sessionRes.count ?? 0;
            response = `JARVIS here. You said: "${transcript}". System: ${agentCount} agents, ${sessionCount} sessions.`;
            data = { agents: agentCount, sessions: sessionCount };
        }

        // ── Step 4: Log voice interaction to telemetry ───────────
        await supabase.from('telemetry_events').insert({
            user_id: user.id,
            event_type: 'voice_interaction',
            payload: { transcript_length: transcript.length, matched_intent: q.includes('agent') ? 'agent' : 'general' },
        }).then(() => {}, () => {});

        return NextResponse.json({ transcript, response, data });
    } catch (err) {
        console.error('[Voice] POST error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
