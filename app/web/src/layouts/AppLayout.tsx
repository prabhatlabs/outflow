import { SidebarProvider } from "@/components/ui/sidebar";
import { DialogProvider } from "@/providers/dialog-provider";
import { useGroupsStore } from "@/store/groups";
import { useEffect } from "react";
import { Outlet } from "react-router";
import AppSidebar from "./components/AppSidebar";

function AppLayout() {
  // keeping all the base or boot api calls here!
  const { fetchGroups, status } = useGroupsStore();

  useEffect(() => {
    if (status === "idle") {
      fetchGroups();
    }
  }, [fetchGroups, status]);

  return (
    <SidebarProvider>
      <DialogProvider>
        <AppSidebar />
        <div className="md:pl-0 md:p-3 bg-sidebar w-full">
          <div className="md:rounded-4xl bg-background md:border relative md:p-2">
            <div className="min-h-dvh md:min-h-[calc(100dvh-42px)] max-h-dvh md:max-h-[calc(100dvh-42px)] h-full overflow-auto">
              <main className="max-w-360 w-full mx-auto p-4 md:px-5">
                <Outlet />
              </main>
            </div>
          </div>
        </div>
      </DialogProvider>
    </SidebarProvider>
  );
}

export default AppLayout;
