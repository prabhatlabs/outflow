import PageHeader from "@/components/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ModeToggle } from "@/components/ui/theme-toggle";
import { ViewModeToggle } from "@/components/ui/view-mode-toggle";
import { useAuthStore } from "@/store/auth";
import { useDialogStore } from "@/store/dialog";
import { LogOut, Pencil } from "lucide-react";
import { useNavigate } from "react-router";

function getInitials(first_name: string, last_name: string | null) {
  const first = first_name?.[0] ?? "";
  const last = last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "U";
}

export default function Settings() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Personal preferences and account."
      />

      <Card className="max-w-xl">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Avatar size="xl">
            {user.avatar_url && (
              <AvatarImage src={user.avatar_url} alt={user.first_name} />
            )}
            <AvatarFallback>
              {getInitials(user.first_name, user.last_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">
              {user.first_name} {user.last_name}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {user.email}
            </p>
          </div>
        </CardContent>
        <CardFooter className="flex gap-2 items-center justify-end">
          <Button
            onClick={handleLogout}
            variant="destructive"
            className={"w-fit"}
          >
            <LogOut className="size-4" />
            Logout
          </Button>
          <Button
            variant="outline"
            onClick={() => useDialogStore.getState().open("editProfile")}
          >
            <Pencil className="size-4" />
            Edit
          </Button>
        </CardFooter>
      </Card>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Theme</p>
            <ModeToggle />
          </div>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">View mode</p>
            <ViewModeToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
