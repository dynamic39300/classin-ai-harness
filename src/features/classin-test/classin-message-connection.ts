import { createContext, useContext } from 'react';
import type { ClassInScene } from '@contracts/classin-test';
import type { MessageWorkspaceExtension } from '@features/message-workspace';
export type ClassInMessageConnection = { status: 'idle' | 'loading' | 'error' | 'ready'; scene?: ClassInScene; extension?: MessageWorkspaceExtension; error?: string; refresh: () => Promise<void> };
export const ClassInMessageConnectionContext = createContext<ClassInMessageConnection>({ status: 'idle', refresh: async () => undefined });
export const useClassInMessageConnection = () => useContext(ClassInMessageConnectionContext);
