"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  Landmark, ArrowLeft, Loader2, CheckCircle, Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RouteGuard } from "@/components/route-guard";

interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifscCode: string;
  accountType: string;
  hasDetails: boolean;
}

export default function OwnerBankSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bankDetails, setBankDetails] = useState<BankDetails | null>(null);

  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [confirmAccountNumber, setConfirmAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountType, setAccountType] = useState("savings");

  const [commissionInfo, setCommissionInfo] = useState<{
    commissionPercentage: number;
    example: { bookingAmount: number; commission: number; ownerReceives: number };
  } | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
  }, [status, router]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const fetchData = async () => {
      try {
        const [bankRes, commRes] = await Promise.all([
          fetch("/api/owner/bank"),
          fetch("/api/owner/commission"),
        ]);
        if (bankRes.ok) {
          const { bankDetails: bd } = await bankRes.json();
          setBankDetails(bd);
          if (bd.hasDetails) {
            setAccountName(bd.accountName);
            setIfscCode(bd.ifscCode);
            setAccountType(bd.accountType || "savings");
          }
        }
        if (commRes.ok) {
          const data = await commRes.json();
          setCommissionInfo(data);
        }
      } catch {
        toast.error("Failed to load bank details");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [status]);

  const handleSave = async () => {
    if (!accountName.trim()) return toast.error("Account name is required");
    if (!accountNumber.trim()) return toast.error("Account number is required");
    if (!/^\d{8,18}$/.test(accountNumber.trim())) return toast.error("Account number must be 8-18 digits");
    if (accountNumber !== confirmAccountNumber) return toast.error("Account numbers don't match");
    if (!ifscCode.trim()) return toast.error("IFSC code is required");
    if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifscCode.trim())) return toast.error("Invalid IFSC code format");

    setSaving(true);
    try {
      const res = await fetch("/api/owner/bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountName: accountName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          accountType,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save");
      }
      toast.success("Bank details saved successfully!");
      // Re-fetch to show masked number
      const bankRes = await fetch("/api/owner/bank");
      if (bankRes.ok) {
        const { bankDetails: bd } = await bankRes.json();
        setBankDetails(bd);
      }
      setAccountNumber("");
      setConfirmAccountNumber("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save bank details");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <RouteGuard allowedRole="OWNER">
        <div className="min-h-screen bg-gray-50/50">
          <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </RouteGuard>
    );
  }

  return (
    <RouteGuard allowedRole="OWNER">
      <div className="min-h-screen bg-gray-50/50">
        {/* Header */}
        <div className="bg-white border-b">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
            <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3">
              <ArrowLeft className="h-4 w-4" /> Back to Dashboard
            </Link>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Landmark className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Bank Account Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your payout bank details</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Current Status */}
          {bankDetails?.hasDetails && (
            <Card className="border-green-200 bg-green-50/50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Bank account linked</p>
                    <p className="text-sm text-green-700">
                      {bankDetails.accountName} — A/c ending {bankDetails.accountNumber.slice(-4)} — IFSC: {bankDetails.ifscCode}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Commission Info */}
          {commissionInfo && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Commission Rate</CardTitle>
                <CardDescription>
                  Platform deducts <span className="font-semibold text-foreground">{commissionInfo.commissionPercentage}%</span> commission on each booking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Booking Amount</p>
                    <p className="font-semibold">₹{commissionInfo.example.bookingAmount.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Commission</p>
                    <p className="font-semibold text-red-600">- ₹{commissionInfo.example.commission.toLocaleString("en-IN")}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">You Receive</p>
                    <p className="font-semibold text-green-600">₹{commissionInfo.example.ownerReceives.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Bank Details Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                {bankDetails?.hasDetails ? "Update Bank Details" : "Add Bank Details"}
              </CardTitle>
              <CardDescription>
                Your bank details are stored securely and used only for payouts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Holder Name</Label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Name as on bank account"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder={bankDetails?.hasDetails ? `Current: ${bankDetails.accountNumber}` : "Enter account number"}
                  maxLength={18}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmAccountNumber">Confirm Account Number</Label>
                <Input
                  id="confirmAccountNumber"
                  value={confirmAccountNumber}
                  onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ""))}
                  placeholder="Re-enter account number"
                  maxLength={18}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifscCode">IFSC Code</Label>
                <Input
                  id="ifscCode"
                  value={ifscCode}
                  onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                  placeholder="e.g. SBIN0001234"
                  maxLength={11}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountType">Account Type</Label>
                <select
                  id="accountType"
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="savings">Savings</option>
                  <option value="current">Current</option>
                </select>
              </div>

              <Button onClick={handleSave} disabled={saving} className="w-full mt-2">
                {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Saving...</> : "Save Bank Details"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </RouteGuard>
  );
}
