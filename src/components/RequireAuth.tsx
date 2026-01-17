import { Navigate } from "react-router-dom";

type Props = {
  children: React.ReactNode;
};

export default function RequireAuth({ children }: Props) {
  const isAuthenticated =
    Boolean(localStorage.getItem("auth_token"));

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
