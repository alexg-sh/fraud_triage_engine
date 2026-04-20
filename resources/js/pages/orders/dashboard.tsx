import { Head, Link, router, useForm, usePage } from '@inertiajs/react';
import axios from 'axios';
import { type FormEvent, useEffect, useState, type ReactNode } from 'react';
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
import { usePagePolling } from '@/lib/use-page-polling';

type DecisionStatus = 'approved' | 'blocked' | 'escalated' | null;
type DecisionFilter = 'approved' | 'blocked' | 'escalated' | 'undecided' | '';
type RiskFilter = 'high' | 'medium' | 'low' | '';

type OrderRow = {
  id: number;
  customer_email: string;
  total_amount: number;
  ip_address: string;
  billing_address: string;
  shipping_address: string;
  risk_score: number;
  risk_signals: string[];
  ai_investigation_note: string | null;
  requires_review: boolean;
  decision_status: DecisionStatus;
  decision_note: string | null;
  decisioned_at: string | null;
  created_at: string | null;
};

type OrderPatch = Partial<Pick<OrderRow, 'risk_score' | 'ai_investigation_note' | 'requires_review' | 'decision_status' | 'decision_note' | 'decisioned_at'>>;

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
    undecided_review_orders: number;
  };
  flash?: {
    status?: string | null;
  };
};

