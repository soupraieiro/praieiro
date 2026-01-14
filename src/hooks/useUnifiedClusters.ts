/**
 * ORQUESTRADOR DE CLUSTERS UNIFICADOS
 * Coordena todos os clusters para operação sincronizada
 */

import { useCallback } from 'react';
import { useGeoCluster, type UnifiedPin, type GeoSearchResult } from './useGeoCluster';
import { useDataCluster } from './useDataCluster';
import { useWhatsAppCluster } from './useWhatsAppCluster';

interface OrderParams {
  vendorPhone: string;
  vendorName: string;
  vendorId?: string;
  items?: Array<{ name: string; quantity: number; price: number }>;
}

interface UseUnifiedClustersResult {
  // Cluster de Georreferenciamento
  searchLocation: (query: string) => Promise<GeoSearchResult[]>;
  selectLocation: (result: GeoSearchResult) => Promise<void>;
  
  // Cluster de Dados (exposto para uso direto se necessário)
  trackEvent: ReturnType<typeof useDataCluster>['trackEvent'];
  identifyUser: ReturnType<typeof useDataCluster>['identifyUser'];
  
  // Integração de Ação Final
  initiateOrder: (pin: UnifiedPin, order: OrderParams) => Promise<void>;
  shareLocation: (pin: UnifiedPin, phone: string, recipientName: string) => Promise<void>;
  
  // Estado
  isSearching: boolean;
  lastResults: GeoSearchResult[];
  error: string | null;
}

export function useUnifiedClusters(): UseUnifiedClustersResult {
  const geoCluster = useGeoCluster();
  const dataCluster = useDataCluster();
  const whatsappCluster = useWhatsAppCluster();

  /**
   * Busca unificada com tracking automático
   */
  const searchLocation = useCallback(async (query: string): Promise<GeoSearchResult[]> => {
    const results = await geoCluster.search(query);
    
    // Track automático no cluster de dados
    await dataCluster.trackSearch(query, results.length);
    
    return results;
  }, [geoCluster, dataCluster]);

  /**
   * Seleção de local com tracking completo
   */
  const selectLocation = useCallback(async (result: GeoSearchResult) => {
    // Track seleção
    await dataCluster.trackSearch('', 1, result.pin);
    await dataCluster.trackMapInteraction('click', result.pin);
  }, [dataCluster]);

  /**
   * Inicia pedido - compila todas as informações e abre WhatsApp
   */
  const initiateOrder = useCallback(async (pin: UnifiedPin, order: OrderParams) => {
    try {
      const link = await whatsappCluster.generateOrderLink({
        pin,
        vendorPhone: order.vendorPhone,
        vendorName: order.vendorName,
        vendorId: order.vendorId,
        orderItems: order.items
      });

      // Track evento de pedido
      await dataCluster.trackEvent({
        eventName: 'order_initiated',
        category: 'order',
        properties: {
          vendor_id: order.vendorId,
          vendor_name: order.vendorName,
          items_count: order.items?.length || 0,
          total_amount: order.items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0
        },
        pin,
        flowStep: 'order_to_whatsapp',
        success: true
      });

      // Abrir WhatsApp
      whatsappCluster.openWhatsApp(link);
    } catch (error) {
      await dataCluster.trackError(
        error instanceof Error ? error.message : 'Erro ao iniciar pedido',
        { pin_id: pin.id, vendor_id: order.vendorId }
      );
      throw error;
    }
  }, [whatsappCluster, dataCluster]);

  /**
   * Compartilha localização via WhatsApp
   */
  const shareLocation = useCallback(async (
    pin: UnifiedPin, 
    phone: string, 
    recipientName: string
  ) => {
    try {
      const link = await whatsappCluster.generateContactLink({
        pin,
        phone,
        recipientName
      });

      await dataCluster.trackEvent({
        eventName: 'location_shared',
        category: 'whatsapp',
        properties: { recipient_name: recipientName },
        pin,
        flowStep: 'share_location',
        success: true
      });

      whatsappCluster.openWhatsApp(link);
    } catch (error) {
      await dataCluster.trackError(
        error instanceof Error ? error.message : 'Erro ao compartilhar localização',
        { pin_id: pin.id }
      );
      throw error;
    }
  }, [whatsappCluster, dataCluster]);

  return {
    // Geo
    searchLocation,
    selectLocation,
    
    // Data
    trackEvent: dataCluster.trackEvent,
    identifyUser: dataCluster.identifyUser,
    
    // Action
    initiateOrder,
    shareLocation,
    
    // State
    isSearching: geoCluster.isSearching,
    lastResults: geoCluster.lastResults,
    error: geoCluster.error
  };
}

// Re-export types
export type { UnifiedPin, GeoSearchResult };
