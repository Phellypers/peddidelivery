import { base44 } from '@/api/base44Client';

let watchId = null;
let delivererId = null;

export function startLocationTracking(delId) {
  if (watchId !== null) return;
  delivererId = delId;
  if (!navigator.geolocation) return;
  watchId = navigator.geolocation.watchPosition(async (pos) => {
    if (!delivererId) return;
    try {
      await base44.entities.Deliverer.update(delivererId, {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        location_updated_at: new Date().toISOString(),
        current_status: 'delivering',
      });
    } catch (_) {}
  }, () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 });
}

export function stopLocationTracking(delId) {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  if (delId) {
    try {
      base44.entities.Deliverer.update(delId, { current_status: 'available' });
    } catch (_) {}
  }
}

export function isTracking() {
  return watchId !== null;
}