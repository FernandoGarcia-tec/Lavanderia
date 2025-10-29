import Link from "next/link";
import { AppLogo } from "@/components/app-logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <AppLogo />
        </div>
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="font-headline text-2xl">Bienvenido de Vuelta</CardTitle>
            <CardDescription>
              Introduce tus credenciales para acceder a tu cuenta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nombre@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link
                    href="#"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input id="password" type="password" required />
              </div>
              <Button type="submit" className="w-full">
                Iniciar Sesión
              </Button>
            </form>
            <div className="mt-4 text-center text-sm">
              ¿No tienes una cuenta?{" "}
              <Link href="/register" className="font-medium text-primary hover:underline">
                Regístrate
              </Link>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                PROTOTIPO
              </span>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Para fines de demostración, puedes entrar a un panel directamente.
            </p>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-3">
              <Button variant="outline" asChild>
                <Link href="/client">Cliente</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/staff">Personal</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin">Administrador</Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
