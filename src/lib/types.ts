import type { Timestamp } from 'firebase/firestore';

export type Role = 'admin' | 'personal' | 'cliente';
export type AccountStatus = 'pendiente' | 'activo' | 'correccion';
export type OrderStatus = 'pendiente' | 'en_proceso' | 'listo' | 'entregado';
export type PaymentStatus = 'pendiente' | 'pagado';
export type ServiceCategory = 'Lavanderia' | 'Planchaduria';
export type PurchaseStatus = 'pendiente' | 'aprobado' | 'rechazado';

export interface Address {
  calle: string;
  cp: string;
  ciudad: string;
}

export interface User {
  uid: string;
  nombreCompleto: string;
  email: string;
  telefono: string;
  rol: Role;
  estatusCuenta: AccountStatus;
  observacionesRegistro?: string;
  direccion: Address;
  fechaRegistro: Timestamp;
}

export interface Order {
  id: string;
  idCliente: string;
  idPersonal?: string;
  estatus: OrderStatus;
  estatusPago: PaymentStatus;
  montoTotal: number;
  fechaRecepcion: Timestamp;
  fechaEntregaEstimada: Timestamp;
  items: OrderItem[];
}

export interface OrderItem {
  id: string;
  idServicio: string;
  nombreServicio: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Service {
  id: string;
  nombre: string;
  descripcion: string;
  precioActual: number;
  categoria: ServiceCategory;
  activo: boolean;
}

export interface InventoryItem {
  id: string;
  nombreInsumo: string;
  stockActual: number;
  stockCritico: number;
  unidad: string;
}

export interface PurchaseRequest {
  id: string;
  idInsumo: string;
  nombreInsumo: string; // Denormalized for easier display
  idSolicitante: string;
  nombreSolicitante: string; // Denormalized for easier display
  cantidadSolicitada: number;
  estatus: PurchaseStatus;
  fechaSolicitud: Timestamp;
}
