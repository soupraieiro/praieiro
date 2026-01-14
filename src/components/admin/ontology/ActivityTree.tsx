import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, ChevronDown, Folder, FileText } from 'lucide-react';
import type { OperationEntry } from '@/hooks/useOntologyDictionary';

interface ActivityTreeProps {
  categoryTree: Record<string, OperationEntry[]>;
}

// Parsear op_key para estrutura hierárquica
function parseOpKey(opKey: string): { level1: string; level2: string; level3: string } {
  const parts = opKey.split(':');
  return {
    level1: parts[0] || '',
    level2: parts[1] || '',
    level3: parts[2] || ''
  };
}

// Agrupar por níveis
function groupByLevels(entries: OperationEntry[]): Record<string, Record<string, OperationEntry[]>> {
  const result: Record<string, Record<string, OperationEntry[]>> = {};
  
  entries.forEach(entry => {
    const { level1, level2 } = parseOpKey(entry.op_key);
    
    if (!result[level1]) {
      result[level1] = {};
    }
    if (!result[level1][level2]) {
      result[level1][level2] = [];
    }
    result[level1][level2].push(entry);
  });
  
  return result;
}

export function ActivityTree({ categoryTree }: ActivityTreeProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedLevel1, setExpandedLevel1] = useState<Set<string>>(new Set());
  const [expandedLevel2, setExpandedLevel2] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  const toggleLevel1 = (key: string) => {
    setExpandedLevel1(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const toggleLevel2 = (key: string) => {
    setExpandedLevel2(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'FINANCEIRO': 'text-emerald-500',
      'USUÁRIO': 'text-blue-500',
      'SISTEMA': 'text-purple-500',
      'GOVERNANÇA': 'text-amber-500',
      'COMUNICAÇÃO': 'text-cyan-500',
      'RECOMPENSA': 'text-pink-500',
      'SEGURANÇA': 'text-red-500'
    };
    return colors[category] || 'text-muted-foreground';
  };

  return (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground mb-4">
        Estrutura hierárquica: <code className="bg-muted px-1 rounded">CATEGORIA:AÇÃO:CONTEXTO</code>
      </div>
      
      <div className="space-y-2">
        {Object.entries(categoryTree).map(([category, entries]) => {
          const levelGroups = groupByLevels(entries);
          const isCategoryExpanded = expandedCategories.has(category);
          
          return (
            <Card key={category} className="overflow-hidden">
              <Collapsible open={isCategoryExpanded} onOpenChange={() => toggleCategory(category)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start h-auto py-3 px-4 rounded-none"
                  >
                    {isCategoryExpanded ? (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    ) : (
                      <ChevronRight className="h-4 w-4 mr-2" />
                    )}
                    <Folder className={`h-4 w-4 mr-2 ${getCategoryColor(category)}`} />
                    <span className="font-semibold">{category}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {entries.length} operações
                    </Badge>
                  </Button>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pl-8 pr-4 pb-4">
                    {Object.entries(levelGroups).map(([level1, level2Groups]) => {
                      const level1Key = `${category}-${level1}`;
                      const isLevel1Expanded = expandedLevel1.has(level1Key);
                      
                      return (
                        <div key={level1Key} className="border-l-2 border-muted ml-2">
                          <Collapsible open={isLevel1Expanded} onOpenChange={() => toggleLevel1(level1Key)}>
                            <CollapsibleTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-auto py-2 px-3"
                              >
                                {isLevel1Expanded ? (
                                  <ChevronDown className="h-3 w-3 mr-2" />
                                ) : (
                                  <ChevronRight className="h-3 w-3 mr-2" />
                                )}
                                <span className="font-mono text-sm font-medium">{level1}</span>
                                <Badge variant="outline" className="ml-auto text-xs">
                                  Nível 1
                                </Badge>
                              </Button>
                            </CollapsibleTrigger>
                            
                            <CollapsibleContent>
                              <div className="ml-6 space-y-1">
                                {Object.entries(level2Groups).map(([level2, operations]) => {
                                  const level2Key = `${level1Key}-${level2}`;
                                  const isLevel2Expanded = expandedLevel2.has(level2Key);
                                  
                                  return (
                                    <div key={level2Key} className="border-l-2 border-muted/50">
                                      <Collapsible open={isLevel2Expanded} onOpenChange={() => toggleLevel2(level2Key)}>
                                        <CollapsibleTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start h-auto py-1.5 px-2"
                                          >
                                            {isLevel2Expanded ? (
                                              <ChevronDown className="h-3 w-3 mr-2" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3 mr-2" />
                                            )}
                                            <span className="font-mono text-sm">{level2}</span>
                                            <Badge variant="outline" className="ml-auto text-xs">
                                              Nível 2 ({operations.length})
                                            </Badge>
                                          </Button>
                                        </CollapsibleTrigger>
                                        
                                        <CollapsibleContent>
                                          <div className="ml-6 py-2 space-y-2">
                                            {operations.map(op => {
                                              const { level3 } = parseOpKey(op.op_key);
                                              return (
                                                <div
                                                  key={op.id}
                                                  className="flex items-start gap-2 py-1 px-2 rounded-md hover:bg-muted/50 transition-colors"
                                                >
                                                  <FileText className="h-3 w-3 mt-1 text-muted-foreground" />
                                                  <div className="flex-1 min-w-0">
                                                    <div className="font-mono text-xs font-medium">
                                                      {level3 || '(raiz)'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate">
                                                      {op.description}
                                                    </div>
                                                  </div>
                                                  <Badge
                                                    variant={op.is_active ? 'default' : 'secondary'}
                                                    className="text-xs shrink-0"
                                                  >
                                                    Nível 3
                                                  </Badge>
                                                </div>
                                              );
                                            })}
                                          </div>
                                        </CollapsibleContent>
                                      </Collapsible>
                                    </div>
                                  );
                                })}
                              </div>
                            </CollapsibleContent>
                          </Collapsible>
                        </div>
                      );
                    })}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
