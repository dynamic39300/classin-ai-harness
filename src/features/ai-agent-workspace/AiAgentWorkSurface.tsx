import { Navigate, useLocation, useParams } from 'react-router-dom';
import { AgentRuntimeSurface } from '@features/agent-runtime';
import { AgentInMarketWorkspace } from '@features/agentin-market';
import { getVisibleWorkBuddyCapability, getWorkBuddyCapability } from './capability-registry';
import { CapabilityWorkspace } from './CapabilityWorkspace';
import { useWorkBuddyExperience } from './workbuddy-experience-context';
import { profileAllowsCapability, workBuddyNewTaskPath } from './workbuddy-experience-profile';

type NewTaskNavigationState = Readonly<{
  capabilityTitle?: string;
  intent?: 'context' | 'context-attached' | 'adapt' | 'schedule' | 'skill-find' | 'skill-create' | 'skill-use';
  prompt?: string;
}>;

function promptFromNavigationState(state: NewTaskNavigationState | null) {
  if (!state) return '';
  if (state.prompt) return state.prompt;
  if (!state.capabilityTitle) return '';
  if (state.intent === 'schedule') return `立即执行定时任务“${state.capabilityTitle}”，并生成结果。`;
  if (state.intent === 'adapt') return `基于“${state.capabilityTitle}”改编一份新的智能课件。`;
  if (state.intent === 'context-attached') return `请基于“${state.capabilityTitle}”继续完成：`;
  return `使用“${state.capabilityTitle}”帮我完成：`;
}

export function AiAgentWorkSurface() {
  const profile = useWorkBuddyExperience();
  const location = useLocation();
  const { runId, section } = useParams();
  const newTaskPath = workBuddyNewTaskPath(profile);

  if (runId) return <Navigate to={newTaskPath} replace />;
  if (section === 'content' && profile.productBoundary === 'classin-integrated') return <Navigate to="/teacher/space/teacherin" replace />;
  const capability = section && profileAllowsCapability(profile, section)
    ? profile.id === 'standalone-teacher' ? getWorkBuddyCapability(section) : getVisibleWorkBuddyCapability(section)
    : undefined;
  if (capability?.id === 'agentin') return <AgentInMarketWorkspace />;
  if (capability) return <CapabilityWorkspace key={capability.id} surface={capability.id} />;
  if (section) return <Navigate to={newTaskPath} replace />;

  const search = new URLSearchParams(location.search);
  if (search.has('workflow')) {
    search.delete('workflow');
    search.delete('session');
    const [pathname, profileSearch = ''] = newTaskPath.split('?');
    const normalizedSearch = new URLSearchParams(profileSearch);
    search.forEach((value, key) => normalizedSearch.set(key, value));
    return <Navigate to={`${pathname}${normalizedSearch.size ? `?${normalizedSearch}` : ''}`} state={location.state} replace />;
  }

  return <AgentRuntimeSurface
    embeddedNavigation={profile.productBoundary === 'classin-integrated'}
    scope={profile.id}
    newTaskPath={newTaskPath}
    initialDraft={promptFromNavigationState(location.state as NewTaskNavigationState | null)}
    returnTarget={profile.returnTarget ?? {
      label: profile.id === 'standalone-teacher' ? '返回 TeachBuddy 首页' : '返回 ClassIn',
      to: profile.id === 'standalone-teacher' ? '/teachbuddy' : '/teacher',
    }}
  />;
}
