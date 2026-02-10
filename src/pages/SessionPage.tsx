import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { trackEvent } from "../lib/analytics";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";

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
  preferences_set: boolean;
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
  const [partnerDisconnected, setPartnerDisconnected] = useState(false);
  const [swipeDirection, setSwipeDirection] =
  useState<"like" | "dislike" | null>(null);
  const SWIPE_THRESHOLD = 120;
  const [partnerStatus, setPartnerStatus] =
  useState<"online" | "offline" | "swiping">("online");
  const [swipeCount, setSwipeCount] = useState(0);
  const recommendationsFetchedRef = useRef(false);
  const [checkingMore, setCheckingMore] = useState(false);
  const preferencesRedirectedRef = useRef(false);


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

  const protocol =
    window.location.protocol === "https:" ? "wss" : "ws";

  const backendHost =
    import.meta.env.VITE_BACKEND_HOST ||
    window.location.hostname;

  const wsUrl = `${protocol}://${backendHost}/ws/session/${id}/`;
  const socket = new WebSocket(wsUrl);

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      /* MATCH BROADCAST (BOTH USERS) AND SWIPING INDICATOR (BOTH USERS) AND PARTNER DISCONNECTING INDICATOR*/
      if (data.type === "partner_disconnected") {
        setPartnerDisconnected(true);

        trackEvent("partner_disconnected", {
          session_id: Number(id),
        });
      }

      if (data.type === "partner_swiping") {
        setPartnerStatus("swiping");

        setTimeout(() => {
          setPartnerStatus((prev) =>
            prev === "swiping" ? "online" : prev
          );
        }, 1500);
      }

      if (data.type === "presence") {
        if (data.user_id !== undefined) {
          setPartnerStatus(data.status);
        }
      }
    
      if (data.type === "match_event") {
        setShowMatch((prev) => {
          if (prev) return prev;

          setMatchedMovie({
            id: data.movie_id,
            title: data.movie_title,
            overview: "",
            poster_url: "",
          });

          // 🎉 Confetti side-effect (outside state setters)
          confetti({
            particleCount: 80,
            spread: 60,
            scalar: 0.8,
          });

          trackEvent("match_popup_shown", {
            session_id: Number(id),
            movie_id: data.movie_id,
            source: "websocket",
          });

          return true;
        });
      }



      /* SESSION ENDED BROADCAST (BOTH USERS) */
      if (data.type === "session_ended") {
        setSessionLocked(true);
        setPartnerStatus("offline");

        setSession((prev) =>
          prev ? { ...prev, ended: true } : prev
        );

        trackEvent("session_ended_ws", {
          session_id: Number(id),
        });
      }
    } catch {
      // ignore malformed events
    }
  };

  socket.onerror = () => {
    // silent fallback to polling
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
          return;
        }

        // ✅ FIXED: Prevent infinite redirect loop
        // Only redirect ONCE when both joined but prefs not set
        if (
          s.host_joined && 
          s.guest_joined && 
          !s.preferences_set && 
          !preferencesRedirectedRef.current  // ✅ NEW: Track if already redirected
        ) {
          preferencesRedirectedRef.current = true;  // ✅ MARK as redirected
          navigate(`/session/${id}/preferences`);
          return;
        }

        // Reset redirect flag when preferences are set
        if (s.preferences_set) {
          preferencesRedirectedRef.current = false;
        }

        // Load recommendations ONCE after both users join AND prefs are set
        if (moviesLoaded) return;

        if (
          s.host_joined &&
          s.guest_joined &&
          s.preferences_set &&
          !recommendationsFetchedRef.current
        ) {
          recommendationsFetchedRef.current = true;

          try {
            const recos = await apiRequest(
              `/api/recommendations/?session_id=${id}`
            );

            setMovies(Array.isArray(recos.movies) ? recos.movies : []);
            setCurrentIndex(0);
            setMoviesLoaded(true);

            trackEvent("movies_loaded", {
              count: recos.movies?.length || 0,
            });
          } catch (err) {
            console.error("Failed to load recommendations:", err);
            setError("Failed to load movies. Please refresh.");
            recommendationsFetchedRef.current = false;
          }
        }

      } catch {
        setError("Failed to load session");
      }
    }

    pollSession();
    const intervalId = window.setInterval(pollSession, 3000);
    return () => clearInterval(intervalId);
  }, [id, moviesLoaded, summaryLoaded, loadMatchHistory, navigate]);


  /* ============================
     SWIPE HANDLER
  ============================ */

  async function handleSwipe(
    reaction: "like" | "dislike"
  ) {
    if (!session) return;

    if (session.ended || sessionLocked || showMatch) {
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
      setCurrentIndex((prev) => prev + 1);

      trackEvent(
        reaction === "like" ? "swipe_like" : "swipe_dislike",
        { movie_id: movie.id }
      );
    
    setSwipeCount((prev) => prev + 1);

// Do nothing here.
// Match popup will be triggered via WebSocket for BOTH users

      setSwipeDirection(null);

} catch (err: any) {
  // If already swiped this movie, skip it
  if (err?.status === 409) {
    setCurrentIndex((prev) => prev + 1);
    setSwipeDirection(null);
    return;
  }

  if (err?.data?.error === "Session has ended") {
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
      <div className="mx-auto mt-24 max-w-md px-6 space-y-6 text-center
                animate-in fade-in zoom-in duration-300">
          <h1 className="text-2xl font-bold">
            Session Summary
          </h1>

          <p className="text-sm text-gray-600">
            This session has ended.
          </p>

          <div className="mt-4 rounded-xl border p-4 space-y-1 text-sm">
            <p>
              <span className="font-semibold">Movies swiped:</span>{" "}
              {swipeCount}
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
      <div className="mx-auto mt-24 max-w-md px-6 space-y-6 text-center
                animate-in fade-in zoom-in duration-300">
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
  // ✅ Check if we should fetch more or truly exhausted
  
  const fetchMoreMovies = async () => {
    setCheckingMore(true);
    try {
      const recos = await apiRequest(
        `/api/recommendations/?session_id=${id}`
      );

      if (recos.exhausted || recos.movies.length === 0) {
        // Truly no more movies
        setError("No more movies match your preferences!");
      } else {
        // Got more movies
        setMovies(recos.movies);
        setCurrentIndex(0);
        trackEvent("movies_refetched", {
          session_id: Number(id),
          count: recos.movies.length,
        });
      }
    } catch {
      setError("Failed to load more movies");
    } finally {
      setCheckingMore(false);
    }
  };

  return (
    <div className="mx-auto mt-24 max-w-md px-6 space-y-4 text-center">
      <h2 className="text-xl font-bold">
        You've reached the end 🎬
      </h2>

      <p className="text-sm text-gray-600">
        You've seen all movies in this batch.
      </p>

      {/* ✅ NEW: Option to load more */}
      <button
        onClick={fetchMoreMovies}
        disabled={checkingMore}
        className="w-full rounded-xl bg-purple-600 py-3 font-bold text-white hover:bg-purple-700 disabled:opacity-50"
      >
        {checkingMore ? "Checking..." : "Load More Movies"}
      </button>

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
        End Session & See Matches
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
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-gray-500 mb-2">
          {partnerStatus === "online" && "🟢 Partner online"}
          {partnerStatus === "swiping" && "✋ Partner is swiping…"}
          {partnerStatus === "offline" && "🔴 Partner disconnected"}
        </div>
 
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
          <AnimatePresence mode="wait">
            <motion.div
              key={movie.id}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (info.offset.y > SWIPE_THRESHOLD) {
                  // ⬇️ Swipe DOWN → LIKE
                  setSwipeDirection("like");
                  handleSwipe("like");
                } else if (info.offset.y < -SWIPE_THRESHOLD) {
                  // ⬆️ Swipe UP → DISLIKE
                  setSwipeDirection("dislike");
                  handleSwipe("dislike");
                }
              }}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: swipeDirection === "like" ? 300 : -300,
                rotate: swipeDirection === "like" ? 8 : -8,
              }}
              transition={{ duration: 0.25 }}
              className="space-y-4 cursor-grab active:cursor-grabbing"
            >
              <h2 className="text-xl font-bold">
                {movie.title}
              </h2>
              {partnerDisconnected && (
                <div className="mb-2 rounded-lg bg-yellow-100 px-3 py-2 text-xs text-yellow-800">
                  Your partner disconnected. Waiting…
                </div>
              )}
              <img
                src={movie.poster_url}
                className="rounded-xl mx-auto select-none"
                draggable={false}
              />

              <p className="text-sm text-gray-600">
                {movie.overview}
              </p>

              <p className="text-xs text-gray-400">
                ⬇️ Swipe down to like · ⬆️ Swipe up to dislike
              </p>
            </motion.div>
          </AnimatePresence>


      <div className="flex gap-4">
        <button
        onClick={() => {
          setSwipeDirection("dislike");
          handleSwipe("dislike");
        }}
        className="flex-1 rounded-xl bg-red-500 py-3 text-white font-bold"
      >
        Dislike
      </button>

      <button
        onClick={() => {
          setSwipeDirection("like");
          handleSwipe("like");
        }}
        className="flex-1 rounded-xl bg-green-500 py-3 text-white font-bold"
      >
        Like
      </button>

      </div>
    </div>
  );
}