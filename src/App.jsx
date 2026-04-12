import { Routes, Route, useSearchParams } from "react-router-dom";
import Home from "./pages/Home";
import Recipe from "./pages/Recipe";
import Admin from "./pages/Admin";
import PasswordGate from "./components/PasswordGate";

/** Root route: renders Recipe if ?recipe=slug is present, otherwise Home */
function RootPage() {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get("recipe");
  if (slug) return <Recipe slug={slug} />;
  return <Home />;
}

function App() {
  return (
    <PasswordGate>
      <Routes>
        <Route path="/" element={<RootPage />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </PasswordGate>
  );
}

export default App;
