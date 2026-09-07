import { STANDALONE_TEACHBUDDY_ROUTES } from '@contracts/workbuddy/product-brand';
import type { WorkBuddyCapabilityId, WorkBuddyExperienceProfile } from './workbuddy-experience-profile';

const STANDALONE_CAPABILITY_IDS: readonly WorkBuddyCapabilityId[] = Object.freeze([
  'skills',
  'tools',
  'content',
  'files',
  'schedules',
  'settings',
]);

export function createStandaloneTeacherWorkBuddyExperience(accountId?: string): WorkBuddyExperienceProfile {
  return Object.freeze({
    id: 'standalone-teacher',
    productBoundary: 'standalone-consumer',
    basePath: STANDALONE_TEACHBUDDY_ROUTES.app,
    sessionNamespace: accountId ? `standalone-teacher:${accountId}` : 'standalone-teacher:anonymous',
    visibleCapabilityIds: STANDALONE_CAPABILITY_IDS,
    navigationCapabilityIds: STANDALONE_CAPABILITY_IDS,
    launchContext: null,
    returnTarget: Object.freeze({ label: '返回官网', to: STANDALONE_TEACHBUDDY_ROUTES.root }),
    search: '',
  });
}
