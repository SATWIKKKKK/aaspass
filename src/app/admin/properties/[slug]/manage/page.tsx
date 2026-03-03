"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import type { DragEvent } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Building2, Users, AlertTriangle, ChevronLeft, ChevronRight,
  Star, Calendar, Megaphone, Loader2, Send, Pencil, BarChart3,
  MapPin, Wifi, Wind, Utensils, Shirt, ShieldCheck, Save,
  X, Plus, ArrowUp, ArrowDown, ImageIcon, TrendingUp,
  DollarSign, CheckCircle, Clock, XCircle, Eye, Upload, UserPlus, Trash2,
  Search, Armchair, Minus, Filter,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, formatPrice, formatDate, SERVICE_TYPES } from "@/lib/utils";
import { uploadFile } from "@/lib/upload";

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const ACCEPTED_VIDEO_TYPES = ["video/mp4", "video/quicktime"];
const MAX_IMG_SIZE = 20 * 1024 * 1024;
const MAX_IMAGES = 15;

/* ───── Image entry type ───── */
interface ImageEntry { id: string; url: string; isWideShot: boolean; previewError: boolean; uploading?: boolean; file?: File; }

export default function ManagePropertyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const router = useRouter();

  const [property, setProperty] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  /* Announcement form */
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

  /* Edit form */
  const [editForm, setEditForm] = useState<any>(null);
  const [editImages, setEditImages] = useState<ImageEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [isDraggingEdit, setIsDraggingEdit] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const editDragCounter = useRef(0);

  /* Tab from URL */
  const defaultTab = searchParams.get("tab") || "bookings";

  /* Pricing plans state */
  const [pricingPlans, setPricingPlans] = useState<{ id?: string; label: string; durationDays: string; price: string; isActive: boolean }[]>([]);
  const [savingPlans, setSavingPlans] = useState(false);

  /* Visit Analytics state */
  const [visitStats, setVisitStats] = useState<{ totalViews: number; thisWeek: number; thisMonth: number } | null>(null);

  /* Service Students state */
  const [serviceStudents, setServiceStudents] = useState<any[]>([]);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentPhone, setNewStudentPhone] = useState("");
  const [addingStudent, setAddingStudent] = useState(false);
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<string | null>(null);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState<string>("ALL");
  const [updatingStudentStatus, setUpdatingStudentStatus] = useState<string | null>(null);
  const [updatingSeats, setUpdatingSeats] = useState(false);

  useEffect(() => { if (status === "unauthenticated") router.push("/login"); }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated" || !params.slug) return;
    Promise.all([
      fetch(`/api/properties/${params.slug}`).then((r) => r.json()),
      fetch("/api/bookings").then((r) => r.json()),
      fetch("/api/complaints").then((r) => r.json()),
      fetch("/api/announcements").then((r) => r.json()).catch(() => ({ announcements: [] })),
    ]).then(([propData, bookData, compData, announceData]) => {
      const prop = propData.property; // FIX: API returns { property: {...} }
      setProperty(prop);
      setBookings((bookData.bookings || []).filter((b: any) => b.property?.slug === params.slug));
      setComplaints((compData.complaints || []).filter((c: any) => c.property?.name === prop?.name));
      setAnnouncements(
        (announceData.announcements || []).filter((a: any) => a.propertyId === prop?.id)
      );

      // Initialize edit form from property data
      if (prop) {
        setEditForm({
          name: prop.name || "", serviceType: prop.serviceType || "HOSTEL",
          description: prop.description || "", price: String(prop.price || ""),
          gstRate: String(prop.gstRate || "18"),
          address: prop.address || "", city: prop.city || "", state: prop.state || "", pincode: prop.pincode || "",
          latitude: prop.latitude ? String(prop.latitude) : "",
          longitude: prop.longitude ? String(prop.longitude) : "",
          nearbyLandmark: prop.nearbyLandmark || "",
          distanceMarket: prop.distanceMarket || "", distanceInstitute: prop.distanceInstitute || "",
          isAC: prop.isAC || false, hasWifi: prop.hasWifi || false,
          forGender: prop.forGender || "", occupancy: prop.occupancy ? String(prop.occupancy) : "",
          foodIncluded: prop.foodIncluded || false, laundryIncluded: prop.laundryIncluded || false,
          hasMedical: prop.hasMedical || false,
          nearbyMess: prop.nearbyMess || "", nearbyLaundry: prop.nearbyLaundry || "",
          rules: prop.rules || "", cancellationPolicy: prop.cancellationPolicy || "",
        });
        setEditImages(
          (prop.images || []).map((img: any) => ({ id: Math.random().toString(36).slice(2), url: img.url, isWideShot: img.isWideShot, previewError: false }))
        );
        // Load pricing plans
        if (prop.pricingPlans && prop.pricingPlans.length > 0) {
          setPricingPlans(prop.pricingPlans.map((p: any) => ({
            id: p.id,
            label: p.label,
            durationDays: String(p.durationDays),
            price: String(p.price),
            isActive: p.isActive !== false,
          })));
        }
      }
    }).catch(() => toast.error("Failed to load service"))
      .finally(() => setLoading(false));
    // Fetch visit analytics
    fetch(`/api/properties/${params.slug}/visits`).then((r) => r.json())
      .then((data) => { if (!data.error) setVisitStats(data); }).catch(() => {});
    // Fetch service students
    fetch(`/api/properties/${params.slug}/students`).then((r) => r.json())
      .then((data) => setServiceStudents(data.students || [])).catch(() => {});
  }, [status, params.slug]);

  /* ─── Edit form helpers ─── */
  const updateEdit = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const val = e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value;
    setEditForm((p: any) => ({ ...p, [field]: val }));
  };
  const addEditImage = () => setEditImages((p) => [...p, { id: Math.random().toString(36).slice(2), url: "", isWideShot: false, previewError: false }]);
  const removeEditImage = (idx: number) => setEditImages((p) => { const item = p[idx]; if (item?.file && item.url?.startsWith("blob:")) URL.revokeObjectURL(item.url); return p.filter((_, i) => i !== idx); });
  const updateEditImageUrl = (idx: number, url: string) =>
    setEditImages((p) => p.map((img, i) => i === idx ? { ...img, url, previewError: false } : img));
  const moveEditImage = (idx: number, dir: -1 | 1) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= editImages.length) return;
    setEditImages((p) => { const a = [...p]; [a[idx], a[newIdx]] = [a[newIdx], a[idx]]; return a; });
  };

  /* Drag-drop for edit images */
  const processEditFiles = useCallback((files: FileList | File[]) => {
    const room = MAX_IMAGES - editImages.length;
    if (room <= 0) { toast.error(`Maximum ${MAX_IMAGES} images`); return; }
    const fileArr = Array.from(files).slice(0, room);
    const newEntries: ImageEntry[] = [];
    for (const file of fileArr) {
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type);
      const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
      if (!isImage && !isVideo) { toast.error(`Unsupported: ${file.name}`); continue; }
      if (file.size > MAX_IMG_SIZE) { toast.error(`${file.name} exceeds 20 MB`); continue; }
      newEntries.push({ id: Math.random().toString(36).slice(2), url: "", isWideShot: editImages.length === 0, previewError: false, uploading: true, file });
    }
    if (!newEntries.length) return;
    setEditImages((prev) => [...prev, ...newEntries]);
    for (const entry of newEntries) {
      if (!entry.file) continue;
      uploadFile(entry.file)
        .then((url) => setEditImages((prev) => prev.map((m) => m.id === entry.id ? { ...m, url, uploading: false } : m)))
        .catch((err: Error) => {
          setEditImages((prev) => prev.map((m) => m.id === entry.id ? { ...m, uploading: false, previewError: true } : m));
          toast.error(`Upload failed: ${err.message}`);
        });
    }
  }, [editImages.length]);

  const handleEditDragEnter = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); editDragCounter.current++; setIsDraggingEdit(true); };
  const handleEditDragLeave = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); editDragCounter.current--; if (editDragCounter.current === 0) setIsDraggingEdit(false); };
  const handleEditDragOver = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); };
  const handleEditDrop = (e: DragEvent) => { e.preventDefault(); e.stopPropagation(); setIsDraggingEdit(false); editDragCounter.current = 0; if (e.dataTransfer.files?.length) processEditFiles(e.dataTransfer.files); };

  const handleSaveEdit = async () => {
    if (!editForm.name || !editForm.price || !editForm.address || !editForm.city) {
      toast.error("Please fill required fields"); return;
    }
    setSaving(true);
    try {
      const body: any = {
        ...editForm,
        price: parseFloat(editForm.price), gstRate: parseFloat(editForm.gstRate) || 18,
        occupancy: editForm.occupancy ? parseInt(editForm.occupancy) : null,
        latitude: editForm.latitude ? parseFloat(editForm.latitude) : null,
        longitude: editForm.longitude ? parseFloat(editForm.longitude) : null,

      };
      if (editImages.some((img) => img.uploading)) {
        toast.error("Please wait — photos are still uploading");
        setSaving(false); return;
      }
      const validImages = editImages.filter((img) => img.url.trim());
      body.images = validImages.map((img) => ({ url: img.url.trim(), isWideShot: img.isWideShot }));

      const res = await fetch(`/api/properties/${params.slug}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Service updated!");
        setProperty(data.property);
        // Update slug in URL if changed
        if (data.property.slug !== params.slug) {
          router.replace(`/admin/properties/${data.property.slug}/manage?tab=edit`);
        }
      } else toast.error(data.error || "Failed to update");
    } catch { toast.error("Failed to update"); }
    finally { setSaving(false); }
  };

  /* ─── Pricing Plans Helpers ─── */
  const addPlan = () => setPricingPlans((p) => [...p, { label: "", durationDays: "30", price: "", isActive: true }]);
  const removePlan = (idx: number) => setPricingPlans((p) => p.filter((_, i) => i !== idx));
  const updatePlan = (idx: number, field: string, value: string | boolean) =>
    setPricingPlans((p) => p.map((plan, i) => i === idx ? { ...plan, [field]: value } : plan));

  const handleSavePlans = async () => {
    const validPlans = pricingPlans.filter((p) => p.label && p.durationDays && p.price);
    if (validPlans.length === 0 && pricingPlans.length > 0) {
      toast.error("Please fill all plan fields"); return;
    }
    setSavingPlans(true);
    try {
      const res = await fetch(`/api/properties/${params.slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricingPlans: validPlans }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Pricing plans saved!");
        if (data.property?.pricingPlans) {
          setPricingPlans(data.property.pricingPlans.map((p: any) => ({
            id: p.id, label: p.label, durationDays: String(p.durationDays), price: String(p.price), isActive: p.isActive !== false,
          })));
        }
      } else toast.error(data.error || "Failed to save plans");
    } catch { toast.error("Failed to save plans"); }
    finally { setSavingPlans(false); }
  };

  /* ─── Student Management ─── */
  const handleAddStudent = async () => {
    if (!newStudentName.trim() || (!newStudentEmail.trim() && !newStudentPhone.trim())) {
      toast.error("Name and email or phone required"); return;
    }
    setAddingStudent(true);
    try {
      const res = await fetch(`/api/properties/${params.slug}/students`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: [{ name: newStudentName.trim(), email: newStudentEmail.trim() || undefined, phone: newStudentPhone.trim() || undefined }] }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Added ${data.added} student(s), ${data.linked} linked to accounts`);
        setNewStudentName(""); setNewStudentEmail(""); setNewStudentPhone("");
        // Refresh list
        const listRes = await fetch(`/api/properties/${params.slug}/students`);
        const listData = await listRes.json();
        setServiceStudents(listData.students || []);
      } else toast.error(data.error || "Failed to add student");
    } catch { toast.error("Failed to add student"); }
    finally { setAddingStudent(false); }
  };

  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCSV(true);
    try {
      const text = await file.text();
      const lines = text.split("\n").filter((l) => l.trim());
      const students: { name: string; email?: string; phone?: string }[] = [];
      // Try to detect header
      const firstLine = lines[0].toLowerCase();
      const hasHeader = firstLine.includes("name") || firstLine.includes("email") || firstLine.includes("phone");
      const startIdx = hasHeader ? 1 : 0;
      for (let i = startIdx; i < lines.length; i++) {
        const cols = lines[i].split(/[,\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length >= 1 && cols[0]) {
          students.push({
            name: cols[0],
            ...(cols[1] && cols[1].includes("@") ? { email: cols[1] } : cols[1] ? { phone: cols[1] } : {}),
            ...(cols[2] ? (cols[2].includes("@") ? { email: cols[2] } : { phone: cols[2] }) : {}),
          });
        }
      }
      if (students.length === 0) { toast.error("No valid entries found"); setUploadingCSV(false); return; }
      const res = await fetch(`/api/properties/${params.slug}/students`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Processed ${data.total}: ${data.added} added, ${data.linked} linked, ${data.skipped} skipped`);
        const listRes = await fetch(`/api/properties/${params.slug}/students`);
        const listData = await listRes.json();
        setServiceStudents(listData.students || []);
      } else toast.error(data.error || "Upload failed");
    } catch { toast.error("Failed to process file"); }
    finally { setUploadingCSV(false); e.target.value = ""; }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm("Remove this student from the list?")) return;
    setDeletingStudent(id);
    try {
      const res = await fetch(`/api/properties/${params.slug}/students?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setServiceStudents((prev) => prev.filter((s) => s.id !== id));
        toast.success("Student removed");
      } else toast.error("Failed to remove");
    } catch { toast.error("Failed to remove"); }
    finally { setDeletingStudent(null); }
  };

  const handleStudentStatusChange = async (id: string, newStatus: string) => {
    setUpdatingStudentStatus(id);
    try {
      const res = await fetch(`/api/properties/${params.slug}/students`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: id, status: newStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setServiceStudents((prev) => prev.map((s) => s.id === id ? { ...s, status: newStatus } : s));
        toast.success(`Student marked as ${newStatus}`);
        // Refresh property to get updated seat count
        if (data.updatedProperty) {
          setProperty((p: any) => ({ ...p, availableRooms: data.updatedProperty.availableRooms }));
        }
      } else { const d = await res.json(); toast.error(d.error || "Failed"); }
    } catch { toast.error("Failed to update status"); }
    finally { setUpdatingStudentStatus(null); }
  };

  const handleQuickSeatUpdate = async (delta: number) => {
    const newVal = Math.max(0, Math.min(property.capacity || 9999, (property.availableRooms ?? 0) + delta));
    setUpdatingSeats(true);
    try {
      const res = await fetch(`/api/properties/${params.slug}/seats`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ availableRooms: newVal }),
      });
      if (res.ok) {
        setProperty((p: any) => ({ ...p, availableRooms: newVal }));
        toast.success("Seats updated");
      } else { const d = await res.json(); toast.error(d.error || "Failed"); }
    } catch { toast.error("Failed"); }
    finally { setUpdatingSeats(false); }
  };

  /* Filtered students */
  const filteredStudents = useMemo(() => {
    return serviceStudents.filter((s) => {
      const matchSearch = !studentSearch || s.name?.toLowerCase().includes(studentSearch.toLowerCase()) ||
        s.email?.toLowerCase().includes(studentSearch.toLowerCase()) || s.phone?.includes(studentSearch);
      const matchStatus = studentStatusFilter === "ALL" || (s.status || "ACTIVE") === studentStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [serviceStudents, studentSearch, studentStatusFilter]);

  /* ─── Announcement ─── */
  const handleSendAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementMessage.trim()) { toast.error("Fill both title and message"); return; }
    setSendingAnnouncement(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: announcementTitle, content: announcementMessage, propertyId: property.id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Announcement sent! ${data.notifiedCount || 0} student(s) notified`);
        setAnnouncementTitle(""); setAnnouncementMessage("");
        setAnnouncements((prev) => [data.announcement, ...prev].filter(Boolean));
      } else toast.error(data.error || "Failed to send");
    } catch { toast.error("Failed to send"); }
    finally { setSendingAnnouncement(false); }
  };

  /* ─── Analytics computed ─── */
  const analytics = useMemo(() => {
    const revenue = bookings.reduce((s: number, b: any) => s + (b.grandTotal || 0), 0);
    const active = bookings.filter((b: any) => ["ACTIVE", "CONFIRMED"].includes(b.status)).length;
    const completed = bookings.filter((b: any) => b.status === "COMPLETED").length;
    const cancelled = bookings.filter((b: any) => b.status === "CANCELLED").length;
    const pending = bookings.filter((b: any) => b.status === "PENDING").length;

    // Monthly breakdown (last 6 months)
    const now = new Date();
    const monthly = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
      const mB = bookings.filter((b: any) => { const d = new Date(b.createdAt); return d >= start && d <= end; });
      monthly.push({
        label: start.toLocaleString("en", { month: "short" }),
        bookings: mB.length,
        revenue: mB.reduce((s: number, b: any) => s + (b.grandTotal || 0), 0),
      });
    }
    return { revenue, active, completed, cancelled, pending, monthly };
  }, [bookings]);

  if (status === "loading" || loading)
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  if (!property)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <Building2 className="h-16 w-16 text-gray-300" />
        <p className="text-lg font-medium text-gray-500">Service not found</p>
        <Link href="/admin/dashboard"><Button variant="outline"><ChevronLeft className="h-4 w-4 mr-1" />Back to Dashboard</Button></Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar variant="admin" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/admin/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary mb-4">
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-gray-500 mt-1 flex items-center gap-1"><MapPin className="h-4 w-4" />{property.address}, {property.city}</p>
          </div>
          <Badge
            variant={property.status === "VERIFIED" ? "success" : property.status === "PENDING" ? "secondary" : "destructive"}
            className="text-sm"
          >
            {property.status}
          </Badge>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-blue-600">{bookings.length}</p><p className="text-xs text-gray-500">Total Bookings</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-green-600">{formatPrice(analytics.revenue)}</p><p className="text-xs text-gray-500">Revenue</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{property.avgRating?.toFixed(1) || "0.0"}</p><p className="text-xs text-gray-500">Rating ({property.totalReviews || 0} reviews)</p></CardContent></Card>
          <Card className="bg-linear-to-br from-purple-50 to-indigo-50 border-purple-100"><CardContent className="p-4 text-center"><Eye className="h-5 w-5 text-purple-600 mx-auto mb-1" /><p className="text-2xl font-bold text-purple-700">{visitStats?.totalViews ?? property.totalViews ?? 0}</p><p className="text-xs text-gray-500 font-semibold">Total Views (KPI)</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{complaints.filter((c: any) => c.status === "OPEN").length}</p><p className="text-xs text-gray-500">Open Complaints</p></CardContent></Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList className="flex flex-wrap">
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="plans">Pricing Plans</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="edit">Edit Service</TabsTrigger>
            <TabsTrigger value="visits">Visit Analytics</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="complaints">Complaints</TabsTrigger>
            <TabsTrigger value="announce">Announcements</TabsTrigger>
          </TabsList>

          {/* ══════ BOOKINGS TAB ══════ */}
          <TabsContent value="bookings" className="space-y-3">
            {bookings.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-gray-500"><Calendar className="h-10 w-10 mx-auto mb-3 text-gray-300" />No bookings yet.</CardContent></Card>
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

          {/* ══════ PRICING PLANS TAB ══════ */}
          <TabsContent value="plans" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" />Duration-Based Pricing Plans</CardTitle>
                <CardDescription>Define strict booking plans for students. Students can only book your service for these exact durations. If no plans are set, the legacy per-day pricing is used.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {pricingPlans.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <DollarSign className="h-10 w-10 mx-auto mb-3" />
                    <p className="text-sm">No pricing plans defined yet. Students can book for any duration using per-day pricing.</p>
                    <p className="text-xs mt-1 text-gray-400">Add plans to restrict booking to specific durations (e.g., Monthly, Quarterly, Yearly).</p>
                  </div>
                ) : (
                  pricingPlans.map((plan, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3 p-4 border border-gray-200 rounded-xl bg-white">
                      <div className="flex-1">
                        <Label className="text-xs">Plan Name *</Label>
                        <Input
                          placeholder="e.g. Monthly, Quarterly, Yearly"
                          value={plan.label}
                          onChange={(e) => updatePlan(idx, "label", e.target.value)}
                        />
                      </div>
                      <div className="w-full sm:w-32">
                        <Label className="text-xs">Duration (days) *</Label>
                        <Input
                          type="number"
                          placeholder="30"
                          value={plan.durationDays}
                          onChange={(e) => updatePlan(idx, "durationDays", e.target.value)}
                        />
                      </div>
                      <div className="w-full sm:w-36">
                        <Label className="text-xs">Price (₹) *</Label>
                        <Input
                          type="number"
                          placeholder="3000"
                          value={plan.price}
                          onChange={(e) => updatePlan(idx, "price", e.target.value)}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50" onClick={() => removePlan(idx)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <Button variant="outline" onClick={addPlan} className="w-full border-dashed">
                  <Plus className="h-4 w-4 mr-2" />Add Pricing Plan
                </Button>
                {pricingPlans.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                    <strong>Important:</strong> Once you save pricing plans, students will ONLY be able to book your service for these exact durations. They cannot choose arbitrary date ranges.
                  </div>
                )}
              </CardContent>
            </Card>
            <div className="flex justify-end">
              <Button onClick={handleSavePlans} disabled={savingPlans} size="lg">
                {savingPlans ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Pricing Plans</>}
              </Button>
            </div>
          </TabsContent>

          {/* ══════ EDIT TAB ══════ */}
          <TabsContent value="edit" className="space-y-6">
            {editForm && (
              <>
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Pencil className="h-5 w-5" />Edit Service Details</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>Service Name *</Label><Input value={editForm.name} onChange={updateEdit("name")} /></div>
                      <div><Label>Service Type</Label>
                        <select value={editForm.serviceType} onChange={updateEdit("serviceType")} className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm">
                          {SERVICE_TYPES.map((st) => <option key={st.value} value={st.value}>{st.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div><Label>Description</Label><Textarea value={editForm.description} onChange={updateEdit("description")} rows={4} /></div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div><Label>Monthly Price (₹) *</Label><Input type="number" value={editForm.price} onChange={updateEdit("price")} /></div>
                      <div><Label>GST Rate (%)</Label><Input type="number" value={editForm.gstRate} onChange={updateEdit("gstRate")} /></div>
                      <div><Label>Gender</Label>
                        <select value={editForm.forGender} onChange={updateEdit("forGender")} className="w-full h-10 rounded-md border border-gray-200 px-3 text-sm">
                          <option value="">Any</option><option value="MALE">Boys</option><option value="FEMALE">Girls</option>
                        </select>
                      </div>
                    </div>
                    <div><Label>Occupancy</Label><Input type="number" value={editForm.occupancy} onChange={updateEdit("occupancy")} /></div>

                    <div className="border-t pt-4">
                      <Label className="text-base font-semibold mb-3 block">Location</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div><Label>Address *</Label><Input value={editForm.address} onChange={updateEdit("address")} /></div>
                        <div><Label>City *</Label><Input value={editForm.city} onChange={updateEdit("city")} /></div>
                        <div><Label>State</Label><Input value={editForm.state} onChange={updateEdit("state")} /></div>
                        <div><Label>Pincode</Label><Input value={editForm.pincode} onChange={updateEdit("pincode")} /></div>
                      </div>
                      <div><Label className="mt-3 block">Nearby Landmark</Label><Input value={editForm.nearbyLandmark} onChange={updateEdit("nearbyLandmark")} /></div>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-base font-semibold mb-3 block">Amenities</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { field: "isAC", label: "Air Conditioned", icon: Wind },
                          { field: "hasWifi", label: "Free WiFi", icon: Wifi },
                          { field: "foodIncluded", label: "Food Included", icon: Utensils },
                          { field: "laundryIncluded", label: "Laundry", icon: Shirt },
                          { field: "hasMedical", label: "Medical", icon: ShieldCheck },
                        ].map((a) => (
                          <label key={a.field} className={cn("flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all text-sm",
                            editForm[a.field] ? "bg-primary/5 border-primary/30" : "bg-white border-gray-200"
                          )}>
                            <input type="checkbox" checked={editForm[a.field]} onChange={updateEdit(a.field)} className="rounded border-gray-300" />
                            <a.icon className="h-4 w-4 text-gray-600" />{a.label}
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <Label className="text-base font-semibold mb-3 block">Rules & Policy</Label>
                      <div><Label>Rules</Label><Textarea value={editForm.rules} onChange={updateEdit("rules")} rows={3} /></div>
                      <div className="mt-3"><Label>Cancellation Policy</Label><Textarea value={editForm.cancellationPolicy} onChange={updateEdit("cancellationPolicy")} rows={2} /></div>
                    </div>
                  </CardContent>
                </Card>

                {/* Edit Images */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><ImageIcon className="h-5 w-5" />Service Photos</CardTitle>
                    <CardDescription>Drag & drop, browse, or paste a URL. First image is the cover photo.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Hidden file input */}
                    <input
                      ref={editFileInputRef}
                      type="file"
                      multiple
                      accept={[...ACCEPTED_IMAGE_TYPES, ...ACCEPTED_VIDEO_TYPES].join(",")}
                      className="hidden"
                      onChange={(e) => { if (e.target.files) processEditFiles(e.target.files); e.target.value = ""; }}
                    />
                    {/* Drag-drop zone */}
                    <div
                      onDragEnter={handleEditDragEnter}
                      onDragLeave={handleEditDragLeave}
                      onDragOver={handleEditDragOver}
                      onDrop={handleEditDrop}
                      onClick={() => editFileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                        isDraggingEdit ? "border-primary bg-primary/5 scale-[1.01]" : "border-gray-200 hover:border-primary/50 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isDraggingEdit ? "bg-primary/10" : "bg-gray-100"}`}>
                          <Upload className={`h-5 w-5 ${isDraggingEdit ? "text-primary" : "text-gray-400"}`} />
                        </div>
                        <p className="text-sm font-medium text-gray-700">{isDraggingEdit ? "Drop files here!" : "Drag & drop or click to browse"}</p>
                        <p className="text-xs text-gray-400">JPG, PNG, WEBP, MP4 • max 20 MB</p>
                      </div>
                    </div>

                    {editImages.map((img, idx) => (
                      <div key={img.id} className="flex gap-3 p-3 border border-gray-200 rounded-xl bg-white">
                        <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200 relative">
                          {img.uploading ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-900/60">
                              <Loader2 className="h-6 w-6 text-white animate-spin" />
                              <span className="text-[9px] text-white/70 mt-0.5">Uploading…</span>
                            </div>
                          ) : img.url.trim() && !img.previewError ? (
                            <img src={img.url} alt="" className="w-full h-full object-cover" onError={() => setEditImages((p) => p.map((im) => im.id === img.id ? { ...im, previewError: true } : im))} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300"><ImageIcon className="h-6 w-6" /></div>
                          )}
                          {idx === 0 && !img.uploading && img.url.trim() && <span className="absolute top-0.5 left-0.5 bg-primary text-white text-[8px] font-bold px-1 py-0.5 rounded">COVER</span>}
                        </div>
                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                          <div>
                            {img.file ? (
                              <div>
                                <p className="text-sm font-medium text-gray-900 truncate">{img.file.name}</p>
                                <p className="text-xs mt-0.5">
                                  {img.uploading ? (
                                    <span className="text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Uploading…</span>
                                  ) : img.url ? (
                                    <span className="text-green-600">✓ Uploaded</span>
                                  ) : (
                                    <span className="text-red-500">Upload failed</span>
                                  )}
                                </p>
                              </div>
                            ) : (
                              <Input value={img.url} onChange={(e) => updateEditImageUrl(idx, e.target.value)} placeholder="https://..." className="text-sm" />
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <label className="flex items-center gap-1 text-xs text-gray-500 cursor-pointer">
                                <input type="checkbox" checked={img.isWideShot}
                                  onChange={() => setEditImages((p) => p.map((im) => im.id === img.id ? { ...im, isWideShot: !im.isWideShot } : im))}
                                  className="rounded border-gray-300 h-3 w-3" />Wide shot
                              </label>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveEditImage(idx, -1)} disabled={idx === 0}><ArrowUp className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => moveEditImage(idx, 1)} disabled={idx === editImages.length - 1}><ArrowDown className="h-3 w-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-500 hover:bg-red-50 ml-auto" onClick={() => removeEditImage(idx)}><X className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <Button variant="outline" onClick={addEditImage} className="flex-1 border-dashed" disabled={editImages.length >= MAX_IMAGES}>
                        <Plus className="h-4 w-4 mr-2" />Add by URL
                      </Button>
                      <Button variant="outline" onClick={() => editFileInputRef.current?.click()} disabled={editImages.length >= MAX_IMAGES}>
                        <Upload className="h-4 w-4 mr-2" />Browse Files
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={handleSaveEdit} disabled={saving} size="lg">
                    {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</> : <><Save className="h-4 w-4 mr-2" />Save Changes</>}
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

          {/* ══════ ANALYTICS TAB ══════ */}
          <TabsContent value="analytics" className="space-y-6">
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="bg-linear-to-br from-green-50 to-emerald-50 border-green-100">
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-green-700">{formatPrice(analytics.revenue)}</p>
                  <p className="text-xs text-gray-500">Total Revenue</p>
                </CardContent>
              </Card>
              <Card className="bg-linear-to-br from-blue-50 to-indigo-50 border-blue-100">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-6 w-6 text-blue-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-blue-700">{analytics.active}</p>
                  <p className="text-xs text-gray-500">Active Bookings</p>
                </CardContent>
              </Card>
              <Card className="bg-linear-to-br from-yellow-50 to-amber-50 border-yellow-100">
                <CardContent className="p-4 text-center">
                  <Clock className="h-6 w-6 text-yellow-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-yellow-700">{analytics.pending}</p>
                  <p className="text-xs text-gray-500">Pending</p>
                </CardContent>
              </Card>
              <Card className="bg-linear-to-br from-red-50 to-rose-50 border-red-100">
                <CardContent className="p-4 text-center">
                  <XCircle className="h-6 w-6 text-red-600 mx-auto mb-1" />
                  <p className="text-2xl font-bold text-red-700">{analytics.cancelled}</p>
                  <p className="text-xs text-gray-500">Cancelled</p>
                </CardContent>
              </Card>
            </div>

            {/* Monthly breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BarChart3 className="h-5 w-5" />Monthly Performance</CardTitle>
                <CardDescription>Bookings and revenue over the last 6 months</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {analytics.monthly.map((m, idx) => {
                    const maxRev = Math.max(...analytics.monthly.map((x) => x.revenue), 1);
                    const pct = (m.revenue / maxRev) * 100;
                    return (
                      <div key={idx} className="flex items-center gap-4">
                        <span className="text-sm font-medium text-gray-600 w-10">{m.label}</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden relative">
                          <div
                            className="h-full bg-linear-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(pct, 2)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-gray-700">
                            {formatPrice(m.revenue)} &middot; {m.bookings} bookings
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {analytics.monthly.every((m) => m.bookings === 0) && (
                  <div className="text-center py-8 text-gray-400">
                    <TrendingUp className="h-10 w-10 mx-auto mb-3" />
                    <p className="text-sm">No booking data yet. Analytics will appear here once you get bookings.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick stats */}
            <Card>
              <CardHeader><CardTitle>Service Overview</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Service Type</span><span className="font-medium capitalize">{property.serviceType?.toLowerCase()}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Monthly Price</span><span className="font-medium">{formatPrice(property.price)}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Avg Rating</span><span className="font-medium flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{property.avgRating?.toFixed(1) || "0.0"}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Total Reviews</span><span className="font-medium">{property.totalReviews || 0}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Total Bookings</span><span className="font-medium">{bookings.length}</span></div>
                  <div className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-500">Completed</span><span className="font-medium">{analytics.completed}</span></div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ══════ COMPLAINTS TAB ══════ */}
          <TabsContent value="complaints" className="space-y-3">
            {complaints.length === 0 ? (
              <Card><CardContent className="p-8 text-center text-gray-500"><AlertTriangle className="h-10 w-10 mx-auto mb-3 text-gray-300" />No complaints. Great job!</CardContent></Card>
            ) : complaints.map((complaint: any) => (
              <Card key={complaint.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium text-gray-900">{complaint.subject}</h3>
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

          {/* ══════ ANNOUNCEMENTS TAB ══════ */}
          <TabsContent value="announce" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5" />Send Announcement</CardTitle>
                <CardDescription>Notify all students booked at this service</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div><Label>Title</Label><Input placeholder="Water Supply Update" value={announcementTitle} onChange={(e) => setAnnouncementTitle(e.target.value)} /></div>
                <div><Label>Message</Label><Textarea placeholder="Write your announcement..." rows={4} value={announcementMessage} onChange={(e) => setAnnouncementMessage(e.target.value)} /></div>
                <Button onClick={handleSendAnnouncement} disabled={sendingAnnouncement}>
                  {sendingAnnouncement ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> :
                    <><Send className="h-4 w-4 mr-2" />Send Announcement</>}
                </Button>
              </CardContent>
            </Card>

            {/* Past announcements */}
            {announcements.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Past Announcements</h3>
                <div className="space-y-3">
                  {announcements.map((a: any) => (
                    <Card key={a.id}>
                      <CardContent className="p-4">
                        <h4 className="font-medium text-gray-900">{a.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{a.content}</p>
                        <p className="text-xs text-gray-400 mt-2">{formatDate(a.createdAt)}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Visit Analytics Tab */}
          <TabsContent value="visits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />Visit Analytics</CardTitle>
                <CardDescription>How many times your service listing has been viewed</CardDescription>
              </CardHeader>
              <CardContent>
                {visitStats ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-purple-50 rounded-xl p-5 text-center">
                      <p className="text-sm font-medium text-purple-600">Total Views</p>
                      <p className="text-3xl font-bold text-purple-700 mt-1">{visitStats.totalViews?.toLocaleString() ?? 0}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-5 text-center">
                      <p className="text-sm font-medium text-blue-600">This Week</p>
                      <p className="text-3xl font-bold text-blue-700 mt-1">{visitStats.thisWeek?.toLocaleString() ?? 0}</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-5 text-center">
                      <p className="text-sm font-medium text-green-600">This Month</p>
                      <p className="text-3xl font-bold text-green-700 mt-1">{visitStats.thisMonth?.toLocaleString() ?? 0}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Loading analytics...</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Student List Tab */}
          <TabsContent value="students" className="space-y-6">
            {/* Seat Overview */}
            {property.capacity && (
              <Card className="bg-linear-to-r from-indigo-50 to-purple-50 border-indigo-100">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-indigo-700 mb-2">Seat Availability</p>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-600">Capacity: <strong>{property.capacity}</strong></span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600">Available: <strong className={cn(
                          (property.availableRooms ?? 0) === 0 ? "text-red-600" :
                          (property.availableRooms ?? 0) <= Math.ceil(property.capacity * 0.1) ? "text-yellow-600" : "text-green-600"
                        )}>{property.availableRooms ?? 0}</strong></span>
                        <span className="text-gray-400">|</span>
                        <span className="text-gray-600">Students: <strong>{serviceStudents.filter(s => (s.status || "ACTIVE") === "ACTIVE").length}</strong></span>
                      </div>
                      <div className="w-full max-w-sm h-2.5 bg-white/50 rounded-full overflow-hidden mt-2">
                        {(() => {
                          const pct = Math.round(((property.capacity - (property.availableRooms ?? 0)) / property.capacity) * 100);
                          const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";
                          return <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${pct}%` }} />;
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-9 w-9 p-0 bg-white" onClick={() => handleQuickSeatUpdate(-1)} disabled={updatingSeats || (property.availableRooms ?? 0) <= 0}>
                        <Minus className="h-4 w-4" />
                      </Button>
                      <span className="text-2xl font-bold text-indigo-700 w-12 text-center">{property.availableRooms ?? 0}</span>
                      <Button size="sm" variant="outline" className="h-9 w-9 p-0 bg-white" onClick={() => handleQuickSeatUpdate(1)} disabled={updatingSeats || (property.availableRooms ?? 0) >= (property.capacity || 9999)}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" />Add Student</CardTitle>
                <CardDescription>Students in this list can leave reviews even without a booking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label>Name *</Label><Input placeholder="Student name" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} /></div>
                  <div><Label>Email</Label><Input placeholder="student@example.com" value={newStudentEmail} onChange={(e) => setNewStudentEmail(e.target.value)} /></div>
                  <div><Label>Phone</Label><Input placeholder="9876543210" value={newStudentPhone} onChange={(e) => setNewStudentPhone(e.target.value)} /></div>
                </div>
                <Button onClick={handleAddStudent} disabled={addingStudent}>
                  {addingStudent ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Adding...</> :
                    <><UserPlus className="h-4 w-4 mr-2" />Add Student</>}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Upload className="h-5 w-5" />Bulk Upload (CSV)</CardTitle>
                <CardDescription>Upload a CSV/TSV file with columns: name, email, phone. Header row is optional.</CardDescription>
              </CardHeader>
              <CardContent>
                <input type="file" accept=".csv,.tsv,.txt" disabled={uploadingCSV}
                  onChange={handleCSVUpload}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
                {uploadingCSV && <p className="text-sm text-gray-500 mt-2 flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Uploading...</p>}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle>Student List ({serviceStudents.length})</CardTitle>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input placeholder="Search students..." value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                        className="pl-9 h-9 w-48 text-sm" />
                    </div>
                    <select value={studentStatusFilter} onChange={(e) => setStudentStatusFilter(e.target.value)}
                      className="h-9 rounded-md border border-gray-200 px-2.5 text-sm bg-white">
                      <option value="ALL">All Status</option>
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="LEFT">Left</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <p className="text-gray-500 text-sm py-4 text-center">
                    {serviceStudents.length === 0 ? "No students added yet." : "No students match your filters."}
                  </p>
                ) : (
                  <div className="space-y-2 max-h-125 overflow-y-auto">
                    {filteredStudents.map((s: any) => {
                      const currentStatus = s.status || "ACTIVE";
                      const statusColors: Record<string, string> = {
                        ACTIVE: "bg-green-100 text-green-700",
                        INACTIVE: "bg-yellow-100 text-yellow-700",
                        LEFT: "bg-red-100 text-red-700",
                      };
                      return (
                        <div key={s.id} className={cn(
                          "flex items-center justify-between p-3 rounded-lg border transition-all",
                          currentStatus === "ACTIVE" ? "bg-white border-gray-200" :
                          currentStatus === "INACTIVE" ? "bg-yellow-50/50 border-yellow-100" : "bg-red-50/30 border-red-100"
                        )}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 truncate">{s.name}</p>
                              {s.userId && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">Linked</span>}
                              {s.seatNumber && <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">Seat: {s.seatNumber}</span>}
                            </div>
                            <p className="text-sm text-gray-500 truncate">
                              {s.email && <span>{s.email}</span>}
                              {s.email && s.phone && <span> · </span>}
                              {s.phone && <span>{s.phone}</span>}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {/* Status Toggle */}
                            <select
                              value={currentStatus}
                              onChange={(e) => handleStudentStatusChange(s.id, e.target.value)}
                              disabled={updatingStudentStatus === s.id}
                              className={cn(
                                "text-xs font-semibold rounded-full pl-2 pr-6 py-1 border-0 cursor-pointer appearance-none",
                                statusColors[currentStatus] || "bg-gray-100 text-gray-700"
                              )}
                              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 4px center" }}
                            >
                              <option value="ACTIVE">Active</option>
                              <option value="INACTIVE">Inactive</option>
                              <option value="LEFT">Left</option>
                            </select>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDeleteStudent(s.id)} disabled={deletingStudent === s.id}>
                              {deletingStudent === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-red-500" />}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
