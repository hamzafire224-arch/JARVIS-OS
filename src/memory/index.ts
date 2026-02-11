/**
 * JARVIS Memory Module Exports
 */

export { MemoryManager, getMemoryManager, initializeMemory } from './MemoryManager.js';
export { SessionCompactor, type CompactionResult } from './SessionCompactor.js';
export {
    PreferenceLearner,
    getPreferenceLearner,
    resetPreferenceLearner,
    type UserPreferences,
    type FeedbackEntry,
    type PreferenceUpdate,
} from './PreferenceLearner.js';
export {
    MemoryReranker,
    getMemoryReranker,
    resetMemoryReranker,
    type MemoryEntry,
    type RerankingConfig,
    type ScoredEntry,
} from './MemoryReranker.js';

// Hierarchical memory exports
export {
    EpisodicMemory,
    getEpisodicMemory,
    initializeEpisodicMemory,
    SessionCompactor as EpisodeCompactor,
    type Episode,
    type EpisodeHighlight,
    type EpisodeQuery,
} from './EpisodicMemory.js';

export {
    HierarchicalMemory,
    getHierarchicalMemory,
    initializeHierarchicalMemory,
    type HierarchicalMemoryOptions,
    type MemoryContext,
    type MemoryRetrievalQuery,
} from './HierarchicalMemory.js';
