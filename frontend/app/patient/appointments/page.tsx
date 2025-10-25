"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function PatientAppointmentsPage() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Book Appointment</CardTitle>
          <CardDescription>Request an appointment with your preferred doctor</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="doctor">Doctor Name</Label>
              <Input id="doctor" placeholder="Dr. Jane Doe" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Preferred Date</Label>
              <Input id="date" type="date" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Preferred Time</Label>
              <Input id="time" type="time" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="type">Consultation Type</Label>
              <Input id="type" placeholder="Video / In-person" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" placeholder="Briefly describe your concern..." />
          </div>
          <Button className="w-full md:w-auto">Submit Request</Button>
        </CardContent>
      </Card>
    </main>
  )
}
