import React, { useState } from "react";
import { auth } from "../services/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  deleteUser,
  signOut,
  User,
} from "firebase/auth";
import { ArrowLeft, Mail, Lock, AlertCircle, CheckCircle } from "lucide-react";

interface AuthScreenProps {
  onBack: () => void;
  user: User | null;
}

type AuthMode = "login" | "signup" | "forgot-password" | "profile";

const AuthScreen: React.FC<AuthScreenProps> = ({ onBack, user }) => {
  const [mode, setMode] = useState<AuthMode>(
    user && !user.isAnonymous ? "profile" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
        onBack(); // Go back after successful login
      } else if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
        onBack(); // Go back after successful signup
      } else if (mode === "forgot-password") {
        await sendPasswordResetEmail(auth, email);
        setMessage("Password reset email sent! Check your inbox.");
        setMode("login");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message.replace("Firebase: ", ""));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete your account? This cannot be undone."
      )
    ) {
      try {
        setLoading(true);
        if (auth.currentUser) {
          await deleteUser(auth.currentUser);
          onBack();
        }
      } catch (err: any) {
        setError(err.message);
        // Re-authentication might be required
        if (err.code === "auth/requires-recent-login") {
          setError("Please log out and log in again to delete your account.");
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onBack();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (mode === "profile") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 flex flex-col">
        <div className="max-w-md w-full mx-auto space-y-6 pt-10">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft size={20} /> Back
          </button>

          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                Your Profile
              </h2>
              <p className="text-slate-500 dark:text-slate-400">
                Logged in as <span className="font-bold">{user?.email}</span>
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleLogout}
                className="w-full py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Log Out
              </button>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={handleDeleteAccount}
                  className="w-full py-3 text-red-500 font-bold text-sm hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                >
                  Delete Account
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 flex flex-col">
      <div className="max-w-md w-full mx-auto space-y-6 pt-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
        >
          <ArrowLeft size={20} /> Back
        </button>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
              {mode === "login"
                ? "Welcome Back"
                : mode === "signup"
                ? "Create Account"
                : "Reset Password"}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {mode === "login"
                ? "Sign in to sync your matches across devices"
                : mode === "signup"
                ? "Sign up to keep your match history safe"
                : "Enter your email to receive a reset link"}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
                  placeholder="hello@example.com"
                />
              </div>
            </div>

            {mode !== "forgot-password" && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white font-medium"
                    placeholder="••••••••"
                    minLength={6}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {message && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg flex items-start gap-2">
                <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : mode === "login" ? (
                "Sign In"
              ) : mode === "signup" ? (
                "Create Account"
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            {mode === "login" && (
              <>
                <button
                  onClick={() => setMode("forgot-password")}
                  className="block w-full text-sm text-slate-500 hover:text-blue-500 font-medium"
                >
                  Forgot Password?
                </button>
                <div className="text-sm text-slate-500">
                  Don't have an account?{" "}
                  <button
                    onClick={() => setMode("signup")}
                    className="text-blue-500 font-bold hover:underline"
                  >
                    Sign Up
                  </button>
                </div>
              </>
            )}

            {mode === "signup" && (
              <div className="text-sm text-slate-500">
                Already have an account?{" "}
                <button
                  onClick={() => setMode("login")}
                  className="text-blue-500 font-bold hover:underline"
                >
                  Sign In
                </button>
              </div>
            )}

            {mode === "forgot-password" && (
              <button
                onClick={() => setMode("login")}
                className="text-blue-500 font-bold text-sm hover:underline"
              >
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthScreen;
