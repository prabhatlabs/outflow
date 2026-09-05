import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/theme-toggle";
import { useAuthStore } from "@/store/auth";

function Home() {
  const { user, logout } = useAuthStore();

  return (
    <main className="min-h-svh p-4">
      <div className="mx-auto flex max-w-5xl justify-between gap-4">
        <h3 className="text-5xl">Testing shit!</h3>
        <div className="flex items-center gap-2">
          {user && (
            <>
              <div className="flex items-center gap-2 rounded-4xl border border-border px-3 py-1.5">
                {user.AvatarUrl && (
                  <img
                    src={user.AvatarUrl}
                    alt=""
                    className="size-6 rounded-full"
                  />
                )}
                <span className="text-sm font-medium">{user.FirstName}</span>
              </div>
              <Button variant="outline" size="icon" onClick={logout} title="Log out">
                <LogOut />
              </Button>
            </>
          )}
          <ModeToggle />
        </div>
      </div>
    </main>
  );
}

export default Home;