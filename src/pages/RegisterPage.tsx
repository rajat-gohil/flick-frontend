import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setError("");

    try {
      await apiRequest("/api/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          username: email,
          password,
        }),
      });
      navigate("/login");
    } catch (err: unknown) {
  console.log("REGISTER ERROR:", err);

  let message = "Registration failed";

  if (typeof err === "object" && err !== null) {
    const e = err as {
      errors?: { detail?: string };
      detail?: string;
      email?: string[];
      password?: string[];
      username?: string[];
    };

    message =
      e.errors?.detail ||
      e.detail ||
      e.email?.[0] ||
      e.username?.[0] ||
      e.password?.[0] ||
      message;
  }

  setError(message);
}   
}

  return (
    <div className="mx-auto mt-24 w-full max-w-sm px-6 space-y-6">
      <h1 className="text-2xl font-bold text-center">
        Register
      </h1>

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
          Create account
        </button>
      </form>
    </div>
  );
}
