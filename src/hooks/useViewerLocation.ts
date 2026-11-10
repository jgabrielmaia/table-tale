import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_RADIUS_KM, RADIUS_OPTIONS_KM, type GeoPoint } from '@/features/games/shelves';

const RADIUS_KEY = 'tt.games.radiusKm';
const CITY_KEY = 'tt.games.city';

type LocationStatus = 'idle' | 'locating' | 'browser' | 'city' | 'denied' | 'unavailable';

function readRadius(): number {
  const stored = Number(localStorage.getItem(RADIUS_KEY));
  return (RADIUS_OPTIONS_KM as readonly number[]).includes(stored) ? stored : DEFAULT_RADIUS_KM;
}

/**
 * Where the viewer is, for the games list. The browser position is kept in memory only;
 * the radius and a manually chosen city are remembered on this device.
 */
export function useViewerLocation() {
  const [radiusKm, setRadiusState] = useState(readRadius);
  const [cityKey, setCityKey] = useState<string | null>(() => localStorage.getItem(CITY_KEY));
  const [browserPoint, setBrowserPoint] = useState<GeoPoint | null>(null);
  const [status, setStatus] = useState<LocationStatus>(() => (localStorage.getItem(CITY_KEY) ? 'city' : 'idle'));

  const locate = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBrowserPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setCityKey(null);
        localStorage.removeItem(CITY_KEY);
        setStatus('browser');
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable'),
      { enableHighAccuracy: false, maximumAge: 10 * 60_000, timeout: 15_000 },
    );
  }, []);

  // Ask once on arrival, unless the viewer already picked a city on this device.
  useEffect(() => {
    if (!localStorage.getItem(CITY_KEY)) locate();
  }, [locate]);

  const chooseCity = (key: string) => {
    setCityKey(key);
    setBrowserPoint(null);
    localStorage.setItem(CITY_KEY, key);
    setStatus('city');
  };

  const setRadius = (km: number) => {
    setRadiusState(km);
    localStorage.setItem(RADIUS_KEY, String(km));
  };

  return {
    status,
    /** Set only while the browser position is the source. */
    browserPoint: status === 'browser' ? browserPoint : null,
    /** Set only while a chosen city is the source; resolved to a point against the known cities. */
    cityKey: status === 'city' ? cityKey : null,
    radiusKm,
    setRadius,
    locate,
    chooseCity,
  };
}
