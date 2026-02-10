import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { apiRequest } from "../lib/api";
import { trackEvent } from "../lib/analytics";

/* ============================
   QUESTIONNAIRE CONFIG
============================ */

const QUESTIONS = [
  {
    id: "mood",
    question: "What mood are you in?",
    options: [
      { value: "happy", label: "😄 Happy & Light", emoji: "😄" },
      { value: "intense", label: "🔥 Intense & Gripping", emoji: "🔥" },
      { value: "emotional", label: "😢 Emotional & Deep", emoji: "😢" },
      { value: "exciting", label: "⚡ Exciting & Fun", emoji: "⚡" },
    ],
  },
  {
    id: "pace",
    question: "What pace do you prefer?",
    options: [
      { value: "fast", label: "🏃 Fast-paced action", emoji: "🏃" },
      { value: "slow", label: "🐢 Slow & thoughtful", emoji: "🐢" },
      { value: "balanced", label: "⚖️ Balanced mix", emoji: "⚖️" },
    ],
  },
  {
    id: "vibe",
    question: "What vibe are you looking for?",
    options: [
      { value: "feel-good", label: "✨ Feel-good & uplifting", emoji: "✨" },
      { value: "mind-bending", label: "🤯 Mind-bending twist", emoji: "🤯" },
      { value: "escapist", label: "🌍 Escapist adventure", emoji: "🌍" },
      { value: "realistic", label: "🎬 Realistic & grounded", emoji: "🎬" },
    ],
  },
  {
    id: "era",
    question: "What era do you prefer?",
    options: [
      { value: "classic", label: "🎞️ Classic (Before 2000)", emoji: "🎞️" },
      { value: "2000s", label: "DVD 2000s Era", emoji: "DVD" },
      { value: "2010s", label: "📱 2010s Era", emoji: "📱" },
      { value: "recent", label: "🆕 Recent (2020+)", emoji: "🆕" },
      { value: "any", label: "🎬 Any era is fine", emoji: "🎬" },
    ],
  },
];

/* ============================
   COMPONENT
============================ */

