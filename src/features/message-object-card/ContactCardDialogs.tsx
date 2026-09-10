import { Check, Contact, MessageCircle, Search, UsersRound, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppRole } from '@domain/account/role';
import {
  getVisibleDirectoryPeople,
  type DirectoryPerson,
  type MessageDirectorySnapshot,
} from '@domain/message/message-directory';
import type { MessageContactCard } from '@domain/message/message-object-card';
import styles from './ContactCardDialogs.module.css';

type ContactCardPickerDialogProps = {
  role: AppRole;
  snapshot: MessageDirectorySnapshot;
  selectedIds: readonly string[];
  onClose: () => void;
  onConfirm: (people: readonly DirectoryPerson[]) => void;
};

type ContactScope = 'recent' | 'friends' | 'organization';

export function ContactCardPickerDialog({ role, snapshot, selectedIds, onClose, onConfirm }: ContactCardPickerDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [scope, setScope] = useState<ContactScope>('recent');
  const [query, setQuery] = useState('');
  const [selection, setSelection] = useState<readonly string[]>(selectedIds);
  const people = useMemo(() => {
    const visible = getVisibleDirectoryPeople(snapshot, role);
    const scoped = scope === 'recent'
      ? visible.filter(({ targetThreadId }) => targetThreadId).slice(0, 5)
      : scope === 'friends'
        ? visible.filter(({ friendState }) => friendState === 'friend')
        : visible;
    const term = query.trim().toLocaleLowerCase();
    return scoped.filter((person) => !term || [person.name, person.relationship, person.identityLabel].join(' ').toLocaleLowerCase().includes(term));
  }, [query, role, scope, snapshot]);
  const allVisible = useMemo(() => getVisibleDirectoryPeople(snapshot, role), [role, snapshot]);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const toggle = (personId: string) => {
    setSelection((current) => current.includes(personId)
      ? current.filter((id) => id !== personId)
      : current.length >= 5 ? current : [...current, personId]);
  };

  return (
    <dialog aria-label="发送联系人名片" className={styles.dialog} ref={dialogRef} onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={onClose}>
      <form className={styles.picker} method="dialog" onSubmit={(event) => {
        event.preventDefault();
        onConfirm(selection.map((id) => allVisible.find((person) => person.id === id)).filter((person): person is DirectoryPerson => Boolean(person)));
      }}>
        <header><span><Contact aria-hidden="true" size={20} /><span><h2>发送联系人名片</h2><small>固定演示目录 · 最多 5 人</small></span></span><button type="button" aria-label="关闭名片选人器" onClick={onClose}><X aria-hidden="true" size={18} /></button></header>
        <nav aria-label="名片联系人范围">
          <button type="button" aria-pressed={scope === 'recent'} onClick={() => setScope('recent')}>最近</button>
          <button type="button" aria-pressed={scope === 'friends'} onClick={() => setScope('friends')}>好友</button>
          <button type="button" aria-pressed={scope === 'organization'} onClick={() => setScope('organization')}>组织</button>
        </nav>
        <label className={styles.search}><Search aria-hidden="true" size={16} /><span className={styles.srOnly}>搜索联系人</span><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名、身份或组织" /></label>
        <main>
          {people.map((person) => {
            const selected = selection.includes(person.id);
            return <button type="button" aria-pressed={selected} className={styles.person} key={person.id} onClick={() => toggle(person.id)}><span className={styles.avatar}>{person.name.slice(0, 1)}</span><span><strong>{person.name}</strong><small>{person.identityLabel} · {person.relationship}</small></span><i aria-hidden="true">{selected ? <Check size={14} /> : null}</i></button>;
          })}
          {people.length === 0 ? <div className={styles.empty}><UsersRound aria-hidden="true" size={22} /><span>当前范围没有匹配联系人</span></div> : null}
        </main>
        <footer><span>已选择 {selection.length}/5</span><button type="button" onClick={onClose}>取消</button><button type="submit">添加 {selection.length ? `${selection.length} 张` : ''}名片</button></footer>
      </form>
    </dialog>
  );
}

type ContactCardProfileDialogProps = {
  card: MessageContactCard;
  canMessage: boolean;
  onClose: () => void;
  onMessage: () => void;
};

export function ContactCardProfileDialog({ card, canMessage, onClose, onMessage }: ContactCardProfileDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialogRef.current?.showModal(); }, []);
  return (
    <dialog aria-label={card.name} className={styles.profileDialog} ref={dialogRef} onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={onClose}>
      <article className={styles.profile}>
        <header><span className={styles.largeAvatar}>{card.name.slice(0, 1)}</span><span><h2>{card.name}</h2><small>{card.identityLabel} · {card.relationship}</small></span><button type="button" aria-label="关闭联系人资料" onClick={onClose}><X aria-hidden="true" size={18} /></button></header>
        <dl>
          <div><dt>组织</dt><dd>{card.organizationLabel}</dd></div>
          <div><dt>ClassIn 号</dt><dd>{card.classInId}</dd></div>
          <div><dt>手机号</dt><dd>{card.phoneMasked}</dd></div>
          <div><dt>邮箱</dt><dd>{card.emailMasked}</dd></div>
          <div><dt>数据说明</dt><dd>{card.truthLabel} · 发送时最小资料快照</dd></div>
        </dl>
        <footer><button type="button" onClick={onClose}>关闭</button><button type="button" disabled={!canMessage} onClick={onMessage}><MessageCircle aria-hidden="true" size={16} />{canMessage ? '发消息' : '当前无法发消息'}</button></footer>
      </article>
    </dialog>
  );
}
