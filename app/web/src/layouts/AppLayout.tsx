import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Outlet } from "react-router";
import AppSidebar from "./components/AppSidebar";
import { DialogProvider } from "@/providers/dialog-provider";
import { useGroupsStore } from "@/store/groups";
import { useEffect } from "react";

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
        <div className="md:pl-0 p-2 bg-sidebar w-full">
          <div className="min-h-[calc(100dvh-16px)] rounded-4xl bg-background border relative">
            <div className="md:hidden absolute top-0 left-0 m-2">
              <SidebarTrigger />
            </div>
            <main className="max-w-360 w-full mx-auto p-4">
              <Outlet />
            </main>
          </div>
        </div>
      </DialogProvider>
    </SidebarProvider>
  );
}

export default AppLayout;
