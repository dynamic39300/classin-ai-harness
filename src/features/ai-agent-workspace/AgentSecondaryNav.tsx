import { ClipboardList } from 'lucide-react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { TEACHBUDDY_BRAND } from '@contracts/workbuddy/product-brand';
import { getVisibleWorkBuddyCapability } from './capability-registry';
import { workBuddyCapabilityPath, workBuddyNewTaskPath, type WorkBuddyExperienceProfile } from './workbuddy-experience-profile';
import styles from './AgentSecondaryNav.module.css';

export function AgentSecondaryNav({ profile }: Readonly<{ profile: WorkBuddyExperienceProfile }>) {
  const location = useLocation();
  const visibleCapabilities = profile.navigationCapabilityIds
    .filter((id) => profile.visibleCapabilityIds.includes(id))
    .flatMap((id) => getVisibleWorkBuddyCapability(id) ?? []);
  const taskWorkspaceActive = location.pathname === profile.basePath
    || location.pathname === `${profile.basePath}/new`;
  const resourceCapabilities = visibleCapabilities.filter(({ placement }) => placement === 'resource');
  const systemCapabilities = visibleCapabilities.filter(({ placement }) => placement === 'system');

  return (
    <div className={styles.panel} role="group" aria-label={`${TEACHBUDDY_BRAND.shortName} 二级导航`}>
      <nav className={styles.links} aria-label={`${TEACHBUDDY_BRAND.shortName} 能力目录`}>
        <Link aria-current={taskWorkspaceActive ? 'page' : undefined} aria-label="我的任务" title="我的任务" to={workBuddyNewTaskPath(profile)}>
          <ClipboardList aria-hidden="true" size={16} />
          <span>我的任务</span>
        </Link>
        {resourceCapabilities.map(({ id, label, icon: Icon }) => (
          <NavLink aria-label={label} title={label} key={id} to={workBuddyCapabilityPath(profile, id)}>
            <Icon aria-hidden="true" size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <nav className={`${styles.links} ${styles.systemLinks}`} aria-label={`${TEACHBUDDY_BRAND.shortName} 自动化与设置`}>
        {systemCapabilities.map(({ id, label, icon: Icon }) => (
          <NavLink aria-label={label} title={label} key={id} to={workBuddyCapabilityPath(profile, id)}>
            <Icon aria-hidden="true" size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
