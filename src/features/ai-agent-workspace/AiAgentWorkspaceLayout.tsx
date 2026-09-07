import { Outlet, useLocation } from 'react-router-dom';
import { TEACHBUDDY_BRAND } from '@contracts/workbuddy/product-brand';
import { getWorkBuddyCapabilityFromPathname } from './capability-registry';
import { WorkBuddyExperienceProvider } from './WorkBuddyExperienceContext';
import type { WorkBuddyExperienceProfile } from './workbuddy-experience-profile';
import { WorkBuddyTaskBar } from './WorkBuddyTaskBar';
import styles from './AiAgentWorkspaceLayout.module.css';

export function AiAgentWorkspaceLayout({ profile, showTaskBarReturn = true }: Readonly<{
  profile: WorkBuddyExperienceProfile;
  showTaskBarReturn?: boolean;
}>) {
  const location = useLocation();
  const capabilityActive = Boolean(getWorkBuddyCapabilityFromPathname(location.pathname, { includeDormant: true }));
  const taskChromeActive = !capabilityActive;

  return (
    <WorkBuddyExperienceProvider profile={profile}>
    <div className={styles.layout} data-experience-profile={profile.id} data-integrated-navigation={taskChromeActive && profile.productBoundary === 'classin-integrated' ? 'true' : undefined} data-task-navigation={taskChromeActive ? 'true' : undefined} data-testid="ai-agent-workspace-layout">
      {taskChromeActive ? (
        <WorkBuddyTaskBar
          key={profile.sessionNamespace}
          showReturnCommand={showTaskBarReturn}
          compactReturnTarget={profile.productBoundary === 'classin-integrated' ? profile.returnTarget ?? { label: '返回教师工作台', to: '/teacher' } : undefined}
        />
      ) : null}
      <section className={styles.surface} aria-label={`${TEACHBUDDY_BRAND.shortName} 工作区`}>
        <Outlet />
      </section>
    </div>
    </WorkBuddyExperienceProvider>
  );
}
