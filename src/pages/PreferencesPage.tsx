import { useState } from "react";
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
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const question = QUESTIONS[currentQuestion];
  const isLastQuestion = currentQuestion === QUESTIONS.length - 1;

  /* ============================
     HANDLERS
  ============================ */

  function handleSelect(value: string) {
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
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
      setError("");
    }
  }

  async function handleSubmit() {
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

      // Navigate to session page
      navigate(`/session/${id}`);
    } catch (err) {
      console.error("Failed to submit preferences:", err);
      setError("Failed to save preferences. Please try again.");
      setIsSubmitting(false);
    }
  }

  /* ============================
     RENDER
  ============================ */

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
                className={`w-full rounded-xl border-2 px-6 py-4 text-left transition-all ${
                  isSelected
                    ? "border-black bg-black text-white font-bold scale-105"
                    : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                }`}
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
              disabled={isSubmitting}
              className="flex-1 rounded-xl border-2 border-gray-300 py-3 font-bold hover:bg-gray-50 disabled:opacity-50"
            >
              Back
            </button>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
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