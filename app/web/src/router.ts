import { createBrowserRouter } from "react-router";
import RequireAuth from "./providers/require-auth";
import AppLayout from "./layouts/AppLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/",
    Component: RequireAuth,
    children: [
      {
        Component: AppLayout,
        children: [
          {
            index: true,
            Component: Home,
          },
          {
            path: "*",
            Component: NotFound,
          },
        ],
      },
    ],
  },
]);

export default router;
