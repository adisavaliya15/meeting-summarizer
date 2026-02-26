import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute({ session }) {
  const location = useLocation();
  if (!session) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}