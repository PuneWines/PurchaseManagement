import React, { useState, useEffect } from "react";
import { Package, User, Lock, LogIn } from "lucide-react";
import { User as UserType } from "../types";
import { LoginUser, indentService } from "../services/indentService";

interface LoginProps {
  onLogin: (user: UserType) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [users, setUsers] = useState<LoginUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setIsLoadingUsers(true);
        console.log("Fetching users from Login sheet...");
        const loginUsers = await indentService.getLoginUsers();
        console.log("Fetched users:", loginUsers);
        setUsers(loginUsers);
        setError("");
      } catch (error) {
        console.error("Failed to fetch login users:", error);
        setError("Failed to load user data. Please refresh the page.");
      } finally {
        setIsLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    console.log("Login attempt:", {
      username: credentials.username,
      password: "***",
    });
    console.log("Users loaded:", users.length, users);
    console.log("Is loading users:", isLoadingUsers);

    if (isLoadingUsers) {
      setError("Still loading user data. Please wait...");
      setIsLoading(false);
      return;
    }

    if (users.length === 0) {
      setError("No user data available. Please check your connection.");
      setIsLoading(false);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000)); // Simulate loading

    const { username, password } = credentials;

    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    // Find user by userId or username (case insensitive)
    const user = users.find((u) => {
      const userIdMatch = u.userId?.toLowerCase() === trimmedUsername.toLowerCase();
      const userNameMatch =
        u.userName?.toLowerCase() === trimmedUsername.toLowerCase();
      const passwordMatch = u.password === trimmedPassword;

      console.log("Checking user:", {
        userId: u.userId,
        userName: u.userName,
        userIdMatch,
        userNameMatch,
        passwordMatch,
      });

      return (userIdMatch || userNameMatch) && passwordMatch;
    });

    if (user) {
      const userData: UserType = {
        id: user.userId,
        username: user.userName,
        role: user.role as "admin" | "user",
        pageAccess: user.pageAccess,
        shopName: user.shopName,
      };

      onLogin(userData);
    } else {
      setError("Invalid username or password");
    }

    setIsLoading(false);
  };

  return (
    <div className="flex justify-center items-center p-4 min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md">
        <div className="p-8 bg-white rounded-2xl shadow-xl">
          <div className="mb-8 text-center">
            <div className="p-4 mx-auto mb-4 w-16 h-16 bg-blue-600 rounded-full">
              <Package className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Purchase App</h1>
            <p className="mt-2 text-gray-600">Management System Login</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
                <input
                  type="text"
                  value={credentials.username}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                  className="p-3 pl-10 w-full rounded-lg border border-gray-300 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter username"
                  required
                  disabled={isLoadingUsers}
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 w-5 h-5 text-gray-400 transform -translate-y-1/2" />
                <input
                  type="password"
                  value={credentials.password}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      password: e.target.value,
                    }))
                  }
                  className="p-3 pl-10 w-full rounded-lg border border-gray-300 transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password"
                  required
                  disabled={isLoadingUsers}
                />
              </div>
            </div>

            {isLoadingUsers && (
              <div className="p-3 text-sm text-center text-blue-700 bg-blue-50 rounded-lg border border-blue-200">
                Loading user data from Login sheet...
              </div>
            )}

            {error && (
              <div className="p-3 text-sm text-red-700 bg-red-50 rounded-lg border border-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || isLoadingUsers}
              className="flex justify-center items-center p-3 space-x-2 w-full text-white bg-blue-600 rounded-lg transition-colors duration-200 hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 rounded-full border-b-2 border-white animate-spin"></div>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>{isLoadingUsers ? "Loading..." : "Login"}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
