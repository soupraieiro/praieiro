import { OutputType, OUTPUT_RENDERERS } from '@/types/aiProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Image as ImageIcon, Play, FileText, Code, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import DOMPurify from 'dompurify';

interface AIOutputRendererProps {
  outputType: OutputType;
  content: string | null;
  loading?: boolean;
  error?: string | null;
}

/**
 * Renderizador dinâmico de outputs de IA
 * Identifica o outputType e renderiza o container apropriado
 */
export function AIOutputRenderer({ outputType, content, loading, error }: AIOutputRendererProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const renderer = OUTPUT_RENDERERS[outputType];

  if (loading) {
    return <OutputSkeleton outputType={outputType} />;
  }

  if (error) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-6 text-center">
          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-destructive">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!content) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <p className="text-sm">Aguardando resposta da IA...</p>
        </CardContent>
      </Card>
    );
  }

  switch (renderer.component) {
    case 'image':
      return (
        <div className={renderer.containerClass}>
          {!imageLoaded && (
            <Skeleton className="w-full h-full absolute inset-0" />
          )}
          <img
            src={content}
            alt="AI Generated Image"
            className={`w-full h-full object-cover ${imageLoaded ? '' : 'invisible'}`}
            onLoad={() => setImageLoaded(true)}
            onError={() => setImageLoaded(true)}
          />
        </div>
      );

    case 'audio':
      return (
        <div className={renderer.containerClass}>
          <audio controls className="w-full">
            <source src={content} type="audio/mpeg" />
            <source src={content} type="audio/wav" />
            Seu navegador não suporta o elemento de áudio.
          </audio>
        </div>
      );

    case 'video':
      return (
        <div className={renderer.containerClass}>
          <video controls className="w-full h-full">
            <source src={content} type="video/mp4" />
            <source src={content} type="video/webm" />
            Seu navegador não suporta o elemento de vídeo.
          </video>
        </div>
      );

    case 'json':
      try {
        const parsed = JSON.parse(content);
        return (
          <pre className={renderer.containerClass}>
            <code>{JSON.stringify(parsed, null, 2)}</code>
          </pre>
        );
      } catch {
        return (
          <pre className={renderer.containerClass}>
            <code>{content}</code>
          </pre>
        );
      }

    case 'markdown':
      return (
        <div 
          className={renderer.containerClass}
          dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
        />
      );

    case 'text':
    default:
      return (
        <div className={renderer.containerClass}>
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      );
  }
}

// Skeleton para cada tipo de output
function OutputSkeleton({ outputType }: { outputType: OutputType }) {
  const renderer = OUTPUT_RENDERERS[outputType];

  switch (renderer.component) {
    case 'image':
      return (
        <div className="aspect-square bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center space-y-2">
            <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto animate-pulse" />
            <p className="text-xs text-muted-foreground">Gerando imagem...</p>
          </div>
        </div>
      );

    case 'audio':
      return (
        <div className="h-12 bg-muted rounded-lg flex items-center justify-center gap-2">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-1 bg-muted-foreground/50 rounded animate-pulse"
                style={{
                  height: `${Math.random() * 20 + 10}px`,
                  animationDelay: `${i * 0.1}s`,
                }}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground ml-2">Processando áudio...</p>
        </div>
      );

    case 'video':
      return (
        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
          <div className="text-center space-y-2">
            <Play className="h-8 w-8 text-muted-foreground mx-auto animate-pulse" />
            <p className="text-xs text-muted-foreground">Gerando vídeo...</p>
          </div>
        </div>
      );

    case 'json':
      return (
        <div className="font-mono bg-muted p-4 rounded-lg space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      );

    default:
      return (
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      );
  }
}

// Parser simples de Markdown com sanitização XSS
function parseMarkdown(text: string): string {
  const html = text
    // Headers
    .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>')
    // Bold
    .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*)\*/gim, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/gim, '<pre class="bg-muted p-2 rounded my-2 overflow-auto"><code>$1</code></pre>')
    // Inline code
    .replace(/`(.*?)`/gim, '<code class="bg-muted px-1 rounded">$1</code>')
    // Line breaks
    .replace(/\n/gim, '<br />');
  
  // Sanitize HTML to prevent XSS attacks
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'strong', 'em', 'pre', 'code', 'br'],
    ALLOWED_ATTR: ['class'],
  });
}

// Preview component para mostrar todos os tipos de output
export function AIOutputPreview() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText className="h-4 w-4" />
            Texto
          </div>
          <AIOutputRenderer 
            outputType="text" 
            content="Este é um exemplo de resposta em texto da IA." 
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Code className="h-4 w-4" />
            JSON
          </div>
          <AIOutputRenderer 
            outputType="json" 
            content='{"status": "success", "data": {"message": "Exemplo"}}' 
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <ImageIcon className="h-4 w-4" />
            Imagem (Loading)
          </div>
          <AIOutputRenderer 
            outputType="image" 
            content={null} 
            loading 
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Play className="h-4 w-4" />
            Vídeo (Loading)
          </div>
          <AIOutputRenderer 
            outputType="video" 
            content={null} 
            loading 
          />
        </CardContent>
      </Card>
    </div>
  );
}
