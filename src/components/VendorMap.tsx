import React, { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Navigation, Signal, SignalHigh, SignalLow, Crosshair } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RequestVendorDialog } from "./RequestVendorDialog";
import { ChatWindow } from "./ChatWindow";
import { usePreciseGeolocation, PreciseLocation } from "@/hooks/usePreciseGeolocation";
import { calculateVincentyDistance, formatDistance } from "@/hooks/useProximityVerification";
import { createVendorMarkerHTML } from "./VendorLocationMarker";

interface Vendor {
  id: string;
  full_name: string;
  product_category: string;
  latitude: number | null;
  longitude: number | null;
  whatsapp_number: string;
  heading?: number | null;
  speed?: number | null;
  accuracy_radius?: number | null;
  freshness?: "fresh" | "recent" | "stale" | "outdated";
  distance?: number;
}

interface VendorMapProps {
  beachId: string;
  beachName: string;
}

// Coordenadas padrão - Praia da Barra, Salvador
const DEFAULT_CENTER: [number, number] = [-38.4897, -13.0094];

// Escape HTML to prevent XSS attacks
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Determinar frescor da localização
function getFreshness(locationAgeSeconds: number | null): Vendor["freshness"] {
  if (!locationAgeSeconds || locationAgeSeconds < 60) return "fresh";
  if (locationAgeSeconds < 300) return "recent";
  if (locationAgeSeconds < 900) return "stale";
  return "outdated";
}