type QueryState = {
  filter: 'review' | null;
  search: string;
  decision: DecisionFilter;
  risk: RiskFilter;
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

const syncTime = new Intl.DateTimeFormat('en-GB', {
  timeStyle: 'medium',
});

const investigationRequestTimeoutMs = 8000;

export default function OrdersDashboard({ orders, stats, flash }: DashboardProps) {
  const { url } = usePage();
  const queryState = getOrderQueryState(url);
  const { isRefreshing, lastUpdatedAt } = usePagePolling({
    intervalMs: 1500,
    only: ['orders', 'stats'],
  });
  const demoOrders = useForm({
    count: '25',
  });
  const resetDemoData = useForm({});
  const [searchTerm, setSearchTerm] = useState(queryState.search);
  const [decisionFilter, setDecisionFilter] = useState<DecisionFilter>(queryState.decision);
  const [riskFilter, setRiskFilter] = useState<RiskFilter>(queryState.risk);
  const [orderOverrides, setOrderOverrides] = useState<Record<number, OrderPatch>>({});

  useEffect(() => {
    setSearchTerm(queryState.search);
    setDecisionFilter(queryState.decision);
    setRiskFilter(queryState.risk);
  }, [queryState.decision, queryState.risk, queryState.search]);

  useEffect(() => {
    setOrderOverrides({});
  }, [orders.data]);

  const visibleOrders = orders.data.map((order) => ({
    ...order,
    ...(orderOverrides[order.id] ?? {}),
  }));
  const visibleFlagged = visibleOrders.filter((order) => order.requires_review).length;
  const visibleClear = Math.max(visibleOrders.length - visibleFlagged, 0);
  const reviewRate = stats.total_orders === 0 ? 0 : Math.round((stats.review_orders / stats.total_orders) * 100);
  const filteredView = hasActiveFilters(queryState);

  const submitDemoOrders = () => {
    demoOrders.post('/orders/demo-batch', {
      preserveScroll: true,
    });
  };

  const submitResetDemoData = () => {
    resetDemoData.post('/orders/reset-demo-data', {
      preserveScroll: true,
    });
  };

  const applyOrderPatch = (orderId: number, patch: OrderPatch) => {
    setOrderOverrides((current) => ({
      ...current,
      [orderId]: {
        ...(current[orderId] ?? {}),
        ...patch,
      },
    }));
  };

  const visitOrders = (nextState: QueryState) => {
    router.get('/orders', buildOrdersParams(nextState), {
      preserveScroll: true,
      preserveState: true,
      replace: true,
      only: ['orders', 'stats'],
    });
  };

  const submitFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    visitOrders({
      ...queryState,
      search: searchTerm.trim(),
      decision: decisionFilter,
      risk: riskFilter,
    });
  };

  const clearFilters = () => {
    visitOrders({
      filter: null,
      search: '',
      decision: '',
      risk: '',
    });
  };

  return (
    <>
      <Head title="Orders" />

      <OperationsLayout
        sidebarFooter={
          <ReviewShareCard reviewRate={reviewRate}>
            {stats.review_orders} flagged orders • {stats.undecided_review_orders} pending decision
          </ReviewShareCard>
        }
      >
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
                <ToolbarChip icon={Shield01Icon} value={`${stats.undecided_review_orders} undecided`} tone={stats.undecided_review_orders > 0 ? 'destructive' : 'outline'} />
                <ToolbarChip
                  icon={Activity01Icon}
                  value={isRefreshing ? 'Syncing order status' : `Live ${syncTime.format(new Date(lastUpdatedAt))}`}
                />
                <Button render={<Link href="/queue-monitor" />} variant="outline" size="xs">
                  <AppIcon icon={Activity01Icon} data-icon="inline-start" />
                  Queue monitor
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
            <CardHeader>
              <CardTitle>Demo orders</CardTitle>
              <CardDescription>Create a fake batch with a fixed mix of safe and review-worthy orders.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                <span>Each batch generates fake customer data and queues triage jobs immediately.</span>
                <span>About 70% should pass and about 30% should land in review.</span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-xs uppercase tracking-[0.14em] text-muted-foreground" htmlFor="demo-order-count">
                  Batch size
                </label>
                <select
                  id="demo-order-count"
                  value={demoOrders.data.count}
                  onChange={(event) => demoOrders.setData('count', event.target.value)}
                  className="h-9 rounded-lg border border-border/70 bg-background/70 px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                >
                  <option value="10">10 orders</option>
                  <option value="25">25 orders</option>
                  <option value="50">50 orders</option>
                  <option value="100">100 orders</option>
                </select>
                <Button type="button" onClick={submitDemoOrders} size="sm" disabled={demoOrders.processing}>
                  <AppIcon icon={ShieldEnergyIcon} data-icon="inline-start" />
                  {demoOrders.processing ? 'Queueing orders' : 'Add demo orders'}
                </Button>
                <Button
                  type="button"
                  onClick={submitResetDemoData}
                  variant="outline"
                  size="sm"
                  disabled={resetDemoData.processing}
                >
                  {resetDemoData.processing ? 'Resetting demo' : 'Reset demo data'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card size="sm" className="bg-card/95 shadow-xl shadow-black/5">
            <CardHeader>
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <TabLink
                      href={buildOrdersHref({ ...queryState, filter: null })}
                      label="All orders"
                      active={queryState.filter !== 'review'}
                    />
                    <TabLink
                      href={buildOrdersHref({ ...queryState, filter: 'review' })}
                      label="Needs review"
                      active={queryState.filter === 'review'}
                    />
                    <Badge variant="outline">{visibleClear} clear</Badge>
                  </div>
                  <div className="flex min-w-0 flex-col gap-1">
                    <CardTitle>Order list</CardTitle>
                    <CardDescription>
                      Searchable review queue with persisted risk signals, AI notes, and final analyst decisions.
                    </CardDescription>
                  </div>
                </div>

                <CardAction className="flex flex-wrap items-center gap-2">
                  <ToolbarChip icon={FilterHorizontalIcon} value={`${visibleOrders.length} visible`} />
                  <ToolbarChip icon={Shield01Icon} value={`${visibleFlagged} flagged`} tone={visibleFlagged > 0 ? 'destructive' : 'outline'} />
                  <div className="hidden items-center gap-2 rounded-xl border border-border/70 bg-background/50 px-3 py-2 text-xs text-muted-foreground md:flex">
                    <AppIcon icon={AiSearch02Icon} className="size-3.5" />
                    Fast analyst filters
                  </div>
                </CardAction>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-3 py-4">
              <form onSubmit={submitFilters} className="grid gap-3 rounded-2xl border border-border/70 bg-background/35 p-3 lg:grid-cols-[minmax(0,1.7fr)_0.8fr_0.8fr_auto]">
                <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Search
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Email, IP, billing, shipping"
                    className="h-10 rounded-xl border border-border/70 bg-background/70 px-3 text-sm normal-case tracking-normal text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                  />
                </label>

                <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Decision
                  <select
                    value={decisionFilter}
                    onChange={(event) => setDecisionFilter(event.target.value as DecisionFilter)}
                    className="h-10 rounded-xl border border-border/70 bg-background/70 px-3 text-sm normal-case tracking-normal text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">All decisions</option>
                    <option value="undecided">Undecided</option>
                    <option value="approved">Approved</option>
                    <option value="blocked">Blocked</option>
                    <option value="escalated">Escalated</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1.5 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                  Risk
                  <select
                    value={riskFilter}
                    onChange={(event) => setRiskFilter(event.target.value as RiskFilter)}
                    className="h-10 rounded-xl border border-border/70 bg-background/70 px-3 text-sm normal-case tracking-normal text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
                  >
                    <option value="">All risk bands</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </label>

                <div className="flex items-end gap-2">
                  <Button type="submit" size="sm">
                    Apply
                  </Button>
                  <Button type="button" onClick={clearFilters} variant="outline" size="sm" disabled={!filteredView}>
                    Reset
                  </Button>
                </div>
              </form>

              {visibleOrders.length === 0 ? (
                <EmptyState reviewMode={queryState.filter === 'review'} filteredView={filteredView} />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-background/35">
                  <Table className="table-fixed">
                    <TableHeader className="bg-background/70">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="w-[12%] pl-4 text-[11px] uppercase tracking-[0.14em]">Order</TableHead>
                        <TableHead className="w-[15%] text-[11px] uppercase tracking-[0.14em]">Date</TableHead>
                        <TableHead className="w-[20%] text-[11px] uppercase tracking-[0.14em]">Customer</TableHead>
                        <TableHead className="w-[15%] text-[11px] uppercase tracking-[0.14em]">Route</TableHead>
                        <TableHead className="w-[10%] text-[11px] uppercase tracking-[0.14em]">Risk</TableHead>
                        <TableHead className="w-[12%] text-[11px] uppercase tracking-[0.14em]">Decision</TableHead>
                        <TableHead className="w-[8%] text-[11px] uppercase tracking-[0.14em]">Total</TableHead>
                        <TableHead className="w-[8%] pr-4 text-right text-[11px] uppercase tracking-[0.14em]">Review</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {visibleOrders.map((order) => {
                        const route = getRouteMeta(order);
                        const risk = getRiskMeta(order.risk_score, order.requires_review);
                        const decision = getDecisionMeta(order.decision_status);

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
                              <div className="flex flex-col gap-1">
                                <Badge variant={decision.variant} className="h-5 px-2 text-[11px]">
                                  {decision.label}
                                </Badge>
                                <span className="truncate text-[11px] text-muted-foreground">
                                  {order.decisioned_at ? timestamp.format(new Date(order.decisioned_at)) : 'Awaiting analyst'}
                                </span>
                              </div>
                            </TableCell>

                            <TableCell className="align-middle">
                              <div className="text-sm font-medium text-foreground">{currency.format(order.total_amount)}</div>
                            </TableCell>

                            <TableCell className="pr-4 text-right align-middle">
                              <OrderReviewDialog
                                order={order}
                                routeLabel={route.label}
                                onOrderPatch={applyOrderPatch}
                              />
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

function OrderReviewDialog({
  order,
  routeLabel,
  onOrderPatch,
}: {
  order: OrderRow;
  routeLabel: string;
  onOrderPatch: (orderId: number, patch: OrderPatch) => void;
}) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(order.ai_investigation_note);
  const [riskScore, setRiskScore] = useState(order.risk_score);
  const [requiresReview, setRequiresReview] = useState(order.requires_review);
  const [decisionStatus, setDecisionStatus] = useState<DecisionStatus>(order.decision_status);
  const [decisionNoteInput, setDecisionNoteInput] = useState(order.decision_note ?? '');
  const [decisionedAt, setDecisionedAt] = useState(order.decisioned_at);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error' | 'not-needed'>(
    order.requires_review ? (order.ai_investigation_note ? 'ready' : 'idle') : 'not-needed',
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [requestNonce, setRequestNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [savingDecision, setSavingDecision] = useState(false);

  useEffect(() => {
    setNote(order.ai_investigation_note);
    setRiskScore(order.risk_score);
    setRequiresReview(order.requires_review);
    setDecisionStatus(order.decision_status);
    setDecisionNoteInput(order.decision_note ?? '');
    setDecisionedAt(order.decisioned_at);
    setStatus(order.requires_review ? (order.ai_investigation_note ? 'ready' : 'idle') : 'not-needed');
    setErrorMessage(null);
    setRequestNonce(0);
    setRefreshing(false);
    setSavingDecision(false);
  }, [
    order.ai_investigation_note,
    order.decision_note,
    order.decision_status,
    order.decisioned_at,
    order.id,
    order.requires_review,
    order.risk_score,
  ]);

  useEffect(() => {
    if (!open || !requiresReview || status === 'loading' || (note !== null && !refreshing) || status === 'not-needed') {
      return;
    }

    let cancelled = false;

    const loadNote = async () => {
      setStatus('loading');
      setErrorMessage(null);

      try {
        const response = await axios.post(
          `/orders/${order.id}/investigation-note`,
          refreshing ? { refresh: true } : {},
          { timeout: investigationRequestTimeoutMs },
        );
        const data = response.data?.data ?? {};
        const investigationNote = typeof data.ai_investigation_note === 'string' ? data.ai_investigation_note : null;
        const returnedRiskScore = Number(data.risk_score ?? order.risk_score);
        const returnedRequiresReview = Boolean(data.requires_review);

        if (cancelled) {
          return;
        }

        setRiskScore(returnedRiskScore);
        setRequiresReview(returnedRequiresReview);
        setRefreshing(false);

        if (!returnedRequiresReview) {
          setNote(null);
          setStatus('not-needed');
          onOrderPatch(order.id, {
            risk_score: returnedRiskScore,
            requires_review: false,
            ai_investigation_note: null,
          });

          return;
        }

        if (investigationNote !== null && investigationNote.trim() !== '') {
          setNote(investigationNote);
          setStatus('ready');
          onOrderPatch(order.id, {
            risk_score: returnedRiskScore,
            requires_review: true,
            ai_investigation_note: investigationNote,
          });

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

        setRefreshing(false);
        setErrorMessage(message);
        setStatus('error');
      }
    };

    void loadNote();

    return () => {
      cancelled = true;
    };
  }, [note, onOrderPatch, open, order.id, order.risk_score, refreshing, requestNonce, requiresReview, status]);

  const retry = () => {
    setRefreshing(note !== null);
    setStatus('idle');
    setErrorMessage(null);
    if (note !== null) {
      setNote(null);
    }
    setRequestNonce((value) => value + 1);
  };

  const saveDecision = async (nextDecisionStatus: NonNullable<DecisionStatus>) => {
    setSavingDecision(true);
    setErrorMessage(null);

    try {
      const response = await axios.post(`/orders/${order.id}/decision`, {
        decision_status: nextDecisionStatus,
        decision_note: decisionNoteInput.trim() === '' ? null : decisionNoteInput.trim(),
      });
      const data = response.data?.data ?? {};
      const nextDecisionNote = typeof data.decision_note === 'string' ? data.decision_note : null;
      const nextDecisionedAt = typeof data.decisioned_at === 'string' ? data.decisioned_at : null;

      setDecisionStatus(nextDecisionStatus);
      setDecisionNoteInput(nextDecisionNote ?? '');
      setDecisionedAt(nextDecisionedAt);
      onOrderPatch(order.id, {
        decision_status: nextDecisionStatus,
        decision_note: nextDecisionNote,
        decisioned_at: nextDecisionedAt,
      });

      router.reload({
        only: ['orders', 'stats'],
        preserveScroll: true,
        preserveState: true,
      });
    } catch (error) {
      const message = axios.isAxiosError(error)
        ? (error.response?.data?.message as string | undefined) ?? error.message
        : 'Unable to save analyst decision.';

      setErrorMessage(message);
    } finally {
      setSavingDecision(false);
    }
  };

  const risk = getRiskMeta(riskScore, requiresReview);
  const decision = getDecisionMeta(decisionStatus);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant={requiresReview ? 'destructive' : 'outline'} size="xs" />}>
        {decisionStatus === null ? 'Open' : 'Update'}
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">Order #{order.id}</Badge>
            <Badge variant={risk.variant}>Risk {riskScore.toFixed(1)}</Badge>
            <Badge variant={requiresReview ? 'destructive' : 'secondary'}>{routeLabel}</Badge>
            <Badge variant={decision.variant}>{decision.label}</Badge>
          </div>
          <DialogTitle>Analyst review workspace</DialogTitle>
          <DialogDescription>
            Review the scored signals, generate the AI summary when needed, and record a final analyst decision.
          </DialogDescription>
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
            <AlertTitle>Review action failed</AlertTitle>
            <AlertDescription>{errorMessage ?? 'Unable to load investigation note.'}</AlertDescription>
          </Alert>
        ) : null}

        {status === 'not-needed' ? (
          <Alert>
            <AppIcon icon={Shield01Icon} />
            <AlertTitle>No AI note required</AlertTitle>
            <AlertDescription>
              This order is currently below the manual-review threshold. The analyst decision controls are still available.
            </AlertDescription>
          </Alert>
        ) : null}

        {status === 'ready' && note !== null ? (
          <Alert variant="destructive">
            <AppIcon icon={Alert01Icon} />
            <AlertTitle>{risk.label}</AlertTitle>
            <AlertDescription>{note}</AlertDescription>
          </Alert>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2">
          <ContextTile icon={Mail01Icon} label="Customer" value={order.customer_email} />
          <ContextTile icon={Radar02Icon} label="IP address" value={order.ip_address} />
          <ContextTile icon={Location01Icon} label="Billing address" value={order.billing_address} />
          <ContextTile icon={Location01Icon} label="Shipping address" value={order.shipping_address} />
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Risk signals</div>
              <div className="mt-1 text-sm text-foreground">Persisted triage reasons behind the current score.</div>
            </div>
            <Badge variant={risk.variant}>{risk.label}</Badge>
          </div>

          {order.risk_signals.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {order.risk_signals.map((signal) => (
                <Badge key={signal} variant="outline" className="h-auto whitespace-normal px-2 py-1 text-left text-[11px]">
                  {signal}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No material risk signals were recorded for this order.</div>
          )}
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/45 p-4">
          <div className="mb-3">
            <div className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Analyst decision</div>
            <div className="mt-1 text-sm text-foreground">
              {decisionedAt
                ? `Last updated ${timestamp.format(new Date(decisionedAt))}`
                : 'No final decision has been recorded yet.'}
            </div>
          </div>

          <label className="flex flex-col gap-2 text-sm text-foreground">
            Decision note
            <textarea
              value={decisionNoteInput}
              onChange={(event) => setDecisionNoteInput(event.target.value)}
              placeholder="Optional analyst rationale or next step"
              className="min-h-24 rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => void saveDecision('approved')} disabled={savingDecision}>
              {savingDecision && decisionStatus === 'approved' ? 'Saving' : 'Approve'}
            </Button>
            <Button type="button" variant="destructive" size="sm" onClick={() => void saveDecision('blocked')} disabled={savingDecision}>
              {savingDecision && decisionStatus === 'blocked' ? 'Saving' : 'Block'}
            </Button>
            <Button type="button" size="sm" onClick={() => void saveDecision('escalated')} disabled={savingDecision}>
              {savingDecision && decisionStatus === 'escalated' ? 'Saving' : 'Escalate'}
            </Button>
          </div>
        </div>

        <DialogFooter showCloseButton>
          {requiresReview ? (
            <Button type="button" variant="outline" onClick={retry}>
              Refresh AI response
            </Button>
          ) : null}
        </DialogFooter>
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

function EmptyState({ reviewMode, filteredView }: { reviewMode: boolean; filteredView: boolean }) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 px-4 py-10 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-secondary text-foreground">
        <AppIcon icon={reviewMode ? Shield01Icon : DashboardSquare02Icon} className="size-5" />
      </div>
      <div className="mt-3 text-sm font-medium text-foreground">
        {filteredView ? 'No orders match the current filters' : reviewMode ? 'No flagged orders on this page' : 'No orders available'}
      </div>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
        {filteredView
          ? 'Adjust the search or reset filters to widen the queue.'
          : reviewMode
            ? 'Switch back to all orders or move to the next page.'
            : 'Use "Add demo orders" to generate fake orders and queue triage jobs.'}
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
      detail: formatRouteCountries(billingCountry, shippingCountry, billingFlag, shippingFlag) ?? `${billingCountry} -> ${shippingCountry}`,
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

function getOrderQueryState(url: string): QueryState {
  const [, search = ''] = url.split('?');
  const params = new URLSearchParams(search);
  const filter = params.get('filter') === 'review' ? 'review' : null;
  const decision = params.get('decision');
  const risk = params.get('risk');

  return {
    filter,
    search: params.get('search') ?? '',
    decision: isDecisionFilter(decision) ? decision : '',
    risk: isRiskFilter(risk) ? risk : '',
  };
}

function buildOrdersParams(state: QueryState): Record<string, string> {
  const params: Record<string, string> = {};

  if (state.filter === 'review') {
    params.filter = 'review';
  }

  if (state.search !== '') {
    params.search = state.search;
  }

  if (state.decision !== '') {
    params.decision = state.decision;
  }

  if (state.risk !== '') {
    params.risk = state.risk;
  }

  return params;
}

function buildOrdersHref(state: QueryState): string {
  const params = new URLSearchParams(buildOrdersParams(state));
  const query = params.toString();

  return query === '' ? '/orders' : `/orders?${query}`;
}

function hasActiveFilters(state: QueryState): boolean {
  return state.filter !== null || state.search !== '' || state.decision !== '' || state.risk !== '';
}

function getRiskMeta(score: number, requiresReview: boolean): { label: string; variant: BadgeTone } {
  if (score >= 80) {
    return {
      label: 'High risk',
      variant: 'destructive',
    };
  }

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

function getDecisionMeta(status: DecisionStatus): { label: string; variant: BadgeTone } {
  if (status === 'approved') {
    return {
      label: 'Approved',
      variant: 'secondary',
    };
  }

  if (status === 'blocked') {
    return {
      label: 'Blocked',
      variant: 'destructive',
    };
  }

  if (status === 'escalated') {
    return {
      label: 'Escalated',
      variant: 'outline',
    };
  }

  return {
    label: 'Undecided',
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

    return `${billingFlag} ${billingCountry} -> ${shippingFlag} ${shippingCountry}`;
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

function isDecisionFilter(value: string | null): value is DecisionFilter {
  return value === '' || value === 'approved' || value === 'blocked' || value === 'escalated' || value === 'undecided';
}

function isRiskFilter(value: string | null): value is RiskFilter {
  return value === '' || value === 'high' || value === 'medium' || value === 'low';
}
