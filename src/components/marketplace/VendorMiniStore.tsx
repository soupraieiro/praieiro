import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useVendorShop, VendorShop, ShopProduct } from "@/hooks/useVendorShop";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Store, Plus, Edit2, Trash2, Package, MapPin,
  Loader2, Save, Image as ImageIcon
} from "lucide-react";

interface VendorMiniStoreProps {
  profileId: string;
}

export function VendorMiniStore({ profileId }: VendorMiniStoreProps) {
  const { myShop, createShop, updateShop } = useVendorShop();
  const { toast } = useToast();
  
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [shopDialogOpen, setShopDialogOpen] = useState(false);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
  const [saving, setSaving] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  // Shop form state
  const [shopForm, setShopForm] = useState({
    shop_name: "",
    description: "",
    logo_url: "",
  });

  // Product form state
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    is_available: true,
  });

  useEffect(() => {
    if (myShop) {
      setShopForm({
        shop_name: myShop.shop_name,
        description: myShop.description || "",
        logo_url: myShop.logo_url || "",
      });
      fetchProducts();
    }
    setLoading(false);
  }, [myShop]);

  const fetchProducts = async () => {
    if (!myShop) return;
    
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("shop_id", myShop.id)
      .order("created_at", { ascending: false });

    if (!error) {
      setProducts(data || []);
    }
  };

  const handleCreateShop = async () => {
    if (!shopForm.shop_name.trim()) {
      toast({
        title: "Nome obrigatório",
        description: "Informe o nome da sua loja.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const result = await createShop(shopForm.shop_name, shopForm.description);
    setSaving(false);

    if (result) {
      setShopDialogOpen(false);
    }
  };

  const handleUpdateShop = async () => {
    if (!myShop) return;

    setSaving(true);
    const success = await updateShop({
      shop_name: shopForm.shop_name,
      description: shopForm.description || null,
      logo_url: shopForm.logo_url || null,
    });
    setSaving(false);

    if (success) {
      setShopDialogOpen(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Erro",
        description: "Geolocalização não suportada.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const success = await updateShop({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (success) {
          toast({
            title: "Localização atualizada!",
            description: "Clientes próximos poderão te encontrar.",
          });
        }
        setUpdatingLocation(false);
      },
      (error) => {
        toast({
          title: "Erro",
          description: "Não foi possível obter sua localização.",
          variant: "destructive",
        });
        setUpdatingLocation(false);
      },
      { enableHighAccuracy: true }
    );
  };

  const handleToggleOpen = async () => {
    if (!myShop) return;
    await updateShop({ is_open: !myShop.is_open });
  };

  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      image_url: "",
      is_available: true,
    });
    setEditingProduct(null);
  };

  const openEditProduct = (product: ShopProduct) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      image_url: product.image_url || "",
      is_available: product.is_available,
    });
    setProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!myShop) return;
    if (!productForm.name.trim() || !productForm.price) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome e preço do produto.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const productData = {
        shop_id: myShop.id,
        vendor_id: profileId,
        name: productForm.name.trim(),
        description: productForm.description.trim() || null,
        price: parseFloat(productForm.price),
        image_url: productForm.image_url.trim() || null,
        is_available: productForm.is_available,
      };

      if (editingProduct) {
        const { error } = await supabase
          .from("products")
          .update(productData)
          .eq("id", editingProduct.id);

        if (error) throw error;
        toast({ title: "Produto atualizado!" });
      } else {
        const { error } = await supabase
          .from("products")
          .insert(productData);

        if (error) throw error;

        // Log to ledger
        await supabase.rpc("log_ledger_event", {
          p_event_type: "product_created",
          p_event_data: { shop_id: myShop.id, product_name: productForm.name },
          p_actor_id: profileId,
          p_actor_type: "vendor"
        });

        toast({ title: "Produto adicionado!" });
      }

      fetchProducts();
      setProductDialogOpen(false);
      resetProductForm();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível salvar o produto.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Excluir este produto?")) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId);

    if (!error) {
      toast({ title: "Produto removido" });
      fetchProducts();
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // No shop yet - show creation prompt
  if (!myShop) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Minha Loja
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Store className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">Você ainda não tem uma loja</h3>
          <p className="text-muted-foreground mb-4">
            Crie sua loja para começar a vender no marketplace
          </p>

          <Dialog open={shopDialogOpen} onOpenChange={setShopDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Criar Minha Loja
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Loja</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="shop_name">Nome da Loja *</Label>
                  <Input
                    id="shop_name"
                    value={shopForm.shop_name}
                    onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })}
                    placeholder="Ex: Barraca do João"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={shopForm.description}
                    onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })}
                    placeholder="Descreva o que você vende..."
                    rows={3}
                  />
                </div>
                <Button
                  onClick={handleCreateShop}
                  disabled={saving}
                  className="w-full gap-2"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
                  Criar Loja
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Shop exists - show management
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Store className="h-5 w-5" />
          {myShop.shop_name}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant={myShop.is_open ? "default" : "secondary"}>
            {myShop.is_open ? "Aberta" : "Fechada"}
          </Badge>
          <Switch
            checked={myShop.is_open}
            onCheckedChange={handleToggleOpen}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Shop Actions */}
        <div className="flex flex-wrap gap-2">
          <Dialog open={shopDialogOpen} onOpenChange={setShopDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Edit2 className="h-4 w-4" />
                Editar Loja
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Loja</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome da Loja</Label>
                  <Input
                    value={shopForm.shop_name}
                    onChange={(e) => setShopForm({ ...shopForm, shop_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea
                    value={shopForm.description}
                    onChange={(e) => setShopForm({ ...shopForm, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>URL do Logo</Label>
                  <Input
                    value={shopForm.logo_url}
                    onChange={(e) => setShopForm({ ...shopForm, logo_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button onClick={handleUpdateShop} disabled={saving} className="w-full gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleUpdateLocation}
            disabled={updatingLocation}
          >
            {updatingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MapPin className="h-4 w-4" />
            )}
            Atualizar Localização
          </Button>
        </div>

        {/* Products Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos ({products.length})
            </h3>
            <Dialog open={productDialogOpen} onOpenChange={(open) => {
              setProductDialogOpen(open);
              if (!open) resetProductForm();
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingProduct ? "Editar Produto" : "Novo Produto"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Nome *</Label>
                    <Input
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="Nome do produto"
                    />
                  </div>
                  <div>
                    <Label>Descrição</Label>
                    <Textarea
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      rows={2}
                    />
                  </div>
                  <div>
                    <Label>Preço (Conchas) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label>URL da Imagem</Label>
                    <Input
                      value={productForm.image_url}
                      onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Disponível</Label>
                    <Switch
                      checked={productForm.is_available}
                      onCheckedChange={(checked) => setProductForm({ ...productForm, is_available: checked })}
                    />
                  </div>
                  <Button onClick={handleSaveProduct} disabled={saving} className="w-full gap-2">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Products List */}
          {products.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>Nenhum produto cadastrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30"
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-12 h-12 rounded object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{product.name}</p>
                    <p className="text-sm text-primary font-bold">
                      🐚 {product.price.toFixed(2)}
                    </p>
                  </div>
                  <Badge variant={product.is_available ? "default" : "secondary"}>
                    {product.is_available ? "Ativo" : "Inativo"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditProduct(product)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDeleteProduct(product.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
