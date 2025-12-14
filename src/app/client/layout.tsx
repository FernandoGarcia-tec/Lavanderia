import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lavandería ANGY",
  description: "Portal del cliente para Lavandería ANGY",
};

export default function ClientLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
