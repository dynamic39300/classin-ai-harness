import type { RuntimeScope } from './agent-runtime';

export type SessionFileFormat = 'markdown' | 'html' | 'text' | 'json';
export type SessionFilePreview = 'text' | 'html';

export type SessionFile = Readonly<{
  id: string;
  artifactId: string;
  sessionId: string;
  sessionTitle: string;
  name: string;
  extension: 'md' | 'html' | 'txt' | 'json';
  format: SessionFileFormat;
  mediaType: string;
  byteSize: number;
  version: number;
  status: 'draft' | 'saved';
  createdAt: string;
  updatedAt: string;
  preview: SessionFilePreview;
  truthLabel: 'local-runtime';
}>;

export type SessionFileGroup = Readonly<{
  sessionId: string;
  sessionTitle: string;
  updatedAt: string;
  files: readonly SessionFile[];
}>;

export type SessionFileContent = Readonly<{
  file: SessionFile;
  content: string;
}>;

export type SessionFileIdentity = Readonly<{
  sessionId: string;
  sessionTitle: string;
}>;

export type GeneratedSessionFile = Readonly<{
  scope: RuntimeScope;
  sessionId: string;
  sessionTitle: string;
  artifactId: string;
  title: string;
  fileName?: string;
  content: string;
  format: SessionFileFormat;
  version: number;
  status: 'draft' | 'saved';
  createdAt: string;
}>;

export interface SessionFileLibrary {
  materialize(input: GeneratedSessionFile): Promise<SessionFile>;
  list(scope: RuntimeScope, sessions: readonly SessionFileIdentity[]): Promise<readonly SessionFileGroup[]>;
  read(scope: RuntimeScope, fileId: string): Promise<SessionFileContent>;
}

export interface SessionFileCatalogAdapter {
  list(scope: RuntimeScope): Promise<readonly SessionFileGroup[]>;
  read(scope: RuntimeScope, fileId: string): Promise<SessionFileContent>;
  downloadUrl(scope: RuntimeScope, fileId: string): string;
}
