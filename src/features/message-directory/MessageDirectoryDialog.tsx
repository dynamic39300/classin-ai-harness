import {
  ArrowLeft,
  Building2,
  Check,
  ChevronRight,
  CircleUserRound,
  Copy,
  GraduationCap,
  MessageCircle,
  QrCode,
  Search,
  Settings,
  Share2,
  UserRoundPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { AppRole } from '@domain/account/role';
import type { MessageDirectoryAdapter } from '@contracts/message/message-directory';
import {
  groupDirectoryFriends,
  projectDirectoryClasses,
  projectFriendEvents,
  projectOrganization,
  searchDirectoryObjects,
  type DirectoryPerson,
  type DirectoryRelationView,
  type DirectorySearchKind,
  type DirectorySearchResult,
} from '@domain/message/message-directory';
import styles from './MessageDirectoryDialog.module.css';

const VIEWS: ReadonlyArray<Readonly<{ id: DirectoryRelationView; label: string }>> = [
  { id: 'new-friends', label: '新好友' },
  { id: 'classes', label: '班级' },
  { id: 'friends', label: '好友' },
  { id: 'organization', label: '组织架构' },
];
const SEARCH_KINDS: ReadonlyArray<Readonly<{ id: DirectorySearchKind; label: string }>> = [
  { id: 'all', label: '全部' },
  { id: 'contact', label: '联系人' },
  { id: 'class', label: '班级' },
  { id: 'open-course', label: '公开课' },
];

function formatDate(value: string) {
  const [, month, date] = value.split('-');
  return `${Number(month)}月${Number(date)}日`;
}

export function MessageDirectoryDialog({
  role,
  adapter,
  onClose,
  onOpenThread,
  onOpenClass,
  onOpenCourse,
  onOpenJoin,
}: {
  role: AppRole;
  adapter: MessageDirectoryAdapter;
  onClose: () => void;
  onOpenThread: (threadId: string) => void;
  onOpenClass: (classId: string, threadId: string | undefined, destination: 'detail' | 'chat') => void;
  onOpenCourse: (openCourseId: string) => void;
  onOpenJoin: (classCode?: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [snapshot, setSnapshot] = useState(() => adapter.getSnapshot());
  const [view, setView] = useState<DirectoryRelationView>('friends');
  const [query, setQuery] = useState('');
  const [searchKind, setSearchKind] = useState<DirectorySearchKind>('all');
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [organizationUnitId, setOrganizationUnitId] = useState<string | undefined>();
  const [remarkDraft, setRemarkDraft] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);

  const selectedPerson = snapshot.people.find(({ id }) => id === selectedPersonId) ?? null;
  const friendGroups = useMemo(() => groupDirectoryFriends(snapshot, role), [role, snapshot]);
  const friendEvents = useMemo(() => projectFriendEvents(snapshot, role), [role, snapshot]);
  const classes = useMemo(() => projectDirectoryClasses(snapshot, role), [role, snapshot]);
  const organization = useMemo(() => projectOrganization(snapshot, role, organizationUnitId), [organizationUnitId, role, snapshot]);
  const searchResults = useMemo(() => searchDirectoryObjects(snapshot, role, query, searchKind), [query, role, searchKind, snapshot]);
  const friendCount = friendGroups.reduce((total, group) => total + group.people.length, 0);
  const recommended = snapshot.people.filter(({ visibleTo, friendState }) => visibleTo.includes(role) && friendState === 'recommended');

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }, []);

  const openPerson = (person: DirectoryPerson) => {
    setSelectedPersonId(person.id);
    setRemarkDraft(person.remark ?? '');
    setShareOpen(false);
    setFeedback(null);
  };

  const runCommand = (result: ReturnType<MessageDirectoryAdapter['requestFriend']>) => {
    setSnapshot(result.snapshot);
    setFeedback(result.message);
  };

  const copyIdentityCode = async () => {
    if (!navigator.clipboard?.writeText) {
      setFeedback(`当前环境不支持自动复制，演示 In 口令为 ${identity.inCode}。`);
      return;
    }
    try {
      await navigator.clipboard.writeText(identity.inCode);
      setFeedback(`已复制演示 In 口令 ${identity.inCode}。`);
    } catch {
      setFeedback(`复制未完成，演示 In 口令为 ${identity.inCode}。`);
    }
  };

  const trapFocus = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button, input, [tabindex]:not([tabindex="-1"])'))
      .filter((element) => !element.hasAttribute('disabled'));
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  const renderPersonRow = (person: DirectoryPerson, detail?: string) => (
    <article className={styles.personRow} key={person.id}>
      <span className={styles.avatar}>{person.name.slice(0, 1)}</span>
      <span><strong>{person.name}</strong><small>{detail ?? `${person.identityLabel} · ${person.relationship}`}</small></span>
      <button type="button" onClick={() => openPerson(person)}>查看资料</button>
    </article>
  );

  const renderSearchResult = (result: DirectorySearchResult) => {
    if (result.kind === 'contact') return renderPersonRow(result.person, result.subtitle);
    if (result.kind === 'class') {
      const member = result.classRecord.memberRoles.includes(role);
      return <article className={styles.objectRow} key={`${result.kind}:${result.id}`}><span><UsersRound aria-hidden="true" size={18} /></span><span><strong>{result.title}</strong><small>{result.subtitle}</small></span><button type="button" onClick={() => member ? onOpenClass(result.id, result.classRecord.threadId, 'detail') : onOpenJoin(result.classRecord.classCode)}>{member ? '进入班级' : '申请加入'}</button></article>;
    }
    return <article className={styles.objectRow} key={`${result.kind}:${result.id}`}><span><GraduationCap aria-hidden="true" size={18} /></span><span><strong>{result.title}</strong><small>{result.subtitle}</small></span><button type="button" onClick={() => onOpenCourse(result.id)}>查看公开课</button></article>;
  };

  const renderDirectory = () => {
    if (view === 'new-friends') return <div className={styles.directoryList}>
      {friendEvents.map((group) => <section className={styles.group} key={group.date}><h3>{formatDate(group.date)}</h3>{group.events.map(({ event, person }) => <article className={styles.friendEvent} key={event.id}><span className={styles.avatar}>{person.name.slice(0, 1)}</span><span><strong>{person.name}</strong><small>{event.direction === 'outgoing' ? '我发出的好友申请' : person.relationship}</small></span><span className={styles.eventState}>{event.status === 'pending' ? '待处理' : event.status === 'accepted' ? '已同意' : '已忽略'}</span>{event.status === 'pending' && event.direction === 'incoming' ? <span className={styles.inlineActions}><button type="button" onClick={() => runCommand(adapter.resolveFriendEvent(role, event.id, 'ignore'))}>忽略</button><button type="button" onClick={() => runCommand(adapter.resolveFriendEvent(role, event.id, 'accept'))}>接受</button></span> : <button type="button" onClick={() => openPerson(person)}>资料</button>}</article>)}</section>)}
      {friendEvents.length === 0 ? <p className={styles.empty} role="status">暂无好友申请</p> : null}
    </div>;

    if (view === 'classes') return <div className={styles.directoryList}>
      <p className={styles.countLine}>当前可发现 {classes.length} 个班级</p>
      {classes.map((item) => {
        const member = item.memberRoles.includes(role);
        return <article className={styles.classRow} key={item.id}><span className={styles.classMark}>班</span><span><strong>{item.name}</strong><small>班级号 {item.classCode} · {item.ownerName} · {item.memberCount} 人</small></span><span className={styles.inlineActions}>{member && item.threadId ? <button type="button" onClick={() => onOpenClass(item.id, item.threadId, 'chat')}>班级群</button> : null}<button type="button" onClick={() => member ? onOpenClass(item.id, item.threadId, 'detail') : onOpenJoin(item.classCode)}>{member ? '进入班级' : '申请加入'}</button></span></article>;
      })}
    </div>;

    if (view === 'organization') return <div className={styles.directoryList}>
      {organization ? <>
        <nav className={styles.breadcrumbs} aria-label="组织路径">{organization.breadcrumbs.map((unit, index) => <span key={unit.id}>{index > 0 ? <ChevronRight aria-hidden="true" size={13} /> : null}<button type="button" aria-current={unit.id === organization.current.id ? 'page' : undefined} onClick={() => setOrganizationUnitId(unit.id)}>{unit.name}</button></span>)}</nav>
        {organization.childUnits.map((unit) => <button className={styles.unitRow} type="button" key={unit.id} onClick={() => setOrganizationUnitId(unit.id)}><Building2 aria-hidden="true" size={18} /><span>{unit.name}</span><ChevronRight aria-hidden="true" size={16} /></button>)}
        {organization.people.map((person) => renderPersonRow(person))}
        {organization.childUnits.length === 0 && organization.people.length === 0 ? <p className={styles.empty} role="status">该组织下暂无可见对象</p> : null}
      </> : <p className={styles.empty} role="status">组织目录当前不可用</p>}
    </div>;

    return <div className={styles.friendsLayout}>
      <div className={styles.friendToolbar}><span>{friendCount} 位好友</span><button type="button" onClick={() => setFeedback('好友设置入口已保留；线上截图未展示具体设置项，本 Demo 不补造。')}><Settings aria-hidden="true" size={14} />好友设置</button></div>
      <nav className={styles.letterIndex} aria-label="好友字母索引">{friendGroups.map(({ initial }) => <button type="button" key={initial} onClick={() => document.getElementById(`directory-friends-${initial}`)?.scrollIntoView({ block: 'start' })}>{initial}</button>)}</nav>
      <div className={styles.directoryList}>{friendGroups.map((group) => <section className={styles.group} id={`directory-friends-${group.initial}`} key={group.initial}><h3>{group.initial}</h3>{group.people.map((person) => renderPersonRow(person))}</section>)}</div>
      {recommended.length ? <section className={styles.recommended}><h3>推荐好友</h3>{recommended.map((person) => renderPersonRow(person, person.recommendationReason))}</section> : null}
    </div>;
  };

  const identity = snapshot.identityByRole[role];
  return <dialog
    aria-labelledby="message-directory-title"
    className={styles.dialog}
    ref={dialogRef}
    onCancel={(event) => { event.preventDefault(); onClose(); }}
    onKeyDown={(event) => { if (event.key === 'Escape') { event.preventDefault(); onClose(); return; } trapFocus(event); }}
  >
    <div className={styles.shell}>
      <header><div><CircleUserRound aria-hidden="true" size={21} /><span><h2 id="message-directory-title">通讯录</h2><small>固定、去标识、可重置的演示目录</small></span></div><span className={styles.headerActions}><button type="button" onClick={() => setShareOpen((current) => !current)}><Share2 aria-hidden="true" size={16} />分享我的身份</button><button type="button" onClick={onClose} aria-label="关闭通讯录"><X aria-hidden="true" size={18} /></button></span></header>
      <section className={styles.searchArea} aria-label="对象发现">
        <label><Search aria-hidden="true" size={16} /><span className={styles.srOnly}>搜索联系人、班级或公开课</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="姓名 / ClassIn号 / 手机号 / 班级号 / 公开课ID" /></label>
        <div role="group" aria-label="搜索对象类型">{SEARCH_KINDS.map(({ id, label }) => <button type="button" aria-pressed={searchKind === id} key={id} onClick={() => setSearchKind(id)}>{label}</button>)}</div>
      </section>
      {shareOpen ? <section className={styles.shareCard} aria-label="演示身份分享"><QrCode aria-label={identity.qrLabel} size={54} /><span><strong>{identity.name}</strong><small>固定 Demo 身份 · 不连接真实账号</small><code>{identity.inCode}</code></span><button type="button" onClick={() => void copyIdentityCode()}><Copy aria-hidden="true" size={14} />复制口令</button></section> : null}
      <div className={styles.body}>
        <nav className={styles.views} aria-label="通讯录分类">{VIEWS.map(({ id, label }) => <button type="button" aria-current={!query && view === id ? 'page' : undefined} key={id} onClick={() => { setQuery(''); setView(id); setSelectedPersonId(null); setFeedback(null); }}>{label}{id === 'friends' ? <strong>{friendCount}</strong> : id === 'new-friends' && friendEvents.some(({ events }) => events.some(({ event }) => event.status === 'pending' && event.direction === 'incoming')) ? <i /> : null}</button>)}</nav>
        <main>
          {selectedPerson ? <section className={styles.profile} aria-labelledby="directory-profile-name">
            <button type="button" className={styles.backButton} onClick={() => { setSelectedPersonId(null); setFeedback(null); }}><ArrowLeft aria-hidden="true" size={15} />返回目录</button>
            <div className={styles.profileHeading}><span className={styles.largeAvatar}>{selectedPerson.name.slice(0, 1)}</span><span><h3 id="directory-profile-name">{selectedPerson.name}</h3><small>{selectedPerson.identityLabel} · {selectedPerson.relationship}</small></span></div>
            <dl><div><dt>ClassIn 号</dt><dd>{selectedPerson.classInId}</dd></div><div><dt>手机号</dt><dd>{selectedPerson.phoneMasked}</dd></div><div><dt>邮箱</dt><dd>{selectedPerson.emailMasked}</dd></div><div><dt>关系状态</dt><dd>{selectedPerson.friendState === 'friend' ? '好友' : selectedPerson.friendState === 'pending' ? '申请处理中' : selectedPerson.friendState === 'recommended' ? '推荐联系人' : selectedPerson.friendState === 'accepted' ? '已同意' : '非好友'}</dd></div></dl>
            <div className={styles.remark}><label htmlFor="directory-remark">备注</label><input id="directory-remark" aria-label="备注" value={remarkDraft} maxLength={24} onChange={(event) => setRemarkDraft(event.target.value)} /><button type="button" onClick={() => runCommand(adapter.saveRemark(role, selectedPerson.id, remarkDraft))}>保存备注</button></div>
            <div className={styles.profileActions}>{selectedPerson.targetThreadId ? <button type="button" onClick={() => onOpenThread(selectedPerson.targetThreadId!)}><MessageCircle aria-hidden="true" size={15} />发消息</button> : <button type="button" disabled={selectedPerson.friendState === 'pending'} onClick={() => runCommand(adapter.requestFriend(role, selectedPerson.id))}><UserRoundPlus aria-hidden="true" size={15} />{selectedPerson.friendState === 'pending' ? '等待对方处理' : '添加好友'}</button>}<button type="button" onClick={() => setFeedback('好友设置入口已保留；更多设置需要生产产品证据。')}><Settings aria-hidden="true" size={15} />好友设置</button></div>
          </section> : query ? <section className={styles.searchResults} aria-live="polite"><p>{searchResults.length ? `找到 ${searchResults.length} 个对象` : '没有匹配的联系人、班级或公开课'}</p>{searchResults.map(renderSearchResult)}</section> : renderDirectory()}
        </main>
      </div>
      {feedback ? <p className={styles.feedback} role="status"><Check aria-hidden="true" size={14} />{feedback}</p> : null}
    </div>
  </dialog>;
}
