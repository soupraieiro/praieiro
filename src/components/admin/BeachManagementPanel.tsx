import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  Waves, 
  MapPin, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Plus,
  Trash2,
  Edit,
  Navigation
} from "lucide-react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

interface Beach {
  id: string;
  beach_name: string;
  city: string | null;
  is_active: boolean | null;
  created_at: string | null;
  vendor_count: number;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
}

export function BeachManagementPanel() {
  const [loading, setLoading] = useState(true);
  const [beaches, setBeaches] = useState<Beach[]>([]);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newBeach, setNewBeach] = useState({ name: "", city: "Salvador", lat: 0, lng: 0 });
  const [mapToken, setMapToken] = useState<string | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    loadBeaches();
    fetchMapToken();
  }, []);

  const fetchMapToken = async () => {
    try {
      const { data } = await supabase.functions.invoke("get-mapbox-token");
      if (data?.token) {
        setMapToken(data.token);
      }
    } catch (error) {
      console.error("Error fetching map token:", error);
    }
  };

  useEffect(() => {
    if (showAddDialog && mapToken && mapContainerRef.current && !mapRef.current) {
      mapboxgl.accessToken = mapToken;
      
      mapRef.current = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-38.5, -13.0], // Salvador center
        zoom: 11,
      });

      mapRef.current.on("click", (e) => {
        const { lng, lat } = e.lngLat;
        setNewBeach(prev => ({ ...prev, lat, lng }));

        if (markerRef.current) {
          markerRef.current.remove();
        }

        markerRef.current = new mapboxgl.Marker({ color: "#f97316" })
          .setLngLat([lng, lat])
          .addTo(mapRef.current!);
      });
    }

    return () => {
      if (!showAddDialog && mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, [showAddDialog, mapToken]);

  const loadBeaches = async () => {
    try {
      setLoading(true);
      
      const { data: beachesData, error: beachesError } = await supabase
        .from("beaches")
        .select("*")
        .order("beach_name");

      if (beachesError) throw beachesError;

      const { data: linksData } = await supabase
        .from("vendor_beach_link")
        .select("beach_id");

      const vendorCountMap: Record<string, number> = {};
      linksData?.forEach((link) => {
        if (link.beach_id) {
          vendorCountMap[link.beach_id] = (vendorCountMap[link.beach_id] || 0) + 1;
        }
      });

      const beachesWithCount = beachesData?.map((beach) => ({
        ...beach,
        vendor_count: vendorCountMap[beach.id] || 0,
      })) || [];

      setBeaches(beachesWithCount);
    } catch (error) {
      console.error("Error loading beaches:", error);
      toast.error("Erro ao carregar praias");
    } finally {
      setLoading(false);
    }
  };

  const toggleBeachStatus = async (beach: Beach) => {
    setUpdatingId(beach.id);
    try {
      const newStatus = !beach.is_active;

      const { error } = await supabase
        .from("beaches")
        .update({ is_active: newStatus })
        .eq("id", beach.id);

      if (error) throw error;

      await supabase.rpc("log_security_event", {
        p_event_type: "admin_beach_status_change",
        p_identifier: beach.id,
        p_details: {
          beach_name: beach.beach_name,
          previous_status: beach.is_active,
          new_status: newStatus,
        },
      });

      setBeaches((prev) =>
        prev.map((b) =>
          b.id === beach.id ? { ...b, is_active: newStatus } : b
        )
      );

      toast.success(
        newStatus
          ? `${beach.beach_name} ativada com sucesso`
          : `${beach.beach_name} desativada`
      );
    } catch (error) {
      console.error("Error updating beach status:", error);
      toast.error("Erro ao atualizar status da praia");
    } finally {
      setUpdatingId(null);
    }
  };

  const addBeach = async () => {
    if (!newBeach.name.trim()) {
      toast.error("Nome da praia é obrigatório");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("beaches")
        .insert({
          beach_name: newBeach.name,
          city: newBeach.city,
          latitude: newBeach.lat || null,
          longitude: newBeach.lng || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setBeaches(prev => [...prev, { ...data, vendor_count: 0 }]);
      setShowAddDialog(false);
      setNewBeach({ name: "", city: "Salvador", lat: 0, lng: 0 });
      toast.success("Praia adicionada com sucesso!");
    } catch (error) {
      console.error("Error adding beach:", error);
      toast.error("Erro ao adicionar praia");
    }
  };

  const deleteBeach = async (beach: Beach) => {
    if (beach.vendor_count > 0) {
      toast.error("Não é possível excluir praia com vendedores vinculados");
      return;
    }

    try {
      const { error } = await supabase
        .from("beaches")
        .delete()
        .eq("id", beach.id);

      if (error) throw error;

      setBeaches(prev => prev.filter(b => b.id !== beach.id));
      toast.success("Praia removida");
    } catch (error) {
      console.error("Error deleting beach:", error);
      toast.error("Erro ao remover praia");
    }
  };

  const activateAllBeaches = async () => {
    try {
      const inactiveBeaches = beaches.filter((b) => !b.is_active);
      
      if (inactiveBeaches.length === 0) {
        toast.info("Todas as praias já estão ativas");
        return;
      }

      const { error } = await supabase
        .from("beaches")
        .update({ is_active: true })
        .eq("is_active", false);

      if (error) throw error;

      setBeaches((prev) =>
        prev.map((b) => ({ ...b, is_active: true }))
      );

      toast.success(`${inactiveBeaches.length} praias ativadas`);
    } catch (error) {
      console.error("Error activating all beaches:", error);
      toast.error("Erro ao ativar praias");
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const activeCount = beaches.filter((b) => b.is_active).length;
  const inactiveCount = beaches.filter((b) => !b.is_active).length;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Waves className="h-5 w-5" />
                Gestão de Praias
              </CardTitle>
              <CardDescription>
                Ative ou desative praias e adicione novas pelo mapa
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="default" size="sm" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Praia
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={activateAllBeaches}
                disabled={inactiveCount === 0}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Ativar Todas
              </Button>
              <Button variant="outline" size="sm" onClick={loadBeaches}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
            </div>
          </div>

          <div className="flex gap-4 mt-4">
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              {activeCount} ativas
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <XCircle className="h-3 w-3" />
              {inactiveCount} inativas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {beaches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Waves className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-muted-foreground">
                Nenhuma praia cadastrada
              </p>
              <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Praia
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Praia</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Coordenadas</TableHead>
                    <TableHead>Vendedores</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {beaches.map((beach) => (
                    <TableRow key={beach.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          {beach.beach_name}
                        </div>
                      </TableCell>
                      <TableCell>{beach.city || "Salvador"}</TableCell>
                      <TableCell>
                        {beach.latitude && beach.longitude ? (
                          <Badge variant="outline" className="font-mono text-xs">
                            <Navigation className="h-3 w-3 mr-1" />
                            {beach.latitude.toFixed(4)}, {beach.longitude.toFixed(4)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">Não definidas</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{beach.vendor_count} vendedores</Badge>
                      </TableCell>
                      <TableCell>{formatDate(beach.created_at)}</TableCell>
                      <TableCell>
                        {beach.is_active ? (
                          <Badge className="bg-green-500 gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Ativa
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="gap-1">
                            <XCircle className="h-3 w-3" />
                            Inativa
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Switch
                            checked={beach.is_active || false}
                            onCheckedChange={() => toggleBeachStatus(beach)}
                            disabled={updatingId === beach.id}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => deleteBeach(beach)}
                            disabled={beach.vendor_count > 0}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Beach Dialog with Map */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar Nova Praia
            </DialogTitle>
            <DialogDescription>
              Clique no mapa para definir a localização da praia
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Nome da Praia</label>
                <Input
                  value={newBeach.name}
                  onChange={(e) => setNewBeach(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Praia do Flamengo"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Cidade</label>
                <Input
                  value={newBeach.city}
                  onChange={(e) => setNewBeach(prev => ({ ...prev, city: e.target.value }))}
                  placeholder="Salvador"
                />
              </div>
            </div>

            {newBeach.lat !== 0 && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Navigation className="h-4 w-4" />
                Coordenadas selecionadas: {newBeach.lat.toFixed(6)}, {newBeach.lng.toFixed(6)}
              </div>
            )}

            <div 
              ref={mapContainerRef} 
              className="h-[300px] rounded-lg border overflow-hidden"
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={addBeach} disabled={!newBeach.name.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Praia
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
