import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "lucide-react";

interface ProfileCompletionDialogProps {
  open: boolean;
  onComplete: () => void;
  userId: string;
}

const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

const validateCPF = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[10])) return false;
  
  return true;
};

export const ProfileCompletionDialog = ({ open, onComplete, userId }: ProfileCompletionDialogProps) => {
  const [fullName, setFullName] = useState("");
  const [cpf, setCpf] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; cpf?: string; birthDate?: string }>({});

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    if (formatted.length <= 14) {
      setCpf(formatted);
      setErrors(prev => ({ ...prev, cpf: undefined }));
    }
  };

  const handleSubmit = async () => {
    const newErrors: { fullName?: string; cpf?: string; birthDate?: string } = {};
    
    // Validate full name
    if (!fullName.trim()) {
      newErrors.fullName = "Nome completo é obrigatório";
    } else if (fullName.trim().split(' ').length < 2) {
      newErrors.fullName = "Digite nome e sobrenome";
    }
    // Validate CPF
    if (!cpf) {
      newErrors.cpf = "CPF é obrigatório";
    } else if (!validateCPF(cpf)) {
      newErrors.cpf = "CPF inválido";
    }
    
    // Validate birth date
    if (!birthDate) {
      newErrors.birthDate = "Data de nascimento é obrigatória";
    } else {
      const birth = new Date(birthDate);
      const today = new Date();
      const age = today.getFullYear() - birth.getFullYear();
      if (age < 18) {
        newErrors.birthDate = "Você deve ter pelo menos 18 anos";
      }
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // ⚠️ Only UPDATE existing profile - NEVER INSERT
      // Profile must already exist (created by backend trigger)
      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      if (checkError) {
        console.error("Error checking profile:", checkError);
        throw new Error("Erro ao verificar perfil");
      }
      
      if (!existingProfile) {
        // Profile doesn't exist yet - backend trigger may still be processing
        toast.error("Seu perfil ainda está sendo preparado. Tente novamente em alguns segundos.");
        setIsSubmitting(false);
        return;
      }
      
      // CORRECT: profiles.id = auth.users.id (identidade soberana)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          cpf: cpf.replace(/\D/g, ''),
          data_nascimento: birthDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
      
      if (error) throw error;
      
      toast.success("Cadastro completado com sucesso!");
      onComplete();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast.error(error.message || "Erro ao salvar dados. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-center mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <User className="h-6 w-6 text-primary" />
            </div>
          </div>
          <DialogTitle className="text-center">Complete seu cadastro</DialogTitle>
          <DialogDescription className="text-center">
            Seu nome social já está salvo. Agora precisamos de algumas informações adicionais.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome completo (documento)</Label>
            <Input
              id="fullName"
              placeholder="Nome como está no documento"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setErrors(prev => ({ ...prev, fullName: undefined }));
              }}
              className={errors.fullName ? "border-destructive" : ""}
            />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Este nome não será exibido publicamente
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={handleCPFChange}
              className={errors.cpf ? "border-destructive" : ""}
            />
            {errors.cpf && (
              <p className="text-sm text-destructive">{errors.cpf}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="birthDate">Data de Nascimento</Label>
            <Input
              id="birthDate"
              type="date"
              value={birthDate}
              onChange={(e) => {
                setBirthDate(e.target.value);
                setErrors(prev => ({ ...prev, birthDate: undefined }));
              }}
              className={errors.birthDate ? "border-destructive" : ""}
              max={new Date().toISOString().split('T')[0]}
            />
            {errors.birthDate && (
              <p className="text-sm text-destructive">{errors.birthDate}</p>
            )}
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? "Salvando..." : "Continuar"}
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            className="w-full text-muted-foreground"
          >
            Pular por agora
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
