import type { ImagePlaceholder } from './placeholder-images';
import { PlaceHolderImages } from './placeholder-images';

const getImage = (id: string): ImagePlaceholder | undefined => PlaceHolderImages.find(img => img.id === id);

export const newClients = [
  { id: 1, name: 'Emma Johnson', email: 'emma.j@example.com', avatar: getImage('user-1')?.imageUrl },
  { id: 2, name: 'Liam Smith', email: 'liam.s@example.com', avatar: getImage('user-2')?.imageUrl },
];

export const stockAlerts = [
  { id: 1, name: 'Premium Detergent', stock: 8, threshold: 10 },
  { id: 2, name: 'Fabric Softener', stock: 5, threshold: 5 },
  { id: 3, name: 'Hangers Pack', stock: 15, threshold: 20 },
];

export const servicesChartData = [
  { month: 'January', services: Math.floor(Math.random() * 500) + 100 },
  { month: 'February', services: Math.floor(Math.random() * 500) + 100 },
  { month: 'March', services: Math.floor(Math.random() * 500) + 100 },
  { month: 'April', services: Math.floor(Math.random() * 500) + 100 },
  { month: 'May', services: Math.floor(Math.random() * 500) + 100 },
  { month: 'June', services: Math.floor(Math.random() * 500) + 100 },
];

export const users = [
    { id: 'USR001', name: 'Olivia Williams', email: 'olivia.w@example.com', role: 'Client', dateAdded: '2023-10-01', avatar: getImage('user-3')?.imageUrl },
    { id: 'USR002', name: 'Noah Brown', email: 'noah.b@example.com', role: 'Client', dateAdded: '2023-10-05', avatar: getImage('user-4')?.imageUrl },
    { id: 'USR003', name: 'Ava Jones', email: 'ava.j@example.com', role: 'Staff', dateAdded: '2023-09-15', avatar: getImage('user-5')?.imageUrl },
    { id: 'USR004', name: 'William Garcia', email: 'william.g@example.com', role: 'Admin', dateAdded: '2023-09-01', avatar: getImage('user-6')?.imageUrl },
    { id: 'USR005', name: 'Emma Johnson', email: 'emma.j@example.com', role: 'Client', dateAdded: '2023-10-12', avatar: getImage('user-1')?.imageUrl },
];

export const appointments = [
    { id: 'APT001', service: 'Dry Cleaning', date: '2024-08-15', time: '10:00 AM', status: 'Confirmed' },
    { id: 'APT002', service: 'Wash & Fold', date: '2024-08-18', time: '02:00 PM', status: 'Confirmed' },
];

export const orders = [
    { id: 'ORD551', date: '2024-07-28', service: 'Suit Dry Cleaning', total: 25.00, status: 'Ready for Pickup' },
    { id: 'ORD550', date: '2024-07-22', service: 'Bedding Wash', total: 30.00, status: 'Completed' },
    { id: 'ORD549', date: '2024-07-15', service: 'Express Wash', total: 18.50, status: 'Completed' },
];

export const staffTasks = [
    { id: 'TSK101', orderId: 'ORD553', client: 'Liam Smith', service: 'Wedding Dress Cleaning', dueDate: '2024-08-10', status: 'In Progress' },
    { id: 'TSK102', orderId: 'ORD554', client: 'Olivia Williams', service: 'Leather Jacket Care', dueDate: '2024-08-11', status: 'Pending' },
    { id: 'TSK103', orderId: 'ORD555', client: 'Noah Brown', service: 'Bulk Wash & Fold', dueDate: '2024-08-11', status: 'Pending' },
    { id: 'TSK104', orderId: 'ORD556', client: 'Ava Jones', service: 'Drapery Cleaning', dueDate: '2024-08-12', status: 'Completed' },
];

export const inventoryItems = [
    { id: 'INV001', name: 'Premium Detergent', category: 'Consumable', stock: 8, status: 'Low Stock' },
    { id: 'INV002', name: 'Fabric Softener', category: 'Consumable', stock: 5, status: 'Low Stock' },
    { id: 'INV003', name: 'Hangers Pack', category: 'Supply', stock: 15, status: 'Low Stock' },
    { id: 'INV004', name: 'Garment Bags', category: 'Supply', stock: 50, status: 'In Stock' },
    { id: 'INV005', name: 'Stain Remover', category: 'Consumable', stock: 25, status: 'In Stock' },
];
