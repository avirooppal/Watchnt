
export interface FeatureFlags {
    realtimeCopilot: boolean;
    knowledgeGraphV2: boolean;
    semanticTimeline: boolean;
    autoEmail: boolean;
    meetingCoach: boolean;
}

export const defaultFeatureFlags: FeatureFlags = {
    realtimeCopilot: false,
    knowledgeGraphV2: false,
    semanticTimeline: true,
    autoEmail: false,
    meetingCoach: false
};