export function VendorMap({ beachId, beachName }: VendorMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const userAccuracyCircleRef = useRef<string | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeVendorName, setActiveVendorName] = useState<string>("");

  // Hook de geolocalização de alta precisão
  const {
    location: userLocation,
    predictedLocation,
    isWatching,
    error: locationError,
    accuracy: locationAccuracy,
    startWatching,
    stopWatching,
  } = usePreciseGeolocation();

  // Calcular distâncias com Vincenty quando userLocation ou vendors mudam
  const vendorsWithDistance = React.useMemo(() => {
    if (!userLocation) return vendors;
    
    return vendors.map((vendor) => {
      if (vendor.latitude && vendor.longitude) {
        // Usar Vincenty para precisão submétrica
        const distance = calculateVincentyDistance(
          userLocation.latitude,
          userLocation.longitude,
          vendor.latitude,
          vendor.longitude
        );
        return { ...vendor, distance };
      }
      return vendor;
    }).sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
  }, [vendors, userLocation]);

  // Buscar token do Mapbox
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-mapbox-token");
        if (error) throw error;
        setMapboxToken(data.token);
      } catch (error) {
        console.error("Erro ao buscar token do Mapbox:", error);
        toast.error("Erro ao carregar o mapa");
      }
    };
    fetchToken();
  }, []);

  // Buscar vendors com localização de alta precisão
  useEffect(() => {
    const fetchVendors = async () => {
      // Use a view de localização precisa
      const { data, error } = await supabase
        .from("vendors_location_precise")
        .select("*")
        .eq("status", "active");

      if (!error && data) {
        const mappedVendors = data.map((v: Record<string, unknown>) => ({
          id: (v.profile_id as string) || "",
          full_name: (v.full_name as string) || "",
          product_category: (v.product_category as string) || "",
          latitude: v.latitude as number | null,
          longitude: v.longitude as number | null,
          whatsapp_number: (v.whatsapp_number as string) || "",
          heading: v.heading as number | null,
          speed: v.speed as number | null,
          accuracy_radius: v.accuracy_radius as number | null,
          freshness: getFreshness(v.location_age_seconds as number | null),
        })).filter(v => v.id !== "" && v.latitude && v.longitude);
        setVendors(mappedVendors);
      }
    };

    fetchVendors();

    // Configurar realtime para atualizações de localização
    const channel = supabase
      .channel("vendors-location")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "vendors",
        },
        (payload) => {
          const updated = payload.new as Vendor;
          setVendors((prev) =>
            prev.map((v) => (v.id === updated.id ? { ...v, ...updated } : v))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [beachId]);

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: DEFAULT_CENTER,
      zoom: 14,
      pitch: 45,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.current.on("load", () => {
      setLoading(false);
    });

    return () => {
      map.current?.remove();
    };
  }, [mapboxToken]);

  // Atualizar marcadores dos vendors
  useEffect(() => {
    if (!map.current) return;

    // Remover marcadores que não existem mais
    const currentVendorIds = new Set(vendorsWithDistance.map(v => v.id));
    markersRef.current.forEach((marker, id) => {
      if (!currentVendorIds.has(id)) {
        marker.remove();
        markersRef.current.delete(id);
      }
    });

    // Adicionar/atualizar marcadores
    vendorsWithDistance.forEach((vendor) => {
      if (vendor.latitude && vendor.longitude) {
        const existingMarker = markersRef.current.get(vendor.id);
        
        if (existingMarker) {
          // Atualizar posição do marcador existente
          existingMarker.setLngLat([vendor.longitude, vendor.latitude]);
        } else {
          // Criar novo marcador
          const el = document.createElement("div");
          el.className = "vendor-marker";
          el.innerHTML = `
            <div class="w-10 h-10 bg-accent rounded-full flex items-center justify-center shadow-lg border-2 border-white cursor-pointer transform hover:scale-110 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <path d="M16 10a4 4 0 0 1-8 0"></path>
              </svg>
            </div>
          `;

          const distanceText = vendor.distance ? ` • ${formatDistance(vendor.distance)}` : '';
          // Escape vendor data to prevent XSS attacks
          const safeFullName = escapeHtml(vendor.full_name);
          const safeProductCategory = escapeHtml(vendor.product_category);
          const popup = new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(`
            <div class="p-2">
              <h3 class="font-bold text-primary">${safeFullName}</h3>
              <p class="text-sm text-muted-foreground">${safeProductCategory}${distanceText}</p>
              <button id="call-vendor-${vendor.id}" class="mt-2 w-full px-3 py-2 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 transition-colors">
                Chamar ambulante
              </button>
            </div>
          `);

          popup.on('open', () => {
            setTimeout(() => {
              const btn = document.getElementById(`call-vendor-${vendor.id}`);
              if (btn) {
                btn.addEventListener('click', () => {
                  setSelectedVendor(vendor);
                  setShowRequestDialog(true);
                });
              }
            }, 10);
          });

          const marker = new mapboxgl.Marker(el)
            .setLngLat([vendor.longitude, vendor.latitude])
            .setPopup(popup)
            .addTo(map.current!);

          markersRef.current.set(vendor.id, marker);
        }
      }
    });

    // Ajustar bounds se houver vendors
    if (vendorsWithDistance.length > 0 && vendorsWithDistance.some((v) => v.latitude && v.longitude)) {
      const bounds = new mapboxgl.LngLatBounds();
      vendorsWithDistance.forEach((v) => {
        if (v.latitude && v.longitude) {
          bounds.extend([v.longitude, v.latitude]);
        }
      });
      if (userLocation) {
        bounds.extend([userLocation.longitude, userLocation.latitude]);
      }
      map.current?.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [vendorsWithDistance, userLocation]);

  // Atualizar marcador do usuário com precisão visual
  useEffect(() => {
    if (!map.current || !userLocation) return;

    // Remover marcador anterior
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    // Remover círculo de precisão anterior
    if (userAccuracyCircleRef.current && map.current.getLayer(userAccuracyCircleRef.current)) {
      map.current.removeLayer(userAccuracyCircleRef.current);
      map.current.removeSource(userAccuracyCircleRef.current);
    }

    // Criar círculo de precisão
    const circleId = `user-accuracy-${Date.now()}`;
    userAccuracyCircleRef.current = circleId;

    if (userLocation.accuracy > 0) {
      map.current.addSource(circleId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [userLocation.longitude, userLocation.latitude]
          },
          properties: {}
        }
      });

      map.current.addLayer({
        id: circleId,
        type: 'circle',
        source: circleId,
        paint: {
          'circle-radius': {
            stops: [
              [0, 0],
              [20, userLocation.accuracy * 3] // Scale with zoom
            ],
            base: 2
          },
          'circle-color': 'rgba(59, 130, 246, 0.2)',
          'circle-stroke-width': 1,
          'circle-stroke-color': 'rgba(59, 130, 246, 0.5)'
        }
      });
    }

    // Criar marcador do usuário com direção
    const el = document.createElement("div");
    const hasHeading = userLocation.heading !== null;
    el.innerHTML = `
      <div class="relative">
        <div class="w-8 h-8 bg-blue-500 rounded-full border-3 border-white shadow-lg flex items-center justify-center"
             style="${hasHeading ? `transform: rotate(${userLocation.heading}deg);` : ''}">
          ${hasHeading ? `
            <div class="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 
                        border-l-[5px] border-l-transparent 
                        border-r-[5px] border-r-transparent 
                        border-b-[8px] border-b-white"></div>
          ` : ''}
          <div class="w-3 h-3 bg-white rounded-full"></div>
        </div>
      </div>
    `;

    userMarkerRef.current = new mapboxgl.Marker(el)
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map.current);

    // Fly to on first location
    map.current.flyTo({ 
      center: [userLocation.longitude, userLocation.latitude], 
      zoom: 16 
    });

    // Cleanup function
    return () => {
      if (map.current && userAccuracyCircleRef.current) {
        if (map.current.getLayer(userAccuracyCircleRef.current)) {
          map.current.removeLayer(userAccuracyCircleRef.current);
        }
        if (map.current.getSource(userAccuracyCircleRef.current)) {
          map.current.removeSource(userAccuracyCircleRef.current);
        }
      }
    };
  }, [userLocation]);

  // Handlers para geolocalização
  const handleStartWatching = useCallback(() => {
    startWatching();
    toast.success("Localização de alta precisão ativada!");
  }, [startWatching]);

  const handleStopWatching = useCallback(() => {
    stopWatching();
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    toast.info("Localização desativada");
  }, [stopWatching]);

  const handleOrderSuccess = (orderId: string) => {
    if (selectedVendor) {
      setActiveOrderId(orderId);
      setActiveVendorName(selectedVendor.full_name);
    }
  };

  // Obter ícone de precisão
  const getAccuracyIcon = () => {
    if (!locationAccuracy) return null;
    switch (locationAccuracy) {
      case "high": return <SignalHigh className="h-4 w-4 text-green-600" />;
      case "medium": return <Signal className="h-4 w-4 text-yellow-600" />;
      case "low": return <SignalLow className="h-4 w-4 text-red-600" />;
    }
  };

  if (!mapboxToken) {
    return (
      <div className="h-[400px] rounded-xl bg-muted flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show chat if there's an active order
  if (activeOrderId) {
    return (
      <div className="h-[500px]">
        <ChatWindow
          orderId={activeOrderId}
          userType="client"
          otherPartyName={activeVendorName}
          onClose={() => setActiveOrderId(null)}
        />
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={mapContainer}
        className="h-[400px] rounded-xl overflow-hidden shadow-lg"
      />
      
      {loading && (
        <div className="absolute inset-0 bg-muted/50 flex items-center justify-center rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Controles de localização */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <Button
          onClick={isWatching ? handleStopWatching : handleStartWatching}
          size="sm"
          variant={isWatching ? "destructive" : "default"}
          className={isWatching ? "shadow-lg" : "bg-white text-primary hover:bg-gray-100 shadow-lg"}
        >
          {isWatching ? (
            <Crosshair className="h-4 w-4 mr-2 animate-pulse" />
          ) : (
            <Navigation className="h-4 w-4 mr-2" />
          )}
          {isWatching ? "Parar GPS" : "Ativar GPS"}
        </Button>

        {/* Indicador de precisão */}
        {isWatching && userLocation && (
          <Badge 
            variant="secondary" 
            className="bg-white/90 shadow flex items-center gap-1"
          >
            {getAccuracyIcon()}
            <span>±{Math.round(userLocation.accuracy)}m</span>
            {userLocation.speed && userLocation.speed > 0.5 && (
              <span className="ml-1">• {(userLocation.speed * 3.6).toFixed(1)} km/h</span>
            )}
          </Badge>
        )}
      </div>

      {/* Erro de localização */}
      {locationError && (
        <div className="absolute top-4 right-4 z-10 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm max-w-xs">
          {locationError}
        </div>
      )}

      {/* Legenda e distâncias */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg max-w-xs">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full" />
            <span>Ativo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded-full" />
            <span>Recente</span>
          </div>
          {userLocation && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full animate-pulse" />
              <span>Você</span>
            </div>
          )}
        </div>
        
        {/* Lista de distâncias com precisão Vincenty */}
        {userLocation && vendorsWithDistance.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-1">
            <p className="text-xs font-semibold text-muted-foreground">Praieiros próximos (Vincenty):</p>
            {vendorsWithDistance.slice(0, 3).map((vendor) => (
              <div key={vendor.id} className="flex justify-between items-center text-xs">
                <span className="truncate max-w-[100px]">{vendor.full_name}</span>
                <div className="flex items-center gap-1">
                  {vendor.freshness === "fresh" && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                  <span className="font-medium text-primary">
                    {vendor.distance ? formatDistance(vendor.distance) : "—"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {vendors.length === 0 && !loading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center rounded-xl">
          <div className="text-center p-4">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">
              Nenhum Praieiro com localização ativa no momento
            </p>
          </div>
        </div>
      )}

      {/* Request Vendor Dialog */}
      {selectedVendor && (
        <RequestVendorDialog
          open={showRequestDialog}
          onOpenChange={setShowRequestDialog}
          vendor={selectedVendor}
          onSuccess={handleOrderSuccess}
        />
      )}
    </div>
  );
}
