import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useRoleSession } from '@features/role-switch';
import { readScene } from './classin-test-adapters';
import { createClassInMessageExtension } from './classin-simulated-messages';
import { ClassInMessageConnectionContext, type ClassInMessageConnection } from './classin-message-connection';
export function ClassInMessageConnectionProvider({ children }: { children: ReactNode }) {
  const { role } = useRoleSession();
  const [state, setState] = useState<Omit<ClassInMessageConnection, 'refresh'>>({ status: 'idle' });
  const sequence = useRef(0);
  const connected = useRef<Omit<ClassInMessageConnection, 'refresh'>>({ status: 'idle' });
  const refresh = useCallback(async () => {
    if (role !== 'teacher') return;
    const seq = ++sequence.current;
    setState((current) => ({ ...current, status: 'loading', error: undefined }));
    try {
      const scene = await readScene();
      if (seq !== sequence.current) return;
      {
        const current = connected.current;
        const sameScope = current.scene?.teacher.id === scene.teacher.id && current.scene.schoolRef === scene.schoolRef && current.scene.class.id === scene.class.id && current.scene.course.id === scene.course.id;
        // Keep the same port and receipt version while refreshing the real API snapshot.
        const extension = sameScope && current.extension ? { ...current.extension, threads: current.extension.threads.map((thread) => ({ ...thread, titleByRole: { teacher: scene.class.name }, subtitleByRole: { teacher: scene.course.name }, memberCount: scene.members.filter((m) => m.identity === 1).length, integration: thread.integration ? { ...thread.integration, teacherName: scene.teacher.name, capturedAt: scene.capturedAt, members: scene.members.map((m) => ({ id: m.id, name: m.name, roleLabel: m.identity === 1 ? '学生' : m.identity === 2 ? '旁听' : '测试班成员' })) } : undefined })) } : createClassInMessageExtension(scene, window.sessionStorage);
        const next = { status: 'ready' as const, scene, extension };
        connected.current = next; setState(next);
      }
    } catch (error) {
      if (seq === sequence.current) setState((current) => ({ ...current, status: 'error', error: error instanceof Error ? error.message : '测试班级连接失败，请重试。' }));
    }
  }, [role]);
  const cancelPending = useCallback(() => { sequence.current += 1; }, []);
  useEffect(() => {
    if (role === 'teacher') void refresh();
    return cancelPending;
  }, [cancelPending, refresh, role]);
  const value = useMemo(() => ({ ...(role === 'teacher' ? state : { status: 'idle' as const }), refresh }), [refresh, role, state]);
  return <ClassInMessageConnectionContext.Provider value={value}>{children}</ClassInMessageConnectionContext.Provider>;
}
