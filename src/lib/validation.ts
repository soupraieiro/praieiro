import { z } from "zod";

// Utility function to sanitize text input (remove potential XSS)
export function sanitizeText(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

// Utility to clean text for display (decode entities back)
export function cleanText(input: string | null | undefined): string {
  if (!input) return "";
  return input
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/");
}

// Validation schemas for different input types
export const orderMessageSchema = z
  .string()
  .max(500, "Mensagem deve ter no máximo 500 caracteres")
  .transform((val) => val.trim())
  .optional();

export const productSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres")
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .transform((val) => val.trim())
    .optional()
    .nullable(),
  price: z
    .number()
    .min(0.01, "Preço deve ser maior que zero")
    .max(99999.99, "Preço inválido"),
  image_url: z
    .string()
    .url("URL inválida")
    .max(500, "URL deve ter no máximo 500 caracteres")
    .optional()
    .nullable()
    .or(z.literal("")),
  is_available: z.boolean(),
});

export const reviewSchema = z.object({
  rating: z.number().min(1, "Avaliação é obrigatória").max(5, "Avaliação inválida"),
  comment: z
    .string()
    .max(500, "Comentário deve ter no máximo 500 caracteres")
    .transform((val) => val.trim())
    .optional()
    .nullable(),
});

export const chatMessageSchema = z
  .string()
  .min(1, "Mensagem não pode estar vazia")
  .max(1000, "Mensagem deve ter no máximo 1000 caracteres")
  .transform((val) => val.trim());

// Validate and sanitize order message
export function validateOrderMessage(message: string): { 
  isValid: boolean; 
  sanitized: string | null; 
  error?: string 
} {
  const trimmed = message.trim();
  if (!trimmed) return { isValid: true, sanitized: null };
  
  if (trimmed.length > 500) {
    return { isValid: false, sanitized: null, error: "Mensagem deve ter no máximo 500 caracteres" };
  }
  
  return { isValid: true, sanitized: sanitizeText(trimmed) };
}

// Validate product data
export function validateProduct(data: {
  name: string;
  description: string;
  price: string;
  image_url: string;
  is_available: boolean;
}): { isValid: boolean; data?: z.infer<typeof productSchema>; error?: string } {
  const priceNum = parseFloat(data.price.replace(",", "."));
  
  if (isNaN(priceNum)) {
    return { isValid: false, error: "Preço inválido" };
  }

  const result = productSchema.safeParse({
    name: data.name,
    description: data.description || null,
    price: priceNum,
    image_url: data.image_url || null,
    is_available: data.is_available,
  });

  if (!result.success) {
    return { isValid: false, error: result.error.errors[0]?.message || "Dados inválidos" };
  }

  // Sanitize text fields
  return {
    isValid: true,
    data: {
      ...result.data,
      name: sanitizeText(result.data.name),
      description: result.data.description ? sanitizeText(result.data.description) : null,
    },
  };
}

// Validate review data
export function validateReview(rating: number, comment: string): {
  isValid: boolean;
  data?: { rating: number; comment: string | null };
  error?: string;
} {
  const result = reviewSchema.safeParse({
    rating,
    comment: comment || null,
  });

  if (!result.success) {
    return { isValid: false, error: result.error.errors[0]?.message || "Dados inválidos" };
  }

  return {
    isValid: true,
    data: {
      rating: result.data.rating,
      comment: result.data.comment ? sanitizeText(result.data.comment) : null,
    },
  };
}

// Validate chat message
export function validateChatMessage(message: string): {
  isValid: boolean;
  sanitized?: string;
  error?: string;
} {
  const result = chatMessageSchema.safeParse(message);

  if (!result.success) {
    return { isValid: false, error: result.error.errors[0]?.message || "Mensagem inválida" };
  }

  return { isValid: true, sanitized: sanitizeText(result.data) };
}
