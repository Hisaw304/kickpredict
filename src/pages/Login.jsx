import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";

import { supabase } from "../lib/supabase";

const Login = () => {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));

    // Clear messages when user starts editing again
    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (error) {
        throw error;
      }

      if (!data?.user) {
        throw new Error("Unable to sign in. Please try again.");
      }

      // Check administrator profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.user.id)
        .single();

      if (profileError) {
        console.error("Admin verification error:", profileError);

        // Sign the user back out if profile verification fails
        await supabase.auth.signOut();

        throw new Error("Unable to verify administrator access.");
      }

      // Only admins can access the dashboard
      if (profile.role !== "admin") {
        await supabase.auth.signOut();

        throw new Error("You do not have administrator access.");
      }

      setSuccess("Login successful. Redirecting...");

      setTimeout(() => {
        navigate("/dashboard");
      }, 700);
    } catch (error) {
      console.error("Login error:", error);

      if (error.message?.toLowerCase().includes("invalid login")) {
        setError("Incorrect email or password.");
      } else if (error.message?.toLowerCase().includes("email not confirmed")) {
        setError("Please confirm your email address before signing in.");
      } else {
        setError(error.message || "Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  return (
    <main className="kp-login">
      <div className="kp-login-container">
        {/* LEFT SIDE */}
        <div className="kp-login-content">
          <div className="kp-login-brand">
            <div className="kp-login-brand-mark">K</div>

            <span>KickPredict</span>
          </div>

          <div className="kp-login-copy">
            <span className="kp-login-tag">— WELCOME BACK —</span>

            <h1>
              Your Predictions.
              <br />
              Your <span>Edge.</span>
            </h1>

            <p>
              Sign in to access your personalized football predictions, match
              insights, statistics, and everything you need to stay ahead of the
              game.
            </p>
          </div>

          <div className="kp-login-highlight">
            <div className="kp-login-highlight-dot"></div>

            <div>
              <strong>Smarter football insights</strong>

              <span>
                Data-driven predictions built to help you make informed
                decisions.
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="kp-login-card">
          <div className="kp-login-card-header">
            <span className="kp-login-small-label">ACCOUNT LOGIN</span>

            <h2>Welcome back</h2>

            <p>Enter your details below to continue to your account.</p>
          </div>

          {/* ERROR */}
          {error && (
            <div className="kp-login-message kp-login-error">
              <AlertCircle size={17} />
              <span>{error}</span>
            </div>
          )}

          {/* SUCCESS */}
          {success && (
            <div className="kp-login-message kp-login-success">
              <CheckCircle size={17} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="kp-login-form">
            {/* EMAIL */}
            <div className="kp-login-field">
              <label htmlFor="email">Email Address</label>

              <div className="kp-login-input">
                <Mail size={18} />

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* PASSWORD */}
            <div className="kp-login-field">
              <div className="kp-login-password-label">
                <label htmlFor="password">Password</label>

                {/* <Link to="/forgot-password">Forgot password?</Link> */}
              </div>

              <div className="kp-login-input">
                <Lock size={18} />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  className="kp-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* REMEMBER */}
            <label className="kp-login-remember">
              <input type="checkbox" disabled={loading} />

              <span>Remember me</span>
            </label>

            {/* BUTTON */}
            <button type="submit" className="kp-login-btn" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={19} className="kp-login-spinner" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={19} />
                </>
              )}
            </button>
          </form>

          {/* REGISTER */}
          {/* <div className="kp-login-register">
            <span>Don't have an account?</span>

            <Link to="/register">Create an account</Link>
          </div>

          <div className="kp-login-security">
            <Lock size={14} />

            <span>Your information is securely protected.</span>
          </div> */}
        </div>
      </div>
    </main>
  );
};

export default Login;
