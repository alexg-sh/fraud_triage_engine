import { Head, Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { useEffect, useState, type ReactNode } from 'react';
import {
  Activity01Icon,
  AiBrain03Icon,
  AiSearch02Icon,
  Alert01Icon,
  Analytics02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Clock01Icon,
  DashboardSquare02Icon,
  FilterHorizontalIcon,
  Location01Icon,
  Mail01Icon,
  Radar02Icon,
  Shield01Icon,
  ShieldEnergyIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/core-free-icons';

import { AppIcon } from '@/components/app-icon';
import { OperationsLayout } from '@/components/operations-layout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  DialogFooter,
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

type BadgeTone = 'secondary' | 'outline' | 'destructive';

const currency = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

const timestamp = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

const investigationRequestTimeoutMs = 8000;

export default function OrdersDashboard({ orders, stats, flash }: DashboardProps) {
  const { url } = usePage();
  const reviewMode = getReviewMode(url);

  const visibleOrders = reviewMode ? orders.data.filter((order) => order.requires_review) : orders.data;
  const visibleFlagged = visibleOrders.filter((order) => order.requires_review).length;
  const visibleClear = Math.max(visibleOrders.length - visibleFlagged, 0);
  const reviewRate = stats.total_orders === 0 ? 0 : Math.round((stats.review_orders / stats.total_orders) * 100);

  return (
    <>
      <Head title="Orders" />

      <OperationsLayout sidebarFooter={<ReviewShareCard reviewRate={reviewRate}>{stats.review_orders} flagged orders</ReviewShareCard>}>
        <div className="flex flex-col gap-4">
          <Card size="sm" className="bg-card/95 shadow-xl shadow-black/5">
            <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Orders</Badge>
                  <Badge variant={reviewRate >= 45 ? 'destructive' : 'secondary'}>
                    {reviewRate >= 45 ? 'Escalated queue' : 'Normal traffic'}
                  </Badge>
                </div>
                <h1 className="font-heading text-2xl font-medium tracking-tight text-foreground">Orders</h1>
                <p className="text-sm text-muted-foreground">
                  Compact review list for fraud operations, model notes, and manual escalation.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <ToolbarChip icon={Analytics02Icon} value={`${stats.average_risk_score.toFixed(1)} avg risk`} />
                <ToolbarChip icon={Alert01Icon} value={`${stats.highest_risk_score.toFixed(1)} peak`} />
                <Button render={<Link href="/horizon" />} variant="outline" size="xs">
                  <AppIcon icon={Activity01Icon} data-icon="inline-start" />
                  Queue workers
                </Button>
              </div>
            </CardContent>
          </Card>

          {flash?.status ? (
            <Alert className="py-3">
              <AppIcon icon={AiBrain03Icon} />
              <AlertTitle>Queue update</AlertTitle>
              <AlertDescription>{flash.status}</AlertDescription>
            </Alert>
          ) : null}

          <Card size="sm" className="bg-card/95 shadow-xl shadow-black/5">
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <TabLink href="/orders" label="All orders" active={!reviewMode} />
                    <TabLink href="/orders?filter=review" label="Needs review" active={reviewMode} />
                    <Badge variant="outline">{visibleClear} clear</Badge>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <CardTitle>Order list</CardTitle>
                    <CardDescription>
                      Shopify-style list view with smaller rows and quick access to the AI investigation note.
                    </CardDescription>
                  </div>
                </div>

                <CardAction className="flex flex-wrap items-center gap-2">
                  <ToolbarChip icon={FilterHorizontalIcon} value={`${visibleOrders.length} visible`} />
                  <ToolbarChip icon={Shield01Icon} value={`${visibleFlagged} flagged`} tone={visibleFlagged > 0 ? 'destructive' : 'outline'} />
                  <div className="hidden items-center gap-2 rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-xs text-muted-foreground md:flex">
                    <AppIcon icon={AiSearch02Icon} className="size-3.5" />
                    Compact admin list view
                  </div>
                </CardAction>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-3 py-4">
              {visibleOrders.length === 0 ? (
                <EmptyState reviewMode={reviewMode} />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/35">
                  <Table className="table-fixed">
                    <TableHeader className="bg-background/70">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[13%] pl-4 text-[11px] uppercase tracking-[0.14em]">Order</TableHead>
                        <TableHead className="w-[18%] text-[11px] uppercase tracking-[0.14em]">Date</TableHead>
                        <TableHead className="w-[22%] text-[11px] uppercase tracking-[0.14em]">Customer</TableHead>
                        <TableHead className="w-[18%] text-[11px] uppercase tracking-[0.14em]">Route</TableHead>
                        <TableHead className="w-[12%] text-[11px] uppercase tracking-[0.14em]">Risk</TableHead>
                        <TableHead className="w-[10%] text-[11px] uppercase tracking-[0.14em]">Total</TableHead>
                        <TableHead className="w-[12%] pr-4 text-right text-[11px] uppercase tracking-[0.14em]">
                          AI note
                        </TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {visibleOrders.map((order) => {
                        const route = getRouteMeta(order);
                        const risk = getRiskMeta(order.risk_score, order.requires_review);

                        return (
                          <TableRow key={order.id} className={order.requires_review ? 'bg-destructive/[0.03]' : ''}>
                            <TableCell className="pl-4 align-middle">
                              <div className="flex flex-col gap-0.5 leading-tight">
                                <span className="font-medium text-foreground">#{order.id}</span>
                                <span className="truncate text-[11px] text-muted-foreground">{order.ip_address}</span>
                              </div>
                            </TableCell>

                            <TableCell className="align-middle">
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <AppIcon icon={Clock01Icon} className="size-3.5" />
                                <span className="truncate">
                                  {order.created_at ? timestamp.format(new Date(order.created_at)) : 'Pending'}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="align-middle">
                              <div className="truncate text-sm text-foreground">{order.customer_email}</div>
                            </TableCell>

                            <TableCell className="align-middle">
                              <div className="flex flex-col gap-1">
                                <Badge variant={route.variant} className="h-5 px-2 text-[11px]">
                                  {route.label}
                                </Badge>
                                <span className="truncate text-[11px] text-muted-foreground">{route.detail}</span>
                              </div>
                            </TableCell>

                            <TableCell className="align-middle">
                              <div className="flex flex-col gap-1">
                                <Badge variant={risk.variant} className="h-5 px-2 text-[11px]">
                                  {order.risk_score.toFixed(1)}
                                </Badge>
                                <span className="text-[11px] text-muted-foreground">{risk.label}</span>
                              </div>
                            </TableCell>

                            <TableCell className="align-middle">
                              <div className="text-sm font-medium text-foreground">{currency.format(order.total_amount)}</div>
                            </TableCell>

                            <TableCell className="pr-4 text-right align-middle">
                              {order.requires_review ? (
                                <InvestigationNoteDialog order={order} routeLabel={route.label} riskLabel={risk.label} />
                              ) : (
                                <span className="text-[11px] text-muted-foreground">Not needed</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-muted-foreground">
                  Page {orders.current_page} of {orders.last_page} • {visibleOrders.length} orders visible
                </div>

                <div className="flex items-center gap-2">
                  <PaginationButton href={orders.prev_page_url} icon={ArrowLeft01Icon} label="Previous" />
                  <PaginationButton href={orders.next_page_url} icon={ArrowRight01Icon} label="Next" reverse />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </OperationsLayout>
    </>
  );
}

function InvestigationNoteDialog({
  order,
  routeLabel,
  riskLabel,
}: {
  order: OrderRow;
  routeLabel: string;
  riskLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(order.ai_investigation_note);
  const [riskScore, setRiskScore] = useState(order.risk_score);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(order.ai_investigation_note ? 'ready' : 'idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestNonce, setRequestNonce] = useState(0);

  useEffect(() => {
    setNote(order.ai_investigation_note);
    setRiskScore(order.risk_score);
    setStatus(order.ai_investigation_note ? 'ready' : 'idle');
    setErrorMessage(null);
    setRequestNonce(0);
  }, [order.ai_investigation_note, order.id, order.risk_score]);

  useEffect(() => {
    if (!open || note !== null || status === 'loading') {
      return;
    }

    let cancelled = false;

    const loadNote = async () => {
      setStatus('loading');
      setErrorMessage(null);

      try {
        const response = await axios.post(
          `/orders/${order.id}/investigation-note`,
          {},
          { timeout: investigationRequestTimeoutMs },
        );
        const investigationNote = response.data?.data?.ai_investigation_note ?? null;
        const returnedRiskScore = Number(response.data?.data?.risk_score ?? order.risk_score);

        if (cancelled) {
          return;
        }

        setRiskScore(returnedRiskScore);
        if (typeof investigationNote === 'string' && investigationNote.trim() !== '') {
          setNote(investigationNote);
          setStatus('ready');

          return;
        }

        setErrorMessage('No investigation summary was returned for this order.');
        setStatus('error');
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = axios.isAxiosError(error)
          ? error.code === 'ECONNABORTED'
            ? 'AI analysis timed out. Try again.'
            : (error.response?.data?.message as string | undefined) ?? error.message
          : 'Unable to load investigation note.';

        setErrorMessage(message);
        setStatus('error');
      }
    };

    void loadNote();

    return () => {
      cancelled = true;
    };
  }, [note, open, order.id, order.risk_score, requestNonce, status]);

  const badgeVariant = riskScore >= 50 ? 'destructive' : 'secondary';
  const retry = () => {
    setStatus('idle');
    setErrorMessage(null);
    setRequestNonce((value) => value + 1);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="destructive" size="xs" />}>Open</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Order #{order.id}</Badge>
            <Badge variant={badgeVariant}>Risk {riskScore.toFixed(1)}</Badge>
            <Badge variant={badgeVariant}>{routeLabel}</Badge>
          </div>
          <DialogTitle>AI investigation summary</DialogTitle>
          <DialogDescription>OpenRouter analysis runs only when an analyst opens a flagged order.</DialogDescription>
        </DialogHeader>

        {status === 'loading' ? (
          <Alert>
            <AppIcon icon={AiBrain03Icon} />
            <AlertTitle>Generating note</AlertTitle>
            <AlertDescription>
              Fetching the investigation summary for this order now. This usually completes within a few seconds.
            </AlertDescription>
          </Alert>
        ) : null}

        {status === 'error' ? (
          <Alert variant="destructive">
            <AppIcon icon={Alert01Icon} />
            <AlertTitle>Note generation failed</AlertTitle>
            <AlertDescription>{errorMessage ?? 'Unable to load investigation note.'}</AlertDescription>
          </Alert>
        ) : null}

        {status === 'ready' && note !== null ? (
          <Alert variant="destructive">
            <AppIcon icon={Alert01Icon} />
            <AlertTitle>{riskLabel}</AlertTitle>
            <AlertDescription>{note}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <ContextTile icon={Mail01Icon} label="Customer" value={order.customer_email} />
          <ContextTile icon={Radar02Icon} label="IP address" value={order.ip_address} />
          <ContextTile icon={Location01Icon} label="Billing address" value={order.billing_address} />
          <ContextTile icon={Location01Icon} label="Shipping address" value={order.shipping_address} />
        </div>

        {status === 'error' ? (
          <DialogFooter>
            <Button variant="outline" onClick={retry}>
              Retry note request
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TabLink({ href, label, active = false }: { href: string; label: string; active?: boolean }) {
  return (
    <Button render={<Link href={href} />} variant={active ? 'secondary' : 'ghost'} size="xs">
      {label}
    </Button>
  );
}

function ToolbarChip({
  icon,
  value,
  tone = 'outline',
}: {
  icon: IconSvgElement;
  value: string;
  tone?: BadgeTone;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-xs text-muted-foreground">
      <AppIcon icon={icon} className="size-3.5" />
      <span className={tone === 'destructive' ? 'text-destructive' : 'text-foreground'}>{value}</span>
    </div>
  );
}

function ContextTile({ icon, label, value }: { icon: IconSvgElement; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/45 px-4 py-3">
      <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        <AppIcon icon={icon} className="size-3.5" />
        <span>{label}</span>
      </div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function ReviewShareCard({ reviewRate, children }: { reviewRate: number; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-background/50 px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Review share</div>
      <div className="mt-1 text-2xl font-medium tracking-tight text-foreground">{reviewRate}%</div>
      <div className="mt-1 text-xs text-muted-foreground">{children}</div>
    </div>
  );
}

function EmptyState({ reviewMode }: { reviewMode: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-foreground">
        <AppIcon icon={reviewMode ? Shield01Icon : DashboardSquare02Icon} className="size-5" />
      </div>
      <div className="mt-3 text-sm font-medium text-foreground">
        {reviewMode ? 'No flagged orders on this page' : 'No orders available'}
      </div>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
        {reviewMode
          ? 'Switch back to all orders or move to the next page.'
          : 'Seed or ingest orders to populate the queue.'}
      </p>
    </div>
  );
}

function PaginationButton({
  href,
  icon,
  label,
  reverse = false,
}: {
  href: string | null;
  icon: IconSvgElement;
  label: string;
  reverse?: boolean;
}) {
  if (href === null) {
    return (
      <Button variant="outline" size="xs" disabled>
        {!reverse ? <AppIcon icon={icon} data-icon="inline-start" /> : null}
        {label}
        {reverse ? <AppIcon icon={icon} data-icon="inline-end" /> : null}
      </Button>
    );
  }

  return (
    <Button render={<Link href={href} />} variant="outline" size="xs">
      {!reverse ? <AppIcon icon={icon} data-icon="inline-start" /> : null}
      {label}
      {reverse ? <AppIcon icon={icon} data-icon="inline-end" /> : null}
    </Button>
  );
}

function getRouteMeta(order: OrderRow): { label: string; detail: string; variant: BadgeTone } {
  const billingCountry = getAddressCountry(order.billing_address);
  const shippingCountry = getAddressCountry(order.shipping_address);
  const billingFlag = getCountryFlag(billingCountry);
  const shippingFlag = getCountryFlag(shippingCountry);

  if (order.billing_address === order.shipping_address) {
    return {
      label: 'Matched',
      detail: formatRouteCountries(billingCountry, shippingCountry, billingFlag, shippingFlag) ?? 'Single address',
      variant: 'secondary',
    };
  }

  if (billingCountry !== null && shippingCountry !== null && billingCountry !== shippingCountry) {
    return {
      label: 'Cross-border',
      detail: formatRouteCountries(billingCountry, shippingCountry, billingFlag, shippingFlag) ?? `${billingCountry} → ${shippingCountry}`,
      variant: 'destructive',
    };
  }

   if (billingCountry !== null && shippingCountry !== null && billingCountry === shippingCountry) {
    return {
      label: 'Domestic',
      detail: formatRouteCountries(billingCountry, shippingCountry, billingFlag, shippingFlag) ?? `${shippingFlag} ${shippingCountry}`,
      variant: 'secondary',
    };
  }

  return {
    label: 'Unclear',
    detail: formatRouteCountries(billingCountry, shippingCountry, billingFlag, shippingFlag) ?? shippingCountry ?? 'Address changed',
    variant: 'outline',
  };
}

function getReviewMode(url: string): boolean {
  const [, search = ''] = url.split('?');

  return new URLSearchParams(search).get('filter') === 'review';
}

function getRiskMeta(score: number, requiresReview: boolean): { label: string; variant: BadgeTone } {
  if (requiresReview) {
    return {
      label: 'Manual review',
      variant: 'destructive',
    };
  }

  if (score >= 30) {
    return {
      label: 'Monitor',
      variant: 'secondary',
    };
  }

  return {
    label: 'Clear',
    variant: 'outline',
  };
}

function getAddressCountry(address: string): string | null {
  const parts = address
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

  return parts.at(-1) ?? null;
}

function formatRouteCountries(
  billingCountry: string | null,
  shippingCountry: string | null,
  billingFlag: string,
  shippingFlag: string,
): string | null {
  if (billingCountry === null && shippingCountry === null) {
    return null;
  }

  if (billingCountry !== null && shippingCountry !== null) {
    if (billingCountry === shippingCountry) {
      return `${shippingFlag} ${shippingCountry}`;
    }

    return `${billingFlag} ${billingCountry} → ${shippingFlag} ${shippingCountry}`;
  }

  if (shippingCountry !== null) {
    return `${shippingFlag} ${shippingCountry}`;
  }

  return `${billingFlag} ${billingCountry}`;
}

function getCountryFlag(country: string | null): string {
  return (
    {
      'United Kingdom': '🇬🇧',
      Romania: '🇷🇴',
      Germany: '🇩🇪',
      Spain: '🇪🇸',
      France: '🇫🇷',
    }[country ?? ''] ?? '🌍'
  );
}
