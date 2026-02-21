"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Building2, Users, AlertTriangle, MessageSquare, ChevronLeft,
  CheckCircle, XCircle, Star, Calendar, Megaphone, Loader2, Send,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatPrice, formatDate } from "@/lib/utils";

export default function ManagePropertyPage() {
  const params = useParams();
  const { data: session, status } = useSession();
  const router = useRouter();
  const [property, setProperty] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !params.slug) return;
    Promise.all([
      fetch(`/api/properties/${params.slug}`).then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/complaints").then((r) => r.json()),
    ]).then(([propData, bookData, compData]) => {
      setProperty(propData);
      setBookings((bookData.bookings || []).filter((b: any) => b.property?.slug === params.slug));
      setComplaints((compData.complaints || []).filter((c: any) => c.property?.slug === params.slug));
    }).catch(() => toast.error("Failed to load property"))
    .finally(() => setLoading(false));
  }, [status, params.slug]);

  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) { toast.error("Fill both title and message"); return; }
    setSendingAnnouncement(true);
    try {
      const studentIds = [...new Set(bookings.map((b: any) => b.studentId).filter(Boolean))];
      for (const studentId of studentIds) {
        await fetch("/api/notifications", { method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: studentId, title: announcementTitle, message: announcementMessage, link: `/services/${params.slug}` }) });
      }
      toast.success(`Announcement sent to ${studentIds.length} student(s)!`);
      setAnnouncementTitle(""); setAnnouncementMessage("");
    } catch { toast.error("Failed to send"); }
    finally { setSendingAnnouncement(false); }
  };

  if (status === "loading" || loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!property) return <div className="min-h-screen flex items-center justify-center"><p>Property not found</p></div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-gray-500 mt-1">{property.address}, {property.city}</p>
          </div>
          <Badge variant="success" className="text-sm">ACTIVE</Badge>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{bookings.length}</p><p className="text-xs text-gray-500">Total Bookings</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{formatPrice(bookings.reduce((s: number, b: any) => s + (b.grandTotal || 0), 0))}</p><p className="text-xs text-gray-500">Revenue</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{property.avgRating?.toFixed(1) || "0.0"}</p><p className="text-xs text-gray-500">Rating ({property.totalReviews} reviews)</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{complaints.filter((c: any) => c.status === "OPEN").length}</p><p className="text-xs text-gray-500">Open Complaints</p></CardContent></Card>
        </div>

        <Tabs defaultValue="bookings" className="space-y-4">
          <TabsList>
            <TabsTrigger value="bookings">Bookings ({bookings.length})</TabsTrigger>
            <TabsTrigger value="complaints">Complaints ({complaints.length})</TabsTrigger>
            <TabsTrigger value="announce">Announcements</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings" className="space-y-3">
            {bookings.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-gray-500">No bookings yet.</CardContent></Card>
            ) : bookings.map((booking: any) => (
              <Card key={booking.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{booking.student?.name || "Student"}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">#{booking.bookingNo}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatPrice(booking.grandTotal || 0)}</p>
                    <Badge variant={["ACTIVE", "CONFIRMED"].includes(booking.status) ? "success" : booking.status === "CANCELLED" ? "destructive" : "secondary"}>
                      {booking.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="complaints" className="space-y-3">
            {complaints.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-gray-500">No complaints.</CardContent></Card>
            ) : complaints.map((complaint: any) => (
              <Card key={complaint.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{complaint.title}</h3>
                      <p className="text-sm text-gray-600 mt-1">{complaint.description}</p>
                      <p className="text-xs text-gray-400 mt-2">By {complaint.student?.name || "Student"} &bull; {formatDate(complaint.createdAt)}</p>
                    </div>
                    <Badge variant={complaint.status === "OPEN" ? "destructive" : complaint.status === "RESOLVED" ? "success" : "secondary"}>
                      {complaint.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="announce">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" />Send Announcement</CardTitle>
                <CardDescription>Notify all students booked at this property</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Title</Label><Input placeholder="Water Supply Update" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} /></div>
                <div><Label>Message</Label><Textarea placeholder="Write your announcement..." rows={4} value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)} /></div>
                <Button onClick={handleSendAnnouncement} disabled={sendingAnnouncement}>
                  {sendingAnnouncement ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> :
                    <><Send className="h-4 w-4 mr-2" />Send to {[...new Set(bookings.map((b: any) => b.studentId))].length} Student(s)</>}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
