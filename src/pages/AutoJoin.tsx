import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

/* ============================
   COMPONENT
============================ */

export default function AutoJoin() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function join() {
      const sessionCode =
        localStorage.getItem("pendingSessionCode");

      if (!sessionCode) {
        navigate("/", { replace: true });
        return;
      }

      try {
        const data = await apiRequest(
          "/api/sessions/join/",
          {
            method: "POST",
            body: JSON.stringify({
              code: sessionCode,
            }),
          }
        );

        localStorage.removeItem("pendingSessionCode");
        navigate(`/session/${data.session_id}`, {
          replace: true,
        });
      } catch {
        localStorage.removeItem("pendingSessionCode");
        setError(
          "This invite link is invalid or the session has ended."
        );
      }
    }

    join();
  }, [navigate]);

  if (error) {
    return (
      <div className="mx-auto mt-24 max-w-sm px-6 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="mx-auto mt-24 max-w-sm px-6 text-center">
      Joining session…
    </div>
  );
}
