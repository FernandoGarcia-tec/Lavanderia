"use client";

import { AuthGuard } from "@/components/auth-guard";

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AuthGuard allowedRoles={['client', 'admin', 'staff']}>
      {children}
    </AuthGuard>
  );
}
