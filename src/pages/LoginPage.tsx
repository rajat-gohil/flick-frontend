import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

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
}
  }

  return (
    <div className="mx-auto mt-24 w-full max-w-sm px-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">Login</h1>

      {error && (
        <p className="text-sm text-red-500 text-center">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          required
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border px-3 py-2"
          required
        />

        <button
          type="submit"
          className="w-full rounded-xl bg-black py-3 font-bold text-white"
        >
          Login
        </button>
      </form>
    </div>
  );
}
