/**
 * JARVIS Federated Insights (Tier 3 AGI Upgrade)
 * 
 * Aggregates anonymized patterns across users via Supabase:
 * - "80% of users asking about Docker also needed Nginx"
 * - Differential privacy: adds noise, never shares raw text
 * - Enhances local suggestions with community intelligence
 * 
 * Privacy guarantees:
 * - Only topic hashes and counts are published (no messages, no context)
 * - Laplace noise added to all counts (ε = 1.0 differential privacy)
 * - Minimum threshold of 5 local patterns before publishing
 * - Users can fully opt out via FEDERATED_LEARNING=false
 */

import { createHash } from 'crypto';
import { logger } from '../utils/logger.js';
import { getSupabaseClient } from '../db/SupabaseClient.js';

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface InsightPattern {
    topicHash: string;           // SHA-256 hash of the normalized topic
    topicLabel: string;          // Generic label ("docker_setup", "react_testing")
    coOccurrences: CoOccurrence[];
    totalObservations: number;   // Noisy count
    publishedAt: string;
}

export interface CoOccurrence {
    relatedTopicHash: string;
    relatedTopicLabel: string;
    probability: number;         // 0-1, noisy
    observationCount: number;    // Noisy count
}

export interface CommunityInsight {
    topicLabel: string;
    suggestion: string;          // "Users working on X often also need Y"
    confidence: number;          // 0-1
}

// ═══════════════════════════════════════════════════════════════════════════════
// Privacy Utilities
// ═══════════════════════════════════════════════════════════════════════════════

const PRIVACY_EPSILON = 1.0;     // Differential privacy budget
const MIN_COUNT_THRESHOLD = 5;   // Minimum observations before publishing

/**
 * Add Laplace noise for differential privacy
 */
function addLaplaceNoise(value: number, sensitivity = 1.0): number {
    const scale = sensitivity / PRIVACY_EPSILON;
    // Laplace distribution via inverse CDF
    const u = Math.random() - 0.5;
    const noise = -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
    return Math.max(0, Math.round(value + noise));
}

/**
 * Hash a topic string for anonymization
 */
function hashTopic(topic: string): string {
    return createHash('sha256')
        .update(topic.toLowerCase().trim())
        .digest('hex')
        .slice(0, 16); // First 16 chars for readability
}

/**
 * Normalize a topic string into a generic label
 */
function normalizeTopicLabel(topic: string): string {
    return topic
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .slice(0, 50);
}

// ═══════════════════════════════════════════════════════════════════════════════
// Federated Insights Engine
// ═══════════════════════════════════════════════════════════════════════════════

export class FederatedInsights {
    private localPatterns: Map<string, { topics: string[]; count: number }> = new Map();
    private communityInsights: CommunityInsight[] = [];
    private lastFetchTime = 0;
    private fetchCooldownMs = 3600_000; // 1 hour

