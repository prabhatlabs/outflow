import { createBrowserRouter } from "react-router";
import RequireAuth from "./components/require-auth";
import Home from "./pages/Home";
import Login from "./pages/Login";

const router = createBrowserRouter([
  {
    path: "/",
    Component: RequireAuth,
    children: [{ index: true, Component: Home }],
  },
  {
    path: "/login",
    Component: Login,
  },
]);

export default router;