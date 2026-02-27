"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Bot, Send, User, Crown, Sparkles, Loader2, Plus, MessageSquare,
  Search, MapPin, Star, Wifi, UtensilsCrossed, Wind, ChevronRight,
  RotateCcw, Copy, Check, ArrowDown, Home, Lock, Zap, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";
import { PremiumModal } from "@/components/premium-modal";

// ==================== TYPES ====================

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  properties?: PropertyResult[];
  isSearch?: boolean;
}

interface PropertyResult {
  id: string;
  name: string;
  slug: string;
  serviceType: string;
  price: number;
  city: string;
  address: string;
  avgRating: number;
  totalReviews: number;
  isAC: boolean;
  hasWifi: boolean;
  foodIncluded: boolean;
  forGender: string;
  nearbyLandmark: string;
  image: string | null;
  relevanceScore: number;
}

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

// ==================== SUGGESTIONS ====================

const SEARCH_SUGGESTIONS = [
  { icon: Search, text: "Find accommodation near KIIT under ₹8000", color: "text-blue-500" },
  { icon: MapPin, text: "Girls PG in Kota with food and WiFi", color: "text-green-500" },
  { icon: Star, text: "Top-rated libraries near Salt Lake, Kolkata", color: "text-yellow-500" },
  { icon: Home, text: "Affordable mess services near KIIT Bhubaneswar", color: "text-purple-500" },
];

const CHAT_SUGGESTIONS = [
  { icon: MessageSquare, text: "What should I look for in a hostel?", color: "text-blue-500" },
  { icon: MapPin, text: "How do I compare PG vs hostel options?", color: "text-green-500" },
  { icon: Star, text: "Tips for finding budget-friendly accommodation", color: "text-yellow-500" },
  { icon: Home, text: "What amenities are essential for students?", color: "text-purple-500" },
];

// ==================== PROPERTY CARD ====================

