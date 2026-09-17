import { ClassInQuestionImagePreview } from './ClassInQuestionImagePreview';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ClassInActivityDetail, ClassInScene } from '@contracts/classin-test';
import { dateLabel, kindLabels, threadRef } from '@domain/classin-test/projections';
import { ImSidecarAgentSurface } from '@features/workbuddy-im-assistance';
import { classInMessagesPath } from './classin-simulated-messages';
import { createClassInAgentServices, readDetail, readScene } from './classin-test-adapters';
import styles from './ClassInTestPage.module.css';
import { ClassInResourcePreview } from './ClassInResourcePreview';
import { ClassInReplayPreview } from './ClassInReplayPreview';
import { ClassInSubmissionImagePreview } from './ClassInSubmissionImagePreview';
type LoadState = { status: 'loading' } | { status: 'failed'; message: string } | { status: 'ready'; scene: ClassInScene; refreshError?: string };
type DetailState = { status: 'empty' } | { status: 'loading' } | { status: 'failed'; message: string } | { status: 'ready'; value: ClassInActivityDetail };
const ignoreLocate = () => undefined;
function ConnectedScene({ scene, refresh, refreshing, refreshError }: { scene: ClassInScene; refresh: () => Promise<ClassInScene | undefined>; refreshing: boolean; refreshError?: string }) {
  const services = useMemo(() => createClassInAgentServices(scene), [scene]);
  const target = useMemo(() => ({ kind: 'class' as const, classId: scene.class.id, classLabel: scene.class.name, threadId: threadRef(scene), memberCount: scene.members.length }), [scene]);
  const [detail, setDetail] = useState<DetailState>({ status: 'empty' });
  const selection = useRef(0);
  const selectedActivity = useRef<string | null>(null);
  async function readSelected(id: string, seq: number) {
    try { const value = await readDetail(id); if (seq === selection.current) setDetail({ status: 'ready', value }); }
    catch (error) { if (seq === selection.current) setDetail({ status: 'failed', message: error instanceof Error ? error.message : '详情读取失败' }); }
  }
  async function inspect(id: string) {
    selectedActivity.current = id;
    const seq = ++selection.current; setDetail({ status: 'loading' });
    await readSelected(id, seq);
  }
  async function refreshSelected() {
    const id = selectedActivity.current; const previous = detail; const seq = ++selection.current;
    if (id) setDetail({ status: 'loading' });
    const current = await refresh();
    if (!id || seq !== selection.current) return;
    if (!current) {
      setDetail(previous.status === 'ready' ? previous : { status: 'failed', message: '详情更新未完成，请重新选择活动。' });
      return;
    }
    if (!current.activities.some((a) => a.id === id)) {
      selectedActivity.current = null;
      setDetail({ status: 'failed', message: '该活动已不在当前课程范围中，请重新选择活动。' });
      return;
    }
    await readSelected(id, seq);
  }
  return <>
    <header className={styles.header}><div><h1>ClassIn 测试环境</h1><p>{scene.class.name} · {scene.course.name}</p></div><div><span>更新于 {dateLabel(scene.capturedAt)}（北京时间）</span><button type="button" onClick={() => void refreshSelected()} disabled={refreshing}>{refreshing ? '正在刷新…' : '刷新真实数据'}</button><Link to={classInMessagesPath(scene)}>进入班级消息与 Copilot</Link><Link to="/teacher/messages?category=class&thread=class-physics-3">原演示班</Link></div></header>
    <p className={styles.notice} role="status">真实测试接口 · {scene.teacher.name} · {scene.activities.length} 项活动 · 班级学生 {scene.members.filter((s) => s.identity === 1).length} 人。此页用于真实数据核验。普通 IM 尚未接通；进入班级消息与 Copilot，可在原工作区体验老师端模拟发送。</p>
    {refreshError ? <p className={styles.notice} role="alert">更新失败：{refreshError} 当前保留上次数据，输入与草稿仍在；生成前会重新读取。</p> : null}
    <main className={styles.workspace}>
      <section className={styles.course} aria-label="真实课程与教学活动">
        <h2>{scene.course.name}</h2><p>班级学生：{scene.members.filter((m) => m.identity === 1).map((m) => m.name).join('、')}。每项任务的分配与参与请查看详情。</p>
        {scene.units.filter((u) => u.count > 0).map((unit) => <section key={unit.id} className={styles.unit}><h3>{unit.name} <small>{unit.count} 项</small></h3><ul>{scene.activities.filter((a) => a.unitId === unit.id).map((a) => <li key={a.id}><button type="button" onClick={() => void inspect(a.id)}><span className={styles.kind}>{kindLabels[a.kind]}</span><strong>{a.name}</strong><span>{a.cancelled ? '已取消/删除' : a.published ? '已发布' : '草稿或隐藏'}</span><small>开始：{dateLabel(a.startsAt)}<br />结束 / 截止：{dateLabel(a.endsAt)}</small></button></li>)}</ul></section>)}
      </section>
      <section className={styles.detail} aria-label="教学活动详情" aria-live="polite">
        {detail.status === 'empty' ? <><h2>教学活动详情</h2><p>选择一项课堂、作业、测验、录播或学习资料，读取它的真实内容与学生状态。</p><p>可在右侧询问“最近有哪些课”或“第1讲作业谁还没交”。</p></> : null}
        {detail.status === 'loading' ? <p role="status">正在读取活动与学生数据…</p> : null}
        {detail.status === 'failed' ? <p role="alert">{detail.message}。点击活动重试。</p> : null}
        {detail.status === 'ready' ? <><h2>{detail.value.activity.name}</h2><small>读取时间 {dateLabel(detail.value.capturedAt)}</small><p className={styles.description}>{detail.value.description || '该详情接口未返回正文；未自动补充内容。'}</p><dl>{detail.value.fields.map((f) => <div key={f.label}><dt>{f.label}</dt><dd>{f.value}</dd></div>)}</dl>
          {detail.value.questions?.length ? <section aria-label="试卷题目"><h3>试卷题目 · {detail.value.questions.length} 题</h3><ol>{detail.value.questions.map((q) => <li key={q.id}><p>{q.content || '此题未提供可读取文字'}</p>{q.hasImage ? <p>包含图片题干，当前文字不完整；AI尚未识别图中内容。</p> : null}{q.images?.map((image) => <ClassInQuestionImagePreview key={image.ref} activityId={detail.value.activity.id} topicId={q.id} image={image} />)}{q.hasImage && !q.images?.length ? <p>该题图片暂不支持读取，请在 ClassIn 原活动核对。</p> : null}{q.options.length ? <ol>{q.options.map((option, index) => <li key={index}>{option}</li>)}</ol> : null}<details><summary>教师查看参考答案与解析</summary><p>答案（接口原值）：{q.answers.join('；') || '未提供'}</p><p>{q.analysis || '未提供解析'}</p></details></li>)}</ol></section> : null}
          {detail.value.classroomResult ? <section aria-label="课后课堂报告"><h3>课后课堂报告</h3><p>{detail.value.classroomResult.message}</p>{detail.value.classroomResult.attendance ? <p>应到 {detail.value.classroomResult.attendance.expected} 人 · 实到 {detail.value.classroomResult.attendance.actual} 人 · 迟到 {detail.value.classroomResult.attendance.late} 人</p> : null}<p>实际时长：{detail.value.classroomResult.durationSeconds === null ? '未取得' : `${detail.value.classroomResult.durationSeconds} 秒`}</p><p>高光：{detail.value.classroomResult.highlights ?? '未取得'} · 板书：{detail.value.classroomResult.blackboards ?? '未取得'}</p><p>AI 授课分析：{detail.value.classroomResult.aiAnalysis === 'available' ? '已有报告；生成的分析不等于学生实际表现' : detail.value.classroomResult.aiAnalysis === 'not_generated' ? '尚无已生成报告' : '本次无法核实状态'}</p><h3>教师课堂笔记</h3><p>{detail.value.classroomResult.notesMessage}</p><ul>{detail.value.classroomResult.notes.map((note) => <li key={note.id}>{note.text}<small> · {dateLabel(note.createdAt)}</small></li>)}</ul></section> : null}
          {detail.value.replay ? <section aria-label="课堂回放结果"><h3>课堂回放</h3><p>{detail.value.replay.message}</p>{detail.value.replay.files.length ? <ol>{detail.value.replay.files.map((file, index) => <li key={file.playbackRef ?? index}><p>录制开始：{dateLabel(file.startsAt, true)}<br />录制结束：{dateLabel(file.endsAt, true)}</p><p>文件时长：{file.durationSeconds === null ? '未提供' : `${file.durationSeconds} 秒`} · 生成时间：{dateLabel(file.createdAt, true)}</p>{file.playbackRef ? <ClassInReplayPreview activityId={detail.value.activity.id} playbackRef={file.playbackRef} position={index + 1} /> : null}</li>)}</ol> : null}</section> : null}
          <h3>教学资源</h3>{detail.value.resources.length ? <ul>{detail.value.resources.map((r, i) => <li key={`${detail.value.activity.id}-${r.id ?? i}`}><ClassInResourcePreview activityId={detail.value.activity.id} resource={r} /></li>)}</ul> : <p>当前详情未返回资源引用。</p>}
          <h3>活动分配与学习状态</h3><ul>{detail.value.students.map((s) => <li key={s.id}><strong>{s.name}</strong><p>{s.status}</p><p>成绩：{s.grade ?? '未提供或不评分'}{s.progress === null ? '' : ` · 进度 ${s.progress}%`}{s.durationSeconds === null ? '' : ` · 观看 ${s.durationSeconds} 秒`}</p>
            {s.examAnswers ? <details><summary>查看测验逐题作答</summary><p>{s.examAnswers.message}</p><ol>{s.examAnswers.questions.map((q) => <li key={q.id}><p>第{q.position}题 · {q.status}</p>{q.answers.length ? <p>学生答案：{q.answers.join('；')}</p> : null}{q.hasMedia ? <p>答案含图片等媒体，当前尚未读取内容。</p> : null}{q.marking ? <p>批阅：{q.marking}</p> : null}{q.score !== null ? <p>得分：{q.score} 分</p> : null}</li>)}</ol></details> : null}
            {s.submission ? <details><summary>查看已提交内容</summary><p>{s.submission.message}</p>{s.submission.status === 'available' ? <><p className={styles.description}>{s.submission.text || '没有可读取的提交文字。'}</p><p>教师评语：{s.submission.teacherFeedback || '当前未提供文字评语'}</p><p>答题附件：{s.submission.attachments.map((a) => `${({ image: '图片', audio: '音频', video: '视频', docs: '文档' } as Record<string, string>)[a.kind] ?? a.kind} ${a.count} 份`).join('、') || '无'}</p>{s.submission.images?.map((image) => <ClassInSubmissionImagePreview key={image.ref} activityId={detail.value.activity.id} studentId={s.id} image={image} />)}</> : null}</details> : null}
          </li>)}</ul>
        </> : null}
      </section>
      <div className={styles.assistant}><ImSidecarAgentSurface services={services} target={target} onLocateMessage={ignoreLocate} /></div>
    </main>
  </>;
}
export function ClassInTestPage() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [refreshing, setRefreshing] = useState(false);
  const sequence = useRef(0);
  const refresh = useCallback(async () => {
    const seq = ++sequence.current; setRefreshing(true);
    try { const scene = await readScene(); if (seq === sequence.current) { setState({ status: 'ready', scene }); return scene; } }
    catch (error) { if (seq === sequence.current) { const message = error instanceof Error ? error.message : '测试数据读取失败。'; setState((current) => current.status === 'ready' ? { ...current, refreshError: message } : { status: 'failed', message }); } }
    finally { if (seq === sequence.current) setRefreshing(false); }
  }, []);
  useEffect(() => {
    const seq = ++sequence.current;
    void readScene().then((scene) => { if (seq === sequence.current) setState({ status: 'ready', scene }); }, (error: unknown) => { if (seq === sequence.current) setState({ status: 'failed', message: error instanceof Error ? error.message : '测试数据读取失败。' }); });
    return () => { sequence.current += 1; };
  }, []);
  return <div className={styles.page}>{state.status === 'ready' ? <ConnectedScene scene={state.scene} refreshError={state.refreshError} refresh={refresh} refreshing={refreshing} /> : <section className={styles.initial}><h1>ClassIn 测试环境</h1>{state.status === 'loading' ? <p role="status">正在校验教师权限并读取真实课程…</p> : <><p role="alert">{state.message}</p><button type="button" onClick={() => void refresh()} disabled={refreshing}>重新连接</button></>}<Link to="/teacher/messages">返回演示</Link></section>}</div>;
}
