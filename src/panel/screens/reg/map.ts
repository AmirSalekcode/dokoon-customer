/**
 * Placeholder-map coordinates for the registration pin. The shared MapPicker draws an illustrated map in
 * % of its box until the Neshan/Balad MapProvider is approved (D-51); we always store coordinates.
 */
export interface LatLng {
  lat: number;
  lng: number;
}
/** Map center: Shahreza (launch city), same as the customer app. */
export const CENTER: LatLng = { lat: 32.0089, lng: 51.8668 };
/** The illustrated map spans ±SPAN/2 degrees around the center. */
const SPAN = 0.08;

const clamp = (v: number) => Math.min(100, Math.max(0, v));
export const toPct = (p: LatLng, c: LatLng = CENTER) => ({
  x: clamp(50 + ((p.lng - c.lng) / SPAN) * 100),
  y: clamp(50 - ((p.lat - c.lat) / SPAN) * 100),
});
export const fromPct = (x: number, y: number, c: LatLng = CENTER): LatLng => ({
  lat: +(c.lat + ((50 - y) / 100) * SPAN).toFixed(6),
  lng: +(c.lng + ((x - 50) / 100) * SPAN).toFixed(6),
});

export function currentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { timeout: 10000, maximumAge: 60000 },
    );
  });
}