function PropertyCard({ property }: { property: PropertyResult }) {
  return (
    <Link href={`/services/${property.slug}`}>
      <div className="flex gap-3 p-3 rounded-xl border border-gray-200 hover:border-primary/40 hover:shadow-md transition-all bg-white cursor-pointer group">
        <div className="h-20 w-20 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex-shrink-0 flex items-center justify-center overflow-hidden">
          {property.image ? (
            <img src={property.image} alt={property.name} className="w-full h-full object-cover rounded-lg" />
          ) : (
            <MapPin className="h-6 w-6 text-primary/40" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm text-gray-900 truncate group-hover:text-primary transition-colors">{property.name}</h4>
            <Badge variant="outline" className="text-[10px] flex-shrink-0">{property.serviceType}</Badge>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{property.address}, {property.city}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-sm font-bold text-primary">{formatPrice(property.price)}<span className="text-[10px] text-gray-400 font-normal">/mo</span></span>
            {property.avgRating > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-gray-500">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />{property.avgRating.toFixed(1)}
              </span>
            )}
            {property.hasWifi && <Wifi className="h-3 w-3 text-blue-400" />}
            {property.foodIncluded && <UtensilsCrossed className="h-3 w-3 text-orange-400" />}
            {property.isAC && <Wind className="h-3 w-3 text-cyan-400" />}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-300 self-center flex-shrink-0" />
      </div>
    </Link>
  );
}

// ==================== MAIN CHAT PAGE ====================

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // Premium access state — verified from backend, NOT from session
  const [accessStatus, setAccessStatus] = useState<"checking" | "allowed" | "blocked">("checking");
  const [premiumOpen, setPremiumOpen] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const chatContainer = useRef<HTMLDivElement>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  
  // Sidebar state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // 🔒 Verify premium access from backend on every page load
  useEffect(() => {
    if (status === "loading" || !session) return;
    const verify = async () => {
      try {
        const res = await fetch("/api/check-premium");
        const data = await res.json();
        setAccessStatus(data.allowed ? "allowed" : "blocked");
      } catch {
        setAccessStatus("blocked");
      }
    };
    verify();
  }, [session, status]);

  // Auto-scroll
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Scroll button visibility
  useEffect(() => {
    const container = chatContainer.current;
    if (!container) return;
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
    };
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + "px";
    }
  }, [input]);

  if (status === "loading" || accessStatus === "checking") {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mx-auto mb-4">
            <Bot className="h-6 w-6 text-white animate-pulse" />
          </div>
          <p className="text-sm text-gray-500">Loading AasPass AI...</p>
        </div>
      </div>
    );
  }
  // 🔒 Auth Gate — unauthenticated users see in-page sign-in prompt
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-100 flex items-center justify-center mx-auto mb-4">
            <Bot className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to use AI Chat</h2>
          <p className="text-gray-500 mb-6">
            AasPass AI Chat is a premium feature. Sign in to your account first, then upgrade to premium to unlock instant AI-powered recommendations.
          </p>
          <div className="space-y-3">
            <Link href="/login">
              <Button className="w-full bg-gradient-to-r from-primary to-blue-600 text-white">
                Sign In
              </Button>
            </Link>
            <Link href="/register">
              <Button variant="outline" className="w-full">
                Create Account
              </Button>
            </Link>
            <Link href="/home">
              <Button variant="ghost" className="w-full text-gray-500">
                <Home className="h-4 w-4 mr-2" /> Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 🔒 Premium Gate Screen — non-premium users are hard-blocked
  if (accessStatus === "blocked") {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center mx-auto mb-4">
              <Lock className="h-8 w-8 text-amber-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Premium Feature</h2>
            <p className="text-gray-500 mb-6">
              AI Chat is exclusively available to premium members. Upgrade to
              unlock instant AI-powered recommendations, 24/7 support, and much
              more.
            </p>

            {/* What they&apos;re missing */}
            <div className="text-left space-y-2 mb-6 bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-2">
                What you&apos;ll unlock:
              </p>
              {[
                { icon: MessageSquare, text: "AI Chat — get instant answers" },
                { icon: Home, text: "Find perfect PG in seconds" },
                { icon: Zap, text: "24/7 intelligent support" },
                { icon: MapPin, text: "Smart location recommendations" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <item.icon className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Pricing preview */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              {[
                { plan: "Monthly", price: "₹99", period: "/mo" },
                {
                  plan: "Quarterly",
                  price: "₹249",
                  period: "/3mo",
                  badge: "Popular",
                },
                {
                  plan: "Yearly",
                  price: "₹799",
                  period: "/yr",
                  badge: "Best Value",
                },
              ].map((p) => (
                <div
                  key={p.plan}
                  className="border-2 border-indigo-100 rounded-xl p-3 relative"
                >
                  {p.badge && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap">
                      {p.badge}
                    </span>
                  )}
                  <p className="text-xs text-gray-500">{p.plan}</p>
                  <p className="font-bold text-gray-900">{p.price}</p>
                  <p className="text-xs text-gray-400">{p.period}</p>
                </div>
              ))}
            </div>

            <Button
              size="lg"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 mb-3"
              onClick={() => setPremiumOpen(true)}
            >
              <Crown className="h-4 w-4 mr-2" />
              Upgrade to Premium
            </Button>
            <Button
              variant="ghost"
              className="w-full text-gray-400 hover:text-gray-600"
              onClick={() => router.back()}
            >
              ← Go Back
            </Button>
          </div>
        </div>
        <PremiumModal open={premiumOpen} onClose={() => setPremiumOpen(false)} />
      </>
    );
  }

  const scrollToBottom = () => messagesEnd.current?.scrollIntoView({ behavior: "smooth" });

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const sendMessage = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    if (inputRef.current) inputRef.current.style.height = "auto";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.reply || "I couldn't process that. Please try again.",
        timestamp: new Date(),
        properties: data.properties || [],
      }]);

      const title = messageText.slice(0, 40) + (messageText.length > 40 ? "..." : "");
      setConversations((prev) => {
        const existing = prev[0];
        if (existing && Date.now() - existing.timestamp.getTime() < 60000) {
          return [{ ...existing, lastMessage: messageText, timestamp: new Date() }, ...prev.slice(1)];
        }
        return [{ id: Date.now().toString(), title, lastMessage: messageText, timestamp: new Date() }, ...prev.slice(0, 19)];
      });
    } catch {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setInput("");
    inputRef.current?.focus();
  };

  const isEmptyState = messages.length === 0;

  return (
    <div className="h-screen flex bg-gray-50">
      {/* ==================== SIDEBAR ==================== */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-72 bg-gray-900 text-white flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-4 border-b border-gray-700">
          <button onClick={startNewChat} className="w-full flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-600 hover:bg-gray-800 text-sm transition-colors">
            <Plus className="h-4 w-4" /> New Chat
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {conversations.length === 0 ? (
            <div className="px-3 py-6 text-center">
              <MessageSquare className="h-8 w-8 text-gray-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <button key={conv.id} className="w-full px-3 py-2 rounded-lg text-left hover:bg-gray-800 transition-colors group">
                <p className="text-sm text-gray-300 truncate">{conv.title}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{conv.timestamp.toLocaleDateString()} {conv.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              </button>
            ))
          )}
        </div>
        <div className="p-4 border-t border-gray-700 space-y-2">
          <Link href="/home" className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 text-sm transition-colors">
            <Home className="h-4 w-4" /> Home
          </Link>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800">
            <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center text-xs font-bold">
              {session.user?.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-200 truncate">{session.user?.name}</p>
              <p className="text-[10px] text-gray-500 truncate">{session.user?.email}</p>
            </div>
            {(session.user as any)?.isPremium && <Crown className="h-4 w-4 text-amber-400" />}
          </div>
        </div>
      </aside>
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ==================== MAIN CHAT AREA ==================== */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="lg:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100">
            <MessageSquare className="h-5 w-5 text-gray-500" />
          </button>
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-semibold text-gray-900 text-sm">AasPass AI</h1>
            <p className="text-[10px] text-gray-400">Powered by AI</p>
          </div>
          {(session.user as any)?.isPremium && <Badge className="bg-amber-100 text-amber-700 text-[10px]"><Crown className="h-3 w-3 mr-1" /> Premium</Badge>}
        </div>

        <div ref={chatContainer} className="flex-1 overflow-y-auto relative">
          {isEmptyState ? (
            <div className="flex flex-col items-center justify-center h-full px-4 py-8">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center mb-6 shadow-lg">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">AI Chat Assistant</h2>
              <p className="text-gray-500 text-center max-w-md mb-8">
                Ask me anything about student life, accommodation tips, property recommendations, or how to make the most of AasPass.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl w-full">
                {CHAT_SUGGESTIONS.map((s, i) => (
                  <button key={i} onClick={() => sendMessage(s.text)} className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-primary/40 hover:bg-primary/5 text-left transition-all group">
                    <s.icon className={cn("h-5 w-5 mt-0.5 flex-shrink-0", s.color)} />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">{s.text}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "")}>
                  {msg.role === "assistant" && (
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div className={cn("max-w-[85%] min-w-0", msg.role === "user" ? "order-first" : "")}>
                    <div className={cn("rounded-2xl px-4 py-3 text-sm", msg.role === "user" ? "bg-primary text-white ml-auto rounded-tr-md" : "bg-white border border-gray-200 rounded-tl-md shadow-sm")}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    </div>
                    {msg.properties && msg.properties.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.properties.map((prop) => <PropertyCard key={prop.id} property={prop} />)}
                      </div>
                    )}
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <button onClick={() => copyToClipboard(msg.content, msg.id)} className="p-1.5 rounded-md hover:bg-gray-100 transition-colors" title="Copy">
                          {copied === msg.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-gray-400" />}
                        </button>
                        <span className="text-[10px] text-gray-400 ml-1">{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    )}
                    {msg.role === "user" && <p className="text-[10px] text-gray-400 mt-1 text-right">{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-xs text-gray-400 ml-1">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEnd} />
            </div>
          )}
          {showScrollBtn && (
            <button onClick={scrollToBottom} className="absolute bottom-4 right-4 h-9 w-9 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-all">
              <ArrowDown className="h-4 w-4 text-gray-500" />
            </button>
          )}
        </div>

        <div className="border-t bg-white px-4 py-3">
          <div className="max-w-3xl mx-auto">
            <div className="relative flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
              <textarea
                ref={inputRef}
                placeholder="Ask anything about services, accommodation tips, or recommendations..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={loading}
                className="flex-1 bg-transparent border-none outline-none resize-none text-sm text-gray-900 placeholder-gray-400 py-1.5 max-h-[200px]"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || loading}
                className={cn("h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all", input.trim() && !loading ? "bg-primary text-white hover:bg-primary/90" : "bg-gray-200 text-gray-400 cursor-not-allowed")}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">AasPass AI can make mistakes. Verify important information.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
