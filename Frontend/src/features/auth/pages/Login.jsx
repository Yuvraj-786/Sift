import { useState } from "react";
import "../auth.form.scss";

import { useAuth } from "../hooks/useAuth.js";
import { useNavigate } from "react-router";

/**
 * @name Login
 * @description Sign-in page for returning users. Collects email and password and submits to the auth service.
 * @access Public
 */
function Login() {

  const { loading, handleLogin } = useAuth()
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  
  /**
   * @name handleSubmit
   * @description Prevents default form submission and hands off credentials to the auth flow.
   * @access Private
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await handleLogin({ email, password });
      navigate("/");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to log in. Check your details and try again.");
    }
  };

  if (loading) {
    return (<main><h1>Loading...</h1></main>)
  }

  return (
    <>
      <div className="auth-card">
        
        <div className="auth-header">
          <h2>Welcome back</h2>
          <p>Sign in to continue to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <div className="auth-field">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>

          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>

          <button type="submit" className="auth-submit">
            Log in
          </button>
        </form>

        <p className="auth-footer">
          No account? <a href="/register">Create one</a>
        </p>
      </div>
    </>
  );
}

export default Login;
