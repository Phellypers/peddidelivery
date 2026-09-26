import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const measurementId = 'G-8GYXGFRWYM';

export default function GoogleAnalyticsPageView() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window.gtag !== 'function') return;

    window.gtag('event', 'page_view', {
      page_title: document.title,
      page_location: window.location.href,
      page_path: `${location.pathname}${location.search}`,
      send_to: measurementId,
    });
  }, [location.pathname, location.search]);

  return null;
}
