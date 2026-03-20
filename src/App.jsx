import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Recipe from "./pages/Recipe";
import Admin from "./pages/Admin";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/recipe/:slug" element={<Recipe />} />
      <Route path="/admin" element={<Admin />} />
    </Routes>
  );
}

export default App;
