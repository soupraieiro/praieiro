import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { VendorCardNew } from "./VendorCardNew";
import { VendorStorePage } from "./VendorStorePage";
import { AlertCircle, Clock } from "lucide-react";

interface Vendor {
  id: string;
  full_name: string;
  product_category: string;
  product_description: string | null;
  profile_photo_url: string | null;
}

interface VendorListProps {
  beachId: string;
  beachName: string;
  isActive: boolean;
}

export function VendorList({ beachId, beachName, isActive }: VendorListProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchVendors() {
      setLoading(true);
      
      // Query vendors with profile data (respecting RLS)
      const { data, error } = await supabase
        .from("vendors")
        .select(`
          profile_id,
          product_category,
          product_description,
          profiles!inner(full_name, profile_photo_url)
        `)
        .eq("status", "active");

      if (!error && data) {
        const vendorData = data.map(v => ({
          id: v.profile_id || "",
          full_name: (v.profiles as any)?.full_name || "",
          product_category: v.product_category || "",
          product_description: v.product_description,
          profile_photo_url: (v.profiles as any)?.profile_photo_url
        })).filter((v): v is Vendor => v.id !== "");
        setVendors(vendorData);
      }
      
      setLoading(false);
    }

    if (isActive) {
      fetchVendors();
    } else {
      setLoading(false);
    }
  }, [beachId, isActive]);

  // Show store page if vendor is selected
  if (selectedVendorId) {
    return (
      <VendorStorePage
        vendorId={selectedVendorId}
        onClose={() => setSelectedVendorId(null)}
      />
    );
  }

  // Praia inativa
  if (!isActive) {
    return (
      <div className="rounded-xl border border-border bg-secondary/50 p-8 text-center">
        <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-xl font-bold text-foreground">Em breve!</h3>
        <p className="mt-2 text-muted-foreground">
          Em breve estaremos atuando na praia {beachName}.
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Fique atento para novidades!
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-80 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    );
  }

  if (vendors.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-secondary/50 p-8 text-center">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h3 className="text-xl font-bold text-foreground">
          Nenhum ambulante cadastrado
        </h3>
        <p className="mt-2 text-muted-foreground">
          Ainda não temos ambulantes cadastrados na praia {beachName}.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {vendors.map((vendor) => (
        <VendorCardNew
          key={vendor.id}
          vendor={vendor}
          beachId={beachId}
          onOpenStore={setSelectedVendorId}
        />
      ))}
    </div>
  );
}
