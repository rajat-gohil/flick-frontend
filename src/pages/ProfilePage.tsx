import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiRequest } from "../lib/api";

export default function ProfilePage() {
  const navigate = useNavigate();
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await apiRequest("/api/users/profile/");
      if (response.success) {
        setUser(response.user);
        setNewUsername(response.user.username);
      }
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) {
      setError("Username cannot be empty");
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
      }
    } catch (err: any) {
      setError(err.message || "Failed to update username");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
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
      <div className="text-center">
        <h1 className="text-2xl font-bold">Your Profile</h1>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Account Information</h2>
            <p className="text-sm text-gray-600">Manage your profile settings</p>
          </div>
        </div>

        <div className="space-y-4">
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
                />
                {error && (
                  <p className="text-sm text-red-600">{error}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveUsername}
                    className="flex-1 rounded-xl bg-black py-2 text-white text-sm font-medium"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditing(false);
                      setNewUsername(user.username);
                      setError("");
                    }}
                    className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-medium"
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
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <span className="text-gray-900">{user?.email}</span>
          </div>

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

      <div className="space-y-3">
        <button
          onClick={handleLogout}
          className="w-full rounded-xl border border-red-500 py-3 text-red-600 font-bold hover:bg-red-50"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
