"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function DoctorNotificationsPage() {
  return (
    <main className="p-6 max-w-3xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>Recent clinical updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-3">
            <div className="font-medium">New Patient Added</div>
            <div className="text-sm text-muted-foreground">Patient P-2345 added to your queue.</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-medium">Report Review</div>
            <div className="text-sm text-muted-foreground">New lab report waiting for your review.</div>
          </div>
          <div className="rounded-lg border p-3">
            <div className="font-medium">Consultation Feedback</div>
            <div className="text-sm text-muted-foreground">You received a new rating from a patient.</div>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
