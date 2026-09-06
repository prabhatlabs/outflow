import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import AuthBootstrap from "./providers/auth-bootstrap.tsx";
import { ThemeProvider } from "./providers/theme-provider.tsx";
import "./index.css";
import router from "./router.ts";
import { TooltipProvider } from "./components/ui/tooltip.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="app-ui-theme">
      <TooltipProvider>
        <AuthBootstrap>
          <RouterProvider router={router} />
        </AuthBootstrap>
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>,
);
