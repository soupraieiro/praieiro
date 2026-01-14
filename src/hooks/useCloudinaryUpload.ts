import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UploadResult {
  success: boolean;
  publicId?: string;
  url?: string;
  expiresAt?: string;
  error?: string;
}

interface UseCloudinaryUploadResult {
  uploadImage: (imageBase64: string, folder?: string) => Promise<UploadResult>;
  isUploading: boolean;
  error: string | null;
}

/**
 * Hook para upload de imagens no Cloudinary com compressão WebP automática
 * As imagens expiram automaticamente após 24 horas
 */
export function useCloudinaryUpload(): UseCloudinaryUploadResult {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(async (
    imageBase64: string, 
    folder: string = "feed"
  ): Promise<UploadResult> => {
    setIsUploading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke("cloudinary-upload", {
        body: { imageBase64, folder },
      });

      if (invokeError) {
        throw new Error(invokeError.message);
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return {
        success: true,
        publicId: data.publicId,
        url: data.url,
        expiresAt: data.expiresAt,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUploading(false);
    }
  }, []);

  return {
    uploadImage,
    isUploading,
    error,
  };
}

/**
 * Converte um File para base64
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
