import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useApp } from "@/context/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Wallet } from "lucide-react";

const Signup = () => {
  const { signup } = useApp();
  const navigate = useNavigate();
  const [familyName, setFamilyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("La contraseña debe tener al menos 6 caracteres.");
    const r = await signup(familyName.trim(), email.trim(), password);
    if (!r.ok) return toast.error(r.error);
    toast.success("¡Familia registrada!");
    navigate("/profiles");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-hero shadow-glow mb-4">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gradient">Crea tu cuenta familiar</h1>
          <p className="text-muted-foreground mt-2">Una sola cuenta. Todos los miembros.</p>
        </div>
        <form onSubmit={submit} className="glass-strong rounded-3xl p-8 space-y-5">
          <div className="space-y-2">
            <Label>Nombre de la familia</Label>
            <Input required value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Pérez García" maxLength={50} />
          </div>
          <div className="space-y-2">
            <Label>Correo familiar</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Contraseña</Label>
            <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" className="w-full bg-gradient-primary text-white shadow-glow h-11 text-base">
            Crear cuenta
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            ¿Ya tienen cuenta?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">
              Inicien sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default Signup;
