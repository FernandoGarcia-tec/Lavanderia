"use client";

import { useState } from 'react';
import { useAuth } from '@/firebase/provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { updatePassword } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function ChangePasswordPage() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    if (!auth?.currentUser) return;
    if (password.length < 6) {
      toast({ title: 'Error', description: 'La contraseña debe tener al menos 6 caracteres.', variant: 'destructive' });
      return;
    }
    if (password !== confirm) {
      toast({ title: 'Error', description: 'Las contraseñas no coinciden.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await updatePassword(auth.currentUser, password);
      // Inform server to clear the mustChangePassword claim
      await fetch('/api/clear-must-change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: auth.currentUser.uid }),
      });
      toast({ title: 'Contraseña actualizada', description: 'Por seguridad, la marca de cambio obligatorio fue removida.' });
      router.push('/');
    } catch (err: any) {
      console.error('change password error', err);
      toast({ title: 'Error', description: err?.message || 'No se pudo actualizar la contraseña.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChange} className="grid gap-3">
            <div>
              <label className="text-sm">Nueva contraseña</label>
              <Input type="password" value={password} onChange={(e) => setPassword((e.target as HTMLInputElement).value)} required />
            </div>
            <div>
              <label className="text-sm">Confirmar contraseña</label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm((e.target as HTMLInputElement).value)} required />
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Cambiar contraseña'}</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
