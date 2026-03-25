import { Link } from 'react-router-dom';

interface Breadcrumb {
  label: string;
  to: string;
}

interface PageHeaderProps {
  title: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export function PageHeader({ title, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-2">
        {breadcrumbs?.map((b, i) => (
          <span key={i} className="flex items-center gap-2">
            <Link to={b.to} className="text-muted-foreground hover:text-foreground text-sm">
              {b.label}
            </Link>
            <span className="text-muted-foreground/40">/</span>
          </span>
        ))}
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
