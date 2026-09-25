import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SiteProvider } from "./context/SiteContext";
import { AuthProvider } from "./context/AuthContext";
import App from "./App";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/gallery.css";
import "./styles/about.css";
import "./styles/biblio.css";
import "./styles/contact.css";
import "./styles/auth.css";
import "./styles/admin.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <SiteProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </SiteProvider>
    </BrowserRouter>
  </StrictMode>,
);
