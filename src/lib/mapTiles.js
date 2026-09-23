const mapboxToken = String(import.meta.env.VITE_MAPS_PROVIDER_KEY || '').trim();

export const mapTileLayer = mapboxToken
  ? {
      url: `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${encodeURIComponent(mapboxToken)}`,
      attribution: '&copy; Mapbox &copy; OpenStreetMap',
      tileSize: 512,
      zoomOffset: -1,
      maxZoom: 20,
    }
  : {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    };
