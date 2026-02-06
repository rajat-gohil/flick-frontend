import { useEffect, useState } from "react";
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

  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionCode, setSessionCode] = useState<string | null>(null);
  const [industry, setIndustry] = useState<"bollywood" | "hollywood" | null>(null);

  
  
  const [error, setError] = useState("");

  /* ============================
     LOAD GENRES
  ============================ */

    useEffect(() => {
      if (!industry) return;

      async function loadGenres() {
        try {
          const data = await apiRequest(
            `/api/genres/?industry=${industry}`
          );
          setGenres(Array.isArray(data.genres) ? data.genres : []);
        } catch {
          setError("Failed to load genres");
        }
      }

      loadGenres();
    }, [industry]);


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

    try {
      const data = await apiRequest(
        "/api/sessions/create/",
        {
          method: "POST",
          body: JSON.stringify({
            genre_id: selectedGenreId,
          }),
        }
      );

      trackEvent("session_created", {
        genre_id: selectedGenreId,
      });

      setSessionId(data.session_id);
      setSessionCode(data.code);
    } catch {
      setError("Failed to create session");
    }
  }

  /* ============================
     RENDER
  ============================ */

  const inviteLink =
  sessionCode
    ? `${window.location.origin}/join/${sessionCode}`
    : "";


  return (
    <div className="mx-auto mt-24 max-w-md px-6 space-y-6">
            {!industry && (
              <div className="space-y-4">
                <p className="text-center text-sm text-gray-600">
                  Choose an industry
                </p>

                <button
                  type="button"
                  onClick={() => setIndustry("bollywood")}
                  className="w-full rounded-xl bg-black py-3 font-bold text-white"
                >
                  🎬 Bollywood
                </button>

                <button
                  type="button"
                  onClick={() => setIndustry("hollywood")}
                  className="w-full rounded-xl border py-3 font-bold"
                >
                  🎥 Hollywood
                </button>
              </div>
            )}

      <h1 className="text-2xl font-bold text-center">
        Create Session
      </h1>

      {error && (
        <p className="text-sm text-red-500 text-center">
          {error}
        </p>
      )}

      {/* ============================
         AFTER SESSION IS CREATED
      ============================ */}
      {sessionId && sessionCode ? (
<div className="space-y-4 text-center">
  <p className="text-lg">
    Share this code with your friend
  </p>

  <div className="border rounded-xl py-4 text-3xl font-bold tracking-widest">
    {sessionCode}
  </div>

  {/* 🔗 INVITE LINK (NEW) */}
  <div className="space-y-2">
    <p className="text-sm text-gray-600">
      Or share this link
    </p>

    <div className="flex items-center gap-2">
      <input
        type="text"
        readOnly
        value={inviteLink}
        className="w-full rounded-lg border px-3 py-2 text-sm"
      />

      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(inviteLink);
        }}
        className="rounded-lg border px-3 py-2 text-sm font-semibold"
      >
        Copy
      </button>
    </div>
  </div>

  <button
    onClick={() => navigate(`/session/${sessionId}`)}
    className="w-full rounded-xl bg-black py-3 font-bold text-white"
  >
    Continue
  </button>
</div>
      ) : (
        /* ============================
           BEFORE SESSION IS CREATED
        ============================ */
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {industry && (
            <div className="space-y-2">
              {genres.map((genre) => (
                <button
                  key={genre.id}
                  type="button"
                  onClick={() => setSelectedGenreId(genre.id)}
                  className={`w-full rounded-lg border px-4 py-2 text-left ${
                    selectedGenreId === genre.id
                      ? "border-black font-bold"
                      : "border-gray-300"
                  }`}
                >
                  {genre.name}
                </button>
              ))}
            </div>
          )}


          <button
            type="submit"
            className="w-full rounded-xl bg-black py-3 font-bold text-white"
          >
            Create Session
          </button>
        </form>
      )}
    </div>
  );
}
