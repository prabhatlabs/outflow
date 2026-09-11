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
import { ActivityPage } from "./pages/groups/Activity"
import { BalancesPage } from "./pages/groups/Balances"
import { BudgetsPage } from "./pages/groups/Budgets"
import { CategoriesPage } from "./pages/groups/Categories"
import { ExpensesPage } from "./pages/groups/Expenses"
import { MemberInvitationsPage } from "./pages/groups/MemberInvitations"
import { MembersPage } from "./pages/groups/Members"
import { OverviewPage } from "./pages/groups/Overview"
import { SettleUpPage } from "./pages/groups/SettleUp"
import { SettlementsPage } from "./pages/groups/Settlements"
import { SettingsPage as GroupSettingsPage } from "./pages/groups/Settings"

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
