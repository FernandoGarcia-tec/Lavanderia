"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function SchedulePage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const { toast } = useToast();

  const handleSchedule = () => {
    toast({
      title: "¡Servicio Programado!",
      description: "Tu cita ha sido reservada con éxito.",
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Programar un Nuevo Servicio</CardTitle>
          <CardDescription>
            Selecciona una fecha, servicio y hora para tu cita.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>1. Selecciona un Servicio</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Elige un servicio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wash-fold">Lavado y Plegado</SelectItem>
                <SelectItem value="dry-clean">Lavado en Seco</SelectItem>
                <SelectItem value="bedding">Ropa de Cama y Edredones</SelectItem>
                <SelectItem value="specialty">Artículos Especiales</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>2. Selecciona una Hora de Recogida</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Elige un horario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Mañana (9 AM - 12 PM)</SelectItem>
                <SelectItem value="afternoon">Tarde (1 PM - 4 PM)</SelectItem>
                <SelectItem value="evening">Noche (5 PM - 8 PM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSchedule}>Confirmar Cita</Button>
        </CardContent>
      </Card>
      <div className="flex items-start justify-center">
         <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            className="rounded-md border"
            />
      </div>
    </div>
  );
}
