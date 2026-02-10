import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

export default function ProfilePage() {
  const navigate = useNavigate();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");

  // Wrap fetchUserProfile in useCallback to include it in dependency array
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await apiRequest("/api/users/profile/");
      if (response.success) {
        setUser(response.user);
        setNewUsername(response.user.username);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
      // Redirect to login if profile fetch fails
      navigate("/login");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]); // Now includes fetchUserProfile

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      setError("Username cannot be empty");
      return;
    }

    // Check if username is actually changed
    if (newUsername.trim() === user.username) {
      setEditing(false);
      setError("");
      return;
    }

    try {
      const response = await apiRequest("/api/users/update-username/", {
        method: "POST",
        body: JSON.stringify({
          username: newUsername.trim(),
        }),
      });

      if (response.success) {
        setUser({ ...user, username: newUsername.trim() });
        setEditing(false);
        setError("");
      } else {
        setError(response.error || "Failed to update username");
      }
    } catch (err: any) {
      setError(err.message || "Failed to update username");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="mx-auto mt-24 max-w-md px-6">
        <div className="text-center">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-24 max-w-md px-6 space-y-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="text-gray-500 hover:text-gray-700 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          Back
        </button>
        <h1 className="text-xl font-bold">Your Profile</h1>
        <div className="w-10"></div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Account Information</h2>
            <p className="text-sm text-gray-600">Manage your profile settings</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Username Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            {editing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-black"
                  placeholder="Enter new username"
                />
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveUsername}
                    className="flex-1 rounded-xl bg-black py-2 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setNewUsername(user.username);
                      setError("");
                    }}
                    className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-lg font-medium">@{user?.username}</span>
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          {/* Email Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <span className="text-gray-900">{user?.email}</span>
            <p className="text-xs text-gray-500 mt-1">
              Used for login and password recovery
            </p>
          </div>

          {/* Member Since */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Member Since
            </label>
            <span className="text-gray-900">
              {user?.date_joined ? new Date(user.date_joined).toLocaleDateString() : "Unknown"}
            </span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="space-y-3">
        <button
          onClick={handleLogout}
          className="w-full rounded-xl border border-red-500 py-3 text-red-600 font-bold hover:bg-red-50 transition-colors"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
