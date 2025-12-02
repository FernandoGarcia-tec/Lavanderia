"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useFirestore } from "@/firebase/provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Filter } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Order = {
	id: string;
	clientName?: string;
	serviceName?: string;
	unit?: "kg" | "pieces";
	quantity?: number;
	estimatedTotal?: number;
	deliveryDate?: any; // Firestore Timestamp
	deliveryTime?: string;
	status?: "pendiente" | "en_progreso" | "completado" | "entregado";
	attendedBy?: string;
	staffName?: string;
	deliveredBy?: string;
	deliveredByUid?: string;
	deliveredAt?: any; // Firestore Timestamp
	paymentMethod?: string;
	paymentStatus?: "pagado" | "sin_pagar";
};

const statusLabel: Record<NonNullable<Order["status"]>, string> = {
	pendiente: "Pendiente",
	en_progreso: "En Progreso",
	completado: "Completado",
	entregado: "Entregado",
};

function StatusBadge({ status }: { status?: Order["status"] }) {
	const variant =
		status === "pendiente"
			? "secondary"
			: status === "en_progreso"
			? "secondary"
			: status === "completado"
			? "outline"
			: "default";
	return <Badge variant={variant}>{status ? statusLabel[status] : "-"}</Badge>;
}

function PaymentBadge({ method, status }: { method?: string; status?: Order["paymentStatus"] }) {
	const isPaid = status === "pagado" || (method && method !== "pagar_al_retiro" && method !== "efectivo_pendiente");
	return (
		<Badge variant={isPaid ? "default" : "destructive"}>{isPaid ? "Pagado" : "Sin pagar"}</Badge>
	);
}

