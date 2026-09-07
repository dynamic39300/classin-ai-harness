import { ArrowLeft, ClipboardList, LockKeyhole, Sparkles } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { TEACHBUDDY_BRAND } from '@contracts/workbuddy/product-brand';
import { getVisibleWorkBuddyCapability, type WorkBuddyCapability } from './capability-registry';
import {
  workBuddyCapabilityPath,
  workBuddyNewTaskPath,
  type WorkBuddyExperienceProfile,
} from './workbuddy-experience-profile';
import styles from './ClassMvpWorkBuddyShell.module.css';

type ClassMvpWorkBuddyShellProps = Readonly<{
  children: ReactNode;
  profile: WorkBuddyExperienceProfile;
}>;

export function ClassMvpWorkBuddyShell({ children, profile }: ClassMvpWorkBuddyShellProps) {
  const location = useLocation();
  const pageRef = useRef<HTMLElement>(null);
  const visibleCapabilities = profile.navigationCapabilityIds
    .filter((id) => profile.visibleCapabilityIds.includes(id))
    .flatMap((id) => getVisibleWorkBuddyCapability(id) ?? []);
  const resourceCapabilities = visibleCapabilities.filter(({ placement }) => placement === 'resource');
  const systemCapabilities = visibleCapabilities.filter(({ placement }) => placement === 'system');
  const taskWorkspaceActive = location.pathname === profile.basePath
    || location.pathname.startsWith(`${profile.basePath}/new`);

  useEffect(() => {
    pageRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className={styles.shell} data-testid="class-mvp-workbuddy-shell">
      <aside className={styles.sidebar} aria-label={`${TEACHBUDDY_BRAND.shortName} 页面导航`}>
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true"><Sparkles size={18} /></span>
          <span className={styles.brandCopy}>
            <strong>{TEACHBUDDY_BRAND.shortName}</strong>
            <span>{TEACHBUDDY_BRAND.descriptor}</span>
          </span>
        </div>

        <nav className={styles.navigation} aria-label={`${TEACHBUDDY_BRAND.shortName} 导航`}>
          <section className={styles.navSection} aria-label="任务">
            <Link
              aria-current={taskWorkspaceActive ? 'page' : undefined}
              aria-label="我的任务"
              title="我的任务"
              className={styles.navItem}
              to={workBuddyNewTaskPath(profile)}
            >
              <ClipboardList aria-hidden="true" size={17} />
              <span>我的任务</span>
            </Link>
          </section>

          <CapabilityLinks label="资源与能力" capabilities={resourceCapabilities} profile={profile} />
          <CapabilityLinks label="自动化与设置" capabilities={systemCapabilities} profile={profile} />
        </nav>

        <section className={styles.launchContext} aria-label="入口上下文">
          <span className={styles.contextLabel}><LockKeyhole aria-hidden="true" size={14} />仅你可见</span>
          {profile.launchContext ? (
            <span className={styles.contextCopy} title={profile.launchContext.className}>
              从 {profile.launchContext.className} 进入
            </span>
          ) : null}
          {profile.returnTarget ? (
            <Link aria-label={profile.returnTarget.label} title={profile.returnTarget.label} className={styles.returnLink} to={profile.returnTarget.to}>
              <ArrowLeft aria-hidden="true" size={15} />
              <span>{profile.returnTarget.label}</span>
            </Link>
          ) : null}
        </section>
      </aside>

      <main
        ref={pageRef}
        className={styles.workspace}
        aria-label={TEACHBUDDY_BRAND.shortName}
        tabIndex={-1}
      >
        {children}
      </main>
    </div>
  );
}

type VisibleCapability = WorkBuddyCapability;

function CapabilityLinks({ capabilities, label, profile }: Readonly<{
  capabilities: readonly VisibleCapability[];
  label: string;
  profile: WorkBuddyExperienceProfile;
}>) {
  if (capabilities.length === 0) return null;
  return (
    <section className={styles.navSection} aria-label={label}>
      {capabilities.map(({ id, icon: Icon, label: capabilityLabel }) => (
        <NavLink aria-label={capabilityLabel} title={capabilityLabel} className={styles.navItem} key={id} to={workBuddyCapabilityPath(profile, id)}>
          <Icon aria-hidden="true" size={17} />
          <span>{capabilityLabel}</span>
        </NavLink>
      ))}
    </section>
  );
}
