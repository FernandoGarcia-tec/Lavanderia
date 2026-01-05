"use client";

import { useState, useEffect, useRef } from "react";
import { 
  Scale, 
  Usb, 
  RefreshCw, 
  Check, 
  X, 
  AlertCircle, 
  Plug, 
  Unplug,
  Terminal,
  Trash2,
  ArrowLeft,
  Wifi,
  WifiOff
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

// Configuraciones comunes de básculas
const BAUD_RATES = [9600, 4800, 19200, 38400, 57600, 115200];

interface LogEntry {
  time: string;
  type: 'info' | 'data' | 'error' | 'success';
  message: string;
}

export default function ScaleTestPage() {
  const { toast } = useToast();
  
  // Estado de conexión
  const [isSupported, setIsSupported] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [portInfo, setPortInfo] = useState<string>("");
  
  // Configuración
  const [baudRate, setBaudRate] = useState(9600);
  
  // Datos
  const [currentWeight, setCurrentWeight] = useState<string>("--");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rawData, setRawData] = useState<string>("");
  
  // Referencias
  const portRef = useRef<SerialPort | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const isReadingRef = useRef(false);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Verificar soporte de WebSerial
  useEffect(() => {
    setIsSupported('serial' in navigator);
    addLog('info', 'Página de diagnóstico de báscula iniciada');
    
    if ('serial' in navigator) {
      addLog('success', '✓ WebSerial API disponible (Chrome/Edge)');
    } else {
      addLog('error', '✗ WebSerial API no disponible. Usa Chrome o Edge.');
    }
  }, []);

  // Auto-scroll de logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (type: LogEntry['type'], message: string) => {
    const time = new Date().toLocaleTimeString('es-MX');
    setLogs(prev => [...prev.slice(-100), { time, type, message }]);
  };

  const clearLogs = () => {
    setLogs([]);
    setRawData("");
    addLog('info', 'Logs limpiados');
  };

  // Parsear peso de datos recibidos
  const parseWeight = (data: string): string | null => {
    // Patrones comunes de básculas
    const patterns = [
      /ST,GS,\s*([+-]?\d+\.?\d*)\s*(kg|g|lb)?/i,  // Formato estándar
      /([+-]?\d+\.?\d*)\s*(kg|g|lb)/i,             // Número con unidad
      /W:?\s*([+-]?\d+\.?\d*)/i,                   // W: 1.234
      /^([+-]?\d+\.?\d*)$/,                         // Solo número
    ];

    for (const pattern of patterns) {
      const match = data.match(pattern);
      if (match && match[1]) {
        const value = parseFloat(match[1]);
        if (!isNaN(value)) {
          const unit = match[2] || 'kg';
          return `${value.toFixed(3)} ${unit}`;
        }
      }
    }
    return null;
  };

  // Conectar a la báscula
  const connect = async () => {
    if (!isSupported) {
      toast({ title: "Error", description: "WebSerial no soportado", variant: "destructive" });
      return;
    }

    setIsConnecting(true);
    addLog('info', `Solicitando puerto serial (${baudRate} baudios)...`);

    try {
      const port = await navigator.serial.requestPort();
      
      // Obtener info del puerto
      const info = port.getInfo();
      const portDesc = info.usbVendorId 
        ? `USB VID:${info.usbVendorId.toString(16)} PID:${info.usbProductId?.toString(16)}`
        : 'Puerto serial';
      setPortInfo(portDesc);
      addLog('info', `Puerto seleccionado: ${portDesc}`);

      await port.open({
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
      });

      portRef.current = port;
      setIsConnected(true);
      addLog('success', `✓ Conectado exitosamente a ${baudRate} baudios`);
      
      toast({ title: "Conectado", description: "Báscula conectada correctamente" });

      // Iniciar lectura
      startReading();

    } catch (err: any) {
      console.error(err);
      
      if (err.name === 'NotFoundError') {
        addLog('error', 'No se seleccionó ningún puerto');
      } else if (err.name === 'NetworkError') {
        addLog('error', 'El puerto está en uso por otra aplicación');
      } else if (err.name === 'InvalidStateError') {
        addLog('error', 'El puerto ya está abierto');
      } else {
        addLog('error', `Error: ${err.message}`);
      }
      
      toast({ title: "Error de conexión", description: err.message, variant: "destructive" });
    } finally {
      setIsConnecting(false);
    }
  };

  // Leer datos del puerto
  const startReading = async () => {
    if (!portRef.current || isReadingRef.current) return;
    
    isReadingRef.current = true;
    addLog('info', 'Iniciando lectura de datos...');
    
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (portRef.current?.readable && isReadingRef.current) {
        readerRef.current = portRef.current.readable.getReader();
        
        try {
          while (true) {
            const { value, done } = await readerRef.current.read();
            
            if (done) {
              addLog('info', 'Lectura terminada');
              break;
            }
            
            if (value) {
              const text = decoder.decode(value, { stream: true });
              buffer += text;
              
              // Mostrar datos crudos (hex y texto)
              const hexData = Array.from(value).map(b => b.toString(16).padStart(2, '0')).join(' ');
              setRawData(prev => (prev + text).slice(-500));
              
              // Buscar líneas completas
              const lines = buffer.split(/[\r\n]+/);
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.trim()) {
                  addLog('data', `← ${line.trim()}`);
                  
                  // Intentar parsear peso
                  const weight = parseWeight(line);
                  if (weight) {
                    setCurrentWeight(weight);
                    addLog('success', `Peso detectado: ${weight}`);
                  }
                }
              }
            }
          }
        } catch (readError: any) {
          if (readError.name !== 'NetworkError' && isReadingRef.current) {
            addLog('error', `Error de lectura: ${readError.message}`);
          }
        } finally {
          readerRef.current?.releaseLock();
          readerRef.current = null;
        }
      }
    } catch (err: any) {
      addLog('error', `Error en ciclo de lectura: ${err.message}`);
    }
    
    isReadingRef.current = false;
  };

  // Desconectar
  const disconnect = async () => {
    addLog('info', 'Desconectando...');
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
      
      setIsConnected(false);
      setCurrentWeight("--");
      setPortInfo("");
      addLog('success', '✓ Desconectado');
      toast({ title: "Desconectado", description: "Báscula desconectada" });
      
    } catch (err: any) {
      addLog('error', `Error al desconectar: ${err.message}`);
    }
  };

  // Enviar comando a la báscula
  const sendCommand = async (cmd: string) => {
    if (!portRef.current?.writable) {
      addLog('error', 'Puerto no disponible para escritura');
      return;
    }

    try {
      const writer = portRef.current.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(cmd + '\r\n'));
      writer.releaseLock();
      addLog('info', `→ Enviado: "${cmd}"`);
    } catch (err: any) {
      addLog('error', `Error enviando comando: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-cyan-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/staff/services">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Scale className="h-6 w-6 text-cyan-600" />
                Diagnóstico de Báscula
              </h1>
              <p className="text-slate-500 text-sm">Rhino BAR-9 / USB Serial</p>
            </div>
          </div>
          
          <Badge 
            variant={isConnected ? "default" : "secondary"}
            className={isConnected ? "bg-green-100 text-green-700 border-green-200" : ""}
          >
            {isConnected ? (
              <><Wifi className="h-3 w-3 mr-1" /> Conectada</>
            ) : (
              <><WifiOff className="h-3 w-3 mr-1" /> Desconectada</>
            )}
          </Badge>
        </div>

        {/* Soporte del navegador */}
        {!isSupported && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Navegador no compatible</p>
                <p className="text-sm text-amber-700">
                  WebSerial API solo funciona en <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong>.
                  Por favor abre esta página en uno de esos navegadores.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          
          {/* Panel de Conexión */}
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Usb className="h-5 w-5 text-cyan-600" />
                Conexión
              </CardTitle>
              <CardDescription>Configura y conecta la báscula</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              
              <div className="space-y-2">
                <Label>Velocidad (Baud Rate)</Label>
                <Select 
                  value={baudRate.toString()} 
                  onValueChange={(v) => setBaudRate(parseInt(v))}
                  disabled={isConnected}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BAUD_RATES.map(rate => (
                      <SelectItem key={rate} value={rate.toString()}>
                        {rate} baudios {rate === 9600 && "(común)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  La Rhino BAR-9 generalmente usa 9600 baudios
                </p>
              </div>

              {portInfo && (
                <div className="bg-slate-50 p-3 rounded-xl text-sm">
                  <span className="text-slate-500">Puerto: </span>
                  <span className="font-mono text-slate-700">{portInfo}</span>
                </div>
              )}

              <div className="flex gap-2">
                {!isConnected ? (
                  <Button 
                    onClick={connect}
                    disabled={!isSupported || isConnecting}
                    className="flex-1 bg-cyan-600 hover:bg-cyan-700 rounded-xl"
                  >
                    {isConnecting ? (
                      <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Conectando...</>
                    ) : (
                      <><Plug className="h-4 w-4 mr-2" /> Conectar Báscula</>
                    )}
                  </Button>
                ) : (
                  <Button 
                    onClick={disconnect}
                    variant="destructive"
                    className="flex-1 rounded-xl"
                  >
                    <Unplug className="h-4 w-4 mr-2" /> Desconectar
                  </Button>
                )}
              </div>

              {/* Comandos rápidos */}
              {isConnected && (
                <div className="space-y-2 pt-2 border-t">
                  <Label className="text-xs text-slate-500">Comandos de prueba</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => sendCommand('W')} className="rounded-lg text-xs">
                      W (Peso)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendCommand('P')} className="rounded-lg text-xs">
                      P (Print)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendCommand('S')} className="rounded-lg text-xs">
                      S (Stable)
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => sendCommand('Z')} className="rounded-lg text-xs">
                      Z (Zero)
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Panel de Peso */}
          <Card className={`border-slate-200 ${isConnected ? 'ring-2 ring-green-200' : ''}`}>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Scale className="h-5 w-5 text-cyan-600" />
                Lectura Actual
              </CardTitle>
              <CardDescription>Peso detectado de la báscula</CardDescription>
            </CardHeader>
            <CardContent>
              <div className={`
                text-center py-8 rounded-2xl border-2 border-dashed transition-all
                ${isConnected 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-slate-200 bg-slate-50'
                }
              `}>
                <div className={`
                  text-5xl font-bold font-mono tracking-tight
                  ${isConnected ? 'text-green-700' : 'text-slate-300'}
                `}>
                  {currentWeight}
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  {isConnected 
                    ? 'Coloca un objeto en la báscula' 
                    : 'Conecta la báscula para ver el peso'
                  }
                </p>
              </div>

              {/* Datos crudos */}
              {rawData && (
                <div className="mt-4 space-y-1">
                  <Label className="text-xs text-slate-500">Datos crudos (últimos caracteres)</Label>
                  <div className="bg-slate-900 text-green-400 p-3 rounded-lg font-mono text-xs overflow-x-auto">
                    {rawData.replace(/\r/g, '\\r').replace(/\n/g, '\\n')}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Consola de Logs */}
        <Card className="border-slate-200">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Terminal className="h-5 w-5 text-cyan-600" />
                Consola de Comunicación
              </CardTitle>
              <CardDescription>Registro de eventos y datos</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={clearLogs} className="text-slate-500">
              <Trash2 className="h-4 w-4 mr-1" /> Limpiar
            </Button>
          </CardHeader>
          <CardContent>
            <div className="bg-slate-900 rounded-xl p-4 h-64 overflow-y-auto font-mono text-sm">
              {logs.length === 0 ? (
                <p className="text-slate-500">Sin eventos...</p>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-slate-500 shrink-0">[{log.time}]</span>
                    <span className={
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-green-400' :
                      log.type === 'data' ? 'text-cyan-400' :
                      'text-slate-400'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              <div ref={logsEndRef} />
            </div>
          </CardContent>
        </Card>

        {/* Instrucciones */}
        <Card className="border-slate-200 bg-white/50">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-800 mb-3">📋 Instrucciones para Rhino BAR-9</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-600">
              <div>
                <p className="font-medium text-slate-700 mb-1">Configuración física:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Conecta el cable USB a la PC</li>
                  <li>Enciende la báscula</li>
                  <li>Verifica que aparezca en COM5 (o similar)</li>
                  <li>Velocidad típica: 9600 baudios</li>
                </ul>
              </div>
              <div>
                <p className="font-medium text-slate-700 mb-1">Solución de problemas:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Si no aparece el puerto, reinstala drivers CH340</li>
                  <li>Cierra otras apps que usen el puerto (Ej: Hyperterminal)</li>
                  <li>Prueba diferentes velocidades de baudios</li>
                  <li>Verifica los switches DIP de la báscula</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
