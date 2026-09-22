import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getCurrentUser } from './localAuth.js';

// Blocks access to every nested route unless the user is logged in, redirecting to /login
// (and remembering where they were headed so they can be sent back after logging in).
export default function RequireAuth() {
  const location = useLocation();
  const currentUser = getCurrentUser();

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
}
