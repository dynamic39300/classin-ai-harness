import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FileLibrary } from '@features/ai-agent-workspace';
import { WorkBuddyArtifactLibraryProvider } from '@features/workbuddy-artifact-library';
import { GuidedExplanationModule } from '@domain/workbuddy/guided-explanation';

describe('WorkBuddy artifact library', () => {
  it('projects a generated format-neutral artifact into My Files without exposing its adapter format', () => {
    const prepared = GuidedExplanationModule.prepare({
      runRef: 'run-guided-library-1',
      classId: 'physics-3', classLabel: '高二物理 3 班', threadId: 'direct-wang-li', targetKind: 'direct', targetLabel: '李明',
      teacherId: 'teacher-001', teacherName: '王老师', question: '质量为 0.20 kg 的小球 A 以 5.0 m/s 向右运动，与静止的 0.30 kg 小球 B 正碰，碰后 A 以 1.0 m/s 向左反弹，求 B 碰后的速度大小和方向？', generatedAt: '2026-08-24T09:00:00+08:00',
    })!;
    render(
      <WorkBuddyArtifactLibraryProvider initialArtifacts={[prepared.artifact]}>
        <FileLibrary scope="ideal-full" productBoundary="classin-integrated" fileCatalog={{ list: async () => [], read: async () => { throw new Error('not used'); }, downloadUrl: () => '' }} draftReceipts={{}} onUseAsContext={() => undefined} onOpenRun={() => undefined} onOpenSession={() => undefined} onCreateTeacherInDraft={() => { throw new Error('not used'); }} onOpenTeacherIn={() => undefined} onLocateInSpace={() => undefined} />
      </WorkBuddyArtifactLibraryProvider>,
    );
    expect(screen.getByText(prepared.artifact.title)).toBeInTheDocument();
    expect(screen.queryByText('H5', { exact: true })).not.toBeInTheDocument();
    expect(screen.getByText('交互讲解')).toBeInTheDocument();
    expect(screen.getByText(/7 个文件/)).toBeInTheDocument();
  });

  it('shows a live Session file, previews sandboxed HTML, downloads it and returns to its source Session', async () => {
    const file = {
      id: 'sf-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb', artifactId: 'artifact-html', sessionId: 'session-html', sessionTitle: '制作函数互动练习',
      name: '函数互动练习.html', extension: 'html' as const, format: 'html' as const, mediaType: 'text/html; charset=utf-8', byteSize: 54,
      version: 1, status: 'draft' as const, createdAt: '2026-09-05T10:00:00.000Z', updatedAt: '2026-09-05T10:00:01.000Z',
      preview: 'html' as const, truthLabel: 'local-runtime' as const,
    };
    const content = '<h1>函数互动练习</h1><script>parent.document.body.remove()</script><img src="https://untrusted.example/x.png">';
    const catalog = {
      list: vi.fn().mockResolvedValue([{ sessionId: file.sessionId, sessionTitle: file.sessionTitle, updatedAt: file.updatedAt, files: [file] }]),
      read: vi.fn().mockResolvedValue({ file, content }),
      downloadUrl: vi.fn().mockReturnValue(`/api/teachbuddy/files/${file.id}/download?scope=ideal-full`),
    };
    const openSession = vi.fn();
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<FileLibrary scope="ideal-full" productBoundary="classin-integrated" initialAssets={[]} fileCatalog={catalog}
      draftReceipts={{}} onUseAsContext={() => undefined} onOpenRun={() => undefined} onOpenSession={openSession}
      onCreateTeacherInDraft={() => { throw new Error('not used'); }} onOpenTeacherIn={() => undefined} onLocateInSpace={() => undefined} />);
    expect(await screen.findByRole('heading', { name: file.sessionTitle })).toBeVisible();
    expect(screen.getByText(file.name)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: `查看${file.name}` }));
    const frame = await screen.findByTitle(`${file.name}安全预览`);
    expect(frame).toHaveAttribute('sandbox', '');
    expect(frame).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(frame.getAttribute('srcdoc')).toContain("default-src 'none'");
    fireEvent.click(screen.getByRole('button', { name: '下载' }));
    expect(catalog.downloadUrl).toHaveBeenCalledWith('ideal-full', file.id);
    expect(click).toHaveBeenCalledOnce();
    fireEvent.click(within(screen.getByLabelText(`${file.name}文件详情`)).getByRole('button', { name: '回到任务' }));
    expect(openSession).toHaveBeenCalledWith(file.sessionId);
    await waitFor(() => expect(catalog.read).toHaveBeenCalledWith('ideal-full', file.id));
    click.mockRestore();
  });
});
