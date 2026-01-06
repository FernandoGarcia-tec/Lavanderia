import { useState, useCallback } from 'react';

interface ReceiptData {
  id: string;
  clientName: string;
  clientPhone?: string;
  staffName: string;
  items: Array<{
    serviceName: string;
    quantity: number;
    unit: string;
    subtotal: number;
  }>;
  estimatedTotal: number;
  paymentMethod: string;
  deliveryDate: Date;
  createdAt: Date;
  notes?: string;
  amountPaid?: number;
  change?: number;
}

export function useThermalPrinter() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [printerName, setPrinterName] = useState<string>('');
  const [device, setDevice] = useState<USBDevice | null>(null);

  // Connect to USB thermal printer
  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Check if Web USB API is supported
      if (!navigator.usb) {
        throw new Error('Web USB no soportado en este navegador. Usa Chrome/Edge.');
      }

      // Request USB device (user selects from dialog)
      const selectedDevice = await navigator.usb.requestDevice({
        filters: [
          // Common thermal printer vendor IDs
          { vendorId: 0x0416 }, // CUSTOM
          { vendorId: 0x04b8 }, // Epson
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x28e9 }, // ZJ - Common for 58mm printers
          { vendorId: 0x1fc9 }, // NXP (some POS printers)
          { vendorId: 0x0483 }, // STMicroelectronics
        ]
      });

      await selectedDevice.open();
      
      // Select first configuration if not already configured
      if (selectedDevice.configuration === null) {
        await selectedDevice.selectConfiguration(1);
      }

      // Claim the interface (usually interface 0)
      await selectedDevice.claimInterface(0);

      setDevice(selectedDevice);
      setPrinterName(selectedDevice.productName || 'Impresora Térmica USB');
      setIsConnected(true);
      setError(null);

    } catch (err: any) {
      console.error('Error connecting to printer:', err);
      
      if (err.name === 'NotFoundError') {
        setError('No se seleccionó ninguna impresora');
      } else if (err.name === 'SecurityError') {
        setError('Acceso denegado. Verifica permisos del navegador.');
      } else {
        setError(err.message || 'Error al conectar impresora USB');
      }
      
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect from printer
  const disconnect = useCallback(async () => {
    if (device) {
      try {
        await device.close();
        setDevice(null);
        setIsConnected(false);
        setPrinterName('');
        setError(null);
      } catch (err) {
        console.error('Error disconnecting:', err);
      }
    }
  }, [device]);

  // ESC/POS Commands (Standard thermal printer language)
  const ESC = 0x1b;
  const GS = 0x1d;

  const commands = {
    // Initialize printer
    init: [ESC, 0x40],
    // Text alignment
    alignLeft: [ESC, 0x61, 0x00],
    alignCenter: [ESC, 0x61, 0x01],
    alignRight: [ESC, 0x61, 0x02],
    // Text size (normal, double height, double width, double both)
    normal: [ESC, 0x21, 0x00],
    doubleHeight: [ESC, 0x21, 0x10],
    doubleWidth: [ESC, 0x21, 0x20],
    doubleBoth: [ESC, 0x21, 0x30],
    // Bold
    boldOn: [ESC, 0x45, 0x01],
    boldOff: [ESC, 0x45, 0x00],
    // Line feed
    lineFeed: [0x0a],
    // Cut paper (partial cut)
    cut: [GS, 0x56, 0x01],
  };

  // Convert string to bytes (UTF-8 encoding)
  const stringToBytes = (text: string): number[] => {
    const encoder = new TextEncoder();
    return Array.from(encoder.encode(text));
  };

  // Send data to printer
  const sendToPrinter = useCallback(async (data: number[]) => {
    if (!device || !isConnected) {
      throw new Error('Impresora no conectada');
    }

    try {
      // Find the OUT endpoint (usually endpoint 1 or 2)
      const iface = device.configuration?.interfaces[0];
      const endpoint = iface?.alternate.endpoints.find(ep => ep.direction === 'out');
      
      if (!endpoint) {
        throw new Error('No se encontró endpoint de salida');
      }

      // Send data in chunks (most printers have buffer limits)
      const chunkSize = 64;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        await device.transferOut(endpoint.endpointNumber, new Uint8Array(chunk));
      }

    } catch (err: any) {
      console.error('Error sending to printer:', err);
      throw new Error('Error al enviar datos a la impresora');
    }
  }, [device, isConnected]);

  // Print test page
  const printTest = useCallback(async () => {
    setIsPrinting(true);
    setError(null);

    try {
      const data: number[] = [
        ...commands.init,
        ...commands.alignCenter,
        ...commands.doubleBoth,
        ...commands.boldOn,
        ...stringToBytes('PRUEBA'),
        ...commands.lineFeed,
        ...commands.normal,
        ...commands.boldOff,
        ...stringToBytes('Sistema de Lavandería'),
        ...commands.lineFeed,
        ...commands.lineFeed,
        ...commands.alignLeft,
        ...stringToBytes('Impresora conectada correctamente'),
        ...commands.lineFeed,
        ...stringToBytes(`Fecha: ${new Date().toLocaleString('es-MX')}`),
        ...commands.lineFeed,
        ...commands.lineFeed,
        ...commands.lineFeed,
        ...commands.lineFeed,
        ...commands.cut,
      ];

      await sendToPrinter(data);
      return true;

    } catch (err: any) {
      console.error('Print test error:', err);
      setError(err.message || 'Error al imprimir prueba');
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [sendToPrinter]);

  // Print receipt
  const printReceipt = useCallback(async (receipt: ReceiptData) => {
    setIsPrinting(true);
    setError(null);

    try {
      const data: number[] = [
        ...commands.init,
        
        // Header
        ...commands.alignCenter,
        ...commands.doubleBoth,
        ...commands.boldOn,
        ...stringToBytes('LAVANDERIA ANGY'),
        ...commands.lineFeed,
        ...commands.normal,
        ...stringToBytes('Servicio de Calidad'),
        ...commands.lineFeed,
        ...commands.lineFeed,
        ...commands.boldOff,
        
        // Folio
        ...commands.boldOn,
        ...stringToBytes(`Folio: ${receipt.id.slice(0, 6).toUpperCase()}`),
        ...commands.lineFeed,
        ...commands.boldOff,
        ...stringToBytes(receipt.createdAt.toLocaleString('es-MX')),
        ...commands.lineFeed,
        ...stringToBytes('--------------------------------'),
        ...commands.lineFeed,
        ...commands.lineFeed,
        
        // Client info
        ...commands.alignLeft,
        ...stringToBytes(`Cliente: ${receipt.clientName}`),
        ...commands.lineFeed,
      ];

      if (receipt.clientPhone) {
        data.push(
          ...stringToBytes(`Tel: ${receipt.clientPhone}`),
          ...commands.lineFeed
        );
      }

      data.push(
        ...stringToBytes(`Atendio: ${receipt.staffName}`),
        ...commands.lineFeed,
        ...stringToBytes('--------------------------------'),
        ...commands.lineFeed,
        ...commands.lineFeed,
        
        // Items
        ...commands.boldOn,
        ...stringToBytes('SERVICIOS:'),
        ...commands.lineFeed,
        ...commands.boldOff
      );

      // Print each item
      receipt.items.forEach(item => {
        const line = `${item.serviceName} x${item.quantity}${item.unit === 'kg' ? 'kg' : 'pz'}`;
        const price = `$${item.subtotal.toFixed(2)}`;
        const spaces = ' '.repeat(Math.max(1, 32 - line.length - price.length));
        
        data.push(
          ...stringToBytes(line + spaces + price),
          ...commands.lineFeed
        );
      });

      data.push(
        ...commands.lineFeed,
        ...stringToBytes('================================'),
        ...commands.lineFeed,
        
        // Total
        ...commands.doubleBoth,
        ...commands.boldOn,
        ...stringToBytes(`TOTAL: $${receipt.estimatedTotal.toFixed(2)}`),
        ...commands.lineFeed,
        ...commands.normal,
        ...commands.boldOff,
        ...commands.lineFeed,
        
        // Payment info
        ...stringToBytes(`Pago: ${receipt.paymentMethod}`),
        ...commands.lineFeed,
        ...stringToBytes('--------------------------------'),
        ...commands.lineFeed,
        ...commands.lineFeed,
        
        // Delivery date
        ...commands.boldOn,
        ...stringToBytes('ENTREGA:'),
        ...commands.lineFeed,
        ...commands.boldOff,
        ...commands.alignCenter,
        ...stringToBytes(receipt.deliveryDate.toLocaleDateString('es-MX', { 
          weekday: 'long', 
          day: '2-digit', 
          month: '2-digit' 
        })),
        ...commands.lineFeed,
        ...commands.lineFeed,
      );

      if (receipt.notes) {
        data.push(
          ...commands.alignLeft,
          ...stringToBytes('Notas:'),
          ...commands.lineFeed,
          ...stringToBytes(receipt.notes),
          ...commands.lineFeed,
          ...commands.lineFeed
        );
      }

      data.push(
        ...commands.alignCenter,
        ...stringToBytes('--------------------------------'),
        ...commands.lineFeed,
        ...stringToBytes('Gracias por su preferencia!'),
        ...commands.lineFeed,
        ...stringToBytes('lavanderiaangy.vercel.app'),
        ...commands.lineFeed,
        ...stringToBytes('Conserve este ticket'),
        ...commands.lineFeed,
        ...commands.lineFeed,
        ...commands.lineFeed,
        ...commands.lineFeed,
        
        // Cut paper
        ...commands.cut
      );

      await sendToPrinter(data);
      return true;

    } catch (err: any) {
      console.error('Print receipt error:', err);
      setError(err.message || 'Error al imprimir recibo');
      return false;
    } finally {
      setIsPrinting(false);
    }
  }, [sendToPrinter]);

  return {
    isConnected,
    isConnecting,
    isPrinting,
    error,
    printerName,
    connect,
    disconnect,
    printTest,
    printReceipt,
  };
}