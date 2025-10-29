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
      title: "Service Scheduled!",
      description: "Your appointment has been successfully booked.",
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Schedule a New Service</CardTitle>
          <CardDescription>
            Select a date, service, and time for your appointment.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>1. Select a Service</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Choose a service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="wash-fold">Wash & Fold</SelectItem>
                <SelectItem value="dry-clean">Dry Cleaning</SelectItem>
                <SelectItem value="bedding">Bedding & Comforters</SelectItem>
                <SelectItem value="specialty">Specialty Items</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>2. Select a Pickup Time</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Choose a time slot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Morning (9 AM - 12 PM)</SelectItem>
                <SelectItem value="afternoon">Afternoon (1 PM - 4 PM)</SelectItem>
                <SelectItem value="evening">Evening (5 PM - 8 PM)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" onClick={handleSchedule}>Confirm Appointment</Button>
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
