import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Sparkles, ArrowRight, ShieldCheck, BookOpen, Building2 } from "lucide-react";

function Login({ onLogin, onRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid credentials. Please try again.");
        return;
      }

      localStorage.setItem("token", data.token);
      onLogin(data.user);
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
            <span>Placement Intelligence</span>
          </div>

          <h1 className="auth-hero-title">
            Ace Your Dream <br />
            <span className="gradient-text">Campus Placement</span>
          </h1>

          <p className="auth-hero-subtitle">
            AI-powered RAG assistant providing curated interview questions, DSA guides, and company-specific preparation.
          </p>

          <div className="auth-features">
            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <Building2 size={18} />
              </div>
              <div>
                <h4>Company-Specific Prep</h4>
                <p>Targeted interview insights for TCS, Amazon, Microsoft, Google, and more.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <BookOpen size={18} />
              </div>
              <div>
                <h4>Verified Document Citations</h4>
                <p>Real-time RAG citations pointing to exact document pages.</p>
              </div>
            </div>

            <div className="feature-item">
              <div className="feature-icon-wrapper">
                <ShieldCheck size={18} />
              </div>
              <div>
                <h4>Personalized Prep Hub</h4>
                <p>Save chat history and upload your own college placement brochures.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Card */}
        <div className="auth-card">
          <div className="auth-header">
            <h2>Welcome back</h2>
            <p>Log in with your credentials to access your assistant</p>
          </div>

          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="login-email"
                  type="email"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
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

            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? (
                <div className="btn-spinner-content">
                  <div className="spinner"></div>
                  <span>Signing In...</span>
                </div>
              ) : (
                <div className="btn-content">
                  <span>Sign In</span>
                  <ArrowRight size={18} />
                </div>
              )}
            </button>
          </form>

          <div className="auth-footer">
            <span>Don't have an account?</span>
            <button type="button" onClick={onRegister} className="auth-link-btn">
              Create an account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;