export default function AdminOrdersPage() {
	const db = useFirestore();
	const [orders, setOrders] = useState<Order[]>([]);
	const [filter, setFilter] = useState<Order["status"] | "todos">("todos");
	const [paymentFilter, setPaymentFilter] = useState<Order["paymentStatus"] | "todos">("todos");
	const [detailOpen, setDetailOpen] = useState(false);
	const [selected, setSelected] = useState<Order | null>(null);

	useEffect(() => {
		if (!db) return;
		const q = query(collection(db, "orders"), orderBy("createdAt", "desc"));
		const unsub = onSnapshot(q, (snap) => {
			const list: Order[] = [];
			snap.forEach((doc) => {
				const d = doc.data() as any;
				list.push({ id: doc.id, ...d });
			});
			setOrders(list);
		});
		return () => unsub();
	}, [db]);

	const filtered = useMemo(() => {
		let list = orders;
		if (filter !== "todos") list = list.filter((o) => o.status === filter);
		if (paymentFilter !== "todos") list = list.filter((o) => (o.paymentStatus || "sin_pagar") === paymentFilter);
		return list;
	}, [orders, filter, paymentFilter]);

	return (
		<div className="p-4 md:p-8">
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle>Gestión de Pedidos</CardTitle>
					<div className="flex items-center gap-4 flex-wrap">
						<div className="flex items-center gap-2">
							<Filter className="h-4 w-4 text-muted-foreground" />
							<div className="flex gap-2">
								{(["todos", "pendiente", "en_progreso", "completado", "entregado"] as const).map((k) => (
									<Button
										key={k}
										variant={filter === k ? "default" : "outline"}
										size="sm"
										onClick={() => setFilter(k as any)}
									>
										{k === "todos" ? "Todos" : statusLabel[k as keyof typeof statusLabel]}
									</Button>
								))}
							</div>
						</div>
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">Pago:</span>
							<div className="flex gap-2">
								{(["todos", "pagado", "sin_pagar"] as const).map((k) => (
									<Button
										key={k}
										variant={paymentFilter === k ? "default" : "outline"}
										size="sm"
										onClick={() => setPaymentFilter(k as any)}
									>
										{k === "todos" ? "Todos" : k === "pagado" ? "Pagado" : "Sin pagar"}
									</Button>
								))}
							</div>
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Cliente</TableHead>
									<TableHead>Servicio</TableHead>
									<TableHead>Entrega</TableHead>
									<TableHead>Estado</TableHead>
									<TableHead>Atendió</TableHead>
									<TableHead>Entregó</TableHead>
									<TableHead>Total Est.</TableHead>
									<TableHead>Pago</TableHead>
									<TableHead className="text-right">Acciones</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filtered.map((o) => {
									const delivery = (() => {
										try {
											if (o.deliveryDate?.toDate) return o.deliveryDate.toDate();
											if (typeof o.deliveryDate === "string") return new Date(o.deliveryDate);
										} catch {}
										return undefined;
									})();
									const deliveryStr = delivery ? format(delivery, "PPP") : "-";
									const deliveryTimeStr = o.deliveryTime ? ` · ${o.deliveryTime}` : "";
									const totalStr = typeof o.estimatedTotal === "number" ? `$${o.estimatedTotal.toFixed(2)}` : "-";
									return (
										<TableRow key={o.id}>
											<TableCell>{o.clientName || "-"}</TableCell>
											<TableCell>{o.serviceName || "-"}</TableCell>
											<TableCell>{deliveryStr}{deliveryTimeStr}</TableCell>
											<TableCell><StatusBadge status={o.status} /></TableCell>
											<TableCell>{o.attendedBy || o.staffName || "-"}</TableCell>
											<TableCell>{o.deliveredBy || "-"}</TableCell>
											<TableCell>{totalStr}</TableCell>
											<TableCell><PaymentBadge method={o.paymentMethod} status={o.paymentStatus} /></TableCell>
											<TableCell className="text-right">
												<Button
													variant="ghost"
													size="icon"
													aria-label="Ver detalles"
													title="Ver detalles"
													onClick={() => { setSelected(o); setDetailOpen(true); }}
												>
													<Eye className="h-4 w-4" />
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
						{filtered.length === 0 && (
							<div className="text-sm text-muted-foreground p-4">No hay pedidos para el filtro seleccionado.</div>
						)}
					</div>
				</CardContent>
			</Card>

			{/* Modal de detalles del pedido */}
			<Dialog open={detailOpen} onOpenChange={setDetailOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Detalle del Pedido</DialogTitle>
						<DialogDescription>Información principal del pedido seleccionado.</DialogDescription>
					</DialogHeader>
					{selected ? (
						<div className="grid gap-2 text-sm">
							<div className="flex justify-between"><span className="text-muted-foreground">ID</span><span className="font-mono">{selected.id}</span></div>
							<div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span>{selected.clientName || '-'}</span></div>
							<div className="flex justify-between"><span className="text-muted-foreground">Servicio</span><span>{selected.serviceName || '-'}</span></div>
							<div className="flex justify-between"><span className="text-muted-foreground">Unidad</span><span>{selected.unit === 'kg' ? 'KG' : selected.unit === 'pieces' ? 'Piezas' : '-'}</span></div>
							<div className="flex justify-between"><span className="text-muted-foreground">Cantidad</span><span>{typeof selected.quantity === 'number' ? selected.quantity : '-'}</span></div>
							<div className="flex justify-between"><span className="text-muted-foreground">Entrega estimada</span><span>{selected.deliveryDate?.toDate ? format(selected.deliveryDate.toDate(), 'PPP') : '-'}</span></div>
							<div className="flex justify-between"><span className="text-muted-foreground">Hora de entrega</span><span>{selected.deliveryTime || '-'}</span></div>
							<div className="flex justify-between"><span className="text-muted-foreground">Estado</span><span><StatusBadge status={selected.status} /></span></div>
							<div className="flex justify-between"><span className="text-muted-foreground">Atendió</span><span>{selected.attendedBy || selected.staffName || '-'}</span></div>
							<div className="flex justify-between"><span className="text-muted-foreground">Entregó</span><span>{selected.deliveredBy || '-'}</span></div>
							<div className="flex justify-between"><span className="text-muted-foreground">Pago</span><span><PaymentBadge method={selected.paymentMethod} status={selected.paymentStatus} /></span></div>
							<div className="flex justify-between"><span className="text-muted-foreground">Total estimado</span><span>{typeof selected.estimatedTotal === 'number' ? `$${selected.estimatedTotal.toFixed(2)}` : '-'}</span></div>
						</div>
					) : (
						<div className="text-sm text-muted-foreground">Seleccione un pedido para ver detalles.</div>
					)}
					<DialogFooter>
						<Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
