// En-tête de page : petit titre, grand titre doré et description, qui apparaissent en fondu
export default function PageHeader({
  eyebrow,
  title,
  children,
  action,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="fade-up mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1 className="mb-3!">{title}</h1>
        {children && <div className="text-lg text-[var(--muted-foreground)]">{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </header>
  );
}
