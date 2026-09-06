import { createBrowserRouter } from "react-router";
import RequireAuth from "./providers/require-auth";
import RequireGroup from "./providers/require-group";
import AppLayout from "./layouts/AppLayout";
import IndexRedirect from "./pages/IndexRedirect";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import {
  ActivityPage,
  BalancesPage,
  BudgetsPage,
  CategoriesPage,
  ExpensesPage,
  MemberInvitationsPage,
  MembersPage,
  OverviewPage,
  SettleUpPage,
  SettlementsPage,
  SettingsPage,
} from "./pages/groups/sections";

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
            Component: IndexRedirect,
          },
          { path: "groups", Component: NotFound },
          { path: "groups/archived", Component: NotFound },
          { path: "dashboard", Component: NotFound },
          { path: "personal-budgets", Component: NotFound },
          { path: "invitations", Component: NotFound },
          { path: "profile", Component: NotFound },
          { path: "settings", Component: NotFound },
          {
            path: ":groupId",
            Component: RequireGroup,
            children: [
              { index: true, Component: OverviewPage },
              { path: "overview", Component: OverviewPage },
              { path: "expenses", Component: ExpensesPage },
              { path: "balances", Component: BalancesPage },
              { path: "settlements", Component: SettlementsPage },
              { path: "settlements/new", Component: SettleUpPage },
              { path: "budgets", Component: BudgetsPage },
              { path: "categories", Component: CategoriesPage },
              { path: "members", Component: MembersPage },
              { path: "members/invitations", Component: MemberInvitationsPage },
              { path: "activity", Component: ActivityPage },
              { path: "settings", Component: SettingsPage },
            ],
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
