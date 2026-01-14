import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface MapboxMapProps {
  center?: [number, number];
  zoom?: number;
  onLocationSelect?: (lat: number, lng: number) => void;
  markers?: Array<{ lat: number; lng: number; title?: string; color?: string }>;
  className?: string;
}

export const MapboxMap = ({
  center = [-38.5014, -12.9714], // Salvador, BA default
  zoom = 12,
  onLocationSelect,
  markers = [],
  className = ''
}: MapboxMapProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeMap = useCallback(async () => {
    if (!mapContainer.current) return;

    try {
      // Get Mapbox token from edge function
      const { data, error: tokenError } = await supabase.functions.invoke('get-mapbox-token');
      
      if (tokenError || !data?.token) {
        throw new Error('Falha ao carregar o mapa');
      }

      mapboxgl.accessToken = data.token;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: center,
        zoom: zoom,
        attributionControl: false
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({ visualizePitch: true }),
        'top-right'
      );

      // Add geolocation control
      map.current.addControl(
        new mapboxgl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: true,
          showUserHeading: true
        }),
        'top-right'
      );

      // Add attribution
      map.current.addControl(new mapboxgl.AttributionControl({ compact: true }));

      // Handle click for location selection
      if (onLocationSelect) {
        map.current.on('click', (e) => {
          onLocationSelect(e.lngLat.lat, e.lngLat.lng);
        });
      }

      map.current.on('load', () => {
        setLoading(false);
      });

    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Não foi possível carregar o mapa');
      setLoading(false);
    }
  }, [center, zoom, onLocationSelect]);

  // Initialize map
  useEffect(() => {
    initializeMap();

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, [initializeMap]);

  // Update center when prop changes
  useEffect(() => {
    if (map.current && center) {
      map.current.flyTo({
        center: center,
        zoom: zoom,
        duration: 1500
      });
    }
  }, [center, zoom]);

  // Update markers
  useEffect(() => {
    if (!map.current) return;

    // Remove old markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach(({ lat, lng, title, color = '#1a365d' }) => {
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.cssText = `
        width: 32px;
        height: 32px;
        background-color: ${color};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        cursor: pointer;
        transition: transform 0.2s;
      `;
      el.onmouseenter = () => { el.style.transform = 'scale(1.2)'; };
      el.onmouseleave = () => { el.style.transform = 'scale(1)'; };

      const marker = new mapboxgl.Marker(el)
        .setLngLat([lng, lat])
        .addTo(map.current!);

      if (title) {
        marker.setPopup(
          new mapboxgl.Popup({ offset: 25 })
            .setHTML(`<p class="font-medium text-sm">${title}</p>`)
        );
      }

      markersRef.current.push(marker);
    });
  }, [markers]);

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-muted rounded-2xl ${className}`}>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
};
