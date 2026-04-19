import { Head, Link } from '@inertiajs/react';
import {
  ActivityIcon,
  AlertTriangleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  BotIcon,
  LayoutDashboardIcon,
  LifeBuoyIcon,
  ListFilterIcon,
  RadarIcon,
  ShieldAlertIcon,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type OrderRow = {
  id: number;
  customer_email: string;
  total_amount: number;
  ip_address: string;
  billing_address: string;
  shipping_address: string;
  risk_score: number;
  ai_investigation_note: string | null;
  requires_review: boolean;
  created_at: string | null;
};

type OrdersPayload = {
  data: OrderRow[];
  current_page: number;
  last_page: number;
  prev_page_url: string | null;
  next_page_url: string | null;
};

type DashboardProps = {
  orders: OrdersPayload;
  stats: {
    total_orders: number;
    review_orders: number;
    average_risk_score: number;
    highest_risk_score: number;
  };
  flash?: {
    status?: string | null;
  };
};

const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

const timestamp = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function OrdersDashboard({ orders, stats, flash }: DashboardProps) {
  return (
    <>
      <Head title="Fraud Queue" />

      <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <header className="rounded-[1.75rem] border border-border/70 bg-card/85 p-3 shadow-sm backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <RadarIcon />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-2xl italic tracking-tight text-foreground">
                    Fraud Triage Engine
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Queue visibility, risk review, and AI investigation notes
                  </span>
                </div>
              </div>

              <nav className="flex flex-wrap items-center gap-2">
                <NavPill href="/orders" label="Dashboard" active icon={LayoutDashboardIcon} />
                <NavPill href="/orders?filter=review" label="Review Queue" icon={ShieldAlertIcon} />
                <NavPill href="/orders?view=signals" label="Signals" icon={ListFilterIcon} />
                <Button render={<Link href="/horizon" />} variant="outline" size="sm">
                  <ActivityIcon data-icon="inline-start" />
                  Horizon
                </Button>
              </nav>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="flex flex-col gap-4">
              <Card className="border-border/70 bg-card/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Workflow</CardTitle>
                  <CardDescription>Follow the queue from incoming order to reviewer decision.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <SideNavItem title="Incoming orders" detail={`${stats.total_orders.toLocaleString('en-GB')} tracked`} active />
                  <SideNavItem title="Needs review" detail={`${stats.review_orders.toLocaleString('en-GB')} flagged`} tone="alert" />
                  <SideNavItem title="AI enrichment" detail="Modal notes for escalated orders" />
                  <SideNavItem title="Queue metrics" detail="Open Horizon for worker status" />
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/90 shadow-sm">
                <CardHeader>
                  <CardTitle>Risk snapshot</CardTitle>
                  <CardDescription>Current queue pressure and scoring envelope.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <MetricStrip label="Average risk" value={stats.average_risk_score.toFixed(1)} />
                  <MetricStrip label="Peak risk" value={stats.highest_risk_score.toFixed(1)} />
                  <MetricStrip label="Visible page" value={`${orders.current_page}/${orders.last_page}`} />
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-primary/95 text-primary-foreground shadow-sm">
                <CardHeader>
                  <CardTitle>Responder note</CardTitle>
                  <CardDescription className="text-primary-foreground/80">
                    High-value mismatches and repeat-IP bursts should be handled first.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex items-start gap-3">
                  <LifeBuoyIcon className="mt-0.5 shrink-0" />
                  <p className="text-sm leading-6 text-primary-foreground/90">
                    Review orders with combined signals before low-signal anomalies. The queue is tuned for manual
                    triage, not auto-rejection.
                  </p>
                </CardContent>
              </Card>
            </aside>

            <section className="flex flex-col gap-4">
              <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-card/90 p-6 shadow-sm backdrop-blur sm:p-8">
                <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-r from-primary/15 via-transparent to-accent/30" />
                <div className="relative flex flex-col gap-6">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                    <div className="flex max-w-2xl flex-col gap-3">
                      <Badge variant="outline" className="w-fit">
                        Live triage queue
                      </Badge>
                      <h1 className="font-display text-4xl italic tracking-tight text-foreground sm:text-5xl">
                        Order review workspace
                      </h1>
                      <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                        Surface suspicious routes quickly, inspect AI context in place, and move through the queue
                        without losing operational context.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <MetricCard label="Orders tracked" value={stats.total_orders.toLocaleString('en-GB')} />
                      <MetricCard label="Review queue" value={stats.review_orders.toLocaleString('en-GB')} alert />
                      <MetricCard label="Average risk" value={stats.average_risk_score.toFixed(1)} />
                      <MetricCard label="Peak risk" value={stats.highest_risk_score.toFixed(1)} />
                    </div>
                  </div>

                  {flash?.status ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-border/70 bg-background/80 px-4 py-3 text-sm text-muted-foreground">
                      <BotIcon className="text-primary" />
                      <span>{flash.status}</span>
                    </div>
                  ) : null}
                </div>
              </section>

              <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
                <CardHeader className="border-b border-border/70">
                  <div className="flex flex-col gap-1">
                    <CardTitle>Order queue</CardTitle>
                    <CardDescription>
                      High-risk orders are marked in red. AI investigation notes open inline without leaving the table.
                    </CardDescription>
                  </div>
                  <CardAction>
                    <Badge variant="secondary">{orders.data.length} visible rows</Badge>
                  </CardAction>
                </CardHeader>
                <CardContent className="px-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-4">Order</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead className="min-w-[260px]">Route</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="pr-4 text-right">Investigation</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.data.map((order) => (
                        <TableRow
                          key={order.id}
                          className={order.requires_review ? 'bg-destructive/5 hover:bg-destructive/10' : undefined}
                        >
                          <TableCell className="pl-4 align-top">
                            <div className="flex min-w-[180px] flex-col gap-1">
                              <div className="font-medium text-foreground">#{order.id}</div>
                              <div className="truncate text-sm text-muted-foreground">{order.customer_email}</div>
                              <div className="text-xs text-muted-foreground">{order.ip_address}</div>
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex flex-col gap-2">
                              <div className="font-medium text-foreground">{order.risk_score.toFixed(1)}</div>
                              {order.requires_review ? (
                                <Badge variant="destructive">Review</Badge>
                              ) : (
                                <Badge variant="secondary">Clear</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="align-top">
                            <div className="flex max-w-md flex-col gap-2 text-sm text-muted-foreground">
                              <span className="line-clamp-2">{order.billing_address}</span>
                              <span className="line-clamp-2">{order.shipping_address}</span>
                            </div>
                          </TableCell>
                          <TableCell className="align-top font-medium">{currency.format(order.total_amount)}</TableCell>
                          <TableCell className="align-top text-sm text-muted-foreground">
                            {order.created_at ? timestamp.format(new Date(order.created_at)) : 'Pending'}
                          </TableCell>
                          <TableCell className="pr-4 align-top text-right">
                            {order.ai_investigation_note ? (
                              <Dialog>
                                <DialogTrigger
                                  render={
                                    <Button variant={order.requires_review ? 'destructive' : 'outline'} size="sm" />
                                  }
                                >
                                  <ShieldAlertIcon data-icon="inline-start" />
                                  Open note
                                </DialogTrigger>
                                <DialogContent className="sm:max-w-lg">
                                  <DialogHeader>
                                    <DialogTitle>AI investigation note</DialogTitle>
                                    <DialogDescription>
                                      Order #{order.id} scored {order.risk_score.toFixed(1)} and needs a reviewer
                                      decision.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="rounded-2xl border border-border/70 bg-muted/40 p-4 text-sm leading-6 text-foreground">
                                    {order.ai_investigation_note}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <span className="text-sm text-muted-foreground">No AI note</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-card/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Page {orders.current_page} of {orders.last_page}
                </div>
                <div className="flex items-center gap-2">
                  <PaginationButton href={orders.prev_page_url} icon={ArrowLeftIcon} label="Previous" />
                  <PaginationButton href={orders.next_page_url} icon={ArrowRightIcon} label="Next" reverse />
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}

function NavPill({
  href,
  label,
  icon: Icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: typeof LayoutDashboardIcon;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        'inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm transition-colors',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-secondary/80 text-secondary-foreground hover:bg-secondary',
      ].join(' ')}
    >
      <Icon />
      <span>{label}</span>
    </Link>
  );
}

function SideNavItem({
  title,
  detail,
  active = false,
  tone = 'default',
}: {
  title: string;
  detail: string;
  active?: boolean;
  tone?: 'default' | 'alert';
}) {
  const accentClass =
    tone === 'alert'
      ? 'border-destructive/30 bg-destructive/5'
      : active
        ? 'border-primary/30 bg-primary/5'
        : 'border-border/70 bg-background/75';

  return (
    <div className={`rounded-2xl border p-3 ${accentClass}`}>
      <div className="text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
    </div>
  );
}

function MetricCard({ label, value, alert = false }: { label: string; value: string; alert?: boolean }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/90 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
        {alert ? <AlertTriangleIcon className="text-destructive" /> : <BotIcon className="text-primary" />}
        <span>{label}</span>
      </div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function MetricStrip({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/75 px-3 py-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold text-foreground">{value}</span>
    </div>
  );
}

function PaginationButton({
  href,
  icon: Icon,
  label,
  reverse = false,
}: {
  href: string | null;
  icon: typeof ArrowLeftIcon;
  label: string;
  reverse?: boolean;
}) {
  if (href === null) {
    return (
      <Button variant="outline" size="sm" disabled>
        {!reverse ? <Icon data-icon="inline-start" /> : null}
        {label}
        {reverse ? <Icon data-icon="inline-end" /> : null}
      </Button>
    );
  }

  return (
    <Button render={<Link href={href} />} variant="outline" size="sm">
      {!reverse ? <Icon data-icon="inline-start" /> : null}
      {label}
      {reverse ? <Icon data-icon="inline-end" /> : null}
    </Button>
  );
}
