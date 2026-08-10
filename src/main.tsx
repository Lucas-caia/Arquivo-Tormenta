import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { applyAccessibilitySettings, loadAccessibilitySettings } from "./settings/accessibility";
import "./styles.css";

applyAccessibilitySettings(loadAccessibilitySettings());

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
