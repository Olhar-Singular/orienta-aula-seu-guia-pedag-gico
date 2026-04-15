import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initTelemetry } from "./lib/telemetry";
import "./index.css";

initTelemetry();

createRoot(document.getElementById("root")!).render(<App />);
