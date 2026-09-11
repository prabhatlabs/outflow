import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Group } from "@/lib/types";
import { useDialogStore } from "@/store/dialog";
import { useGroupsStore } from "@/store/groups";
import { Archive, ArchiveRestore, Pencil, SquareArrowOutUpRight } from "lucide-react";
import { Link } from "react-router";

type Props = {
  group: Group;
};

export function GroupListItem({ group }: Props) {
  const archiveGroup = useGroupsStore((s) => s.archiveGroup);
  const unarchiveGroup = useGroupsStore((s) => s.unarchiveGroup);

  const handleEdit = (group: Group) => {
    useDialogStore.getState().open("createGroup", { groupId: group.id });
  };

  const handleArchive = (group: Group) => {
    useDialogStore.getState().open("confirm", {
      title: "Archive group?",
      description: `Archive "${group.name}"? You can restore it later from archived groups.`,
      confirmLabel: "Archive",
      onConfirm: () => {
        archiveGroup(group.id);
      },
    });
  };

  const handleUnarchive = (group: Group) => {
    useDialogStore.getState().open("confirm", {
      title: "Unarchive group?",
      description: `Unarchive "${group.name}"?`,
      confirmLabel: "Unarchive",
      onConfirm: () => {
        unarchiveGroup(group.id);
      },
    });
  };

  return (
    <Card className="py-3">
      <CardContent className="flex items-start justify-between gap-3 px-3">
        <div className="min-w-0">
          <p className="truncate font-medium">{group.name}</p>
          {group.description && (
            <p className="truncate text-sm text-muted-foreground">
              {group.description}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary">{group.type}</Badge>
            <Badge variant="outline">{group.default_currency}</Badge>
            {group.is_archived && <Badge variant="destructive">archived</Badge>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/${group.id}/overview`}
            className={buttonVariants({ variant: "outline", size: "xs" })}
          >
            <SquareArrowOutUpRight />
            Open
          </Link>
          <Button size="xs" variant="outline" onClick={() => handleEdit(group)}>
            <Pencil />
            Edit
          </Button>
          {group.is_archived ? (
            <Button
              size="xs"
              variant="default"
              onClick={() => handleUnarchive(group)}
            >
              <ArchiveRestore />
              Unarchive
            </Button>
          ) : (
            <Button
              size="xs"
              variant="destructive"
              onClick={() => handleArchive(group)}
            >
              <Archive />
              Archive
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
