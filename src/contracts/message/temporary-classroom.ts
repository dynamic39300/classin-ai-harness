import type { AppRole } from '@domain/account/role';

export type TemporaryClassroomCommandResult = Readonly<{
  status: 'success' | 'ended' | 'forbidden' | 'not-found';
  message: string;
  classroomId: string;
}>;

export interface TemporaryClassroomAdapter {
  enter(role: AppRole, classroomId: string): TemporaryClassroomCommandResult;
  reset(): void;
}
