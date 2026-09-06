import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/auth";
import { useDialogStore } from "@/store/dialog";
import { useGroupsStore } from "@/store/groups";
import { cn } from "cn";
import {
  ArrowLeftRight,
  ChevronDown,
  ChevronsUpDown,
  History,
  LayoutDashboard,
  LogOut,
  Mail,
  PiggyBank,
  Plus,
  Receipt,
  Scale,
  Settings,
  Summary,
  Tags,
  User,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";

type SidebarSubItem = {
  label: string;
  href: string;
};

type SidebarNavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  subItems?: SidebarSubItem[];
};

type SidebarNavGroup = {
  label: string;
  items: SidebarNavItem[];
};

const NAV_GROUPS: SidebarNavGroup[] = [
  {
    label: "Group",
    items: [
      { label: "Overview", href: "/overview", icon: Summary },
      { label: "Expenses", href: "/expenses", icon: Receipt },
      { label: "Balances", href: "/balances", icon: Scale },
      {
        label: "Settlements",
        href: "/settlements",
        icon: ArrowLeftRight,
        subItems: [
          { label: "Settle Up", href: "/settlements/new" },
          { label: "Settlement History", href: "/settlements" },
        ],
      },
      { label: "Group Budgets", href: "/budgets", icon: Wallet },
      { label: "Categories", href: "/categories", icon: Tags },
      {
        label: "Members",
        href: "/members",
        icon: UserPlus,
        subItems: [
          { label: "All Members", href: "/members" },
          { label: "Invitations", href: "/members/invitations" },
        ],
      },
      { label: "Activity", href: "/activity", icon: History },
      { label: "Group Settings", href: "/settings", icon: Settings },
    ],
  },
  {
    label: "Personal",
    items: [
      {
        label: "Groups",
        href: "/groups",
        icon: Users,
        subItems: [
          { label: "All Groups", href: "/groups" },
          { label: "Archived Groups", href: "/groups/archived" },
        ],
      },
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Personal Budgets", href: "/personal-budgets", icon: PiggyBank },
      { label: "My Invitations", href: "/invitations", icon: Mail },
      { label: "Profile", href: "/profile", icon: User },
    ],
  },
];

function SidebarNavCollapsibleItem({
  item,
  pathname,
}: {
  item: SidebarNavItem;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const Icon = item.icon;
  const isActive =
    pathname === item.href ||
    item.subItems?.some((sub) => pathname === sub.href) === true;

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={item.label}
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
      >
        <Icon />
        <span>{item.label}</span>
        <ChevronDown
          className={cn("ml-auto transition-transform", open && "rotate-180")}
        />
      </SidebarMenuButton>
      {open && (
        <SidebarMenuSub>
          {item.subItems?.map((sub) => (
            <SidebarMenuSubItem key={sub.label}>
              <SidebarMenuSubButton
                render={<Link to={sub.href} />}
                isActive={pathname === sub.href}
              >
                <span>{sub.label}</span>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          ))}
        </SidebarMenuSub>
      )}
    </SidebarMenuItem>
  );
}

function getInitials(first_name: string, last_name: string | null) {
  const first = first_name?.[0] ?? "";
  const last = last_name?.[0] ?? "";
  return (first + last).toUpperCase() || "U";
}

function GroupSwitcher() {
  const { currentGroup, setCurrentGroupById, groups, status } =
    useGroupsStore();

  return status == "loading" && groups.length == 0 ? (
    <Skeleton className="h-14 w-full" />
  ) : (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
        <Avatar>
          <AvatarFallback>
            {getInitials(currentGroup?.name ?? "", null)}
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">{currentGroup?.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            {currentGroup?.type}
          </span>
        </div>
        <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Groups</DropdownMenuLabel>
          {groups.map((group) => (
            <DropdownMenuItem
              key={group.id}
              onClick={() => setCurrentGroupById(group.id)}
            >
              <Avatar size="sm">
                <AvatarFallback>{getInitials(group.name, null)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium">{group.name}</span>
                <span className="text-xs text-muted-foreground">
                  {group.type}
                </span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => useDialogStore.getState().open("createGroup")}
          >
            <Plus className="size-4" />
            Create Group
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<SidebarMenuButton size="lg" />}>
        <Avatar size="lg">
          {user.avatar_url && (
            <AvatarImage src={user.avatar_url} alt={user.first_name} />
          )}
          <AvatarFallback>
            {getInitials(user.first_name, user.last_name)}
          </AvatarFallback>
        </Avatar>
        <div className="grid flex-1 text-left text-sm leading-tight">
          <span className="truncate font-semibold">
            {user.first_name} {user.last_name}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </div>
        <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Account</DropdownMenuLabel>
          <DropdownMenuItem render={<Link to="/profile" />}>
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link to="/settings" />}>
            Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AppSidebar() {
  const { pathname } = useLocation();

  return (
    <Sidebar className="">
      <SidebarHeader>
        <h5 className="text-3xl px-3">
          <Link to={"/"}>outflow.lol</Link>
        </h5>
        <GroupSwitcher />
      </SidebarHeader>

      <SidebarContent>
        {NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="h-4">{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;

                  if (item.subItems) {
                    return (
                      <SidebarNavCollapsibleItem
                        key={item.label}
                        item={item}
                        pathname={pathname}
                      />
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        render={<Link to={item.href} />}
                        isActive={pathname === item.href}
                        tooltip={item.label}
                      >
                        <Icon />
                        <span>{item.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <UserMenu />
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;
