/**
 * PAINEL DE CATÁLOGOS DE ANÚNCIOS
 * Gerenciamento de empresas que pagam por ads na Fase 0
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Twitter, Eye, MousePointer, Trash2, ExternalLink } from 'lucide-react';

interface AdCatalog {
  id: string;
  company_name: string;
  company_logo_url: string | null;
  catalog_url: string | null;
  twitter_handle: string | null;
  contact_email: string | null;
  monthly_fee: number;
  is_active: boolean;
  impressions_count: number;
  clicks_count: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
}

export default function AdCatalogPanel() {
  const [catalogs, setCatalogs] = useState<AdCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCatalog, setNewCatalog] = useState({
    company_name: '',
    company_logo_url: '',
    catalog_url: '',
    twitter_handle: '',
    contact_email: '',
    monthly_fee: 0
  });

  useEffect(() => {
    loadCatalogs();
  }, []);

  const loadCatalogs = async () => {
    try {
      const { data, error } = await supabase
        .from('ad_catalogs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCatalogs(data || []);
    } catch (error) {
      console.error('Erro ao carregar catálogos:', error);
    } finally {
      setLoading(false);
    }
  };

  const createCatalog = async () => {
    try {
      const { error } = await supabase.from('ad_catalogs').insert({
        company_name: newCatalog.company_name,
        company_logo_url: newCatalog.company_logo_url || null,
        catalog_url: newCatalog.catalog_url || null,
        twitter_handle: newCatalog.twitter_handle || null,
        contact_email: newCatalog.contact_email || null,
        monthly_fee: newCatalog.monthly_fee,
        is_active: true,
        start_date: new Date().toISOString().split('T')[0]
      });

      if (error) throw error;

      toast.success('Catálogo criado com sucesso');
      setIsDialogOpen(false);
      setNewCatalog({
        company_name: '',
        company_logo_url: '',
        catalog_url: '',
        twitter_handle: '',
        contact_email: '',
        monthly_fee: 0
      });
      loadCatalogs();
    } catch (error: any) {
      toast.error('Erro ao criar catálogo', { description: error.message });
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('ad_catalogs')
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      toast.success(currentStatus ? 'Anúncio desativado' : 'Anúncio ativado');
      loadCatalogs();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const deleteCatalog = async (id: string) => {
    try {
      const { error } = await supabase.from('ad_catalogs').delete().eq('id', id);
      if (error) throw error;
      toast.success('Catálogo removido');
      loadCatalogs();
    } catch (error) {
      toast.error('Erro ao remover catálogo');
    }
  };

  const totalRevenue = catalogs
    .filter(c => c.is_active)
    .reduce((sum, c) => sum + (c.monthly_fee || 0), 0);

  const totalImpressions = catalogs.reduce((sum, c) => sum + (c.impressions_count || 0), 0);
  const totalClicks = catalogs.reduce((sum, c) => sum + (c.clicks_count || 0), 0);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Receita Mensal (Ads)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              R$ {totalRevenue.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" /> Impressões Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <MousePointer className="w-4 h-4" /> Cliques Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              CTR: {totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 0}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Catálogos */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Catálogos de Anúncios (Fase 0)</CardTitle>
            <CardDescription>Empresas que pagam por visibilidade no marketplace</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" /> Novo Anunciante
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Novo Anunciante</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Nome da Empresa *</Label>
                  <Input
                    value={newCatalog.company_name}
                    onChange={(e) => setNewCatalog(prev => ({ ...prev, company_name: e.target.value }))}
                    placeholder="Ex: Coca-Cola Brasil"
                  />
                </div>
                <div>
                  <Label>URL do Logo</Label>
                  <Input
                    value={newCatalog.company_logo_url}
                    onChange={(e) => setNewCatalog(prev => ({ ...prev, company_logo_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>URL do Catálogo</Label>
                  <Input
                    value={newCatalog.catalog_url}
                    onChange={(e) => setNewCatalog(prev => ({ ...prev, catalog_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label>Twitter/X Handle</Label>
                  <Input
                    value={newCatalog.twitter_handle}
                    onChange={(e) => setNewCatalog(prev => ({ ...prev, twitter_handle: e.target.value }))}
                    placeholder="@empresa"
                  />
                </div>
                <div>
                  <Label>E-mail de Contato</Label>
                  <Input
                    type="email"
                    value={newCatalog.contact_email}
                    onChange={(e) => setNewCatalog(prev => ({ ...prev, contact_email: e.target.value }))}
                    placeholder="ads@empresa.com"
                  />
                </div>
                <div>
                  <Label>Taxa Mensal (R$)</Label>
                  <Input
                    type="number"
                    value={newCatalog.monthly_fee}
                    onChange={(e) => setNewCatalog(prev => ({ ...prev, monthly_fee: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                  />
                </div>
                <Button onClick={createCatalog} className="w-full" disabled={!newCatalog.company_name}>
                  Criar Catálogo
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>Twitter</TableHead>
                <TableHead>Taxa/Mês</TableHead>
                <TableHead>Impressões</TableHead>
                <TableHead>Cliques</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {catalogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum anunciante cadastrado
                  </TableCell>
                </TableRow>
              ) : (
                catalogs.map((catalog) => (
                  <TableRow key={catalog.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {catalog.company_logo_url && (
                          <img 
                            src={catalog.company_logo_url} 
                            alt={catalog.company_name}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        {catalog.company_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {catalog.twitter_handle && (
                        <a 
                          href={`https://twitter.com/${catalog.twitter_handle.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-400 hover:underline"
                        >
                          <Twitter className="w-4 h-4" />
                          {catalog.twitter_handle}
                        </a>
                      )}
                    </TableCell>
                    <TableCell>R$ {(catalog.monthly_fee || 0).toFixed(2)}</TableCell>
                    <TableCell>{catalog.impressions_count?.toLocaleString()}</TableCell>
                    <TableCell>{catalog.clicks_count?.toLocaleString()}</TableCell>
                    <TableCell>
                      <Switch
                        checked={catalog.is_active}
                        onCheckedChange={() => toggleActive(catalog.id, catalog.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {catalog.catalog_url && (
                          <Button variant="ghost" size="icon" asChild>
                            <a href={catalog.catalog_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => deleteCatalog(catalog.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
