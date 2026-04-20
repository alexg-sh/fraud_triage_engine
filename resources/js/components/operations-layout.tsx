import { Link, usePage } from '@inertiajs/react';
import {
  Activity01Icon,
  DashboardSquare02Icon,
  Shield01Icon,
  ShieldEnergyIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/core-free-icons';
import type { PropsWithChildren, ReactNode } from 'react';

import { AppIcon } from '@/components/app-icon';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type OperationsLayoutProps = PropsWithChildren<{
  sidebarFooter?: ReactNode;
}>;

type NavKey = 'orders' | 'review' | 'queue';

const navigation: Array<{
  href: string;
  label: string;
  icon: IconSvgElement;
  key: NavKey;
}> = [
  {
    href: '/orders',
    label: 'Orders',
    icon: DashboardSquare02Icon,
    key: 'orders',
  },
  {
    href: '/orders?filter=review',
    label: 'Review queue',
    icon: Shield01Icon,
    key: 'review',
  },
  {
    href: '/queue-monitor',
    label: 'Queue monitor',
    icon: Activity01Icon,
    key: 'queue',
  },
];

export function OperationsLayout({ children, sidebarFooter }: OperationsLayoutProps) {
  const { url } = usePage();
  const activeNav = getActiveNav(url);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[1380px] flex-col gap-4 px-3 py-4 sm:px-4 lg:py-5 xl:flex-row">
        <aside className="w-full shrink-0 xl:w-56">
          <Card size="sm" className="bg-card/95 shadow-xl shadow-black/5 xl:sticky xl:top-4">
            <CardContent className="flex flex-col gap-4 py-4">
              <Link href="/orders" className="flex items-center gap-3 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/20">
                  <AppIcon icon={ShieldEnergyIcon} className="size-5" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">Fraud Admin</span>
                  <span className="text-xs text-muted-foreground">Operations queue</span>
                </div>
              </Link>

              <nav className="flex flex-col gap-1" aria-label="Sidebar">
                {navigation.map((item) => (
                  <SidebarLink key={item.key} {...item} active={activeNav === item.key} />
                ))}
              </nav>

              {sidebarFooter}
            </CardContent>
          </Card>
        </aside>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </main>
  );
}

function SidebarLink({
  href,
  label,
  icon,
  active,
}: {
  href: string;
  label: string;
  icon: IconSvgElement;
  active: boolean;
}) {
  return (
    <Button
      render={<Link href={href} aria-current={active ? 'page' : undefined} />}
      variant={active ? 'secondary' : 'ghost'}
      size="sm"
      className={cn(
        'justify-start',
        active && 'bg-primary/12 text-foreground ring-1 ring-primary/20 hover:bg-primary/15',
      )}
    >
      <AppIcon icon={icon} data-icon="inline-start" />
      <span className="flex-1 text-left">{label}</span>
    </Button>
  );
}

function getActiveNav(url: string): NavKey {
  const [pathname, search = ''] = url.split('?');

  if (pathname === '/queue-monitor') {
    return 'queue';
  }

  const params = new URLSearchParams(search);

  return params.get('filter') === 'review' ? 'review' : 'orders';
}
