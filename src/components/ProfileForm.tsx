import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { validateCPF, formatCPF } from "@/lib/cpfValidation";
import { useProfile } from "@/hooks/useProfile";
import { Loader2 } from "lucide-react";

const profileSchema = z.object({
  full_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  data_nascimento: z.string().optional(),
  sexo: z.string().optional(),
  cpf: z.string().refine((val) => validateCPF(val), "CPF inválido"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  onSuccess?: () => void;
}

export function ProfileForm({ onSuccess }: ProfileFormProps) {
  const { profile, updateProfile, hasProfile, isRetrying } = useProfile();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cpfDisplay, setCpfDisplay] = useState(profile?.cpf || "");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: profile?.full_name || "",
      email: profile?.email || "",
      data_nascimento: profile?.data_nascimento || "",
      sexo: profile?.sexo || "",
      cpf: profile?.cpf || "",
    },
  });

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setCpfDisplay(formatted);
    setValue("cpf", e.target.value.replace(/\D/g, ""));
  };

  const onSubmit = async (data: ProfileFormData) => {
    // ⚠️ Profile must exist - only UPDATE is allowed from frontend
    if (!hasProfile) {
      toast.error("Seu perfil ainda está sendo preparado. Aguarde alguns segundos e tente novamente.");
      return;
    }

    setIsSubmitting(true);
    try {
      await updateProfile({
        full_name: data.full_name,
        email: data.email,
        cpf: data.cpf,
        data_nascimento: data.data_nascimento || null,
        sexo: data.sexo || null,
      });
      toast.success("Perfil atualizado com sucesso!");
      onSuccess?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao salvar perfil";
      if (message.includes("duplicate key") && message.includes("cpf")) {
        toast.error("Este CPF já está cadastrado");
      } else if (message.includes("duplicate key") && message.includes("email")) {
        toast.error("Este email já está cadastrado");
      } else {
        toast.error(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while waiting for profile
  if (isRetrying && !hasProfile) {
    return (
      <Card className="w-full max-w-lg mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Carregando perfil...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <CardTitle>Editar Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              {...register("full_name")}
              placeholder="Seu nome completo"
            />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              placeholder="seu@email.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              value={cpfDisplay}
              onChange={hasProfile ? undefined : handleCpfChange}
              placeholder="000.000.000-00"
              maxLength={14}
              disabled={hasProfile}
              className={hasProfile ? "bg-muted cursor-not-allowed" : ""}
            />
            {hasProfile && (
              <p className="text-xs text-muted-foreground">CPF não pode ser alterado</p>
            )}
            {errors.cpf && (
              <p className="text-sm text-destructive">{errors.cpf.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="data_nascimento">Data de Nascimento</Label>
            <Input
              id="data_nascimento"
              type="date"
              {...register("data_nascimento")}
              disabled={hasProfile}
              className={hasProfile ? "bg-muted cursor-not-allowed" : ""}
            />
            {hasProfile && (
              <p className="text-xs text-muted-foreground">Data de nascimento não pode ser alterada</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sexo">Sexo</Label>
            <Select
              defaultValue={profile?.sexo || ""}
              onValueChange={(value) => setValue("sexo", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="masculino">Masculino</SelectItem>
                <SelectItem value="feminino">Feminino</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
                <SelectItem value="prefiro_nao_dizer">Prefiro não dizer</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {hasProfile ? "Salvar Alterações" : "Criar Perfil"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
