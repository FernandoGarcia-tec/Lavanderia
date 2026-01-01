"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAuth, useFirestore } from '@/firebase/provider';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'order_update' | 'payment' | 'promo' | 'info';
  read: boolean;
  orderId?: string;
  createdAt: Timestamp | Date;
}

// Mapeo de estados a mensajes amigables
const statusMessages: Record<string, { title: string; message: string }> = {
  pendiente: { title: '📋 Pedido Recibido', message: 'Tu solicitud ha sido registrada. Pronto comenzaremos a trabajar.' },
  en_progreso: { title: '🧺 En Proceso', message: '¡Tu ropa está siendo lavada y cuidada con esmero!' },
  completado: { title: '✨ ¡Listo!', message: 'Tu ropa está lista para recoger o entregar.' },
  entregado: { title: '🎉 Entregado', message: '¡Gracias por confiar en nosotros! Tu ropa ha sido entregada.' }
};

export function useNotifications() {
  const auth = useAuth();
  const firestore = useFirestore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Escuchar notificaciones del usuario
  useEffect(() => {
    if (!firestore || !auth?.currentUser) {
      setLoading(false);
      return;
    }

    const uid = auth.currentUser.uid;
    
    const q = query(
      collection(firestore, 'notifications'),
      where('userId', '==', uid),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const notifs: Notification[] = [];
      snap.forEach(docu => {
        notifs.push({ id: docu.id, ...docu.data() } as Notification);
      });
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
      setLoading(false);
    }, (error) => {
      console.error('Error cargando notificaciones:', error);
      // Si falla por falta de índice, usar notificaciones locales
      setLoading(false);
    });

    return () => unsub();
  }, [firestore, auth?.currentUser?.uid]);

  // Escuchar cambios en pedidos para crear notificaciones automáticas
  useEffect(() => {
    if (!firestore || !auth?.currentUser) return;

    const uid = auth.currentUser.uid;
    
    const q = query(
      collection(firestore, 'orders'),
      where('userId', '==', uid)
    );

    let previousStatuses: Record<string, string> = {};

    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach(async (change) => {
        if (change.type === 'modified') {
          const order = change.doc.data();
          const orderId = change.doc.id;
          const newStatus = order.status;
          const oldStatus = previousStatuses[orderId];

          // Si el estado cambió, crear notificación
          if (oldStatus && oldStatus !== newStatus && statusMessages[newStatus]) {
            const { title, message } = statusMessages[newStatus];
            await createNotification({
              title,
              message,
              type: 'order_update',
              orderId,
              userId: uid
            });
          }
          
          previousStatuses[orderId] = newStatus;
        } else if (change.type === 'added') {
          previousStatuses[change.doc.id] = change.doc.data().status;
        }
      });
    });

    return () => unsub();
  }, [firestore, auth?.currentUser?.uid]);

  // Crear una notificación
  const createNotification = useCallback(async (data: {
    title: string;
    message: string;
    type: Notification['type'];
    orderId?: string;
    userId: string;
  }) => {
    if (!firestore) return;
    
    try {
      await addDoc(collection(firestore, 'notifications'), {
        ...data,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error creando notificación:', error);
    }
  }, [firestore]);

  // Marcar notificación como leída
  const markAsRead = useCallback(async (notificationId: string) => {
    if (!firestore) return;
    
    try {
      await updateDoc(doc(firestore, 'notifications', notificationId), {
        read: true
      });
    } catch (error) {
      console.error('Error marcando notificación:', error);
    }
  }, [firestore]);

  // Marcar todas como leídas
  const markAllAsRead = useCallback(async () => {
    if (!firestore) return;
    
    const unread = notifications.filter(n => !n.read);
    await Promise.all(unread.map(n => markAsRead(n.id)));
  }, [firestore, notifications, markAsRead]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    createNotification
  };
}
