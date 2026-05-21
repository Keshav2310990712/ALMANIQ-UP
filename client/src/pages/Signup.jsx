import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { signup as signupApi } from "@/lib/api";
import { Calendar, AlertCircle } from "lucide-react";

export default function Signup() {
  const { signin, user } = useAuth();
  const navigate = useNavigate();

  // If user is already logged in, redirect them immediately to dashboard
  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(""); // Clear error on change
  };

  const validate = () => {
    const { name, email, password, confirmPassword } = formData;

    if (!name.trim()) return "Full Name is required";
    if (!email.trim()) return "Email address is required";
    
    // Simple email regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return "Please enter a valid email address";

    if (!password) return "Password is required";
    if (password.length < 8) return "Password must be at least 8 characters long";
    if (password !== confirmPassword) return "Passwords do not match";

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const response = await signupApi({
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password
      });

      // signupApi returns token under data.token (which we wrapped in api.js as returning response.data.data)
      if (response && response.token) {
        signin(response.token);
        navigate("/dashboard");
      } else {
        setError("Account created but no session token received.");
      }
    } catch (err) {
      console.error("Signup failed:", err);
      setError(err?.response?.data?.message || "Failed to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/30 px-4 py-12 transition-colors duration-300">
      <div className="absolute top-0 left-0 right-0 h-[320px] bg-gradient-to-b from-blue-500/5 to-transparent -z-10" />

      <div className="w-full max-w-[460px] space-y-6">
        
        {/* Branding header */}
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="flex items-center gap-2.5 group mb-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-foreground text-background shadow-md group-hover:scale-105 transition-transform duration-300">
              <Calendar className="h-5 w-5" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              Almaniq
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Create your account</h1>
          <p className="text-sm text-muted-foreground mt-1">Get started with a free scheduling account</p>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl border border-border bg-card p-8 shadow-2xl shadow-foreground/5">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Inline Error messages */}
            {error && (
              <div className="flex items-start gap-2.5 rounded-2xl bg-destructive/10 p-4 text-xs font-medium text-destructive border border-destructive/20 animate-shake">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Name field */}
            <div className="space-y-1.5">
              <label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                disabled={loading}
                value={formData.name}
                onChange={handleChange}
                placeholder="Jane Doe"
                className="w-full bg-background border border-border focus:border-foreground rounded-2xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
              />
            </div>

            {/* Email field */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                disabled={loading}
                value={formData.email}
                onChange={handleChange}
                placeholder="jane@example.com"
                className="w-full bg-background border border-border focus:border-foreground rounded-2xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
              />
            </div>

            {/* Password field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={loading}
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                className="w-full bg-background border border-border focus:border-foreground rounded-2xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
              />
            </div>

            {/* Confirm Password field */}
            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                disabled={loading}
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat your password"
                className="w-full bg-background border border-border focus:border-foreground rounded-2xl px-4 py-3 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground transition-all"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 mt-2 rounded-2xl bg-foreground hover:bg-foreground/90 font-medium text-background text-sm tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          {/* Redirect to Login */}
          <div className="mt-6 text-center text-xs text-muted-foreground">
            Already have an account?{" "}
            <Link to="/signin" className="font-semibold text-foreground hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
