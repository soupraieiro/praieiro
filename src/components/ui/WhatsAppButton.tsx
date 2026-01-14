import { MessageCircle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

// Número de suporte da empresa Praieiro
const SUPPORT_PHONE_NUMBER = "5521995006655";

interface WhatsAppButtonProps {
  message?: string;
  children?: React.ReactNode;
  variant?: "default" | "floating";
  className?: string;
}

export function WhatsAppButton({
  message = "Olá! Preciso de suporte com o Praieiro.",
  children,
  variant = "default",
  className,
}: WhatsAppButtonProps) {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/${SUPPORT_PHONE_NUMBER}?text=${encodedMessage}`;

  if (variant === "floating") {
    return (
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full whatsapp-gradient shadow-lg transition-all hover:scale-110 hover:shadow-xl md:h-16 md:w-16",
          className
        )}
        aria-label="Falar com suporte no WhatsApp"
      >
        <MessageCircle className="h-7 w-7 text-white md:h-8 md:w-8" fill="currentColor" />
      </a>
    );
  }

  return (
    <Button
      asChild
      className={cn(
        "whatsapp-gradient gap-2 text-white hover:opacity-90 font-semibold px-6 py-6 text-base shadow-lg transition-all hover:scale-105",
        className
      )}
    >
      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="h-5 w-5" fill="currentColor" />
        {children || "Suporte"}
      </a>
    </Button>
  );
}
