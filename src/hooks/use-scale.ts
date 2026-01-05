"use client";

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Hook para integrar báscula Rhino BAR-9 u otras básculas USB
 * 
 * Soporta dos modos:
 * 1. WebSerial API - Comunicación directa con la báscula
 * 2. Modo HID (teclado) - La báscula envía peso como texto al campo enfocado
 */

// Configuración típica de la báscula Rhino BAR-9
const SCALE_CONFIG = {
  baudRate: 9600, // Velocidad típica de la BAR-9
  dataBits: 8 as const,
  stopBits: 1 as const,
  parity: 'none' as ParityType,
  flowControl: 'none' as FlowControlType,
};

// Patrones comunes de respuesta de básculas
// La BAR-9 suele enviar: "ST,GS,  0.000 kg" o similar
const WEIGHT_PATTERNS = [
  /(\d+\.?\d*)\s*kg/i,           // "1.234 kg"
  /(\d+\.?\d*)\s*lb/i,           // "1.234 lb"  
  /ST,GS,\s*(\d+\.?\d*)/i,       // "ST,GS,  1.234"
  /(\d+\.?\d*)/,                  // Cualquier número decimal
];

interface UseScaleOptions {
  onWeightReceived?: (weight: number, unit: string) => void;
  autoConnect?: boolean;
}

interface UseScaleReturn {
  // Estado
  isConnected: boolean;
  isConnecting: boolean;
  weight: number | null;
  unit: string;
  error: string | null;
  isSupported: boolean;
  
  // Acciones
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  requestWeight: () => Promise<number | null>;
  clearWeight: () => void;
}

export function useScale(options: UseScaleOptions = {}): UseScaleReturn {
  const { onWeightReceived } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [weight, setWeight] = useState<number | null>(null);
  const [unit, setUnit] = useState<string>('kg');
  const [error, setError] = useState<string | null>(null);
  
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const isReadingRef = useRef(false);

  // Verificar si WebSerial está disponible
  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

  // Parsear peso de la respuesta de la báscula
  const parseWeight = useCallback((data: string): { weight: number; unit: string } | null => {
    for (const pattern of WEIGHT_PATTERNS) {
      const match = data.match(pattern);
      if (match && match[1]) {
        const weightValue = parseFloat(match[1]);
        if (!isNaN(weightValue) && weightValue >= 0) {
          // Detectar unidad
          let detectedUnit = 'kg';
          if (data.toLowerCase().includes('lb')) {
            detectedUnit = 'lb';
          } else if (data.toLowerCase().includes('g') && !data.toLowerCase().includes('kg')) {
            detectedUnit = 'g';
          }
          return { weight: weightValue, unit: detectedUnit };
        }
      }
    }
    return null;
  }, []);

  // Leer datos continuamente del puerto serial
  const startReading = useCallback(async () => {
    if (!portRef.current || isReadingRef.current) return;
    
    isReadingRef.current = true;
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (portRef.current?.readable && isReadingRef.current) {
        readerRef.current = portRef.current.readable.getReader();
        
        try {
          while (true) {
            const { value, done } = await readerRef.current.read();
            
            if (done) {
              break;
            }
            
            if (value) {
              buffer += decoder.decode(value, { stream: true });
              
              // Buscar líneas completas (terminadas en \n o \r)
              const lines = buffer.split(/[\r\n]+/);
              buffer = lines.pop() || ''; // Mantener datos incompletos
              
              for (const line of lines) {
                if (line.trim()) {
                  const parsed = parseWeight(line);
                  if (parsed) {
                    setWeight(parsed.weight);
                    setUnit(parsed.unit);
                    onWeightReceived?.(parsed.weight, parsed.unit);
                  }
                }
              }
            }
          }
        } catch (readError: any) {
          if (readError.name !== 'NetworkError') {
            console.error('Error leyendo de la báscula:', readError);
          }
        } finally {
          readerRef.current?.releaseLock();
          readerRef.current = null;
        }
      }
    } catch (err) {
      console.error('Error en ciclo de lectura:', err);
    }
    
    isReadingRef.current = false;
  }, [parseWeight, onWeightReceived]);

  // Conectar a la báscula
  const connect = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Tu navegador no soporta WebSerial. Usa Chrome o Edge.');
      return false;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Solicitar puerto al usuario
      const port = await navigator.serial.requestPort({
        // Filtros opcionales para USB Vendor/Product IDs de la báscula
        // filters: [{ usbVendorId: 0x0483 }] // Ajustar según la báscula
      });

      await port.open(SCALE_CONFIG);
      
      portRef.current = port;
      setIsConnected(true);
      setError(null);
      
      // Iniciar lectura continua
      startReading();
      
      return true;
    } catch (err: any) {
      console.error('Error conectando a la báscula:', err);
      
      if (err.name === 'NotFoundError') {
        setError('No se seleccionó ningún dispositivo.');
      } else if (err.name === 'NetworkError') {
        setError('El puerto ya está en uso por otra aplicación.');
      } else {
        setError(`Error de conexión: ${err.message}`);
      }
      
      setIsConnected(false);
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [isSupported, startReading]);

  // Desconectar
  const disconnect = useCallback(async (): Promise<void> => {
    isReadingRef.current = false;
    
    try {
      if (readerRef.current) {
        await readerRef.current.cancel();
        readerRef.current = null;
      }
      
      if (portRef.current) {
        await portRef.current.close();
        portRef.current = null;
      }
    } catch (err) {
      console.error('Error al desconectar:', err);
    }
    
    setIsConnected(false);
    setWeight(null);
  }, []);

  // Solicitar peso (enviar comando a la báscula)
  const requestWeight = useCallback(async (): Promise<number | null> => {
    if (!portRef.current?.writable) {
      setError('La báscula no está conectada.');
      return null;
    }

    try {
      const writer = portRef.current.writable.getWriter();
      const encoder = new TextEncoder();
      
      // Comando P (Print) - Confirmado que funciona con Rhino BAR-9
      await writer.write(encoder.encode('P\r\n'));
      writer.releaseLock();
      
      // El peso se recibirá en el ciclo de lectura
      return weight;
    } catch (err: any) {
      setError(`Error solicitando peso: ${err.message}`);
      return null;
    }
  }, [weight]);

  // Limpiar peso actual
  const clearWeight = useCallback(() => {
    setWeight(null);
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isConnecting,
    weight,
    unit,
    error,
    isSupported,
    connect,
    disconnect,
    requestWeight,
    clearWeight,
  };
}

