function NotFound() {
  return (
    <div className="flex flex-col lg:gap-2 mt-70 items-center justify-center">
      <h1 className="text-destructive text-3xl lg:text-5xl font-semibold">
        404 - Not Found
      </h1>
      <p className="text-muted-foreground lg:text-xl">
        The page you are looking for does not exist.
      </p>
    </div>
  );
}

export default NotFound;
