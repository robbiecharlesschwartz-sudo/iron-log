import "./storage.js";
import { createRoot } from "react-dom/client";
import Site from "./Site.jsx";

const root = document.getElementById("root");
createRoot(root).render(<Site />);
