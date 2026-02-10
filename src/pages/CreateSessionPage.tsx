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

type Industry = "bollywood" | "hollywood" | "mixed";

type LanguageOption = {
  code: string;
  name: string;
  emoji: string;
};

/* ============================
   LANGUAGE OPTIONS
============================ */

const LANGUAGE_OPTIONS: Record<Industry, LanguageOption[]> = {
  bollywood: [
    { code: "hi", name: "Hindi", emoji: "🇮🇳" },
    { code: "ta", name: "Tamil", emoji: "🇮🇳" },
    { code: "te", name: "Telugu", emoji: "🇮🇳" },
    { code: "bn", name: "Bengali", emoji: "🇮🇳" },
    { code: "mr", name: "Marathi", emoji: "🇮🇳" },
    { code: "gu", name: "Gujarati", emoji: "🇮🇳" },
    { code: "kn", name: "Kannada", emoji: "🇮🇳" },
    { code: "ml", name: "Malayalam", emoji: "🇮🇳" },
    { code: "pa", name: "Punjabi", emoji: "🇮🇳" },
  ],
  hollywood: [
    { code: "en", name: "English", emoji: "🇺🇸" },
  ],
  mixed: [
    { code: "hi", name: "Hindi", emoji: "🇮🇳" },
    { code: "ta", name: "Tamil", emoji: "🇮🇳" },
    { code: "te", name: "Telugu", emoji: "🇮🇳" },
    { code: "en", name: "English", emoji: "🇺🇸" },
    { code: "mr", name: "Marathi", emoji: "🇮🇳" },
    { code: "gu", name: "Gujarati", emoji: "🇮🇳" },
    { code: "es", name: "Spanish", emoji: "🇪🇸" },
    { code: "fr", name: "French", emoji: "🇫🇷" },
    { code: "ko", name: "Korean", emoji: "🇰🇷" },
    { code: "ja", name: "Japanese", emoji: "🇯🇵" },
  ],
};

/* ============================
   COMPONENT
============================ */

