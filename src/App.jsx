import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Recipe from "./pages/Recipe";
import Admin from "./pages/Admin";
import PasswordGate from "./components/PasswordGate";

function App() {
  return (
    <PasswordGate>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/recipe/:slug" element={<Recipe />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </PasswordGate>
  );
}

export default App;
