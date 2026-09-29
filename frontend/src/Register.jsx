import { useState } from "react";
import { User, Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";

function Register({ onBackToLogin }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (event) => {
    event.preventDefault();

    if (!name.trim() || !email.trim() || !password) {
      setError("Please fill in your full name, email, and password.");
      setSuccess("");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed. Please try a different email.");
        return;
      }

      setSuccess("Account created successfully! You can now log in.");
      setName("");
      setEmail("");
      setPassword("");
    } catch {
      setError("Unable to connect to backend server. Please verify the server is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left Branding Showcase */}
        <div className="auth-hero">
          <div className="auth-hero-badge">
            <Sparkles size={16} className="sparkle-icon" />
            <span>Join PlacementAI</span>
          </div>

          <h1 className="auth-hero-title">
            Start Your Interview <br />
            <span className="gradient-text">Success Journey</span>
          </h1>

          <p className="auth-hero-subtitle">
            Create your account to unlock interactive AI preparation sessions, save interview history, and query custom college placement resources.
          </p>

          <div className="auth-quote-card">
            <p>
              "Personalized practice with real questions from Google, Amazon, and TCS helped bridge the gap between college study and technical rounds."
            </p>
            <div className="quote-author">
              <div className="author-avatar">🎓</div>
              <div>
                <strong>Placement Prep AI</strong>
                <span>Built for campus engineering students</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="auth-card">
          <div className="auth-header">
            <h2>Create Account</h2>
            <p>Enter your details to create your placement prep profile</p>
          </div>

          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="register-name">Full Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  id="register-name"
                  type="text"
                  placeholder="Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="register-email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="register-email"
                  type="email"
                  placeholder="alex@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="register-password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="auth-alert error">
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="auth-alert success">
                <CheckCircle2 size={18} />
                <span>{success}</span>
              </div>
            )}

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <div className="btn-spinner-content">
                  <div className="spinner"></div>
                  <span>Creating Account...</span>
                </div>
              ) : (
                <div className="btn-content">
                  <span>Sign Up & Get Started</span>
                  <ArrowRight size={18} />
                </div>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <button type="button" onClick={onBackToLogin} className="back-link-btn">
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;