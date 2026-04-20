import { router } from '@inertiajs/react';
import { useEffect, useRef, useState } from 'react';

type PagePollingOptions = {
  intervalMs?: number;
  only: string[];
};

export function usePagePolling({ intervalMs = 5000, only }: PagePollingOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => Date.now());
  const pending = useRef(false);
  const onlyKey = only.join(',');

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      const partials = onlyKey === '' ? [] : onlyKey.split(',');

      if (document.visibilityState === 'hidden' || pending.current) {
        return;
      }

      pending.current = true;

      router.reload({
        only: partials,
        preserveScroll: true,
        preserveState: true,
        replace: true,
        onStart: () => {
          if (!cancelled) {
            setIsRefreshing(true);
          }
        },
        onSuccess: () => {
          if (!cancelled) {
            setLastUpdatedAt(Date.now());
          }
        },
        onFinish: () => {
          pending.current = false;

          if (!cancelled) {
            setIsRefreshing(false);
          }
        },
      });
    };

    const intervalId = window.setInterval(refresh, intervalMs);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [intervalMs, onlyKey]);

  return {
    isRefreshing,
    lastUpdatedAt,
  };
}