export default function CreateSessionPage() {
  const navigate = useNavigate();

  /* ----------------------------
     STATE
  ---------------------------- */

  const [step, setStep] = useState<"industry" | "language" | "genre" | "created">("industry");
  const [industry, setIndustry] = useState<Industry | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [selectedGenreId, setSelectedGenreId] = useState<number | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [sessionCode, setSessionCode] = useState<string>("");
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
      const data = await apiRequest(`/api/genres/?industry=${industry}`);
      setGenres(Array.isArray(data.genres) ? data.genres : []);
      setSelectedGenreId(null);
    } catch {
      setError("Failed to load genres");
      setGenres([]);
    } finally {
      setIsLoading(false);
    }
  }, [industry]);

  useEffect(() => {
    if (step === "genre") {
      loadGenres();
    }
  }, [step, loadGenres]);

  /* ============================
     HANDLERS
  ============================ */

  function handleIndustrySelect(selectedIndustry: Industry) {
    setIndustry(selectedIndustry);
    setStep("language");
  }

  function toggleLanguage(code: string) {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code)
        : [...prev, code]
    );
  }

  function handleLanguageContinue() {
    if (selectedLanguages.length === 0) {
      setError("Please select at least one language");
      return;
    }
    setError("");
    setStep("genre");
  }

  function handleBackToIndustry() {
    setIndustry(null);
    setSelectedLanguages([]);
    setGenres([]);
    setStep("industry");
  }

  function handleBackToLanguage() {
    setSelectedLanguages([]);
    setGenres([]);
    setSelectedGenreId(null);
    setStep("language");
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
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

    if (selectedLanguages.length === 0) {
      setError("Please select at least one language");
      return;
    }

    setIsLoading(true);
    try {
      // Create session
      const sessionData = await apiRequest("/api/sessions/create/", {
        method: "POST",
        body: JSON.stringify({}),
      });

      // Set genre, industry, and languages
      await apiRequest("/api/sessions/genre/", {
        method: "POST",
        body: JSON.stringify({
          genre_id: selectedGenreId,
          session_id: sessionData.id,
          industry: industry,
          languages: selectedLanguages,
        }),
      });

      trackEvent("session_created", {
        genre_id: selectedGenreId,
        industry: industry,
        languages: selectedLanguages,
      });

      setSessionId(sessionData.id);
      setSessionCode(sessionData.code);
      setStep("created");
    } catch (error) {
      console.error("Session creation failed:", error);
      setError("Failed to create session. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const inviteLink = sessionCode
    ? `${window.location.origin}/join/${sessionCode}`
    : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      // Optional: Show success toast
    } catch {
      setError("Failed to copy link to clipboard");
    }
  };

  /* ============================
     RENDER
  ============================ */

  return (
    <div className="mx-auto mt-24 max-w-md px-6 space-y-6">
      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      )}

      {/* STEP 1: Industry Selection */}
      {step === "industry" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">
              Choose movie preference
            </h1>
            <button 
              onClick={() => navigate("/profile")}
              className="text-sm bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2"
            >
              Profile
            </button>
          </div>

          
          <div className="space-y-4">
            <button
              type="button"
              onClick={() => handleIndustrySelect("bollywood")}
              className="w-full rounded-xl bg-black py-3 font-bold text-white hover:bg-gray-800 transition-colors"
              disabled={isLoading}
            >
              🎬 Indian Movies Only
            </button>

            <button
              type="button"
              onClick={() => handleIndustrySelect("hollywood")}
              className="w-full rounded-xl border-2 border-gray-300 py-3 font-bold hover:bg-gray-50 transition-colors"
              disabled={isLoading}
            >
              🎥 Hollywood Only
            </button>

            <button
              type="button"
              onClick={() => handleIndustrySelect("mixed")}
              className="w-full rounded-xl border-2 border-purple-500 bg-purple-50 py-3 font-bold hover:bg-purple-100 transition-colors"
              disabled={isLoading}
            >
              🌍 Mixed (All Movies)
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Language Selection */}
      {step === "language" && industry && (
        <div className="space-y-6">
          <div className="text-center">
            <button
              type="button"
              onClick={handleBackToIndustry}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              ← Back to industry selection
            </button>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Select Languages</h1>
              <button 
                onClick={() => navigate("/profile")}
                className="text-sm bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2"
              >
                Profile
              </button>
            </div>

            <p className="text-sm text-gray-600 mt-1">
              Choose one or more languages
            </p>
          </div>

          <div className="space-y-3">
            {LANGUAGE_OPTIONS[industry].map((lang) => {
              const isSelected = selectedLanguages.includes(lang.code);
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => toggleLanguage(lang.code)}
                  className={`w-full rounded-xl border-2 px-6 py-4 text-left transition-all ${
                    isSelected
                      ? "border-black bg-black text-white font-bold scale-105"
                      : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{lang.emoji}</span>
                    <span className="text-lg">{lang.name}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleLanguageContinue}
            disabled={selectedLanguages.length === 0}
            className={`w-full rounded-xl py-3 font-bold transition-colors ${
              selectedLanguages.length === 0
                ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                : "bg-black text-white hover:bg-gray-800"
            }`}
          >
            Continue to Genres
          </button>
        </div>
      )}

      {/* STEP 3: Genre Selection */}
      {step === "genre" && industry && (
        <div className="space-y-6">
          <div className="text-center">
            <button
              type="button"
              onClick={handleBackToLanguage}
              className="text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              ← Back to language selection
            </button>
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Create Session</h1>
              <button 
                onClick={() => navigate("/profile")}
                className="text-sm bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2"
              >
                Profile
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              {industry === "bollywood" && "🎬 Indian Movies"}
              {industry === "hollywood" && "🎥 Hollywood"}
              {industry === "mixed" && "🌍 Mixed Movies"}
              {" • "}
              {selectedLanguages.length} language
              {selectedLanguages.length !== 1 ? "s" : ""} selected
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
                <p className="text-sm font-medium text-gray-700">
                  Select a genre:
                </p>
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

      {/* STEP 4: Session Created */}
      {step === "created" && sessionId && sessionCode && (
        <div className="space-y-6">
          <div className="text-center">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">Session Created!</h1>
              <button 
                onClick={() => navigate("/profile")}
                className="text-sm bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2"
              >
                Profile
              </button>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Share this code with your friend to join
            </p>
          </div>

          <div className="space-y-4 text-center">
            <div className="border-2 border-black rounded-xl py-6 text-4xl font-bold tracking-widest bg-gray-50">
              {sessionCode}
            </div>

            <div className="space-y-2">
              <p className="text-sm text-gray-600">Or share this link:</p>

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