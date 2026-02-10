import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await apiRequest("/api/auth/login/", {
        method: "POST",
        body: JSON.stringify({
          username: email,
          password,
        }),
      });

      localStorage.setItem("auth_token", data.token);
      navigate("/");
    } catch (err: unknown) {
      let message = "Invalid credentials";

      if (typeof err === "object" && err !== null) {
        const e = err as {
          errors?: { detail?: string };
          detail?: string;
        };

        message = e.errors?.detail || e.detail || message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto mt-24 w-full max-w-sm px-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Login</h1>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
        </div>

        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black"
            required
          />
        </div>

        <div className="text-center text-sm text-gray-600">
          <button 
            type="button"
            onClick={() => navigate("/forgot-password")}
            className="font-semibold text-black hover:underline"
          >
            Forgot Password?
          </button>
        </div>

        <div className="text-center text-sm text-gray-600">
          Don't have an account?{" "}
          <button 
            type="button"
            onClick={() => navigate("/register")}
            className="font-semibold text-black hover:underline"
          >
            Sign up
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded-xl py-3 font-bold text-white transition-colors ${
            loading ? "bg-gray-400" : "bg-black hover:bg-gray-800"
          }`}
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </div>
  );
}
