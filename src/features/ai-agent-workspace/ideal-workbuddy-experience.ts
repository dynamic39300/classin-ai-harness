import type { WorkBuddyCapabilityId, WorkBuddyExperienceProfile } from './workbuddy-experience-profile';

const IDEAL_CAPABILITY_IDS: readonly WorkBuddyCapabilityId[] = Object.freeze([
  'skills',
  'agentin',
  'tools',
  'content',
  'files',
  'schedules',
]);

const IDEAL_NAVIGATION_IDS: readonly WorkBuddyCapabilityId[] = Object.freeze([
  'skills', 'agentin', 'files', 'tools', 'schedules',
]);

export function createIdealWorkBuddyExperience(): WorkBuddyExperienceProfile {
  return Object.freeze({
    id: 'ideal-full',
    productBoundary: 'classin-integrated',
    basePath: '/teacher/ai-agent',
    sessionNamespace: 'ideal-full',
    visibleCapabilityIds: IDEAL_CAPABILITY_IDS,
    navigationCapabilityIds: IDEAL_NAVIGATION_IDS,
    launchContext: null,
    returnTarget: null,
    search: '',
  });
}
