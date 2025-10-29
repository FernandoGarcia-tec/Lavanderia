import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string): ImagePlaceholder | undefined => PlaceHolderImages.find(img => img.id === id);

export const newClients = [
  { id: 1, name: 'Emma Johnson', email: 'emma.j@example.com', avatar: getImage('user-1')?.imageUrl },
  { id: 2, name: 'Liam Smith', email: 'liam.s@example.com', avatar: getImage('user-2')?.imageUrl },
];

export const stockAlerts = [
  { id: 1, name: 'Detergente Premium', stock: 8, threshold: 10 },
  { id: 2, name: 'Suavizante', stock: 5, threshold: 5 },
  { id: 3, name: 'Paquete de Perchas', stock: 15, threshold: 20 },
];

export const servicesChartData = [
  { month: 'Enero', services: Math.floor(Math.random() * 500) + 100 },
  { month: 'Febrero', services: Math.floor(Math.random() * 500) + 100 },
  { month: 'Marzo', services: Math.floor(Math.random() * 500) + 100 },
  { month: 'Abril', services: Math.floor(Math.random() * 500) + 100 },
  { month: 'Mayo', services: Math.floor(Math.random() * 500) + 100 },
  { month: 'Junio', services: Math.floor(Math.random() * 500) + 100 },
];

export const users = [
    { id: 'USR001', name: 'Olivia Williams', email: 'olivia.w@example.com', role: 'Client', dateAdded: '2023-10-01', avatar: getImage('user-3')?.imageUrl },
    { id: 'USR002', name: 'Noah Brown', email: 'noah.b@example.com', role: 'Client', dateAdded: '2023-10-05', avatar: getImage('user-4')?.imageUrl },
    { id: 'USR003', name: 'Ava Jones', email: 'ava.j@example.com', role: 'Staff', dateAdded: '2023-09-15', avatar: getImage('user-5')?.imageUrl },
    { id: 'USR004', name: 'William Garcia', email: 'william.g@example.com', role: 'Admin', dateAdded: '2023-09-01', avatar: getImage('user-6')?.imageUrl },
    { id: 'USR005', name: 'Emma Johnson', email: 'emma.j@example.com', role: 'Client', dateAdded: '2023-10-12', avatar: getImage('user-1')?.imageUrl },
];

export const appointments = [
    { id: 'APT001', service: 'Lavado en Seco', date: '2024-08-15', time: '10:00 AM', status: 'Confirmada' },
    { id: 'APT002', service: 'Lavado y Plegado', date: '2024-08-18', time: '02:00 PM', status: 'Confirmada' },
];

export const orders = [
    { id: 'ORD551', date: '2024-07-28', service: 'Limpieza de Traje en Seco', total: 25.00, status: 'Listo para Recoger' },
    { id: 'ORD550', date: '2024-07-22', service: 'Lavado de Ropa de Cama', total: 30.00, status: 'Completado' },
    { id: 'ORD549', date: '2024-07-15', service: 'Lavado Express', total: 18.50, status: 'Completado' },
];

export const staffTasks = [
    { id: 'TSK101', orderId: 'ORD553', client: 'Liam Smith', service: 'Limpieza de Vestido de Novia', dueDate: '2024-08-10', status: 'En Progreso' },
    { id: 'TSK102', orderId: 'ORD554', client: 'Olivia Williams', service: 'Cuidado de Chaqueta de Cuero', dueDate: '2024-08-11', status: 'Pendiente' },
    { id: 'TSK103', orderId: 'ORD555', client: 'Noah Brown', service: 'Lavado y Plegado a Granel', dueDate: '2024-08-11', status: 'Pendiente' },
    { id: 'TSK104', orderId: 'ORD556', client: 'Ava Jones', service: 'Limpieza de Cortinas', dueDate: '2024-08-12', status: 'Completado' },
];

export const inventoryItems = [
    { id: 'INV001', name: 'Detergente Premium', category: 'Consumible', stock: 8, status: 'Stock Bajo' },
    { id: 'INV002', name: 'Suavizante', category: 'Consumible', stock: 5, status: 'Stock Bajo' },
    { id: 'INV003', name: 'Paquete de Perchas', category: 'Suministro', stock: 15, status: 'Stock Bajo' },
    { id: 'INV004', name: 'Bolsas para Ropa', category: 'Suministro', stock: 50, status: 'En Stock' },
    { id: 'INV005', name: 'Quitamanchas', category: 'Consumible', stock: 25, status: 'En Stock' },
];

export const services = [
    { id: 'SRV001', name: 'Lavado y Plegado', price: 15.00, paymentStatus: 'Pagado' },
    { id: 'SRV002', name: 'Lavado en Seco', price: 25.50, paymentStatus: 'Pendiente' },
    { id: 'SRV003', name: 'Ropa de Cama y Edredones', price: 30.00, paymentStatus: 'Pagado' },
    { id: 'SRV004', name: 'Artículos Especiales', price: 40.00, paymentStatus: 'Pagado' },
];
