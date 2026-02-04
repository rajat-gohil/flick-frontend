import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { trackEvent } from "../lib/analytics";

/* ============================
   TYPES (MATCH BACKEND)
============================ */

type Movie = {
  id: number;
  title: string;
  overview: string;
  poster_url: string;
};

type Match = {
  session_id: number;
  movie_id: number;
  movie_title: string;
  matched_at?: string;
};

type Session = {
  id: number;
  code: string;
  host_joined: boolean;
  guest_joined: boolean;
  ended: boolean;
};


/* ============================
   COMPONENT
============================ */

export default function SessionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  /* ----------------------------
     STATE
  ---------------------------- */

  const [session, setSession] = useState<Session | null>(null);

  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [moviesLoaded, setMoviesLoaded] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  
  const [showMatch, setShowMatch] = useState(false);
  const [matchedMovie, setMatchedMovie] = useState<Movie | null>(null);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  const [error, setError] = useState("");

  const [sessionLocked, setSessionLocked] = useState(false);

/* ============================
   LOAD MATCH HISTORY
============================ */

  const loadMatchHistory = useCallback(async () => {
    try {
      setLoadingMatches(true);

      const data = await apiRequest(
        `/api/matches/?session_id=${id}`
      );

      if (Array.isArray(data.matches)) {
        const filtered = data.matches.filter(
          (m: Match) => m.session_id === Number(id)
        );
        setMatches(filtered);
      } else {
        setMatches([]);
      }
    } catch {
      setMatches([]);
    } finally {
      setLoadingMatches(false);
    }
  }, [id]);





  /* ============================
     WEBSOCKET (MATCH SYNC)
  ============================ */

  useEffect(() => {
    if (!id) return;
      console.log("WS HOST:", import.meta.env.VITE_BACKEND_HOST);
    const protocol =
      window.location.protocol === "https:" ? "wss" : "ws";

    const backendHost =
      import.meta.env.VITE_BACKEND_HOST ||
      window.location.hostname;

    const wsUrl = `${protocol}://${backendHost}/ws/session/${id}/`;

    const socket = new WebSocket(wsUrl);
    console.log("WS URL:", wsUrl);
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "match_event") {
          setMatchedMovie({
            id: data.movie_id,
            title: data.movie_title,
            overview: "",
            poster_url: "",
          });

          setShowMatch(true);
        }
      } catch {
        // ignore malformed events
      }
    };

    socket.onerror = () => {
      // silent failure; polling remains fallback
    };

    return () => {
      socket.close();
    };
  }, [id]);


  /* ============================
     SESSION POLLING
  ============================ */

  useEffect(() => {
    if (!id) return;

    async function pollSession() {
      try {
        const data = await apiRequest(`/api/sessions/${id}/`);
        const s: Session = data.session;
        setSession(s);
        if (s.ended && !summaryLoaded) {
          loadMatchHistory();
          setSummaryLoaded(true);
          trackEvent("session_summary_loaded", {
            session_id: s.id,
          });
        }


        // Load recommendations ONCE after both users join
        if (
          s.host_joined &&
          s.guest_joined &&
          !moviesLoaded
        ) {
          const recos = await apiRequest(
            `/api/recommendations/?session_id=${id}`
          );

          setMovies(Array.isArray(recos.movies) ? recos.movies : []);
          setCurrentIndex(0);
          setMoviesLoaded(true);

          trackEvent("movies_loaded", {
            count: recos.movies?.length || 0,
          });
        }
      } catch {
        setError("Failed to load session");
      }
    }

    pollSession();
    const intervalId = window.setInterval(pollSession, 3000);
    return () => clearInterval(intervalId);
  }, [id, moviesLoaded, summaryLoaded, loadMatchHistory]);


  /* ============================
     SWIPE HANDLER
  ============================ */

  async function handleSwipe(
    reaction: "like" | "dislike"
  ) {
    if (!session) return;

    if (session.ended || sessionLocked) {
      return;
    }

    const movie = movies[currentIndex];
    if (!movie) return;

    try {
      await apiRequest("/api/swipes/", {
        method: "POST",
        body: JSON.stringify({
          session: Number(id),
          movie: movie.id,
          reaction,
        }),
      });

      trackEvent(
        reaction === "like" ? "swipe_like" : "swipe_dislike",
        { movie_id: movie.id }
      );

// Do nothing here.
// Match popup will be triggered via WebSocket for BOTH users

      setCurrentIndex((prev) => prev + 1);

    } catch (err: unknown) {
      if (
        typeof err === "object" &&
        err !== null &&
        "error" in err &&
        (err as { error?: string }).error === "Session has ended"
      ) {
        // Silent ignore — UI will transition via polling / WS
        return;
      }

      setError("Swipe failed");
    }

  }

  /* ============================
     UI STATES
  ============================ */

  if (error) {
    return (
      <div className="mt-24 text-center text-red-500">
        {error}
      </div>
    );
  }

  if (!session) {
    return (
      <div className="mt-24 text-center">
        Loading session…
      </div>
    );
  }

  /* ============================
     SESSION ENDED
  ============================ */

  if (session.ended) {
    return (
      <div className="mx-auto mt-24 max-w-md px-6 space-y-6 text-center">
          <h1 className="text-2xl font-bold">
            Session Summary
          </h1>

          <p className="text-sm text-gray-600">
            This session has ended.
          </p>

          <div className="mt-4 rounded-xl border p-4 space-y-1 text-sm">
            <p>
              <span className="font-semibold">Movies swiped:</span>{" "}
              {movies.length}
            </p>
            <p>
              <span className="font-semibold">Matches:</span>{" "}
              {matches.length}
            </p>
          </div>

        <button
          onClick={loadMatchHistory}
          className="w-full rounded-xl border py-3 font-bold"
        >
          View Matches Again
        </button>

        {loadingMatches && <p>Loading matches…</p>}

        {!loadingMatches && matches.length === 0 && (
          <p className="text-sm text-gray-500">
            No matches in this session
          </p>
        )}
        
        {!loadingMatches &&
          matches.map((m, index) => (
            <div
              key={`${m.movie_id}-${index}`}
              className="border rounded-xl p-4 space-y-2"
            >
              <h2 className="font-bold">
                {m.movie_title}
              </h2>

              {m.matched_at && (
                <p className="text-xs text-gray-500">
                  Matched at{" "}
                  {new Date(m.matched_at).toLocaleString()}
                </p>
              )}

              <p className="text-sm text-gray-600">
                Where to watch:
              </p>

              <p className="text-sm text-gray-500">
                Streaming availability coming soon
              </p>
            </div>
          ))}
          <button
            onClick={() => {
              trackEvent("start_new_session_clicked");
              navigate("/");
            }}
            className="w-full rounded-xl bg-green-600 py-3 text-white font-bold"
          >
            Start New Session
          </button> 

        <button
          onClick={() => navigate("/")}
          className="w-full rounded-xl bg-black py-3 text-white font-bold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  /* ============================
     WAITING ROOM
  ============================ */

  if (!session.host_joined || !session.guest_joined) {
    return (
      <div className="mt-24 text-center space-y-4">
        <p className="text-lg">
          Waiting for your friend…
        </p>

        <div className="text-3xl font-bold tracking-widest">
          {session.code}
        </div>

        <p className="text-sm text-gray-500">
          Share this code
        </p>
      </div>
    );
  }

  /* ============================
     MATCH POPUP
  ============================ */

  if (showMatch && matchedMovie) {
    return (
      <div className="mx-auto mt-24 max-w-md px-6 space-y-6 text-center">
        <h1 className="text-3xl font-bold text-green-600">
          It’s a Match! 🎉
        </h1>

        <h2 className="font-bold">
          {matchedMovie.title}
        </h2>

        <img
          src={matchedMovie.poster_url}
          className="rounded-xl mx-auto"
        />

        <button
          onClick={() => {
            trackEvent("match_continue");
            setShowMatch(false);
            setMatchedMovie(null);
            setCurrentIndex((prev) => prev + 1);
          }}
          className="w-full rounded-xl bg-black py-3 text-white font-bold"
        >
          Continue Swiping
        </button>

        <button
          onClick={async () => {
            trackEvent("match_end_session");
            await apiRequest("/api/sessions/end/", {
              method: "POST",
              body: JSON.stringify({
                session_id: Number(id),
              }),
            });
            setSessionLocked(true);
          }}
          className="w-full rounded-xl border py-3 font-bold"
        >
          End Session
        </button>
      </div>
    );
  }

/* ============================
   NO MORE MOVIES
============================ */

if (currentIndex >= movies.length) {
  return (
    <div className="mx-auto mt-24 max-w-md px-6 space-y-4 text-center">
      <h2 className="text-xl font-bold">
        You’ve reached the end 🎬
      </h2>

      <p className="text-sm text-gray-600">
        You’ve seen all available movies for this session.
      </p>

      <button
        onClick={async () => {
          try {
            await apiRequest("/api/sessions/end/", {
              method: "POST",
              body: JSON.stringify({
                session_id: Number(id),
              }),
            });
            setSessionLocked(true);

            trackEvent("session_end_manual", {
              session_id: Number(id),
              reason: "no_more_movies",
            });
          } catch {
            setError("Failed to end session");
          }
        }}
        className="w-full rounded-xl bg-black py-3 font-bold text-white"
      >
        End Session
      </button>
    </div>
  );
}

  /* ============================
     SWIPING UI
  ============================ */

  const movie = movies[currentIndex];

  return (
    <div className="mx-auto mt-12 max-w-md px-6 space-y-4 text-center">
      <div className="flex justify-end">
        <button
          onClick={async () => {
            await apiRequest("/api/sessions/end/", {
              method: "POST",
              body: JSON.stringify({
                session_id: Number(id),
              }),
            });
            setSessionLocked(true);
          }}
          className="text-sm font-semibold text-gray-500 hover:text-black"
        >
          End Session
        </button>
      </div> 
      <h2 className="text-xl font-bold">
        {movie.title}
      </h2>

      <img
        src={movie.poster_url}
        className="rounded-xl mx-auto"
      />

      <p className="text-sm text-gray-600">
        {movie.overview}
      </p>

      <div className="flex gap-4">
        <button
          onClick={() => handleSwipe("dislike")}
          className="flex-1 rounded-xl bg-red-500 py-3 text-white font-bold"
        >
          Dislike
        </button>

        <button
          onClick={() => handleSwipe("like")}
          className="flex-1 rounded-xl bg-green-500 py-3 text-white font-bold"
        >
          Like
        </button>
      </div>
    </div>
  );
}
