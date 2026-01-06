"use client";

import { useRef, useState, useEffect, useCallback } from 'react';
import { Scale, Usb, RefreshCw, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Tipos de WebSerial (moved to top)
type ParityType = 'none' | 'even' | 'odd' | 'mark' | 'space';
type FlowControlType = 'none' | 'hardware';

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
    getInfo: () => { usbVendorId?: number; usbProductId?: number };
  }
  
  interface SerialOptions {
    baudRate: number;
    dataBits?: 7 | 8;
    stopBits?: 1 | 2;
    parity?: ParityType;
    flowControl?: FlowControlType;
  }
}

// Configuración de la báscula Rhino BAR-9
const SCALE_CONFIG = {
  baudRate: 9600,
  dataBits: 8 as const,
  stopBits: 1 as const,
  parity: 'none' as ParityType,
  flowControl: 'none' as FlowControlType,
};

// Patrones para detectar peso en la respuesta
const WEIGHT_PATTERNS = [
  /([+-]?\d+\.?\d*)\s*kg/i,
  /ST,GS,\s*([+-]?\d+\.?\d*)/i,
  /([+-]?\d+\.?\d*)\s*g(?!s)/i,
  /^([+-]?\d+\.?\d*)$/,
];

interface ScaleInputProps {
  value: string;
  onChange: (value: string) => void;
  unit?: 'kg' | 'pieces';
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  id?: string;
}

/**
 * Input con soporte para báscula USB Rhino BAR-9
 * Usa comando "P" (Print) para solicitar peso
 */
