import { Navigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useDialogStore } from "@/store/dialog";
import { useGroupsStore } from "@/store/groups";

function IndexRedirect() {
  const status = useGroupsStore((s) => s.status);
  const groups = useGroupsStore((s) => s.groups);
  const currentGroup = useGroupsStore((s) => s.currentGroup);

  if (status === "idle" || status === "loading") return null;

  const target = currentGroup ?? groups[0] ?? null;
  if (target) return <Navigate to={`/${target.id}/overview`} replace />;

  return (
    <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">
      <h2 className="text-xl font-semibold">No groups yet</h2>
      <p className="text-sm text-muted-foreground">
        Create your first group to get started.
      </p>
      <Button onClick={() => useDialogStore.getState().open("createGroup")}>
        Create group
      </Button>
    </div>
  );
}

export default IndexRedirect;
