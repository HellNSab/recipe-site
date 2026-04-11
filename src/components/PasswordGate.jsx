import { useState } from "react";
import { isFamilyAuthenticated, familyLogin } from "../lib/familyAuth";

export default function PasswordGate({ children }) {
  const [authenticated, setAuthenticated] = useState(isFamilyAuthenticated);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (familyLogin(password)) {
      setAuthenticated(true);
    } else {
      setError("Mot de passe incorrect");
      setPassword("");
    }
  };

  if (authenticated) return children;

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">🍳</div>
          <h1 className="font-serif text-2xl font-bold text-gray-800 mb-2">
            Le Livre de Recettes
          </h1>
          <p className="text-gray-500 text-sm">
            Entrez le mot de passe pour accéder aux recettes de la famille
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError("");
              }}
              placeholder="Mot de passe"
              className="form-input"
              autoFocus
              required
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
          )}

          <button type="submit" className="w-full btn-primary">
            Entrer
          </button>
        </form>
      </div>
    </div>
  );
}
