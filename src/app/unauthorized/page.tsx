export function Unauthorized() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="mb-4 text-3xl font-bold">Unauthorized</h1>
      <p className="text-muted-foreground mb-6 text-lg">
        You do not have permission to access this page.
      </p>
      <a href="/hub" className="text-primary underline">
        Return to Hub
      </a>
    </div>
  );
}

export default function UnauthorizedPage() {
  return <Unauthorized />;
}
