import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Group } from "@/lib/types";
import { useDialogStore } from "@/store/dialog";
import { useGroupsStore } from "@/store/groups";
import { Archive, SquareArrowOutUpRight } from "lucide-react";
import { Link } from "react-router";

type Props = {
  groups: Group[];
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return value.slice(0, 10);
}

export function GroupTable({ groups }: Props) {
  const archiveGroup = useGroupsStore((s) => s.archiveGroup);
  const unarchiveGroup = useGroupsStore((s) => s.unarchiveGroup);


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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Currency</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Action</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <TableRow key={group.id}>
            <TableCell className="truncate font-medium min-w-0 max-w-55">
              {group.name}
            </TableCell>
            <TableCell>
              <Badge variant="secondary">{group.type}</Badge>
            </TableCell>
            <TableCell>{group.default_currency}</TableCell>
            <TableCell>{formatDate(group.created_at)}</TableCell>
            <TableCell>
              {group.is_archived ? (
                <Badge variant="destructive">archived</Badge>
              ) : (
                <Badge variant="default">active</Badge>
              )}
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Button size="xs" variant="outline">
                  <SquareArrowOutUpRight />
                  <Link to={`/${group.id}/overview`}>Open</Link>
                </Button>
                {group.is_archived ? (
                  <Button
                    size="xs"
                    variant="default"
                    onClick={() => handleUnarchive(group)}
                  >
                    <Archive />
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