/**
 * Hook simplificado para modo HID (teclado)
 * La báscula envía el peso como texto cuando presionas su botón PRINT
 * 
 * Uso:
 * 1. Configura la báscula en modo "Keyboard" o "HID"
 * 2. Enfoca el input donde quieres recibir el peso
 * 3. Presiona el botón PRINT en la báscula
 */
export function useScaleHID(inputRef: React.RefObject<HTMLInputElement>) {
  const [lastWeight, setLastWeight] = useState<number | null>(null);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    // La báscula en modo HID simula teclas rápidamente
    // Detectamos cuando se escribe un peso completo
    let timeout: NodeJS.Timeout | null = null;
    let lastValue = input.value;

    const handleInput = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const currentValue = target.value;
      
      // Limpiar timeout anterior
      if (timeout) clearTimeout(timeout);
      
      // Esperar un momento para que lleguen todos los caracteres
      timeout = setTimeout(() => {
        // Verificar si parece un peso de la báscula
        const weightMatch = currentValue.match(/(\d+\.?\d*)/);
        if (weightMatch) {
          const weightValue = parseFloat(weightMatch[1]);
          if (!isNaN(weightValue) && weightValue > 0) {
            setLastWeight(weightValue);
          }
        }
        lastValue = currentValue;
      }, 100); // Esperar 100ms después del último caracter
    };

    input.addEventListener('input', handleInput);
    
    return () => {
      input.removeEventListener('input', handleInput);
      if (timeout) clearTimeout(timeout);
    };
  }, [inputRef]);

  return { lastWeight };
}

// Tipos de WebSerial (para TypeScript)
type ParityType = 'none' | 'even' | 'odd' | 'mark' | 'space';
type FlowControlType = 'none' | 'hardware';

// Extender Window para WebSerial
declare global {
  interface Navigator {
    serial: {
      requestPort: (options?: SerialPortRequestOptions) => Promise<SerialPort>;
      getPorts: () => Promise<SerialPort[]>;
    };
  }
  
  interface SerialPortRequestOptions {
    filters?: Array<{ usbVendorId?: number; usbProductId?: number }>;
  }
  
  interface SerialPort {
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
    open: (options: SerialOptions) => Promise<void>;
    close: () => Promise<void>;
  }
  
  interface SerialOptions {
    baudRate: number;
    dataBits?: 7 | 8;
    stopBits?: 1 | 2;
    parity?: ParityType;
    flowControl?: FlowControlType;
  }
}
