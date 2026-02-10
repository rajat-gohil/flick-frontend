import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

export default function RegisterPage() {
  const navigate = useNavigate();
  
  const [step, setStep] = useState<"register" | "username">("register");
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generate username suggestions based on email
  const generateUsernameSuggestions = (email: string) => {
    const base = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "");
    const suggestions = [
      base,
      `${base}${Math.floor(Math.random() * 1000)}`,
      `${base}_${Math.floor(Math.random() * 100)}`,
      `user_${base}`,
    ];
    return suggestions.slice(0, 4);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      // Register user
      const registerResponse = await apiRequest("/api/auth/register/", {
        method: "POST",
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      console.log("Registration response:", registerResponse);

      if (registerResponse.success) {
        console.log("Registration successful, attempting login...");
        
        // AUTO LOGIN AFTER REGISTRATION
        const loginResponse = await apiRequest("/api/auth/login/", {
          method: "POST",
          body: JSON.stringify({
            username: formData.email,
            password: formData.password,
          }),
        });

        console.log("Login response:", loginResponse);

        if (loginResponse.success) {
          // Store token
          localStorage.setItem("auth_token", loginResponse.token);
          
          // Generate username suggestions
          setUsernameSuggestions(generateUsernameSuggestions(formData.email));
          setStep("username");
        } else {
          setError(loginResponse.error || "Login failed after registration");
        }
      } else {
        setError(registerResponse.error || "Registration failed");
      }
    } catch (err: any) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    setLoading(true);
    try {
      // Update user with username (auth token handled automatically)
      const response = await apiRequest("/api/users/update-username/", {
        method: "POST",
        body: JSON.stringify({
          username: username.trim(),
        }),
      });

      if (response.success) {
        navigate("/session/create");
      } else {
        setError(response.error || "Failed to set username");
      }
    } catch (err: any) {
      setError(err.message || "Failed to set username");
    } finally {
      setLoading(false);
    }
  };

  if (step === "register") {
    return (
      <div className="mx-auto mt-24 max-w-md px-6 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-sm text-gray-600">Join Flick to start matching movies</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600 text-center">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500"
                >
                  {showConfirmPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-black py-3 font-bold text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {loading ? "Creating Account..." : "Continue"}
          </button>
        </form>

        <div className="text-center text-sm text-gray-600">
          Already have an account?{" "}
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

  // Username selection step
  return (
    <div className="mx-auto mt-24 max-w-md px-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Choose Your Username</h1>
        <p className="text-sm text-gray-600">This is how others will see you on Flick</p>
      </div>

      <form onSubmit={handleUsernameSubmit} className="space-y-6">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 text-center">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
            Username
          </label>
          <input
            id="username"
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-black"
            placeholder="Enter your username"
          />
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Suggestions:</p>
          <div className="grid grid-cols-2 gap-2">
            {usernameSuggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setUsername(suggestion)}
                className={`rounded-lg border px-3 py-2 text-sm text-left ${
                  username === suggestion
                    ? "border-black bg-black text-white"
                    : "border-gray-300 hover:border-gray-400"
                }`}
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !username.trim()}
          className="w-full rounded-xl bg-black py-3 font-bold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {loading ? "Setting Up..." : "Get Started"}
        </button>
      </form>
    </div>
  );
}
