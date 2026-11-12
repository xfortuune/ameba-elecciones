export function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div role="alert" className="rounded-sm border-l-4 border-stamp bg-stamp-soft px-4 py-3 text-sm font-medium text-stamp">
      {children}
    </div>
  );
}
