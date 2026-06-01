import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Redirect to login if not logged in
// Redirect to /unauthorized if logged in but wrong role
export default function ProtectedRoute({ children, page }) {
  const { user, can } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (page && !can(page)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}
