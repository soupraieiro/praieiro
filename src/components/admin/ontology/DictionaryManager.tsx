import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import type { OperationEntry } from '@/hooks/useOntologyDictionary';

const CATEGORIES = [
  'FINANCEIRO',
  'USUÁRIO',
  'SISTEMA',
  'GOVERNANÇA',
  'COMUNICAÇÃO',
  'RECOMPENSA',
  'SEGURANÇA'
];

interface DictionaryManagerProps {
  dictionary: OperationEntry[];
  onAdd: (opKey: string, category: string, description: string, parentKey?: string) => Promise<unknown>;
  onUpdate: (id: string, updates: Partial<Pick<OperationEntry, 'description' | 'category' | 'is_active'>>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DictionaryManager({
  dictionary,
  onAdd,
  onUpdate,
  onDelete
}: DictionaryManagerProps) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<OperationEntry | null>(null);
  const [loading, setLoading] = useState(false);

  // Form states
  const [newOpKey, setNewOpKey] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const filteredDictionary = dictionary.filter(entry => {
    const matchesSearch = 
      entry.op_key.toLowerCase().includes(search.toLowerCase()) ||
      entry.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || entry.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = async () => {
    if (!newOpKey || !newCategory || !newDescription) return;
    
    setLoading(true);
    try {
      await onAdd(newOpKey, newCategory, newDescription);
      setNewOpKey('');
      setNewCategory('');
      setNewDescription('');
      setAddDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editEntry) return;
    
    setLoading(true);
    try {
      await onUpdate(editEntry.id, {
        description: editEntry.description,
        category: editEntry.category,
        is_active: editEntry.is_active
      });
      setEditEntry(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover esta operação?')) return;
    
    setLoading(true);
    try {
      await onDelete(id);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'FINANCEIRO': 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
      'USUÁRIO': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      'SISTEMA': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
      'GOVERNANÇA': 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      'COMUNICAÇÃO': 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
      'RECOMPENSA': 'bg-pink-500/10 text-pink-500 border-pink-500/20',
      'SEGURANÇA': 'bg-red-500/10 text-red-500 border-red-500/20'
    };
    return colors[category] || 'bg-muted';
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-1 gap-2 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por chave ou descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Operação
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Nova Operação</DialogTitle>
              <DialogDescription>
                Defina uma nova chave de operação no dicionário do sistema
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="opKey">Chave da Operação</Label>
                <Input
                  id="opKey"
                  placeholder="Ex: FIN:CASHBACK:PROMO"
                  value={newOpKey}
                  onChange={(e) => setNewOpKey(e.target.value.toUpperCase())}
                />
                <p className="text-xs text-muted-foreground">
                  Formato: CATEGORIA:AÇÃO:CONTEXTO
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o propósito desta operação..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAdd} disabled={loading || !newOpKey || !newCategory || !newDescription}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chave</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDictionary.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma operação encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredDictionary.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm font-medium">
                    {entry.op_key}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getCategoryColor(entry.category)}>
                      {entry.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={entry.is_active ? 'default' : 'secondary'}>
                      {entry.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditEntry(entry)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(entry.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editEntry} onOpenChange={(open) => !open && setEditEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Operação</DialogTitle>
            <DialogDescription>
              {editEntry?.op_key}
            </DialogDescription>
          </DialogHeader>
          {editEntry && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select
                  value={editEntry.category}
                  onValueChange={(v) => setEditEntry({ ...editEntry, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editEntry.description}
                  onChange={(e) => setEditEntry({ ...editEntry, description: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Ativo</Label>
                <Switch
                  checked={editEntry.is_active}
                  onCheckedChange={(v) => setEditEntry({ ...editEntry, is_active: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditEntry(null)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdate} disabled={loading}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
