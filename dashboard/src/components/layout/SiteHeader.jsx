import { Fragment } from 'react';
import { useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import useTheme from '@/hooks/useTheme';

function useBreadcrumbs() {
  const location = useLocation();
  const path = location.pathname;

  if (path === '/') return [{ label: 'Library' }];
  if (path === '/queue') return [{ label: 'Queue' }];
  if (path === '/search') return [{ label: 'Search' }];
  if (path === '/settings') return [{ label: 'Settings' }];
  if (path.startsWith('/recording/')) {
    return [
      { label: 'Library', href: '/' },
      { label: 'Recording' },
    ];
  }
  return [{ label: 'Home' }];
}

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme();
  const breadcrumbs = useBreadcrumbs();

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/80 backdrop-blur sticky top-0 z-10 px-4">
      <SidebarTrigger className="-ml-1" />
      <Breadcrumb>
        <BreadcrumbList>
          {breadcrumbs.map((crumb, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <Fragment key={index}>
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {isLast ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>
    </header>
  );
}
