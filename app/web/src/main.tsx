import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router";
import { TooltipProvider } from "./components/ui/tooltip.tsx";
import "./index.css";
import AuthBootstrap from "./providers/auth-bootstrap.tsx";
import { ThemeProvider } from "./providers/theme-provider.tsx";
import router from "./router.ts";

createRoot(document.getElementById("root")!).render(
  // <StrictMode>
  <ThemeProvider defaultTheme="dark" storageKey="app-ui-theme">
    <TooltipProvider>
      <AuthBootstrap>
        <RouterProvider router={router} />
      </AuthBootstrap>
    </TooltipProvider>
  </ThemeProvider>,
  // </StrictMode>,
);
