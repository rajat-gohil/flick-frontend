import { useNavigate } from "react-router-dom";

export default function EntryPage() {
  const navigate = useNavigate();

  // Simple auth check (MVP-safe)
  const isAuthenticated =
    Boolean(localStorage.getItem("auth_token"));

  function handleLogout() {
    localStorage.removeItem("auth_token");
    navigate("/login");
  }

  return (
    <div className="mx-auto mt-24 max-w-md px-6 space-y-6 text-center">
      {/* App title */}
      <h1 className="text-3xl font-bold">
        Flick
      </h1>

      <p className="text-gray-600">
        Find a movie together.
      </p>

      {/* ============================
         AUTHENTICATED USER
      ============================ */}
      {isAuthenticated ? (
        <>
          <button
            onClick={() =>
              navigate("/session/create")
            }
            className="w-full rounded-xl bg-black py-3 font-bold text-white"
          >
            Create a Session
          </button>

          <button
            onClick={() =>
              navigate("/session/join")
            }
            className="w-full rounded-xl border py-3 font-bold"
          >
            Join a Session
          </button>

          <button
            onClick={handleLogout}
            className="w-full text-sm text-gray-500 underline"
          >
            Logout
          </button>
        </>
      ) : (
        /* ============================
           NOT AUTHENTICATED
        ============================ */
        <>
          <button
            onClick={() => navigate("/login")}
            className="w-full rounded-xl bg-black py-3 font-bold text-white"
          >
            Login
          </button>

          <button
            onClick={() => navigate("/register")}
            className="w-full rounded-xl border py-3 font-bold"
          >
            Register
          </button>

          <button
            onClick={() =>
              navigate("/session/join")
            }
            className="w-full text-sm text-gray-500 underline"
          >
            Join with a code
          </button>
        </>
      )}
    </div>
  );
}