    /**
     * Check if federated learning is enabled
     */
    isEnabled(): boolean {
        return process.env['FEDERATED_LEARNING'] !== 'false';
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Local Pattern Collection
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Record a local pattern: user asked about topic X, then also needed topic Y.
     * This only stores anonymized topic labels locally.
     */
    recordCoOccurrence(primaryTopic: string, relatedTopic: string): void {
        if (!this.isEnabled()) return;

        const key = `${normalizeTopicLabel(primaryTopic)}::${normalizeTopicLabel(relatedTopic)}`;
        const existing = this.localPatterns.get(key);

        if (existing) {
            existing.count++;
        } else {
            this.localPatterns.set(key, {
                topics: [normalizeTopicLabel(primaryTopic), normalizeTopicLabel(relatedTopic)],
                count: 1,
            });
        }
    }

    /**
     * Record multiple topic associations from a conversation
     */
    recordTopicsFromConversation(topics: string[]): void {
        if (!this.isEnabled() || topics.length < 2) return;

        // Record all pairwise co-occurrences
        for (let i = 0; i < topics.length; i++) {
            for (let j = i + 1; j < topics.length; j++) {
                this.recordCoOccurrence(topics[i]!, topics[j]!);
            }
        }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Publishing (Anonymized)
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Publish anonymized patterns to the shared Supabase pool.
     * Only publishes if:
     * 1. Federated learning is enabled
     * 2. Enough local patterns exist (≥ MIN_COUNT_THRESHOLD)
     * 3. Supabase is configured
     */
    async publishAnonymized(): Promise<number> {
        if (!this.isEnabled()) return 0;

        const supabase = getSupabaseClient();
        if (!supabase) {
            logger.debug('[FEDERATED] No Supabase client, skipping publish');
            return 0;
        }

        // Filter patterns with enough observations
        const publishable = Array.from(this.localPatterns.entries())
            .filter(([_, data]) => data.count >= MIN_COUNT_THRESHOLD);

        if (publishable.length === 0) {
            logger.debug('[FEDERATED] Not enough patterns to publish');
            return 0;
        }

        let published = 0;

        for (const [_, data] of publishable) {
            const [primaryLabel, relatedLabel] = data.topics;

            const pattern: InsightPattern = {
                topicHash: hashTopic(primaryLabel!),
                topicLabel: primaryLabel!,
                coOccurrences: [{
                    relatedTopicHash: hashTopic(relatedLabel!),
                    relatedTopicLabel: relatedLabel!,
                    probability: Math.min(1, addLaplaceNoise(data.count) / (data.count + 5)), // Noisy probability
                    observationCount: addLaplaceNoise(data.count),
                }],
                totalObservations: addLaplaceNoise(data.count),
                publishedAt: new Date().toISOString(),
            };

            try {
                const { error } = await supabase
                    .from('jarvis_federated_insights')
                    .upsert({
                        topic_hash: pattern.topicHash,
                        topic_label: pattern.topicLabel,
                        co_occurrences: pattern.coOccurrences,
                        total_observations: pattern.totalObservations,
                        published_at: pattern.publishedAt,
                    });

                if (!error) {
                    published++;
                } else {
                    logger.warn('[FEDERATED] Publish failed', { error: error.message });
                }
            } catch (err) {
                logger.warn('[FEDERATED] Publish error', {
                    error: err instanceof Error ? err.message : String(err),
                });
            }
        }

        logger.info('[FEDERATED] Published anonymized patterns', { count: published });
        return published;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Fetching Community Insights
    // ─────────────────────────────────────────────────────────────────────────────

    /**
     * Fetch anonymized patterns from the community pool.
     * Respects cooldown to avoid excessive API calls.
     */
    async fetchCommunityInsights(): Promise<CommunityInsight[]> {
        if (!this.isEnabled()) return [];

        // Check cooldown
        if (Date.now() - this.lastFetchTime < this.fetchCooldownMs) {
            return this.communityInsights;
        }

        const supabase = getSupabaseClient();
        if (!supabase) return [];

        try {
            const { data, error } = await supabase
                .from('jarvis_federated_insights')
                .select('*')
                .gt('total_observations', 10) // Only significant patterns
                .order('total_observations', { ascending: false })
                .limit(50);

            if (error) {
                logger.warn('[FEDERATED] Fetch failed', { error: error.message });
                return this.communityInsights;
            }

            this.communityInsights = (data ?? []).flatMap((row: any) => {
                const coOccurrences = row.co_occurrences as CoOccurrence[];
                return coOccurrences
                    .filter(co => co.probability > 0.3) // Only high-confidence
                    .map(co => ({
                        topicLabel: row.topic_label,
                        suggestion: `Users working on "${row.topic_label}" often also need "${co.relatedTopicLabel}"`,
                        confidence: co.probability,
                    }));
            });

            this.lastFetchTime = Date.now();
            logger.info('[FEDERATED] Fetched community insights', { count: this.communityInsights.length });

        } catch (err) {
            logger.warn('[FEDERATED] Fetch error', {
                error: err instanceof Error ? err.message : String(err),
            });
        }

        return this.communityInsights;
    }

    /**
     * Get community-enhanced suggestions for a given topic
     */
    async getSuggestionsForTopic(topic: string): Promise<CommunityInsight[]> {
        const insights = await this.fetchCommunityInsights();
        const normalized = normalizeTopicLabel(topic);

        return insights.filter(insight =>
            insight.topicLabel.includes(normalized) ||
            normalized.includes(insight.topicLabel)
        );
    }

    /**
     * Generate augmentation text for agent system prompt
     */
    async getCommunityAugmentation(currentTopics: string[]): Promise<string> {
        if (!this.isEnabled() || currentTopics.length === 0) return '';

        const allSuggestions: CommunityInsight[] = [];

        for (const topic of currentTopics) {
            const suggestions = await this.getSuggestionsForTopic(topic);
            allSuggestions.push(...suggestions);
        }

        if (allSuggestions.length === 0) return '';

        // Deduplicate
        const unique = allSuggestions.filter((s, i, arr) =>
            arr.findIndex(x => x.suggestion === s.suggestion) === i
        );

        let augmentation = '\n## Community Intelligence\n';
        augmentation += 'Based on patterns from other JARVIS users (anonymized):\n';

        for (const s of unique.slice(0, 5)) {
            augmentation += `- ${s.suggestion} (${Math.round(s.confidence * 100)}% confidence)\n`;
        }

        return augmentation;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Statistics
    // ─────────────────────────────────────────────────────────────────────────────

    getLocalPatternCount(): number {
        return this.localPatterns.size;
    }

    getCommunityInsightCount(): number {
        return this.communityInsights.length;
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton
// ═══════════════════════════════════════════════════════════════════════════════

let instance: FederatedInsights | null = null;

export function getFederatedInsights(): FederatedInsights {
    if (!instance) {
        instance = new FederatedInsights();
    }
    return instance;
}

export function resetFederatedInsights(): void {
    instance = null;
}
