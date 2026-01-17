import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import posthog from "posthog-js";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

posthog.init(
  import.meta.env.VITE_POSTHOG_KEY!,
  {
    api_host: import.meta.env.VITE_POSTHOG_HOST,
    autocapture: false,        // IMPORTANT
    capture_pageview: false,   // IMPORTANT
    disable_session_recording: true, // IMPORTANT
  }
);