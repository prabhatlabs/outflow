import { SidebarTrigger } from "./ui/sidebar";

function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col md:flex-row gap-4 md:justify-between md:items-center">
      <div className="space-y-2 md:space-y-1">
        <div className="flex items-center gap-3">
          <SidebarTrigger className={"md:hidden"} />
          <h1 className="text-xl lg:text-3xl font-semibold">{title}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 items-center">{actions}</div>
      )}
    </header>
  );
}

export default PageHeader;
