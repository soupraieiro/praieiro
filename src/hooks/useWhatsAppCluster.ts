/**
 * INTEGRAÇÃO DE AÇÃO FINAL - WHATSAPP
 * Compila dados das APIs de georreferenciamento para gerar
 * link direto do WhatsApp com mensagem pronta
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { UnifiedPin } from './useGeoCluster';
import { useDataCluster } from './useDataCluster';

interface WhatsAppMessage {
  vendorName: string;
  vendorPhone: string;
  locationName: string;
  mapLink: string;
  orderDetails?: string;
  customMessage?: string;
}

interface GeneratedLink {
  id?: string;
  whatsappUrl: string;
  mapLink: string;
  message: string;
  pin: UnifiedPin;
}

interface UseWhatsAppClusterResult {
  generateOrderLink: (params: {
    pin: UnifiedPin;
    vendorPhone: string;
    vendorName: string;
    vendorId?: string;
    orderItems?: Array<{ name: string; quantity: number; price: number }>;
  }) => Promise<GeneratedLink>;
  generateContactLink: (params: {
    pin: UnifiedPin;
    phone: string;
    recipientName: string;
  }) => Promise<GeneratedLink>;
  trackLinkClick: (linkId: string) => Promise<void>;
  openWhatsApp: (link: GeneratedLink) => void;
}

export function useWhatsAppCluster(): UseWhatsAppClusterResult {
  const dataCluster = useDataCluster();

  /**
   * Gera link de pedido com todas as informações compiladas
   */
  const generateOrderLink = useCallback(async (params: {
    pin: UnifiedPin;
    vendorPhone: string;
    vendorName: string;
    vendorId?: string;
    orderItems?: Array<{ name: string; quantity: number; price: number }>;
  }): Promise<GeneratedLink> => {
    const { pin, vendorPhone, vendorName, vendorId, orderItems } = params;

    // Gerar link do mapa (formato universal que abre em qualquer app)
    const mapLink = `https://maps.google.com/?q=${pin.latitude},${pin.longitude}`;

    // Formatar itens do pedido se existirem
    let orderText = '';
    let totalAmount = 0;
    if (orderItems && orderItems.length > 0) {
      orderText = '\n\n📦 *Meu pedido:*\n';
      orderItems.forEach(item => {
        orderText += `• ${item.quantity}x ${item.name} - R$ ${(item.price * item.quantity).toFixed(2)}\n`;
        totalAmount += item.price * item.quantity;
      });
      orderText += `\n💰 *Total: R$ ${totalAmount.toFixed(2)}*`;
    }

    // Montar mensagem completa
    const message = `🏖️ *Olá ${vendorName}!*

Encontrei você pelo Praieiro e gostaria de fazer um pedido.

📍 *Estou em:* ${pin.name}
🗺️ *Ver no mapa:* ${mapLink}${orderText}

Pode me atender? 🙏`;

    // Formatar número para WhatsApp (remover caracteres especiais)
    const formattedPhone = vendorPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    // Salvar no banco para tracking
    const { data: savedLink } = await supabase
      .from('whatsapp_links')
      .insert({
        vendor_id: vendorId,
        pin_id: pin.id,
        message_template: message,
        map_link: mapLink,
        generated_link: whatsappUrl
      })
      .select()
      .single();

    // Track no cluster de dados
    await dataCluster.trackWhatsAppAction(pin, vendorId, 'generate');

    return {
      id: savedLink?.id,
      whatsappUrl,
      mapLink,
      message,
      pin
    };
  }, [dataCluster]);

  /**
   * Gera link de contato simples
   */
  const generateContactLink = useCallback(async (params: {
    pin: UnifiedPin;
    phone: string;
    recipientName: string;
  }): Promise<GeneratedLink> => {
    const { pin, phone, recipientName } = params;

    const mapLink = `https://maps.google.com/?q=${pin.latitude},${pin.longitude}`;

    const message = `🏖️ Olá ${recipientName}!

Encontrei este local pelo Praieiro:

📍 *${pin.name}*
${pin.address ? `📮 ${pin.address}` : ''}
🗺️ Ver no mapa: ${mapLink}

Vamos nos encontrar lá?`;

    const formattedPhone = phone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    const { data: savedLink } = await supabase
      .from('whatsapp_links')
      .insert({
        pin_id: pin.id,
        message_template: message,
        map_link: mapLink,
        generated_link: whatsappUrl
      })
      .select()
      .single();

    await dataCluster.trackWhatsAppAction(pin, undefined, 'generate');

    return {
      id: savedLink?.id,
      whatsappUrl,
      mapLink,
      message,
      pin
    };
  }, [dataCluster]);

  /**
   * Registra clique no link para métricas de conversão
   */
  const trackLinkClick = useCallback(async (linkId: string) => {
    await supabase
      .from('whatsapp_links')
      .update({
        clicked: true,
        clicked_at: new Date().toISOString()
      })
      .eq('id', linkId);
  }, []);

  /**
   * Abre WhatsApp e registra o clique
   */
  const openWhatsApp = useCallback((link: GeneratedLink) => {
    // Track antes de abrir
    if (link.id) {
      trackLinkClick(link.id);
    }
    
    dataCluster.trackWhatsAppAction(link.pin, undefined, 'click');

    // Abrir WhatsApp
    window.open(link.whatsappUrl, '_blank');
  }, [dataCluster, trackLinkClick]);

  return {
    generateOrderLink,
    generateContactLink,
    trackLinkClick,
    openWhatsApp
  };
}
