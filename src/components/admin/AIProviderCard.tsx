import { AIProvider, getActiveCapabilities } from '@/types/aiProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare,
  Eye,
  Image,
  Mic,
  Wrench,
  Video,
  Code,
  MoreVertical,
  Star,
  Pencil,
  Trash2,
  Zap,
  Clock,
  Timer,
} from 'lucide-react';

const CAPABILITY_ICONS: Record<string, React.ReactNode> = {
  text: <MessageSquare className="h-4 w-4" />,
  vision: <Eye className="h-4 w-4" />,
  image: <Image className="h-4 w-4" />,
  audio: <Mic className="h-4 w-4" />,
  tools: <Wrench className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
};

const LATENCY_ICONS: Record<string, React.ReactNode> = {
  low: <Zap className="h-4 w-4 text-green-500" />,
  medium: <Clock className="h-4 w-4 text-yellow-500" />,
  high: <Timer className="h-4 w-4 text-red-500" />,
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-700 border-green-500/30',
  inactive: 'bg-muted text-muted-foreground',
  deprecated: 'bg-red-500/20 text-red-700 border-red-500/30',
  testing: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
};

interface AIProviderCardProps {
  provider: AIProvider;
  onEdit: (provider: AIProvider) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, newStatus: 'active' | 'inactive') => void;
  onSetDefault: (id: string) => void;
}

export function AIProviderCard({
  provider,
  onEdit,
  onDelete,
  onToggleStatus,
  onSetDefault,
}: AIProviderCardProps) {
  const activeCapabilities = getActiveCapabilities(provider);
  const isActive = provider.status === 'active';

  return (
    <Card className={`relative transition-all ${provider.is_default ? 'ring-2 ring-primary' : ''}`}>
      {provider.is_default && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground rounded-full p-1">
          <Star className="h-4 w-4 fill-current" />
        </div>
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {provider.provider_name}
              {provider.legacy_format && (
                <Badge variant="outline" className="text-xs">
                  Migrado
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{provider.provider_company}</p>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              checked={isActive}
              onCheckedChange={(checked) =>
                onToggleStatus(provider.id, checked ? 'active' : 'inactive')
              }
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(provider)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </DropdownMenuItem>
                {!provider.is_default && (
                  <DropdownMenuItem onClick={() => onSetDefault(provider.id)}>
                    <Star className="h-4 w-4 mr-2" />
                    Definir como Padrão
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onDelete(provider.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status e Latência */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={STATUS_COLORS[provider.status]}>
            {provider.status.charAt(0).toUpperCase() + provider.status.slice(1)}
          </Badge>
          <Badge variant="outline" className="flex items-center gap-1">
            {LATENCY_ICONS[provider.latency_profile]}
            Latência {provider.latency_profile}
          </Badge>
          {provider.max_tokens && (
            <Badge variant="secondary" className="text-xs">
              {(provider.max_tokens / 1000).toFixed(0)}K tokens
            </Badge>
          )}
        </div>

        {/* Capacidades */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Capacidades
          </p>
          <div className="flex flex-wrap gap-2">
            {activeCapabilities.length > 0 ? (
              activeCapabilities.map((cap) => (
                <Badge key={cap} variant="secondary" className="flex items-center gap-1">
                  {CAPABILITY_ICONS[cap]}
                  {cap.charAt(0).toUpperCase() + cap.slice(1)}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Nenhuma capacidade definida</span>
            )}
          </div>
        </div>

        {/* Output Types */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            Tipos de Output
          </p>
          <div className="flex flex-wrap gap-1">
            {provider.output_types.map((type) => (
              <Badge key={type} variant="outline" className="text-xs">
                {type}
              </Badge>
            ))}
          </div>
        </div>

        {/* API Key Reference */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground font-mono">
            {provider.api_key_ref}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
