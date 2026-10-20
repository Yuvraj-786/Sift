import { useState } from "react";
import "../auth.form.scss";

import { useAuth } from "../hooks/useAuth.js";
import { useNavigate } from "react-router";

/**
 * @name Register
 * @description Sign-up page for new users. Collects username, email and password and submits to the auth service.
 * @access Public
 */
function Register() { 

  const {loading, handleRegister} = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  /**
   * @name handleSubmit
   * @description Prevents default form submission and hands off the new account details to the auth flow.
   * @access Private
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await handleRegister({ username, email, password });
      navigate("/");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to create your account. Please try again.");
    }
  };

  if (loading) {
    return (<main><h1>Loading...</h1></main>)
  }

  return (
    <div className="auth-card">
      <div className="auth-header">
        <h2>Welcome</h2>
        <p>Sign up to continue to your dashboard</p>
      </div>

      <form onSubmit={handleSubmit}>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <div className="auth-field">
          <label htmlFor="username">Username</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="the Man"
            required
          />
        </div>

        <div className="auth-field">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
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
            placeholder="Min. 8 characters"
            required
          />
        </div>

        <button type="submit" className="auth-submit">
          Create account
        </button>
      </form>

      <p className="auth-footer">
        Already have an account? <a href="/login">Log in</a>
      </p>
    </div>
  );
}

export default Register;