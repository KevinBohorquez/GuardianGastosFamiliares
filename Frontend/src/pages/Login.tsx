import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

const Login = () => {
  const { login } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await login(email, password);
    if (!r.ok) return toast.error(r.error);
    toast.success("¡Bienvenidos de vuelta!");
    navigate("/dashboard");
  };

  const fillDemoAdmin = () => {
    setEmail("admin@admin.com");
    setPassword("admin1234");
  };

  const fillDemoGuardian = () => {
    setEmail("demo@guardian.com");
    setPassword("demo123");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-hero shadow-glow mb-4">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gradient">Guardián de Gastos</h1>
          <p className="text-muted-foreground mt-2">Tu economía familiar, en armonía.</p>
        </div>
        <form onSubmit={submit} className="glass-strong rounded-3xl p-8 space-y-5" autoComplete="off">
          <div className="space-y-2">
            <Label>Correo familiar</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="familia@correo.com" autoComplete="off" />
          </div>
          <div className="space-y-2">
            <Label>Contraseña</Label>
            <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary text-white shadow-glow h-11 text-base mb-2">
            Iniciar sesión
          </Button>
          <div className="flex flex-col gap-2 mt-4">
            <Button type="button" variant="outline" onClick={fillDemoAdmin} className="w-full glass">
              Usar cuenta demo (admin / admin)
            </Button>
            <Button type="button" variant="outline" onClick={fillDemoGuardian} className="w-full glass">
              Usar cuenta de prueba (demo@guardian.com)
            </Button>
          </div>
          <p className="text-center text-sm text-muted-foreground pt-2">
            ¿Aún no tienen cuenta?{" "}
            <Link to="/signup" className="text-primary font-semibold hover:underline">
              Regístrenla
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Login;
