"use client";

import { useState, useEffect } from "react";
import { gsap } from "@/lib/gsap";
import toast from "react-hot-toast";
import { useSession } from "next-auth/react";
import { Mail, Phone, MapPin, Send, MessageSquare, Loader2, CheckCircle2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  const { data: session } = useSession();
  const [form, setForm] = useState({ name: session?.user?.name || "", email: session?.user?.email || "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [friendlyError, setFriendlyError] = useState("");

  // GSAP entrance
  useEffect(() => {
    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
    tl.fromTo("[data-gsap='contact-title']", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.5 })
      .fromTo("[data-gsap='contact-form']", { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.4 }, "-=0.2")
      .fromTo("[data-gsap='contact-info']", { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.08 }, "-=0.2");
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFriendlyError("");
    if (!form.name || !form.email || !form.subject || !form.message) { toast.error("Please fill all fields"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        toast.success(data.message || "Message sent successfully!");
      } else {
        if (res.status === 502) {
          const message = "Email service is temporarily busy. Please retry in a minute.";
          setFriendlyError(message);
          toast.error(message);
        } else {
          toast.error(data.error || "Failed to send message");
        }
      }
    } catch {
      const message = "Network issue while sending your message. Please check your connection and retry.";
      setFriendlyError(message);
      toast.error(message);
    }
    finally { setSending(false); }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar variant={session ? ((session.user as any)?.role === "OWNER" ? "admin" : "student") : "public"} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div data-gsap="contact-title" className="text-center mb-12" style={{ opacity: 0 }}>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">Get in Touch</h1>
          <p className="text-lg text-gray-600">Have questions? We&apos;d love to hear from you.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div data-gsap="contact-form" className="md:col-span-2" style={{ opacity: 0 }}>
            {sent ? (
              <Card><CardContent className="p-12 text-center"><CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" /><h2 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h2><p className="text-gray-500 mb-6">We&apos;ll get back to you within 24 hours.</p><Button onClick={() => { setSent(false); setForm({ name: "", email: "", subject: "", message: "" }); }}>Send Another</Button></CardContent></Card>
            ) : (
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Send a Message</CardTitle></CardHeader>
                <CardContent>
                  {friendlyError ? (
                    <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {friendlyError}
                    </div>
                  ) : null}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><Label>Name</Label><Input placeholder="Your name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required /></div>
                      <div><Label>Email</Label><Input type="email" placeholder="you@example.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required /></div>
                    </div>
                    <div><Label>Subject</Label><Input placeholder="How can we help?" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} required /></div>
                    <div><Label>Message</Label><Textarea placeholder="Tell us more..." rows={6} value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} required /></div>
                    <Button type="submit" className="w-full" disabled={sending}>{sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Send className="h-4 w-4 mr-2" />Send Message</>}</Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card data-gsap="contact-info" style={{ opacity: 0 }}><CardContent className="p-6"><div className="flex items-start gap-3"><div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0"><Mail className="h-5 w-5 text-blue-600" /></div><div><h3 className="font-semibold text-gray-900">Email</h3><a href="https://mail.google.com/mail/?view=cm&fs=1&to=aaspass001@gmail.com" target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">aaspass001@gmail.com</a></div></div></CardContent></Card>
            <Card data-gsap="contact-info" style={{ opacity: 0 }}><CardContent className="p-6"><div className="flex items-start gap-3"><div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center shrink-0"><Phone className="h-5 w-5 text-green-600" /></div><div><h3 className="font-semibold text-gray-900">Phone</h3><a href="tel:+918690861854" className="text-sm text-primary hover:underline">+91 8690861854</a><p className="text-xs text-gray-400 mt-1">Mon-Sat, 9AM-6PM</p></div></div></CardContent></Card>
            <Card data-gsap="contact-info" style={{ opacity: 0 }}><CardContent className="p-6"><div className="flex items-start gap-3"><div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0"><MapPin className="h-5 w-5 text-purple-600" /></div><div><h3 className="font-semibold text-gray-900">Office</h3><p className="text-sm text-gray-600">Hostel 4,<br />IIT Bombay</p></div></div></CardContent></Card>
            <a href="https://mail.google.com/mail/?view=cm&fs=1&to=aaspass001@gmail.com" target="_blank" rel="noopener noreferrer" className="block" data-gsap="contact-info" style={{ opacity: 0 }}>
              <Button className="w-full gap-2" size="lg">
                <Mail className="h-5 w-5" />Contact Us
              </Button>
            </a>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
