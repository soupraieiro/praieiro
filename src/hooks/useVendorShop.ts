import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface VendorShop {
  id: string;
  profile_id: string;
  shop_name: string;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  latitude: number | null;
  longitude: number | null;
  is_open: boolean;
  rating: number;
  total_sales: number;
  status: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  profile?: {
    full_name: string;
    profile_photo_url: string | null;
  };
  distance?: number;
}

export interface ShopProduct {
  id: string;
  shop_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  created_at: string;
}

interface UseVendorShopResult {
  shops: VendorShop[];
  myShop: VendorShop | null;
  loading: boolean;
  error: string | null;
  createShop: (shopName: string, description?: string) => Promise<VendorShop | null>;
  updateShop: (updates: Partial<VendorShop>) => Promise<boolean>;
  fetchNearbyShops: (lat: number, lng: number, radiusKm?: number) => Promise<VendorShop[]>;
  getShopProducts: (shopId: string) => Promise<ShopProduct[]>;
}

export function useVendorShop(): UseVendorShopResult {
  const [shops, setShops] = useState<VendorShop[]>([]);
  const [myShop, setMyShop] = useState<VendorShop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch user's own shop
  const fetchMyShop = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      const { data: shop, error: shopError } = await supabase
        .from("vendor_shops")
        .select("*")
        .eq("profile_id", profile.id)
        .maybeSingle();

      if (shopError) throw shopError;
      setMyShop(shop);
    } catch (err) {
      console.error("Error fetching my shop:", err);
    }
  }, []);

  // Create a new shop for vendor
  const createShop = useCallback(async (shopName: string, description?: string): Promise<VendorShop | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", user.id)
        .single();

      if (!profile) throw new Error("Perfil não encontrado");

      const { data: shop, error: shopError } = await supabase
        .from("vendor_shops")
        .insert({
          profile_id: profile.id,
          shop_name: shopName,
          description: description || null,
          status: "active", // Auto-activate for now
        })
        .select()
        .single();

      if (shopError) throw shopError;

      // Log event to ledger
      await supabase.rpc("log_ledger_event", {
        p_event_type: "vendor_shop_created",
        p_event_data: { shop_id: shop.id, shop_name: shopName },
        p_actor_id: profile.id,
        p_actor_type: "vendor"
      });

      setMyShop(shop);
      toast({
        title: "Loja criada!",
        description: "Sua loja foi criada com sucesso.",
      });
      return shop;
    } catch (err: any) {
      console.error("Error creating shop:", err);
      setError(err.message);
      toast({
        title: "Erro",
        description: err.message || "Não foi possível criar a loja.",
        variant: "destructive",
      });
      return null;
    }
  }, [toast]);

  // Update shop
  const updateShop = useCallback(async (updates: Partial<VendorShop>): Promise<boolean> => {
    if (!myShop) return false;

    try {
      const { error: updateError } = await supabase
        .from("vendor_shops")
        .update(updates)
        .eq("id", myShop.id);

      if (updateError) throw updateError;

      setMyShop({ ...myShop, ...updates });
      toast({
        title: "Loja atualizada!",
        description: "Suas alterações foram salvas.",
      });
      return true;
    } catch (err: any) {
      console.error("Error updating shop:", err);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a loja.",
        variant: "destructive",
      });
      return false;
    }
  }, [myShop, toast]);

  // Calculate distance between two points
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Fetch nearby shops sorted by distance
  const fetchNearbyShops = useCallback(async (
    lat: number, 
    lng: number, 
    radiusKm: number = 10
  ): Promise<VendorShop[]> => {
    try {
      setLoading(true);
      
      const { data: shopsData, error: shopsError } = await supabase
        .from("vendor_shops")
        .select(`
          *,
          profiles!vendor_shops_profile_id_fkey (
            full_name,
            profile_photo_url
          )
        `)
        .eq("status", "active")
        .eq("is_open", true);

      if (shopsError) throw shopsError;

      // Calculate distance and filter/sort
      const shopsWithDistance = (shopsData || [])
        .map(shop => {
          const distance = shop.latitude && shop.longitude
            ? calculateDistance(lat, lng, shop.latitude, shop.longitude)
            : Infinity;
          return {
            ...shop,
            profile: shop.profiles,
            distance
          } as VendorShop;
        })
        .filter(shop => shop.distance <= radiusKm)
        .sort((a, b) => (a.distance || 0) - (b.distance || 0));

      setShops(shopsWithDistance);
      return shopsWithDistance;
    } catch (err: any) {
      console.error("Error fetching nearby shops:", err);
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  // Get products for a specific shop
  const getShopProducts = useCallback(async (shopId: string): Promise<ShopProduct[]> => {
    try {
      const { data, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("shop_id", shopId)
        .eq("is_available", true)
        .order("created_at", { ascending: false });

      if (productsError) throw productsError;
      return data || [];
    } catch (err) {
      console.error("Error fetching products:", err);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchMyShop();
    setLoading(false);
  }, [fetchMyShop]);

  return {
    shops,
    myShop,
    loading,
    error,
    createShop,
    updateShop,
    fetchNearbyShops,
    getShopProducts,
  };
}
