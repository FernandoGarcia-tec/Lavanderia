"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

type CashRecord = {
  id: string;
  type: "opening" | "closing" | string;
  amount?: number;
  userId?: string | null;
  createdAt?: any; // Firestore Timestamp
};

export default function AdminCajaPage() {
  const db = useFirestore();
  const [records, setRecords] = useState<CashRecord[]>([]);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "cash_registers"), where("type", "==", "opening"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: CashRecord[] = [];
      snap.forEach((doc) => list.push({ id: doc.id, ...(doc.data() as any) }));
      setRecords(list);
    });
    return () => unsub();
  }, [db]);

  return (
    <div className="p-4 md:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Registro de Aperturas de Caja</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>ID Registro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => {
                  const date = r.createdAt?.toDate ? r.createdAt.toDate() : undefined;
                  return (
                    <TableRow key={r.id}>
                      <TableCell>{date ? format(date, "PPP p") : "-"}</TableCell>
                      <TableCell>{typeof r.amount === "number" ? `$${r.amount.toFixed(2)}` : "-"}</TableCell>
                      <TableCell>{r.userId || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">{r.id}</TableCell>
                    </TableRow>
                  );
                })}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-sm text-muted-foreground">Sin registros de apertura.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
