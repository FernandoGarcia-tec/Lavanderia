"use client";

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AdminCreateUserPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('client');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, role, password }),
      });
      const json = await res.json();
      if (json.ok) {
        setMessage(`Usuario creado: ${json.uid}. Reset link: ${json.resetLink}`);
        setEmail('');
        setName('');
        setPassword('');
        setRole('client');
      } else {
        setMessage(`Error: ${json.error}`);
      }
    } catch (err: any) {
      setMessage(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Crear usuario (Admin)</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nombre</Label>
              <Input id="name" value={name} onChange={(e) => setName((e.target as HTMLInputElement).value)} required />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail((e.target as HTMLInputElement).value)} required />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)} className="w-full h-10 rounded">
                <option value="client">client</option>
                <option value="personal">personal</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <div>
              <Label htmlFor="password">Contraseña (opcional)</Label>
              <Input id="password" type="text" value={password} onChange={(e) => setPassword((e.target as HTMLInputElement).value)} />
            </div>
            <div>
              <Button type="submit" disabled={loading}>{loading ? 'Creando...' : 'Crear usuario'}</Button>
            </div>
            {message && <p className="text-sm mt-2">{message}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
