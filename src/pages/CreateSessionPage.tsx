import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { trackEvent } from "../lib/analytics";

/* ============================
   TYPES
============================ */

type Genre = {
  id: number;
  name: string;
};

/* ============================
   COMPONENT
============================ */

export default function CreateSessionPage() {
  const navigate = useNavigate();

  /* ----------------------------
     STATE
  ---------------------------- */

  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number>();
  const [sessionCode, setSessionCode] = useState<string>();
  const [industry, setIndustry] = useState<"bollywood" | "hollywood">();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  /* ============================
     LOAD GENRES
  ============================ */

  const loadGenres = useCallback(async () => {
    if (!industry) return;
    
    setIsLoading(true);
    setError("");
    try {
      const data = await apiRequest(
        `/api/genres/?industry=${industry}`  // CHANGED FROM `/genres/?industry=${industry}`
      );
      setGenres(Array.isArray(data.genres) ? data.genres : []);
      setSelectedGenreId(null); // Reset selection when industry changes
    } catch {
      setError("Failed to load genres");
      setGenres([]);
    } finally {
      setIsLoading(false);
    }
  }, [industry]);

  useEffect(() => {
    loadGenres();
  }, [loadGenres]);

/* ============================
   CREATE SESSION
============================ */

async function handleSubmit(
  e: React.FormEvent<HTMLFormElement>
) {
  e.preventDefault();
  setError("");

  if (selectedGenreId === null) {
    setError("Please select a genre");
    return;
  }

  if (!industry) {
    setError("Please select an industry first");
    return;
  }

  setIsLoading(true);
  try {
    // CHANGE 1: Keep consistent with your backend URLs
    const sessionData = await apiRequest(
      "/api/sessions/create/", // ← Already correct
      {
        method: "POST",
        body: JSON.stringify({}),
      }
    );

      await apiRequest(
        "/api/sessions/genre/",  // CHANGED FROM "/sessions/set-genre/"
        {
          method: "POST",
          body: JSON.stringify({
            genre_id: selectedGenreId,
            industry: industry,
            session_id: sessionData.id,
          }),
        }
      );

    trackEvent("session_created", {
      genre_id: selectedGenreId,
      industry: industry,
    });

    setSessionId(sessionData.id);
    setSessionCode(sessionData.code);
  } catch (error) {
    console.error("Session creation failed:", error);
    setError("Failed to create session. Please try again.");
  } finally {
    setIsLoading(false);
  }
}

  /* ============================
     RENDER
  ============================ */

  const inviteLink = sessionCode
    ? `${window.location.origin}/join/${sessionCode}`
    : "";

  // Handle copy to clipboard with error handling
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      // Optional: Show success toast/message
    } catch {
      setError("Failed to copy link to clipboard");
    }
  };

  return (
    <div className="mx-auto mt-24 max-w-md px-6 space-y-6">
      {/* Show error at top if exists */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 text-center">
            {error}
          </p>
        </div>
      )}

      {/* Step 1: Industry Selection */}
      {!industry && !sessionId && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-center">
            Choose an industry
          </h1>
          
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => setIndustry("bollywood")}
              className="w-full rounded-xl bg-black py-3 font-bold text-white hover:bg-gray-800 transition-colors"
              disabled={isLoading}
            >
              🎬 Indian Movies
            </button>

            <button
              type="button"
              onClick={() => setIndustry("hollywood")}
              className="w-full rounded-xl border py-3 font-bold hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              🎥 Hollywood
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Genre Selection & Session Creation */}
      {industry && !sessionId && (
        <div className="space-y-6">
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIndustry(undefined);
                setSelectedGenreId(null);
                setGenres([]);
              }}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              ← Back to industry selection
            </button>
            <h1 className="text-2xl font-bold">
              Create Session
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {industry === "bollywood" ? "🎬 Bollywood" : "🎥 Hollywood"}
            </p>
          </div>

          {isLoading && genres.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Loading genres...</p>
            </div>
          ) : genres.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No genres available</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700">Select a genre:</p>
                {genres.map((genre) => (
                  <button
                    key={genre.id}
                    type="button"
                    onClick={() => setSelectedGenreId(genre.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                      selectedGenreId === genre.id
                        ? "border-black bg-black text-white font-bold"
                        : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                    }`}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>

              <button
                type="submit"
                disabled={selectedGenreId === null || isLoading}
                className={`w-full rounded-xl py-3 font-bold transition-colors ${
                  selectedGenreId === null || isLoading
                    ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                    : "bg-black text-white hover:bg-gray-800"
                }`}
              >
                {isLoading ? "Creating..." : "Create Session"}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Step 3: Session Created */}
      {sessionId && sessionCode && (
        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Session Created!</h1>
            <p className="text-sm text-gray-600 mt-1">
              Share this code with your friends to join
            </p>
          </div>

          <div className="space-y-4 text-center">
            <div className="border-2 border-black rounded-xl py-6 text-4xl font-bold tracking-widest bg-gray-50">
              {sessionCode}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Or share this link:
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-semibold hover:bg-gray-100 whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
            </div>

            <button
              onClick={() => navigate(`/session/${sessionId}`)}
              className="w-full rounded-xl bg-black py-3 font-bold text-white hover:bg-gray-800 transition-colors"
            >
              Continue to Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}