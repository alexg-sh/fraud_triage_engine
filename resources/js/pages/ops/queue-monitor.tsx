import { Head, Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import {
  Alert01Icon,
  Clock01Icon,
  Database01Icon,
  RefreshIcon,
  Shield01Icon,
  TaskDone01Icon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/core-free-icons';

import { AppIcon } from '@/components/app-icon';
import { OperationsLayout } from '@/components/operations-layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type QueueMonitorProps = {
  stats: {
    pending_jobs: number;
    failed_jobs: number;
    review_orders: number;
    triaged_orders: number;
  };
  pendingJobs: Array<{
    id: number;
    queue: string;
    attempts: number;
    reserved_at: number | null;
    available_at: number;
    created_at: number;
  }>;
  failedJobs: Array<{
    id: number;
    queue: string;
    failed_at: string;
    exception: string;
  }>;
  recentTriagedOrders: Array<{
    id: number;
    customer_email: string;
    risk_score: number;
    requires_review: boolean;
    ai_investigation_note: string | null;
    updated_at: string | null;
  }>;
  runtime: {
    queue_connection: string;
    horizon_available: boolean;
  };
};

const timestamp = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

export default function QueueMonitor({
  stats,
  pendingJobs,
  failedJobs,
  recentTriagedOrders,
  runtime,
}: QueueMonitorProps) {
  return (
    <>
      <Head title="Queue Monitor" />

      <OperationsLayout sidebarFooter={<SidebarStatus runtime={runtime}>{stats.pending_jobs} pending</SidebarStatus>}>
        <div className="flex flex-col gap-4">
          <Card size="sm" className="bg-card/95 shadow-xl shadow-black/5">
            <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Queue Monitor</Badge>
                  <Badge variant={stats.failed_jobs > 0 ? 'destructive' : 'secondary'}>
                    {stats.failed_jobs > 0 ? 'Attention needed' : 'Healthy'}
                  </Badge>
                  <Badge variant="outline">{runtime.queue_connection} queue</Badge>
                </div>
                <div>
                  <h1 className="font-heading text-2xl font-medium tracking-tight text-foreground">Jobs</h1>
                  <p className="text-sm text-muted-foreground">
                    Database-backed queue monitor for local development. This replaces Horizon when Redis is not
                    available.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button render={<Link href="/horizon" />} variant="outline" size="xs">
                  <AppIcon icon={RefreshIcon} data-icon="inline-start" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {!runtime.horizon_available ? (
            <Alert>
              <AppIcon icon={Alert01Icon} />
              <AlertTitle>Redis Horizon is unavailable in this environment</AlertTitle>
              <AlertDescription>
                The app is running jobs with the database queue worker instead. `composer dev` now starts
                `queue:work database --queue=triage,default`.
              </AlertDescription>
            </Alert>
          ) : null}

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={Database01Icon} label="Pending jobs" value={stats.pending_jobs.toString()} />
            <MetricCard
              icon={Alert01Icon}
              label="Failed jobs"
              value={stats.failed_jobs.toString()}
              tone={stats.failed_jobs > 0 ? 'destructive' : 'secondary'}
            />
            <MetricCard icon={Shield01Icon} label="Review orders" value={stats.review_orders.toString()} />
            <MetricCard icon={TaskDone01Icon} label="Triaged orders" value={stats.triaged_orders.toString()} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
            <Card size="sm" className="bg-card/95 shadow-xl shadow-black/5">
              <CardHeader className="border-b">
                <CardTitle>Pending queue</CardTitle>
                <CardDescription>Jobs waiting in the database queue tables.</CardDescription>
              </CardHeader>
              <CardContent className="py-4">
                {pendingJobs.length === 0 ? (
                  <EmptyState label="No pending jobs" />
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/35">
                    <Table>
                      <TableHeader className="bg-background/70">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="pl-4">ID</TableHead>
                          <TableHead>Queue</TableHead>
                          <TableHead>Attempts</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="pr-4">Reserved</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingJobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="pl-4 font-medium text-foreground">#{job.id}</TableCell>
                            <TableCell>{job.queue}</TableCell>
                            <TableCell>{job.attempts}</TableCell>
                            <TableCell>{formatUnix(job.created_at)}</TableCell>
                            <TableCell className="pr-4">{job.reserved_at ? formatUnix(job.reserved_at) : 'Waiting'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card size="sm" className="bg-card/95 shadow-xl shadow-black/5">
              <CardHeader className="border-b">
                <CardTitle>Recent triage</CardTitle>
                <CardDescription>Latest orders that have been scored or annotated.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 py-4">
                {recentTriagedOrders.length === 0 ? (
                  <EmptyState label="No triaged orders yet" />
                ) : (
                  recentTriagedOrders.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-border/70 bg-background/40 px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">#{order.id} {order.customer_email}</div>
                          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                            <AppIcon icon={Clock01Icon} className="size-3.5" />
                            <span>{order.updated_at ? timestamp.format(new Date(order.updated_at)) : 'Unknown'}</span>
                          </div>
                        </div>
                        <Badge variant={order.requires_review ? 'destructive' : 'secondary'}>
                          {order.risk_score.toFixed(1)}
                        </Badge>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">
                        {order.ai_investigation_note ?? 'Scored without AI note.'}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </section>

          <Card size="sm" className="bg-card/95 shadow-xl shadow-black/5">
            <CardHeader className="border-b">
              <CardTitle>Failed jobs</CardTitle>
              <CardDescription>Most recent exceptions captured in `failed_jobs`.</CardDescription>
            </CardHeader>
            <CardContent className="py-4">
              {failedJobs.length === 0 ? (
                <EmptyState label="No failed jobs" />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/35">
                  <Table>
                    <TableHeader className="bg-background/70">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="pl-4">ID</TableHead>
                        <TableHead>Queue</TableHead>
                        <TableHead>Failed at</TableHead>
                        <TableHead className="pr-4">Exception</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {failedJobs.map((job) => (
                        <TableRow key={job.id}>
                          <TableCell className="pl-4 font-medium text-foreground">#{job.id}</TableCell>
                          <TableCell>{job.queue}</TableCell>
                          <TableCell>{timestamp.format(new Date(job.failed_at))}</TableCell>
                          <TableCell className="pr-4 whitespace-normal text-muted-foreground">{job.exception}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </OperationsLayout>
    </>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone = 'outline',
}: {
  icon: IconSvgElement;
  label: string;
  value: string;
  tone?: 'outline' | 'secondary' | 'destructive';
}) {
  return (
    <Card size="sm" className="bg-card/95 shadow-xl shadow-black/5">
      <CardContent className="flex items-center justify-between py-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <div className="mt-1 text-2xl font-medium tracking-tight text-foreground">{value}</div>
        </div>
        <Badge variant={tone}>
          <AppIcon icon={icon} />
        </Badge>
      </CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function formatUnix(value: number): string {
  return timestamp.format(new Date(value * 1000));
}

function SidebarStatus({
  runtime,
  children,
}: {
  runtime: QueueMonitorProps['runtime'];
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/50 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Queue status</div>
      <div className="mt-1 text-sm font-medium text-foreground">
        {runtime.horizon_available ? 'Horizon available' : 'Database worker mode'}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {runtime.queue_connection} • {children}
      </div>
    </div>
  );
}
