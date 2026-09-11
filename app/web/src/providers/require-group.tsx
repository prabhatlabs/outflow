import { useEffect, useState } from "react";
import { Navigate, Outlet, useParams } from "react-router";
import { useGroupsStore } from "@/store/groups";
import { useBalancesStore } from "@/store/balances";
import { useCategoriesStore } from "@/store/categories";
import { useExpensesStore } from "@/store/expenses";
import { useGroupBudgetsStore } from "@/store/budgets";
import { useGroupInvitationsStore } from "@/store/invitations";
import { useMembersStore } from "@/store/members";
import { useSettlementsStore } from "@/store/settlements";

// Group-scoped stores keep a single flat list; when the group changes the
// previous group's data is stale, so we clear them and let each page refetch.
function clearGroupScopedStores() {
  useBalancesStore.getState().clear();
  useCategoriesStore.getState().clear();
  useExpensesStore.getState().clear();
  useGroupBudgetsStore.getState().clear();
  useGroupInvitationsStore.getState().clear();
  useMembersStore.getState().clear();
  useSettlementsStore.getState().clear();
}

// Syncs the :groupId URL param into the groups store. The URL is the source
// of truth: if the id isn't in the loaded list it is validated against the
// server, otherwise we bounce back to "/" (handled by IndexRedirect).
function RequireGroup() {
  const { groupId } = useParams();
  const status = useGroupsStore((s) => s.status);
  const groups = useGroupsStore((s) => s.groups);
  const currentGroup = useGroupsStore((s) => s.currentGroup);
  const [denied, setDenied] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!groupId) {
      setDenied(true);
      return;
    }

    if (status === "idle" || status === "loading") return;
    if (currentGroup?.id === groupId) {
      setDenied(false);
      return;
    }
    if (groups.some((g) => g.id === groupId)) {
      useGroupsStore.getState().setCurrentGroupById(groupId);
      clearGroupScopedStores();
      setDenied(false);
      return;
    }

    setChecking(true);
    useGroupsStore
      .getState()
      .fetchGroupById(groupId)
      .then(
        (group) => {
          useGroupsStore.getState().setCurrentGroup(group);
          clearGroupScopedStores();
          setDenied(false);
        },
        () => setDenied(true),
      )
      .finally(() => setChecking(false));

  }, [groupId, status, groups, currentGroup?.id]);

  if (!groupId || denied) return <Navigate to="/" replace />;
  if (status === "idle" || status === "loading" || checking) return null;
  if (currentGroup?.id !== groupId) return null;
  return <Outlet />;
}

export default RequireGroup;
