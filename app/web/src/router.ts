import { createBrowserRouter } from "react-router";
import RequireAuth from "./providers/require-auth";
import RequireGroup from "./providers/require-group";
import AppLayout from "./layouts/AppLayout";
import IndexRedirect from "./pages/IndexRedirect";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ArchivedGroups from "./pages/ArchivedGroups"
import Dashboard from "./pages/Dashboard"
import Groups from "./pages/Groups"
import Invitations from "./pages/Invitations"
import PersonalBudgets from "./pages/PersonalBudgets"
import Settings from "./pages/Settings"
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
  SettingsPage as GroupSettingsPage,
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
          { path: "groups", Component: Groups },
          { path: "groups/archived", Component: ArchivedGroups },
          { path: "dashboard", Component: Dashboard },
          { path: "personal-budgets", Component: PersonalBudgets },
          { path: "invitations", Component: Invitations },
          { path: "profile", Component: Settings },
          { path: "settings", Component: Settings },
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
              { path: "settings", Component: GroupSettingsPage },
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
