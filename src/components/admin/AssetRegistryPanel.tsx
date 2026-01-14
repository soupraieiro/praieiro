import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Coins, 
  Shell, 
  Send, 
  Plus, 
  RefreshCw, 
  Loader2,
  ArrowRightLeft,
  Hash,
  User,
  Package
} from 'lucide-react';
import { formatSatoshiToast, extractErrorCode } from '@/lib/satoshiErrorDictionary';

interface Asset {
  asset_id: string;
  entity_id: string;
  asset_type: string;
  asset_name: string;
  asset_description: string | null;
  total_supply: number | null;
  circulating_supply: number | null;
  decimals: number | null;
  owner_id: string | null;
  status: string | null;
  contract_address: string | null;
  token_id: string | null;
  token_standard: string | null;
  blockchain: string | null;
  checksum: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

const ASSET_TYPES = [
  { value: 'SERVICE_TOKEN', label: 'Token de Serviço', icon: Coins },
  { value: 'CONCHA', label: 'Concha', icon: Shell },
  { value: 'NFT', label: 'NFT', icon: Package }
];

export function AssetRegistryPanel() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [mintDialogOpen, setMintDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [mintAmount, setMintAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferTo, setTransferTo] = useState('');
  const [newAssetType, setNewAssetType] = useState('SERVICE_TOKEN');
  const [newAssetName, setNewAssetName] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('asset_registry')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets((data || []) as Asset[]);
    } catch (error) {
      console.error('Error loading assets:', error);
      const { title, description } = formatSatoshiToast(error);
      toast.error(title, { description });
    } finally {
      setLoading(false);
    }
  };

  const handleMint = async () => {
    if (!mintAmount || !newAssetName) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      setProcessing(true);
      
      const entityId = crypto.randomUUID();
      const amount = parseFloat(mintAmount);
      
      // Create asset
      const { error: assetError } = await supabase
        .from('asset_registry')
        .insert({
          entity_id: entityId,
          asset_type: newAssetType,
          asset_name: newAssetName,
          total_supply: amount,
          circulating_supply: amount,
          decimals: 8,
          status: 'active',
          blockchain: 'satoshi_protocol',
          token_standard: 'SPT-1'
        });

      if (assetError) throw assetError;

      // Log event (simplified - ledger_events may have different schema)
      console.log('[SATOSHI] Mint event logged:', { entityId, amount, asset_type: newAssetType });

      toast.success('Ativo Criado', {
        description: `${amount} ${newAssetName} mintados com sucesso.`
      });

      setMintDialogOpen(false);
      setMintAmount('');
      setNewAssetName('');
      await loadAssets();
    } catch (error) {
      console.error('Error minting asset:', error);
      const { title, description } = formatSatoshiToast(error);
      toast.error(title, { description });
    } finally {
      setProcessing(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedAsset || !transferAmount || !transferTo) {
      toast.error('Preencha todos os campos');
      return;
    }

    try {
      setProcessing(true);
      
      const amount = parseFloat(transferAmount);
      const currentSupply = selectedAsset.circulating_supply || 0;
      
      if (amount > currentSupply) {
        toast.error('Saldo Insuficiente', {
          description: `Supply disponível: ${currentSupply}`
        });
        return;
      }

      // Update supply
      const { error: updateError } = await supabase
        .from('asset_registry')
        .update({
          circulating_supply: currentSupply - amount
        })
        .eq('asset_id', selectedAsset.asset_id);

      if (updateError) throw updateError;

      // Log transfer event
      console.log('[SATOSHI] Transfer event logged:', { asset_id: selectedAsset.asset_id, to: transferTo, amount });

      toast.success('Transferência Registrada', {
        description: `${amount} ${selectedAsset.asset_name} transferidos.`
      });

      setTransferDialogOpen(false);
      setTransferAmount('');
      setTransferTo('');
      setSelectedAsset(null);
      await loadAssets();
    } catch (error) {
      console.error('Error transferring asset:', error);
      const { title, description } = formatSatoshiToast(error);
      toast.error(title, { description });
    } finally {
      setProcessing(false);
    }
  };

  const getAssetIcon = (type: string) => {
    const assetType = ASSET_TYPES.find(t => t.value === type);
    const Icon = assetType?.icon || Coins;
    return <Icon className="h-5 w-5" />;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500">Ativo</Badge>;
      case 'frozen':
        return <Badge variant="secondary">Congelado</Badge>;
      case 'burned':
        return <Badge variant="destructive">Queimado</Badge>;
      default:
        return <Badge variant="outline">Indefinido</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shell className="h-5 w-5 text-primary" />
              Registro de Ativos (Conchas)
            </CardTitle>
            <CardDescription>
              Tokenização e gestão de ativos do Protocolo Satoshi
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={loadAssets}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Atualizar
            </Button>
            <Dialog open={mintDialogOpen} onOpenChange={setMintDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Mint
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar Novo Ativo</DialogTitle>
                  <DialogDescription>
                    Mint de tokens para o Protocolo Satoshi
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Tipo de Ativo</Label>
                    <Select value={newAssetType} onValueChange={setNewAssetType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Nome do Ativo</Label>
                    <Input
                      value={newAssetName}
                      onChange={e => setNewAssetName(e.target.value)}
                      placeholder="Ex: Concha Genesis"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Quantidade (Supply)</Label>
                    <Input
                      type="number"
                      value={mintAmount}
                      onChange={e => setMintAmount(e.target.value)}
                      placeholder="1000000"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setMintDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleMint} disabled={processing}>
                    {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Plus className="h-4 w-4 mr-1" />}
                    Mintar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="SERVICE_TOKEN">Tokens</TabsTrigger>
            <TabsTrigger value="CONCHA">Conchas</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {assets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum ativo registrado. Clique em "Mint" para criar.
              </div>
            ) : (
              assets.map(asset => (
                <AssetCard 
                  key={asset.asset_id} 
                  asset={asset}
                  onTransfer={() => {
                    setSelectedAsset(asset);
                    setTransferDialogOpen(true);
                  }}
                  getAssetIcon={getAssetIcon}
                  getStatusBadge={getStatusBadge}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="SERVICE_TOKEN" className="space-y-3">
            {assets.filter(a => a.asset_type === 'SERVICE_TOKEN').map(asset => (
              <AssetCard 
                key={asset.asset_id} 
                asset={asset}
                onTransfer={() => {
                  setSelectedAsset(asset);
                  setTransferDialogOpen(true);
                }}
                getAssetIcon={getAssetIcon}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </TabsContent>

          <TabsContent value="CONCHA" className="space-y-3">
            {assets.filter(a => a.asset_type === 'CONCHA').map(asset => (
              <AssetCard 
                key={asset.asset_id} 
                asset={asset}
                onTransfer={() => {
                  setSelectedAsset(asset);
                  setTransferDialogOpen(true);
                }}
                getAssetIcon={getAssetIcon}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </TabsContent>
        </Tabs>

        {/* Transfer Dialog */}
        <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Transferir {selectedAsset?.asset_name}</DialogTitle>
              <DialogDescription>
                Supply Disponível: {selectedAsset?.circulating_supply?.toLocaleString() || 0}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Destinatário (User ID ou Wallet)</Label>
                <Input
                  value={transferTo}
                  onChange={e => setTransferTo(e.target.value)}
                  placeholder="UUID do destinatário"
                />
              </div>
              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  value={transferAmount}
                  onChange={e => setTransferAmount(e.target.value)}
                  placeholder="100"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleTransfer} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                Transferir
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

interface AssetCardProps {
  asset: Asset;
  onTransfer: () => void;
  getAssetIcon: (type: string) => JSX.Element;
  getStatusBadge: (status: string | null) => JSX.Element;
}

function AssetCard({ asset, onTransfer, getAssetIcon, getStatusBadge }: AssetCardProps) {
  return (
    <div className="p-4 bg-muted/30 rounded-lg border border-border/50 hover:border-primary/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {getAssetIcon(asset.asset_type)}
          </div>
          <div>
            <div className="font-medium flex items-center gap-2">
              {asset.asset_name}
              {getStatusBadge(asset.status)}
            </div>
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Hash className="h-3 w-3" />
              {asset.entity_id.slice(0, 8)}...
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold">
            {(asset.circulating_supply || 0).toLocaleString()}
          </div>
          <div className="text-xs text-muted-foreground">
            de {(asset.total_supply || 0).toLocaleString()} total
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          Standard: {asset.token_standard || 'N/A'} | Chain: {asset.blockchain || 'N/A'}
        </div>
        <Button variant="ghost" size="sm" onClick={onTransfer}>
          <ArrowRightLeft className="h-4 w-4 mr-1" />
          Transferir
        </Button>
      </div>
    </div>
  );
}
