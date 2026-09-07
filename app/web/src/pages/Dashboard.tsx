import { BannerCard } from "@/components/BannerCard";
import { GroupList } from "@/components/groups/GroupList";
import { GroupTable } from "@/components/groups/GroupTable";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePersonalBudgetsStore } from "@/store/budgets";
import { useDialogStore } from "@/store/dialog";
import { useGroupsStore } from "@/store/groups";
import { useMyInvitationsStore } from "@/store/invitations";
import { useViewModeStore } from "@/store/viewMode";
import { useEffect } from "react";
import { Link } from "react-router";

export default function Dashboard() {
  const groups = useGroupsStore((s) => s.groups);
  const groupsStatus = useGroupsStore((s) => s.status);
  const fetchGroups = useGroupsStore((s) => s.fetchGroups);

  const budgets = usePersonalBudgetsStore((s) => s.items);
  const budgetsStatus = usePersonalBudgetsStore((s) => s.status);
  const fetchBudgets = usePersonalBudgetsStore((s) => s.fetch);

  const invites = useMyInvitationsStore((s) => s.items);
  const invitesStatus = useMyInvitationsStore((s) => s.status);
  const fetchInvites = useMyInvitationsStore((s) => s.fetch);

  useEffect(() => {
    if (groupsStatus === "idle") fetchGroups();
  }, [groupsStatus, fetchGroups]);
  useEffect(() => {
    if (budgetsStatus === "idle") fetchBudgets();
  }, [budgetsStatus, fetchBudgets]);
  useEffect(() => {
    if (invitesStatus === "idle") fetchInvites();
  }, [invitesStatus, fetchInvites]);

  const activeGroups = groups.filter((g) => !g.is_archived);
  const groupsError = useGroupsStore((s) => s.error);
  const mode = useViewModeStore((s) => s.mode);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="At a glance across your groups and budgets."
      />

      {groupsError && (
        <BannerCard
          variant="destructive"
          title="Failed to load dashboard"
          description={groupsError}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm" className="gap-2">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              Groups
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groupsStatus === "loading" ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-semibold">{activeGroups.length}</p>
            )}
            <Button variant="link" className="px-0">
              <Link to="/groups">View groups</Link>
            </Button>
          </CardContent>
        </Card>

        <Card size="sm" className="gap-2">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              Pending invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invitesStatus === "loading" ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-semibold">{invites.length}</p>
            )}
            <Button variant="link" className="px-0">
              <Link to="/invitations">View invitations</Link>
            </Button>
          </CardContent>
        </Card>

        <Card size="sm" className="gap-2">
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">
              Personal budgets
            </CardTitle>
          </CardHeader>
          <CardContent>
            {budgetsStatus === "loading" ? (
              <Skeleton className="h-7 w-12" />
            ) : (
              <p className="text-2xl font-semibold">{budgets.length}</p>
            )}
            <Button variant="link" className="px-0">
              <Link to="/personal-budgets">View budgets</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Groups</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {groupsStatus === "loading" && <Skeleton className="h-16 w-full" />}
          {groupsStatus !== "loading" && activeGroups.length === 0 && (
            <BannerCard
              title="No active groups yet"
              description="Create a group to start tracking shared expenses."
              action={
                <Button
                  size="sm"
                  onClick={() => useDialogStore.getState().open("createGroup")}
                >
                  New group
                </Button>
              }
            />
          )}
          {activeGroups.length > 0 &&
            (mode === "table" ? (
              <GroupTable groups={activeGroups.slice(0, 6)} />
            ) : (
              <GroupList groups={activeGroups.slice(0, 6)} />
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
