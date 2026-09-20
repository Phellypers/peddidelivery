export function storefrontStoreRef(search = window.location.search) {
  const params = new URLSearchParams(search);
  const direct = params.get('store');
  if (direct) return direct;
  const returnTo = params.get('returnTo');
  if (!returnTo) return '';
  try { return new URL(returnTo, window.location.origin).searchParams.get('store') || ''; }
  catch { return ''; }
}

export function withStore(path, storeRef = storefrontStoreRef()) {
  if (!storeRef) return path;
  const url = new URL(path, window.location.origin);
  url.searchParams.set('store', storeRef);
  return `${url.pathname}${url.search}${url.hash}`;
}
