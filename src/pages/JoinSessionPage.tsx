import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { trackEvent } from "../lib/analytics";

/* ============================
   TYPES
============================ */

// Shape of error returned by backend
type ApiErrorResponse = {
  error?: string;
  errors?: {
    detail?: string;
  };
};

/* ============================
   COMPONENT
============================ */

export default function JoinSessionPage() {
  const navigate = useNavigate();

  /* ----------------------------
     STATE
  ---------------------------- */

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  /* ============================
     JOIN SESSION
  ============================ */

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");

    const sessionCode = code.trim().toUpperCase();

    if (!sessionCode) {
      setError("Please enter a session code");
      return;
    }

    try {
      setLoading(true);

      const data = await apiRequest(
        "/api/sessions/join/",
        {
          method: "POST",
          body: JSON.stringify({
            code: sessionCode,
          }),
        }
      );

      trackEvent("session_joined", {
        session_id: data.session_id,
      });

      navigate(`/session/${data.session_id}`);
    } catch (err: unknown) {
      // 🔒 Type-safe error handling
      let message = "Unable to join session";

      if (typeof err === "object" && err !== null) {
        const apiError = err as ApiErrorResponse;

        if (apiError.error) {
          message = apiError.error;
        } else if (apiError.errors?.detail) {
          message = apiError.errors.detail;
        }
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  /* ============================
     RENDER
  ============================ */

  return (
    <div className="mx-auto mt-24 w-full max-w-sm px-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">
        Join a Session
      </h1>
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">
          Join a Session
        </h1>
        <button 
          onClick={() => navigate("/")}
          className="text-sm bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2"
        >
          Home
        </button>
      </div>

      {error && (
        <p className="text-sm text-red-500 text-center">
          {error}
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <input
          type="text"
          placeholder="Enter session code"
          value={code}
          onChange={(e) =>
            setCode(e.target.value.toUpperCase())
          }
          maxLength={6}
          className="w-full rounded-lg border px-3 py-2 text-center tracking-widest"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-xl py-3 font-bold text-white ${
            loading ? "bg-gray-400" : "bg-black"
          }`}
        >
          {loading ? "Joining…" : "Join Session"}
        </button>
      </form>
    </div>
  );
}
