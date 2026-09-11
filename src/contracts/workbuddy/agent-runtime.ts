import type { ConversationRunEvent } from './conversation-run';
import type { SessionFileFormat } from './session-files';

export type RuntimeScope = 'ideal-full' | 'classin-mvp' | 'standalone-teacher';
export type RuntimeHealth = Readonly<{
  status: 'ready' | 'unconfigured' | 'offline';
  message: string;
}>;
export type RuntimeImageMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';
export type RuntimeImageInput = Readonly<{
  name: string;
  mediaType: RuntimeImageMediaType;
  byteSize: number;
  data: string;
}>;
export type RuntimeArtifact = Readonly<{
  id: string;
  title: string;
  content: string;
  fileRef: string;
  fileName: string;
  format: SessionFileFormat;
  mediaType: string;
  byteSize: number;
  createdAt: string;
  version: number;
  status: 'draft' | 'saved';
  receipt?: Readonly<{ id: string; approvedAt: string; savedAt: string; truthLabel: 'local-runtime'; }>;
}>;
export type RuntimeSession = Readonly<{
  id: string;
  title: string;
  status: 'idle' | 'running' | 'stopped' | 'failed';
  updatedAt: string;
  events: readonly ConversationRunEvent[];
  artifacts: readonly RuntimeArtifact[];
  error?: string;
  failureCode?: 'vision-permission' | 'model-history-invalid';
}>;
export interface AgentRuntimeAdapter {
  health(): Promise<RuntimeHealth>;
  list(scope: RuntimeScope): Promise<readonly RuntimeSession[]>;
  create(scope: RuntimeScope): Promise<RuntimeSession>;
  read(scope: RuntimeScope, id: string): Promise<RuntimeSession>;
  send(scope: RuntimeScope, id: string, text: string, commandId: string, images?: readonly RuntimeImageInput[]): Promise<RuntimeSession>;
  cancel(scope: RuntimeScope, id: string): Promise<RuntimeSession>;
  approve(scope: RuntimeScope, id: string, artifactId: string, version: number, commandId: string): Promise<RuntimeSession>;
}
