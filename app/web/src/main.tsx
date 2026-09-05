import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import AuthBootstrap from "./components/auth-bootstrap.tsx";
import { ThemeProvider } from "./components/theme-provider.tsx";
import "./index.css";
import router from "./router.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="app-ui-theme">
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
    </ThemeProvider>
  </StrictMode>,
);
