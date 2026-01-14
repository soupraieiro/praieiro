import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Waves, Mail, Lock, User, ArrowLeft, Phone, CreditCard, Calendar, Users, Camera, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { TermsConsentDialog } from "@/components/TermsConsentDialog";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().email("E-mail inválido");
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres");
const phoneSchema = z.string().min(10, "Telefone deve ter pelo menos 10 dígitos").max(15, "Telefone inválido");
const cpfSchema = z.string().length(11, "CPF deve ter 11 dígitos");

export default function VendorAuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [motherName, setMotherName] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { signIn, signUp, signInWithGoogle, user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  useEffect(() => {
    const checkVendorRole = async () => {
      if (!loading && user) {
        // Check if user is a vendor using governance_roles (constitutional)
        const { data: roles } = await (supabase as any)
          .from("governance_roles")
          .select("role")
          .eq("profile_id", user.id)
          .eq("role", "vendor");
        
        if (roles && roles.length > 0) {
          navigate("/painel-ambulante");
        }
      }
    };
    checkVendorRole();
  }, [user, loading, navigate]);

  const validateForm = () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({
        title: "E-mail inválido",
        description: emailResult.error.errors[0].message,
        variant: "destructive",
      });
      return false;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      toast({
        title: "Senha inválida",
        description: passwordResult.error.errors[0].message,
        variant: "destructive",
      });
      return false;
    }

    if (!isLogin) {
      if (!fullName.trim()) {
        toast({
          title: "Nome obrigatório",
          description: "Por favor, informe seu nome completo.",
          variant: "destructive",
        });
        return false;
      }

      const phoneResult = phoneSchema.safeParse(whatsapp.replace(/\D/g, ""));
      if (!phoneResult.success) {
        toast({
          title: "WhatsApp inválido",
          description: phoneResult.error.errors[0].message,
          variant: "destructive",
        });
        return false;
      }

      const cpfResult = cpfSchema.safeParse(cpf.replace(/\D/g, ""));
      if (!cpfResult.success) {
        toast({
          title: "CPF inválido",
          description: cpfResult.error.errors[0].message,
          variant: "destructive",
        });
        return false;
      }

      if (!dateOfBirth) {
        toast({
          title: "Data de nascimento obrigatória",
          description: "Por favor, informe sua data de nascimento.",
          variant: "destructive",
        });
        return false;
      }

      if (!motherName.trim()) {
        toast({
          title: "Nome da mãe obrigatório",
          description: "Por favor, informe o nome da sua mãe.",
          variant: "destructive",
        });
        return false;
      }

      if (!productCategory.trim()) {
        toast({
          title: "Categoria obrigatória",
          description: "Por favor, informe o que você vende.",
          variant: "destructive",
        });
        return false;
      }

      if (!profilePhoto) {
        toast({
          title: "Foto obrigatória",
          description: "Por favor, envie uma foto do seu rosto para validação biométrica.",
          variant: "destructive",
        });
        return false;
      }
    }

    return true;
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A foto deve ter no máximo 5MB.",
          variant: "destructive",
        });
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast({
          title: "Formato inválido",
          description: "Por favor, envie uma imagem (JPG, PNG, etc).",
          variant: "destructive",
        });
        return;
      }

      setProfilePhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setProfilePhoto(null);
    setPhotoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!profilePhoto) return null;

    setIsUploadingPhoto(true);
    try {
      const { data, error } = await supabase.functions.invoke('cloudinary-upload', {
        body: {
          file: await fileToBase64(profilePhoto),
          folder: 'vendor-biometric',
          transformation: 'c_fill,w_400,h_400,g_face',
        },
      });

      if (error) throw error;
      return data.secure_url;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Erro no upload",
        description: "Não foi possível enviar a foto. Tente novamente.",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isForgotPassword) {
      await handleForgotPassword();
      return;
    }
    
    if (!validateForm()) return;

    if (!isLogin) {
      setShowTerms(true);
      return;
    }

    await performLogin();
  };

  const handleForgotPassword = async () => {
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      toast({
        title: "E-mail inválido",
        description: emailResult.error.errors[0].message,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      
      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível enviar o e-mail de recuperação.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "E-mail enviado!",
          description: "Verifique sua caixa de entrada para redefinir sua senha.",
        });
        setIsForgotPassword(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const performLogin = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        let message = "Erro ao fazer login.";
        if (error.message.includes("Invalid login credentials")) {
          message = "E-mail ou senha incorretos.";
        }
        toast({
          title: "Erro no login",
          description: message,
          variant: "destructive",
        });
        return;
      }
      
      // Check if user is a vendor using governance_roles (constitutional)
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        const { data: roles } = await (supabase as any)
          .from("governance_roles")
          .select("role")
          .eq("profile_id", currentUser.id)
          .eq("role", "vendor");
        
        if (!roles || roles.length === 0) {
          await supabase.auth.signOut();
          toast({
            title: "Acesso negado",
            description: "Esta conta não é de ambulante. Use o login de cliente.",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Bem-vindo!",
          description: "Login realizado com sucesso.",
        });
        navigate("/painel-ambulante");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAcceptTerms = async () => {
    setShowTerms(false);
    setIsSubmitting(true);

    try {
      // First upload the photo
      const photoUrl = await uploadPhoto();
      if (!photoUrl) {
        setIsSubmitting(false);
        return;
      }

      const { error, data } = await signUp(email, password, fullName);
      if (error) {
        let message = "Erro ao criar conta.";
        if (error.message.includes("User already registered")) {
          message = "Este e-mail já está cadastrado. Faça login.";
        }
        toast({
          title: "Erro no cadastro",
          description: message,
          variant: "destructive",
        });
        return;
      }
      
      if (data?.user) {
        // Wait for profile to be created by trigger
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // CORRECT: profiles.id = auth.users.id (identidade soberana)
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", data.user.id)
          .single();

        if (!profile) {
          toast({
            title: "Erro no cadastro",
            description: "Erro ao criar perfil.",
            variant: "destructive",
          });
          return;
        }

        // Update profile with additional data including biometric photo
        await supabase.from("profiles").update({
          phone: phone.replace(/\D/g, "") || null,
          data_nascimento: dateOfBirth,
          mother_name: motherName.trim(),
          profile_photo_url: photoUrl,
        }).eq("id", profile.id);

        // Create vendor record
        const { error: vendorError } = await supabase.from("vendors").insert({
          profile_id: profile.id,
          whatsapp_number: whatsapp.replace(/\D/g, ""),
          product_category: productCategory.trim(),
          product_description: productDescription.trim() || null,
          status: "pending",
        });

        if (vendorError) {
          console.error("Error creating vendor:", vendorError);
          toast({
            title: "Erro no cadastro",
            description: "Erro ao salvar dados do ambulante.",
            variant: "destructive",
          });
          return;
        }

        // Assign vendor role using governance_roles (constitutional)
        const { error: roleError } = await (supabase as any).from("governance_roles").insert({
          profile_id: data.user.id,
          role: "vendor",
        });

        if (roleError) {
          console.error("Error assigning role:", roleError);
        }

        toast({
          title: "Conta criada!",
          description: "Seu cadastro foi enviado para aprovação.",
        });
        navigate("/painel-ambulante");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeclineTerms = () => {
    setShowTerms(false);
    toast({
      title: "Termos não aceitos",
      description: "É necessário aceitar os termos para criar sua conta.",
      variant: "destructive",
    });
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-3 sm:px-4 pt-20 sm:pt-24 pb-8 sm:pb-12">
        <div className="max-w-md mx-auto">
          <Link 
            to="/ambulantes" 
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-4 sm:mb-6 py-2 touch-manipulation"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>

          <div className="bg-card rounded-2xl shadow-xl p-5 sm:p-8 border">
            <div className="text-center mb-6 sm:mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-accent/10 mb-3 sm:mb-4">
                <Waves className="h-7 w-7 sm:h-8 sm:w-8 text-accent" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-primary">
                {isForgotPassword ? "Recuperar Senha" : isLogin ? "Área do Praieiro" : "Cadastro de Praieiro"}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2">
                {isForgotPassword
                  ? "Digite seu e-mail para receber o link de recuperação"
                  : isLogin 
                    ? "Acesse sua conta para encontrar os Clientes" 
                    : "Cadastre-se para vender na plataforma"}
              </p>
            </div>

            {/* Google Sign In Button - Only show on login mode */}
            {isLogin && !isForgotPassword && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-5 sm:py-6 rounded-full text-base font-medium border-2 hover:bg-muted/50 min-h-[48px] flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-70"
                  onClick={async () => {
                    if (isGoogleLoading) return; // Previne cliques múltiplos
                    setIsGoogleLoading(true);
                    try {
                      const { error } = await signInWithGoogle();
                      if (error) {
                        toast({
                          title: "Erro ao entrar com Google",
                          description: error.message.includes("provider_not_enabled") 
                            ? "Login com Google não está habilitado. Entre em contato com o suporte."
                            : error.message.includes("redirect_uri_mismatch")
                            ? "Erro de configuração. Entre em contato com o suporte."
                            : error.message,
                          variant: "destructive",
                        });
                        setIsGoogleLoading(false);
                      }
                      // Não resetar loading aqui - o redirect vai acontecer
                    } catch (err) {
                      console.error("Google login error:", err);
                      toast({
                        title: "Erro inesperado",
                        description: "Não foi possível conectar ao Google. Tente novamente.",
                        variant: "destructive",
                      });
                      setIsGoogleLoading(false);
                    }
                  }}
                  disabled={isGoogleLoading || isSubmitting}
                >
                  {isGoogleLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent"></div>
                      <span className="text-muted-foreground">Conectando ao Google...</span>
                    </div>
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        />
                      </svg>
                      Entrar com Google
                    </>
                  )}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {!isLogin && !isForgotPassword && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nome completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Seu nome"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp (para clientes)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="whatsapp"
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                        className="pl-10"
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone (opcional)</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={phone}
                        onChange={(e) => setPhone(formatPhone(e.target.value))}
                        className="pl-10"
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cpf">CPF</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="cpf"
                        type="text"
                        placeholder="000.000.000-00"
                        value={cpf}
                        onChange={(e) => setCpf(formatCpf(e.target.value))}
                        className="pl-10"
                        maxLength={14}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Data de nascimento</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="motherName">Nome da mãe</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="motherName"
                        type="text"
                        placeholder="Nome completo da mãe"
                        value={motherName}
                        onChange={(e) => setMotherName(e.target.value)}
                        className="pl-10"
                        maxLength={100}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productCategory">O que você vende?</Label>
                    <Input
                      id="productCategory"
                      type="text"
                      placeholder="Ex: Bebidas, Açaí, Picolé..."
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value)}
                      maxLength={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="productDescription">Descrição dos produtos (opcional)</Label>
                    <Input
                      id="productDescription"
                      type="text"
                      placeholder="Descreva seus produtos"
                      value={productDescription}
                      onChange={(e) => setProductDescription(e.target.value)}
                      maxLength={500}
                    />
                  </div>

                  {/* Biometric Photo Upload */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      Foto de rosto (obrigatório)
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Envie uma foto clara do seu rosto para validação biométrica. Sem a foto não é possível concluir o cadastro.
                    </p>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handlePhotoSelect}
                      className="hidden"
                      id="photo-upload"
                    />

                    {photoPreview ? (
                      <div className="relative inline-block">
                        <img 
                          src={photoPreview} 
                          alt="Preview" 
                          className="w-32 h-32 object-cover rounded-lg border-2 border-primary"
                        />
                        <button
                          type="button"
                          onClick={removePhoto}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 hover:bg-destructive/80"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label
                        htmlFor="photo-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-lg cursor-pointer hover:border-primary transition-colors"
                      >
                        <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-muted-foreground">Clique para enviar foto</span>
                        <span className="text-xs text-muted-foreground">ou tire uma selfie</span>
                      </label>
                    )}
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    maxLength={255}
                  />
                </div>
              </div>

              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {isLogin && !isForgotPassword && (
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setIsForgotPassword(true)}
                    className="text-sm text-muted-foreground hover:text-primary"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-accent hover:bg-accent/90 active:bg-accent/80 text-white font-semibold py-5 sm:py-6 rounded-full text-base touch-manipulation min-h-[48px]"
                disabled={isSubmitting}
              >
                {isSubmitting 
                  ? "Aguarde..." 
                  : isForgotPassword
                    ? "Enviar link de recuperação"
                    : isLogin 
                      ? "Entrar" 
                      : "Cadastrar"}
              </Button>
            </form>

            <div className="mt-6 text-center space-y-2">
              {isForgotPassword ? (
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(false)}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  Voltar ao login
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  {isLogin 
                    ? "Não tem conta? Cadastre-se" 
                    : "Já tem conta? Faça login"}
                </button>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-border text-center">
              <p className="text-xs text-muted-foreground">
                É cliente? <Link to="/cadastro" className="text-primary hover:underline">Acesse aqui</Link>
              </p>
            </div>
          </div>
        </div>
      </main>

      <TermsConsentDialog
        open={showTerms}
        onAccept={handleAcceptTerms}
        onDecline={handleDeclineTerms}
        type="vendor"
      />
    </div>
  );
}
