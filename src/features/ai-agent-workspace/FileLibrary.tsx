import {
  Bot,
  BookOpen,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  FileArchive,
  FileCode2,
  FileJson,
  FileSpreadsheet,
  FileText,
  Filter,
  Link2,
  MessageSquare,
  Presentation,
  RefreshCw,
  Search,
  Share2,
  Star,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { RuntimeScope } from '@contracts/workbuddy/agent-runtime';
import type { SessionFileCatalogAdapter, SessionFileContent } from '@contracts/workbuddy/session-files';
import type { TeacherInDraftReceipt } from '@domain/workbuddy/teacherin';
import { useOptionalWorkBuddyArtifactLibrary } from '@features/workbuddy-artifact-library';
import { createHttpSessionFileCatalog } from '@features/session-files/http-session-files';
import {
  FILE_ASSET_FIXTURES,
  FILE_ASSET_KIND_OPTIONS,
  buildFileAssetView,
  type FileAsset,
  type FileAssetKind,
} from "./file-library";
import styles from "./FileLibrary.module.css";

type Props = Readonly<{
  scope: RuntimeScope;
  productBoundary: 'classin-integrated' | 'standalone-consumer';
  initialAssets?: readonly FileAsset[];
  fileCatalog?: SessionFileCatalogAdapter;
  onUseAsContext: (asset: FileAsset) => void;
  onOpenRun: (runId: string) => void;
  onOpenSession: (sessionId: string) => void;
  draftReceipts: Readonly<Record<string, TeacherInDraftReceipt>>;
  onCreateTeacherInDraft: (asset: FileAsset) => TeacherInDraftReceipt;
  onOpenTeacherIn: (path: string) => void;
  onLocateInSpace: (asset: FileAsset) => void;
}>;

const httpSessionFiles = createHttpSessionFileCatalog();

const SHARE_TARGETS = [
  {
    id: "teacher-li",
    label: "李明老师",
    kind: "一对一聊天",
    detail: "高中数学教研组",
    icon: MessageSquare,
  },
  {
    id: "class-group",
    label: "高一（3）班班级群",
    kind: "班级群",
    detail: "当前课程群聊",
    icon: Users,
  },
  {
    id: "research-group",
    label: "高中数学教研组",
    kind: "群聊",
    detail: "8 位教师",
    icon: Users,
  },
] as const;

const TYPE_FILTER_OPTIONS: ReadonlyArray<{
  value: "all" | FileAssetKind;
  label: string;
}> = [
  { value: "all", label: "全部类型" },
  ...FILE_ASSET_KIND_OPTIONS.map((option) => ({
    value: option,
    label: option,
  })),
];

function AssetIcon({
  asset,
  size = 18,
}: Readonly<{ asset: FileAsset; size?: number }>) {
  const Icon = asset.sessionFile?.format === 'html'
    ? FileCode2
    : asset.sessionFile?.format === 'json'
      ? FileJson
      : asset.kind === "课件"
      ? Presentation
      : asset.kind === "表格"
        ? FileSpreadsheet
        : asset.kind === "素材包"
          ? FileArchive
          : FileText;
  return <Icon aria-hidden="true" size={size} />;
}

function fileKind(name: string, format: string): FileAssetKind {
  if (format === 'html') return '交互讲解';
  if (/练习|测验|题/.test(name)) return '练习';
  if (/报告|分析/.test(name)) return '学情报告';
  if (/课件|演示/.test(name)) return '课件';
  if (/表格|数据/.test(name) || format === 'json') return '表格';
  return '教案';
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function createdLabel(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '生成时间未知';
  return new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function asAsset(file: SessionFileContent['file'], favorite: boolean): FileAsset {
  return {
    id: `session-file-${file.id}`,
    name: file.name,
    extension: file.extension.toLocaleUpperCase('en-US'),
    kind: fileKind(file.name, file.format),
    summary: `由 TeachBuddy 在“${file.sessionTitle}”中生成的 ${file.extension.toLocaleUpperCase('en-US')} 文件。`,
    size: fileSize(file.byteSize),
    version: `v${file.version}`,
    createdAt: file.createdAt,
    createdLabel: createdLabel(file.createdAt),
    status: '可使用',
    favorite,
    reuseCount: 0,
    sharedTargets: [],
    project: {
      id: `runtime-session-${file.sessionId}`,
      title: file.sessionTitle,
      context: 'TeachBuddy 对话产物',
      runId: file.sessionId,
      runtimeSession: true,
    },
    canUseAsContext: false,
    canShare: false,
    sessionFile: file,
  };
}

function sandboxedHtml(content: string): string {
  const policy = `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; font-src data:">`;
  if (/<head(?:\s[^>]*)?>/i.test(content)) return content.replace(/<head(\s[^>]*)?>/i, (head) => `${head}${policy}`);
  if (/<html(?:\s[^>]*)?>/i.test(content)) return content.replace(/<html(\s[^>]*)?>/i, (html) => `${html}<head>${policy}</head>`);
  return `<!doctype html><html><head>${policy}</head><body>${content}</body></html>`;
}

export function FileLibrary({
  scope, productBoundary, initialAssets, fileCatalog = httpSessionFiles, onUseAsContext, onOpenRun, onOpenSession,
  draftReceipts, onCreateTeacherInDraft, onOpenTeacherIn, onLocateInSpace,
}: Props) {
  const standalone = productBoundary === 'standalone-consumer';
  const generatedLibrary = useOptionalWorkBuddyArtifactLibrary();
  const [assets, setAssets] = useState<FileAsset[]>(() =>
    (initialAssets ?? FILE_ASSET_FIXTURES).map((asset) => ({ ...asset, project: { ...asset.project } })),
  );
  const [sessionFiles, setSessionFiles] = useState<readonly SessionFileContent['file'][]>([]);
  const [fileState, setFileState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [fileError, setFileError] = useState('');
  const loadFiles = useCallback((isActive: () => boolean) => {
    void fileCatalog.list(scope).then((groups) => {
      if (!isActive()) return;
      setSessionFiles(groups.flatMap((group) => group.files));
      setFileState('ready');
    }).catch((error: unknown) => {
      if (!isActive()) return;
      setFileState('error');
      setFileError(error instanceof Error ? error.message : '读取 Session 文件失败，请重试。');
    });
  }, [fileCatalog, scope]);
  const refreshFiles = useCallback(() => {
    setFileState('loading');
    setFileError('');
    loadFiles(() => true);
  }, [loadFiles]);
  useEffect(() => {
    let active = true;
    loadFiles(() => active);
    return () => { active = false; };
  }, [loadFiles]);
  const libraryAssets = useMemo(() => {
    const generated = (generatedLibrary?.artifacts ?? []).map((artifact): FileAsset => ({
        id: artifact.id, name: artifact.title, extension: '链接', kind: '交互讲解',
        summary: artifact.summary, size: '交互内容', version: `v${artifact.version}`,
        createdAt: artifact.generatedAt, createdLabel: '刚刚', status: '可使用',
        favorite: assets.find(({ id }) => id === artifact.id)?.favorite ?? false,
        reuseCount: 0, sharedTargets: [],
        project: { id: artifact.runRef, title: 'IM 单题讲解', context: artifact.question, runId: artifact.runRef },
        canUseAsContext: true, canShare: false,
      }));
    const live = sessionFiles.map((file) => asAsset(file, assets.find(({ sessionFile }) => sessionFile?.id === file.id)?.favorite ?? false));
    const projected = [...generated, ...live];
    return [...assets.filter(({ id }) => !projected.some((candidate) => candidate.id === id)), ...projected];
  }, [assets, generatedLibrary?.artifacts, sessionFiles]);
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"all" | FileAssetKind>("all");
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [selected, setSelected] = useState<FileAsset | null>(null);
  const [sharing, setSharing] = useState<FileAsset | null>(null);
  const [shareTargetId, setShareTargetId] = useState<string>(
    SHARE_TARGETS[0].id,
  );
  const [feedback, setFeedback] = useState("");
  const [preview, setPreview] = useState<Readonly<{ status: 'idle' | 'loading' | 'ready' | 'error'; content?: string; error?: string }>>({ status: 'idle' });
  const typeControlRef = useRef<HTMLDivElement>(null);
  const typeTriggerRef = useRef<HTMLButtonElement>(null);
  const typeMenuRef = useRef<HTMLDivElement>(null);

  const view = useMemo(
    () => buildFileAssetView(libraryAssets, { query, kind, favoriteOnly }),
    [favoriteOnly, kind, libraryAssets, query],
  );

  const selectedTypeLabel =
    TYPE_FILTER_OPTIONS.find((option) => option.value === kind)?.label ??
    "全部类型";
  const selectedReceipt = !standalone && selected ? draftReceipts[selected.id] : undefined;

  useEffect(() => {
    if (!selected?.sessionFile) return;
    let active = true;
    void fileCatalog.read(scope, selected.sessionFile.id).then((content) => {
      if (active) setPreview({ status: 'ready', content: content.content });
    }).catch((error: unknown) => {
      if (active) setPreview({ status: 'error', error: error instanceof Error ? error.message : '预览加载失败，请重试。' });
    });
    return () => { active = false; };
  }, [fileCatalog, scope, selected]);

  const openAsset = (asset: FileAsset) => {
    setPreview({ status: asset.sessionFile ? 'loading' : 'idle' });
    setSelected(asset);
  };

  useEffect(() => {
    if (!typeMenuOpen) return;

    window.requestAnimationFrame(() => {
      typeMenuRef.current
        ?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
        ?.focus();
    });

    const handlePointerDown = (event: PointerEvent) => {
      if (typeControlRef.current?.contains(event.target as Node)) return;
      setTypeMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setTypeMenuOpen(false);
      window.requestAnimationFrame(() => typeTriggerRef.current?.focus());
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [typeMenuOpen]);

  const resetFilters = () => {
    setQuery("");
    setKind("all");
    setTypeMenuOpen(false);
    setFavoriteOnly(false);
  };
  const toggleFavorite = (asset: FileAsset, event?: MouseEvent) => {
    event?.stopPropagation();
    setAssets((current) =>
      (current.some(({ id }) => id === asset.id) ? current : [...current, asset]).map((candidate) =>
        candidate.id === asset.id
          ? { ...candidate, favorite: !candidate.favorite }
          : candidate,
      ),
    );
    if (selected?.id === asset.id)
      setSelected({ ...asset, favorite: !asset.favorite });
    setFeedback(
      `${asset.name}${asset.favorite ? "已取消收藏" : "已加入收藏"}。`,
    );
  };
  const openShare = (asset: FileAsset, event?: MouseEvent) => {
    event?.stopPropagation();
    if (!asset.canShare) return;
    setShareTargetId(SHARE_TARGETS[0].id);
    setSharing(asset);
  };
  const attachAsContext = (asset: FileAsset, event?: MouseEvent) => {
    event?.stopPropagation();
    if (asset.canUseAsContext) onUseAsContext(asset);
  };
  const openRun = (asset: FileAsset) => {
    if (!asset.project.runId) return;
    if (asset.project.runtimeSession) onOpenSession(asset.project.runId);
    else onOpenRun(asset.project.runId);
  };
  const downloadFile = (asset: FileAsset, event?: MouseEvent) => {
    event?.stopPropagation();
    if (!asset.sessionFile) {
      setFeedback(`${asset.name} 已准备下载。`);
      return;
    }
    const link = document.createElement('a');
    link.href = fileCatalog.downloadUrl(scope, asset.sessionFile.id);
    link.download = asset.name;
    document.body.append(link);
    link.click();
    setTimeout(() => link.remove(), 1000);
    setFeedback(`${asset.name} 已开始下载。`);
  };
  const createTeacherInDraft = (asset: FileAsset, event?: MouseEvent) => {
    event?.stopPropagation();
    if (standalone) return;
    const receipt = onCreateTeacherInDraft(asset);
    setFeedback(receipt.status === 'success'
      ? '已在 TeacherIn 创建草稿。你可以前往 TeacherIn 继续编辑作品信息、设置授权并发布。'
      : receipt.result);
  };

  return (
    <section className={styles.scene} aria-label="我的文件">
      <div className={styles.toolbar} aria-label="文件筛选">
        <div
          className={styles.selectControl}
          ref={typeControlRef}
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node)) {
              setTypeMenuOpen(false);
            }
          }}
        >
          <button
            ref={typeTriggerRef}
            className={styles.selectTrigger}
            type="button"
            aria-label="筛选文件类型"
            aria-haspopup="listbox"
            aria-expanded={typeMenuOpen}
            aria-controls="file-type-filter-options"
            onClick={() => setTypeMenuOpen((open) => !open)}
            onKeyDown={(event) => {
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              event.preventDefault();
              setTypeMenuOpen(true);
            }}
          >
            <Filter aria-hidden="true" size={16} />
            <span>{selectedTypeLabel}</span>
            <ChevronDown aria-hidden="true" size={15} />
          </button>
          {typeMenuOpen ? (
            <div
              ref={typeMenuRef}
              className={styles.selectMenu}
              id="file-type-filter-options"
              role="listbox"
              aria-label="文件类型选项"
              onKeyDown={(event) => {
                const options = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    '[role="option"]',
                  ),
                );
                const currentIndex = options.indexOf(
                  document.activeElement as HTMLElement,
                );
                const nextIndex =
                  event.key === "ArrowDown"
                    ? (currentIndex + 1) % options.length
                    : event.key === "ArrowUp"
                      ? (currentIndex - 1 + options.length) % options.length
                      : event.key === "Home"
                        ? 0
                        : event.key === "End"
                          ? options.length - 1
                          : -1;
                if (nextIndex < 0) return;
                event.preventDefault();
                options[nextIndex]?.focus();
              }}
            >
              {TYPE_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  className={styles.selectOption}
                  type="button"
                  role="option"
                  aria-selected={kind === option.value}
                  tabIndex={kind === option.value ? 0 : -1}
                  onClick={() => {
                    setKind(option.value);
                    setTypeMenuOpen(false);
                    window.requestAnimationFrame(() =>
                      typeTriggerRef.current?.focus(),
                    );
                  }}
                >
                  <span>{option.label}</span>
                  <Check
                    className={styles.optionCheck}
                    aria-hidden="true"
                    size={15}
                  />
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <label className={styles.searchControl}>
          <Search aria-hidden="true" size={17} />
          <span className={styles.srOnly}>搜索文件、任务或课程</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索文件、任务或课程"
          />
        </label>
        <button
          className={styles.favoriteFilter}
          type="button"
          aria-pressed={favoriteOnly}
          onClick={() => setFavoriteOnly((current) => !current)}
        >
          <Star
            aria-hidden="true"
            size={16}
            fill={favoriteOnly ? "currentColor" : "none"}
          />
          我的收藏
          <span>{view.favoriteCount}</span>
        </button>
        <output className={styles.resultSummary} aria-live="polite">
          {view.resultCount} 个文件 / {view.groups.length} 个任务
        </output>
      </div>

      {fileState === 'loading' ? (
        <p className={styles.catalogState} role="status">正在同步 Session 文件…</p>
      ) : fileState === 'error' ? (
        <div className={styles.catalogError} role="alert">
          <span>{fileError}</span>
          <button type="button" onClick={() => refreshFiles()}><RefreshCw aria-hidden="true" size={14} />重试</button>
        </div>
      ) : null}

      {view.groups.length ? (
        <div
          className={styles.timelineList}
          role="region"
          aria-label="按任务分组的 AI 协作文件"
        >
          <div className={styles.fileColumns} aria-hidden="true">
            <span>文件</span>
            <span>类型</span>
            <span>生成时间</span>
            <span>大小</span>
            <span />
          </div>
          {view.groups.map((group) => (
            <section
              className={styles.sessionGroup}
              key={group.project.id}
              aria-labelledby={`file-group-${group.project.id}`}
            >
              <header className={styles.sessionHeader}>
                <div className={styles.sessionIdentity}>
                  <span className={styles.groupIcon}>
                    <Bot aria-hidden="true" size={19} />
                  </span>
                  <div className={styles.groupCopy}>
                    <h2 id={`file-group-${group.project.id}`}>
                      {group.project.title}
                    </h2>
                    <p>{group.project.context}</p>
                  </div>
                </div>
                <span className={styles.sessionCount}>
                  {group.assets.length} 个文件
                </span>
                {group.project.runId ? (
                  <button
                    className={styles.runButton}
                    type="button"
                    onClick={() => group.project.runtimeSession
                      ? onOpenSession(group.project.runId!)
                      : onOpenRun(group.project.runId!)}
                  >
                    回到任务
                    <ExternalLink aria-hidden="true" size={14} />
                  </button>
                ) : null}
              </header>
              <div className={styles.fileList}>
                {group.assets.map((asset) => (
                  <article className={styles.fileItem} key={asset.id}>
                    <button
                      className={styles.assetOpen}
                      type="button"
                      aria-label={`查看${asset.name}`}
                      onClick={() => openAsset(asset)}
                    >
                      <span className={styles.assetIcon} data-kind={asset.kind}>
                        <AssetIcon asset={asset} />
                      </span>
                      <span>
                        <strong>{asset.name}</strong>
                      </span>
                    </button>
                    <span className={styles.fileKind}>{asset.kind}</span>
                    <time
                      className={styles.fileTime}
                      dateTime={asset.createdAt}
                    >
                      {asset.createdLabel}
                    </time>
                    <span className={styles.fileSize}>{asset.size}</span>
                    <div className={styles.rowActions}>
                      {!asset.sessionFile && !standalone && draftReceipts[asset.id]?.status === 'success' ? (
                        <button
                          type="button"
                          aria-label={`${asset.name}前往 TeacherIn`}
                          title="前往 TeacherIn"
                          onClick={(event) => {
                            event.stopPropagation();
                            const receipt = draftReceipts[asset.id];
                            if (receipt?.status === 'success') onOpenTeacherIn(receipt.draft.editorPath);
                          }}
                        >
                          <BookOpen aria-hidden="true" size={16} />
                        </button>
                      ) : !asset.sessionFile && !standalone ? (
                        <button
                          type="button"
                          aria-label={`${asset.name}创建草稿到 TeacherIn`}
                          title="创建草稿到 TeacherIn"
                          onClick={(event) => createTeacherInDraft(asset, event)}
                        >
                          <BookOpen aria-hidden="true" size={16} />
                        </button>
                      ) : null}
                      {asset.sessionFile ? <button
                          type="button"
                          aria-label={`${asset.name}下载`}
                          title="下载"
                          onClick={(event) => downloadFile(asset, event)}
                        >
                          <Download aria-hidden="true" size={16} />
                        </button> : null}
                      <button
                        type="button"
                        aria-label={`${asset.name}收藏`}
                        aria-pressed={asset.favorite}
                        title={asset.favorite ? "取消收藏" : "收藏"}
                        onClick={(event) => toggleFavorite(asset, event)}
                      >
                        <Star
                          aria-hidden="true"
                          size={16}
                          fill={asset.favorite ? "currentColor" : "none"}
                        />
                      </button>
                      {!asset.sessionFile ? <button
                        type="button"
                        aria-label={`${asset.name}作为上下文`}
                        title="作为上下文"
                        disabled={!asset.canUseAsContext}
                        onClick={(event) => attachAsContext(asset, event)}
                      >
                        <Link2 aria-hidden="true" size={16} />
                      </button> : null}
                      {!asset.sessionFile ? <button
                        type="button"
                        aria-label={`${asset.name}分享`}
                        title="分享"
                        disabled={!asset.canShare}
                        onClick={(event) => openShare(asset, event)}
                      >
                        <Share2 aria-hidden="true" size={16} />
                      </button> : null}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <Search aria-hidden="true" size={28} />
          <strong>没有找到匹配文件</strong>
          <p>尝试更换文件类型或搜索关键词。</p>
          <button type="button" onClick={resetFilters}>
            清除筛选
          </button>
        </div>
      )}

      {feedback ? (
        <p className={styles.toast} role="status">
          <Check aria-hidden="true" size={16} />
          {feedback}
        </p>
      ) : null}

      {selected ? (
        <div
          className={styles.detailBackdrop}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSelected(null);
          }}
        >
          <aside
            className={styles.detailPanel}
            aria-label={`${selected.name}文件详情`}
          >
            <header>
              <div>
                <span>{selected.kind}</span>
                <h2>{selected.name}</h2>
              </div>
              <button
                type="button"
                aria-label="关闭文件详情"
                onClick={() => setSelected(null)}
              >
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            {selected.sessionFile ? (
              <div className={styles.livePreview} data-format={selected.sessionFile.format}>
                {preview.status === 'loading' ? <p role="status">正在加载预览…</p> : null}
                {preview.status === 'error' ? <div role="alert"><p>{preview.error}</p><button type="button" onClick={() => openAsset({ ...selected })}><RefreshCw aria-hidden="true" size={14} />重试</button></div> : null}
                {preview.status === 'ready' && selected.sessionFile.preview === 'html' ? (
                  <iframe
                    title={`${selected.name}安全预览`}
                    sandbox=""
                    referrerPolicy="no-referrer"
                    srcDoc={sandboxedHtml(preview.content ?? '')}
                  />
                ) : null}
                {preview.status === 'ready' && selected.sessionFile.preview === 'text' ? (
                  <pre tabIndex={0}>{selected.sessionFile.format === 'json' ? (() => {
                    try { return JSON.stringify(JSON.parse(preview.content ?? ''), null, 2); } catch { return preview.content; }
                  })() : preview.content}</pre>
                ) : null}
              </div>
            ) : (
              <div className={styles.preview}>
                <span className={styles.previewIcon}>
                  <AssetIcon asset={selected} size={34} />
                </span>
                <strong>{selected.extension}</strong>
                <p>{selected.summary}</p>
                <small>当前展示结构化文件摘要</small>
              </div>
            )}
            <section className={styles.detailSection}>
              <h3>任务与回溯</h3>
              <dl>
                <div>
                  <dt>{selected.sessionFile ? '来源 Session' : '任务 / 项目'}</dt>
                  <dd>{selected.project.title}</dd>
                </div>
                <div>
                  <dt>教学范围</dt>
                  <dd>{selected.project.context}</dd>
                </div>
                <div>
                  <dt>生成时间</dt>
                  <dd>{selected.createdLabel}</dd>
                </div>
                <div>
                  <dt>版本</dt>
                  <dd>{selected.version}</dd>
                </div>
                {selected.sessionFile ? <div>
                  <dt>文件状态</dt>
                  <dd>{selected.sessionFile.status === 'saved' ? '已确认保存' : '已生成，待审阅'}</dd>
                </div> : null}
              </dl>
            </section>
            {!selected.sessionFile ? <section className={styles.detailSection}>
              <h3>复用记录</h3>
              <p>
                已作为上下文引用 {selected.reuseCount} 次
                {!standalone && selected.sharedTargets.length
                  ? `，最近分享到${selected.sharedTargets.join("、")}`
                  : standalone && selected.canShare
                    ? '，可生成个人分享链接'
                    : "，尚未分享"}
                。
              </p>
            </section> : <section className={styles.detailSection}>
              <h3>本地文件</h3>
              <p>此文件由来源 Session 自动留存。确认保存、发送或正式发布仍需单独操作。</p>
            </section>}
            {selected.sessionFile ? null : standalone ? (
              <section className={styles.detailSection}>
                <h3>个人文件库</h3>
                <p>文件保存在当前独立账号中，可下载、复用或生成个人分享链接。</p>
              </section>
            ) : (
              <section className={styles.detailSection}>
                <h3>TeacherIn 作品</h3>
                {selectedReceipt?.status === 'success' ? (
                  <p>已创建草稿 · {selectedReceipt.draft.createdAt} · 来源版本 {selectedReceipt.draft.sourceArtifactRef.version}</p>
                ) : selectedReceipt ? (
                  <p>{selectedReceipt.result}</p>
                ) : (
                  <p>尚未创建 TeacherIn 草稿。</p>
                )}
              </section>
            )}
            <div className={styles.detailActions}>
              {selected.sessionFile ? null : !standalone && selectedReceipt?.status === 'success' ? (
                <button
                  className={styles.teacherInButton}
                  type="button"
                  onClick={() => {
                    const receipt = selectedReceipt;
                    if (receipt?.status === 'success') onOpenTeacherIn(receipt.draft.editorPath);
                  }}
                >
                  <BookOpen aria-hidden="true" size={16} />
                  前往 TeacherIn
                </button>
              ) : !standalone ? (
                <button className={styles.teacherInButton} type="button" onClick={() => createTeacherInDraft(selected)}>
                  <BookOpen aria-hidden="true" size={16} />
                  创建草稿到 TeacherIn
                </button>
              ) : null}
              {!selected.sessionFile ? <button
                className={styles.contextButton}
                type="button"
                disabled={!selected.canUseAsContext}
                onClick={() => attachAsContext(selected)}
              >
                <Link2 aria-hidden="true" size={16} />
                作为上下文
              </button> : null}
              {!selected.sessionFile ? <button
                type="button"
                disabled={!selected.canShare}
                onClick={() => standalone
                  ? setFeedback(`${selected.name} 的个人分享链接已复制。`)
                  : openShare(selected)}
              >
                <Share2 aria-hidden="true" size={16} />
                {standalone ? '复制分享链接' : '分享'}
              </button> : null}
              <button
                type="button"
                onClick={() => downloadFile(selected)}
              >
                <Download aria-hidden="true" size={16} />
                下载
              </button>
              {!selected.sessionFile && !standalone ? (
                <button type="button" onClick={() => onLocateInSpace(selected)}>
                  <ExternalLink aria-hidden="true" size={16} />
                  在空间中定位
                </button>
              ) : null}
              {selected.project.runId ? (
                <button type="button" onClick={() => openRun(selected)}>
                  <ExternalLink aria-hidden="true" size={16} />
                  回到任务
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {!standalone && sharing ? (
        <div className={styles.dialogBackdrop}>
          <section
            className={styles.shareDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="share-file-title"
          >
            <header>
              <div>
                <span>分享文件</span>
                <h2 id="share-file-title">选择发送位置</h2>
                <p>{sharing.name}</p>
              </div>
              <button
                type="button"
                aria-label="关闭分享文件"
                onClick={() => setSharing(null)}
              >
                <X aria-hidden="true" size={18} />
              </button>
            </header>
            <fieldset className={styles.targetList}>
              <legend>发送到</legend>
              {SHARE_TARGETS.map((target) => {
                const Icon = target.icon;
                return (
                  <label key={target.id}>
                    <input
                      type="radio"
                      name="share-target"
                      value={target.id}
                      checked={shareTargetId === target.id}
                      onChange={() => setShareTargetId(target.id)}
                    />
                    <span className={styles.targetIcon}>
                      <Icon aria-hidden="true" size={17} />
                    </span>
                    <span>
                      <strong>{target.label}</strong>
                      <small>
                        {target.kind} / {target.detail}
                      </small>
                    </span>
                  </label>
                );
              })}
            </fieldset>
            <footer>
              <button
                type="button"
                onClick={() => {
                  setFeedback(`${sharing.name} 的分享链接已复制。`);
                  setSharing(null);
                }}
              >
                <Copy aria-hidden="true" size={16} />
                复制链接
              </button>
              <button
                className={styles.sendButton}
                type="button"
                onClick={() => {
                  const target = SHARE_TARGETS.find(
                    (candidate) => candidate.id === shareTargetId,
                  )!;
                  setFeedback(
                    `${sharing.name} 已发送到${target.label}。`,
                  );
                  setSharing(null);
                }}
              >
                <Share2 aria-hidden="true" size={16} />
                发送
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </section>
  );
}
