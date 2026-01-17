import { useParams, Navigate } from "react-router-dom";
import { useEffect } from "react";

export default function JoinViaLink() {
  const { sessionCode } = useParams<{ sessionCode: string }>();

  useEffect(() => {
    if (sessionCode) {
      localStorage.setItem(
        "pendingSessionCode",
        sessionCode.toUpperCase()
      );
    }
  }, [sessionCode]);

  if (!sessionCode) {
    return <Navigate to="/" replace />;
  }

  // ✅ USE THE SAME KEY AS LOGIN
  const token = localStorage.getItem("auth_token"); // ← FIX HERE

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/auto-join" replace />;
}