export default function PreferencesPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({
    mood: [],
    pace: [],
    vibe: [],
    era: [],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [compatibilityMessage, setCompatibilityMessage] = useState("");
  const [partnerStatus, setPartnerStatus] = useState<"waiting" | "ready">("waiting");

  const question = QUESTIONS[currentQuestion];
  const isLastQuestion = currentQuestion === QUESTIONS.length - 1;

  /* ============================
     POLL FOR PARTNER STATUS AND SESSION UPDATES
  ============================ */
  
  useEffect(() => {
    let intervalId: number; // ✅ Changed from NodeJS.Timeout to number
    
    if (hasSubmitted) {
      // Poll for partner completion and session updates
      intervalId = window.setInterval(async () => {
        try {
          const response = await apiRequest(`/api/sessions/${id}/`);
          const session = response.session;
          
          // If preferences are set by both users, navigate to session
          if (session?.preferences_set) {
            setPartnerStatus("ready");
            // Give a moment for the compatibility message to show, then navigate
            setTimeout(() => {
              navigate(`/session/${id}`);
            }, 2000);
          }
        } catch (err) {
          console.error("Failed to poll session status:", err);
        }
      }, 2000);
    } else {
      // Before submission, check if partner already finished
      intervalId = window.setInterval(async () => {
        try {
          const response = await apiRequest(`/api/sessions/${id}/`);
          const session = response.session;
          
          // If partner already submitted and we haven't, maybe show a message?
          if (session?.preferences_set && !hasSubmitted) {
            // Partner is already done, but we haven't submitted yet
            // This is fine - they're just waiting for us
          }
        } catch (err) {
          console.error("Failed to poll session status:", err);
        }
      }, 3000);
    }

    return () => {
      if (intervalId) window.clearInterval(intervalId); // ✅ Use window.clearInterval
    };
  }, [hasSubmitted, id, navigate]);

  /* ============================
     HANDLERS
  ============================ */

  function handleSelect(value: string) {
    if (hasSubmitted) return;
    
    const questionId = question.id;
    const currentAnswers = answers[questionId] || [];

    // Toggle selection (allow multiple)
    const newAnswers = currentAnswers.includes(value)
      ? currentAnswers.filter((v) => v !== value)
      : [...currentAnswers, value];

    setAnswers({
      ...answers,
      [questionId]: newAnswers,
    });
  }

  async function handleNext() {
    if (hasSubmitted) return;
    
    const questionId = question.id;

    // Require at least one selection
    if (!answers[questionId] || answers[questionId].length === 0) {
      setError("Please select at least one option");
      return;
    }

    setError("");

    if (isLastQuestion) {
      await handleSubmit();
    } else {
      setCurrentQuestion((prev) => prev + 1);
    }
  }

  function handleBack() {
    if (hasSubmitted) return;
    
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
      setError("");
    }
  }

  async function handleSubmit() {
    if (hasSubmitted) return;
    
    setIsSubmitting(true);
    setError("");

    try {
      const response = await apiRequest("/api/sessions/preferences/", {
        method: "POST",
        body: JSON.stringify({
          session_id: Number(id),
          preferences: answers,
        }),
      });

      trackEvent("preferences_submitted", {
        session_id: Number(id),
        answers,
      });

      setHasSubmitted(true);
      setIsSubmitting(false);

      // Show compatibility message if both ready
      if (response.both_ready && response.overlap_score !== undefined) {
        const score = response.overlap_score;
        let message = "";
        let emoji = "";
        
        if (score >= 70) {
          message = `Perfect match! You're incredibly aligned in taste.`;
          emoji = "🎉";
        } else if (score >= 50) {
          message = `Great match! You have strong compatibility (${score}%).`;
          emoji = "✨";
        } else if (score >= 30) {
          message = `Good match! You share some common interests (${score}%).`;
          emoji = "👍";
        } else {
          message = `Interesting mix! Opposites can create great discoveries (${score}% match).`;
          emoji = "🤝";
        }
        
        setCompatibilityMessage(`${emoji} ${message}`);
      }
      
    } catch (err) {
      console.error("Failed to submit preferences:", err);
      setError("Failed to save preferences. Please try again.");
      setIsSubmitting(false);
    }
  }

  /* ============================
     RENDER
  ============================ */

  // Show waiting screen after submission
  if (hasSubmitted) {
    return (
      <div className="mx-auto mt-24 max-w-md px-6 space-y-6">
        <div className="text-center space-y-4">
          <div className="text-6xl">
            {partnerStatus === "ready" ? "🎬" : "⏳"}
          </div>
          <h1 className="text-2xl font-bold">
            {partnerStatus === "ready" 
              ? "Great minds think alike!" 
              : "Hang tight!"}
          </h1>
          <p className="text-gray-600">
            {partnerStatus === "ready" 
              ? "Your partner is ready too. Starting session..." 
              : "Waiting for your partner to finish their questionnaire..."}
          </p>
          
          {compatibilityMessage && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-800">{compatibilityMessage}</p>
            </div>
          )}
          
          {partnerStatus === "ready" && (
            <div className="animate-pulse">
              <p className="text-sm text-gray-500">Redirecting to session...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-24 max-w-md px-6 space-y-6">
      {/* Progress Bar */}
      <div className="flex gap-2">
        {QUESTIONS.map((_, index) => (
          <div
            key={index}
            className={`h-1 flex-1 rounded-full transition-colors ${
              index <= currentQuestion ? "bg-black" : "bg-gray-200"
            }`}
          />
        ))}
      </div>

      {/* Question */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <p className="text-sm text-gray-500">
            Question {currentQuestion + 1} of {QUESTIONS.length}
          </p>
          <h1 className="text-2xl font-bold">{question.question}</h1>
          <p className="text-sm text-gray-600">Select all that apply</p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((option) => {
            const isSelected = answers[question.id]?.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                disabled={hasSubmitted}
                className={`w-full rounded-xl border-2 px-6 py-4 text-left transition-all ${
                  isSelected
                    ? "border-black bg-black text-white font-bold scale-105"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                } ${hasSubmitted ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{option.emoji}</span>
                  <span className="text-lg">{option.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          {currentQuestion > 0 && (
            <button
              type="button"
              onClick={handleBack}
              disabled={isSubmitting || hasSubmitted}
              className="flex-1 rounded-xl border-2 border-gray-300 py-3 font-bold hover:bg-gray-50 disabled:opacity-50"
            >
              Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting || hasSubmitted}
            className={`rounded-xl py-3 font-bold text-white disabled:opacity-50 ${
              currentQuestion > 0 ? "flex-1" : "w-full"
            } bg-black hover:bg-gray-800`}
          >
            {isSubmitting
              ? "Submitting..."
              : isLastQuestion
              ? "Start Swiping!"
              : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
