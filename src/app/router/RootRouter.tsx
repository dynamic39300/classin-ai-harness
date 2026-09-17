import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { RoleSelectPage, useRoleSession } from '@features/role-switch';
import { StudentRoutes } from './StudentRoutes';
import { TeacherRoutes } from './TeacherRoutes';

export function RootRouter() {
  const { role } = useRoleSession();
  const location = useLocation();

  if (role === null) {
    return (
      <Routes>
        <Route path="/teacher/classin-test" element={<RoleSelectPage teacherDestination={`${location.pathname}${location.search}`} />} />
        <Route path="/select-role" element={<RoleSelectPage />} />
        <Route path="*" element={<Navigate to="/select-role" replace />} />
      </Routes>
    );
  }

  return role === 'teacher' ? <TeacherRoutes /> : <StudentRoutes />;
}
