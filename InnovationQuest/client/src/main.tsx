import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Set the document title
document.title = "Innovation Station: Classroom Edition";

createRoot(document.getElementById("root")!).render(<App />);
