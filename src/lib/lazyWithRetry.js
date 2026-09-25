import { lazy } from 'react';

const RETRY_PREFIX = 'peddi:chunk-retry:';

export function lazyWithRetry(importer, routeKey) {
  return lazy(async () => {
    const retryKey = `${RETRY_PREFIX}${routeKey}`;
    try {
      const module = await importer();
      sessionStorage.removeItem(retryKey);
      return module;
    } catch (error) {
      if (!sessionStorage.getItem(retryKey)) {
        sessionStorage.setItem(retryKey, '1');
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem(retryKey);
      throw error;
    }
  });
}
