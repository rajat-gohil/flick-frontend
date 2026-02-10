import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await apiRequest("/api/auth/password-reset/", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (response.success) {
        // In development, show the reset link/info
        setSuccess(true);
        // For testing: you can show the uid/token to manually test reset
        console.log("Reset info:", response.uid, response.token);
      } else {
        setError(response.error || "Failed to send reset link");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send reset link");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="mx-auto mt-24 max-w-md px-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Reset Password</h1>
        <p className="text-sm text-gray-600">
          Enter your email and we'll send you a link to reset your password
        </p>
      </div>

      {success ? (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-green-800">
            Check your email for password reset instructions
          </p>
          <button
            onClick={() => navigate("/login")}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Back to Login
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
              placeholder="your@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black py-3 font-bold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>
      )}

      <div className="text-center text-sm text-gray-600">
        Remember your password?{" "}
        <button 
          onClick={() => navigate("/login")}
          className="font-semibold text-black hover:underline"
        >
          Sign in
        </button>
      </div>
    </div>
  );
}
