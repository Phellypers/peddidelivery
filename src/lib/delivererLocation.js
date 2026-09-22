import { base44 } from '@/api/base44Client';

let watchId = null;
let delivererId = null;
let startPromise = null;
let lastSent = null;

const OPTIONS = { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 };
const MIN_UPDATE_INTERVAL = 4000;
const MIN_DISTANCE_METERS = 8;

function locationErrorMessage(error) {
  if (error?.code === 1) return 'Permita o acesso à localização nas configurações do navegador.';
  if (error?.code === 2) return 'Não foi possível obter o sinal do GPS. Verifique se a localização está ligada.';
  if (error?.code === 3) return 'O GPS demorou para responder. Tente novamente em um local aberto.';
  return 'Não foi possível iniciar o compartilhamento da localização.';
}

function distanceInMeters(a, b) {
  if (!a || !b) return Infinity;
  const rad = value => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function publishPosition(position, force = false) {
  if (!delivererId) return null;
  const lat = Number(position.coords.latitude);
  const lng = Number(position.coords.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) throw new Error('O aparelho retornou uma localização inválida.');
  const now = Date.now();
  if (!force && lastSent && now - lastSent.at < MIN_UPDATE_INTERVAL && distanceInMeters(lastSent, { lat, lng }) < MIN_DISTANCE_METERS) return null;
  const data = {
    lat, lng,
    location_accuracy: Number.isFinite(position.coords.accuracy) ? Math.round(position.coords.accuracy) : null,
    location_heading: Number.isFinite(position.coords.heading) ? position.coords.heading : null,
    location_speed: Number.isFinite(position.coords.speed) ? position.coords.speed : null,
    location_updated_at: new Date(position.timestamp || now).toISOString(),
    current_status: 'delivering',
  };
  await base44.entities.Deliverer.update(delivererId, data);
  lastSent = { lat, lng, at: now };
  window.dispatchEvent(new CustomEvent('peddi-deliverer-location', { detail: data }));
  return data;
}

export function startLocationTracking(delId) {
  if (watchId !== null) return Promise.resolve(lastSent);
  if (startPromise) return startPromise;
  if (!navigator.geolocation) return Promise.reject(new Error('Este aparelho não oferece suporte à localização.'));
  delivererId = delId;
  startPromise = new Promise((resolve, reject) => {
    let firstPosition = true;
    watchId = navigator.geolocation.watchPosition(async position => {
      try {
        const data = await publishPosition(position, firstPosition);
        if (firstPosition) { firstPosition = false; startPromise = null; resolve(data); }
      } catch (error) {
        if (firstPosition) { firstPosition = false; stopLocationTracking(); startPromise = null; reject(error); }
      }
    }, error => {
      const message = locationErrorMessage(error);
      window.dispatchEvent(new CustomEvent('peddi-location-error', { detail: message }));
      if (firstPosition) { firstPosition = false; stopLocationTracking(); startPromise = null; reject(new Error(message)); }
    }, OPTIONS);
  });
  return startPromise;
}

export function stopLocationTracking(delId) {
  if (watchId !== null) navigator.geolocation?.clearWatch(watchId);
  watchId = null;
  startPromise = null;
  lastSent = null;
  const id = delId || delivererId;
  delivererId = null;
  if (id) void base44.entities.Deliverer.update(id, { current_status: 'available' }).catch(() => {});
}

export function isTracking() { return watchId !== null; }