export function ScaleInput({
  value,
  onChange,
  unit = 'kg',
  placeholder = 'Cantidad',
  disabled = false,
  className,
  label,
  id = 'scale-input',
}: ScaleInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [showHelp, setShowHelp] = useState(false);
  
  // Estado de conexión
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isWeighing, setIsWeighing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Referencias para WebSerial
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const isReadingRef = useRef(false);

  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator;

  // Parsear peso de los datos recibidos
  const parseWeight = useCallback((data: string): number | null => {
    for (const pattern of WEIGHT_PATTERNS) {
      const match = data.match(pattern);
      if (match && match[1]) {
        const weightValue = parseFloat(match[1]);
        if (!isNaN(weightValue) && weightValue >= 0) {
          return weightValue;
        }
      }
    }
    return null;
  }, []);

  // Leer datos del puerto serial
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
            const { value: chunk, done } = await readerRef.current.read();
            
            if (done) break;
            
            if (chunk) {
              buffer += decoder.decode(chunk, { stream: true });
              
              // Buscar líneas completas
              const lines = buffer.split(/[\r\n]+/);
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.trim()) {
                  console.log('Báscula:', line.trim());
                  const weight = parseWeight(line);
                  if (weight !== null) {
                    onChange(weight.toFixed(2));
                    setIsWeighing(false);
                  }
                }
              }
            }
          }
        } catch (readError: any) {
          if (readError.name !== 'NetworkError') {
            console.error('Error leyendo:', readError);
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
  }, [parseWeight, onChange]);

  // Conectar a la báscula
  const connect = async () => {
    if (!isSupported) {
      setError('Tu navegador no soporta WebSerial. Usa Chrome o Edge.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const port = await navigator.serial.requestPort();
      await port.open(SCALE_CONFIG);
      
      portRef.current = port;
      setIsConnected(true);
      setError(null);
      
      // Iniciar lectura continua
      startReading();
      
    } catch (err: any) {
      console.error('Error conectando:', err);
      
      if (err.name === 'NotFoundError') {
        setError('No se seleccionó ningún dispositivo.');
      } else if (err.name === 'NetworkError') {
        setError('El puerto ya está en uso.');
      } else {
        setError(`Error: ${err.message}`);
      }
      
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  // Desconectar
  const disconnect = async () => {
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
  };

  // Solicitar peso con comando P (Print)
  const requestWeight = async () => {
    if (!portRef.current?.writable) {
      setError('La báscula no está conectada.');
      return;
    }

    setIsWeighing(true);
    setError(null);

    try {
      const writer = portRef.current.writable.getWriter();
      const encoder = new TextEncoder();
      
      // Comando P (Print) - Funciona con Rhino BAR-9
      await writer.write(encoder.encode('P\r\n'));
      writer.releaseLock();
      
      // Timeout por si no hay respuesta
      setTimeout(() => {
        setIsWeighing(false);
      }, 3000);
      
    } catch (err: any) {
      setError(`Error: ${err.message}`);
      setIsWeighing(false);
    }
  };

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const handleConnect = async () => {
    if (isConnected) {
      await disconnect();
    } else {
      await connect();
    }
  };

  // Solo mostrar botones de báscula para unidad kg
  const showScaleButtons = unit === 'kg';

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="flex items-center gap-2">
          {label}
          {showScaleButtons && isConnected && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-600">
              <Scale className="w-3 h-3 mr-1" />
              Conectada
            </Badge>
          )}
        </Label>
      )}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            id={id}
            type="number"
            step="0.01"
            min="0"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className={cn(
              "pr-12 text-black placeholder:text-gray-400 bg-white border-slate-300 focus:border-cyan-500 focus:ring-cyan-500",
              isConnected && "border-green-500 focus:ring-green-500",
              className
            )}
            style={{ color: '#111', background: '#fff', caretColor: '#0891b2' }}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm bg-white px-1">
            {unit === 'kg' ? 'kg' : 'pzas'}
          </span>
        </div>
        
        {showScaleButtons && (
          <>
            {/* Botón Conectar/Desconectar */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant={isConnected ? "default" : "outline"}
                    size="icon"
                    onClick={handleConnect}
                    disabled={isConnecting || disabled}
                    className={cn(
                      "shrink-0",
                      isConnected && "bg-green-600 hover:bg-green-700"
                    )}
                  >
                    {isConnecting ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : isConnected ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Usb className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!isSupported ? (
                    'Usa Chrome o Edge'
                  ) : isConnected ? (
                    'Desconectar báscula'
                  ) : (
                    'Conectar báscula USB'
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Botón Pesar (solo visible cuando está conectada) */}
            {isConnected && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="default"
                      size="icon"
                      onClick={requestWeight}
                      disabled={isWeighing || disabled}
                      className="shrink-0 bg-cyan-600 hover:bg-cyan-700"
                    >
                      {isWeighing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Scale className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Obtener peso (Comando P)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {/* Botón Ayuda */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowHelp(true)}
                    className="shrink-0"
                  >
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Ayuda para la báscula
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-500 flex items-center gap-1">
          <X className="h-3 w-3" />
          {error}
        </p>
      )}

      {/* Modal de ayuda */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Báscula Rhino BAR-9
            </DialogTitle>
            <DialogDescription>
              Instrucciones de uso
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Opción WebSerial */}
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Usb className="h-4 w-4" />
                Conexión USB (Recomendada)
              </h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Conecta la báscula al puerto USB</li>
                <li>Haz clic en el botón USB <Usb className="h-3 w-3 inline" /></li>
                <li>Selecciona <strong>USB-SERIAL CH340 (COM5)</strong></li>
                <li>Haz clic en <Scale className="h-3 w-3 inline" /> para pesar</li>
              </ol>
              <p className="text-xs text-amber-600">
                ⚠️ Requiere Chrome o Edge
              </p>
            </div>

            {/* Opción HID */}
            <div className="border rounded-lg p-4 space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Modo Teclado (Alternativo)
              </h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Configura la báscula en modo HID</li>
                <li>Haz clic en el campo de cantidad</li>
                <li>Presiona <strong>PRINT</strong> en la báscula</li>
              </ol>
              <p className="text-xs text-green-600">
                ✓ Funciona en cualquier navegador
              </p>
            </div>

            {/* Info técnica */}
            <div className="bg-muted rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">Configuración técnica:</p>
              <ul className="text-muted-foreground text-xs space-y-0.5">
                <li>• Puerto: COM5 (USB-SERIAL CH340)</li>
                <li>• Velocidad: 9600 baudios</li>
                <li>• Comando: P (Print)</li>
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button onClick={() => setShowHelp(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/**
 * Indicador de estado de la báscula para el header/sidebar
 */
export function ScaleStatus() {
  const [isConnected] = useState(false);
  const isSupported = typeof navigator !== 'undefined' && 'serial' in navigator;
  
  if (!isSupported) return null;
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-2",
              isConnected && "text-green-600"
            )}
          >
            <Scale className="h-4 w-4" />
            <span className="text-xs text-muted-foreground">Báscula</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {isConnected ? 'Báscula conectada' : 'Báscula no conectada'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
