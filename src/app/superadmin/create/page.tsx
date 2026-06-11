"use client";

import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Building2,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  Upload,
  UserPlus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const SERVICE_TYPES = ["HOSTEL", "PG", "LIBRARY", "COACHING", "MESS", "LAUNDRY", "GYM", "COWORKING"];
const PROPERTY_STATUSES = ["VERIFIED", "PENDING", "DRAFT"];
const TEMPLATE_HEADERS = [
  "Owner Name",
  "Owner Contact Number",
  "Owner Email",
  "Property Name",
  "Service Type",
  "Description",
  "Price",
  "GST Rate",
  "Address",
  "City",
  "State",
  "Pincode",
  "Google Maps Link",
  "Latitude",
  "Longitude",
  "Status",
  "AC",
  "WiFi",
  "Gender Preference",
  "Occupancy",
  "Food Included",
  "Laundry Included",
  "Medical",
  "Capacity",
  "Available Seats",
  "Amenities",
  "Image URLs",
];

type TabId = "account" | "property" | "bulk";

type UserOption = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

type CreatedAccount = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
};

type CreatedPropertyResponse = {
  property: {
    id: string;
    name: string;
    status: string;
  };
  promotedOwner: boolean;
};

type BulkUploadResultRow = {
  row: number;
  status: "created" | "failed";
  propertyName?: string;
  ownerName?: string;
  ownerEmail?: string;
  generatedPassword?: string | null;
  ownerCreated?: boolean;
  ownerPromoted?: boolean;
  error?: string;
};

type BulkUploadResult = {
  summary: {
    total: number;
    created: number;
    failed: number;
    ownersCreated: number;
  };
  results: BulkUploadResultRow[];
};

type AmenityField = "isAC" | "hasWifi" | "foodIncluded" | "laundryIncluded" | "hasMedical";

function csvCell(value: string) {
  return `"${value.replace(/"/g, "\"\"")}"`;
}

function messageFromError(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function SuperAdminCreatePage() {
  const [activeTab, setActiveTab] = useState<TabId>("account");
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [creatingProperty, setCreatingProperty] = useState(false);
  const [uploadingBulk, setUploadingBulk] = useState(false);
  const [ownerSearch, setOwnerSearch] = useState("");
  const [ownerOptions, setOwnerOptions] = useState<UserOption[]>([]);
  const [loadingOwners, setLoadingOwners] = useState(false);
  const [createdAccount, setCreatedAccount] = useState<{
    user: CreatedAccount;
    generatedPassword: string | null;
    generatedEmail: string | null;
  } | null>(null);
  const [createdProperty, setCreatedProperty] = useState<CreatedPropertyResponse | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [accountForm, setAccountForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "OWNER",
    gender: "",
  });

  const [propertyForm, setPropertyForm] = useState({
    ownerId: "",
    name: "",
    serviceType: "HOSTEL",
    status: "VERIFIED",
    description: "",
    price: "",
    gstRate: "18",
    address: "",
    city: "",
    state: "",
    pincode: "",
    capacity: "",
    availableRooms: "",
    forGender: "",
    occupancy: "",
    isAC: false,
    hasWifi: false,
    foodIncluded: false,
    laundryIncluded: false,
    hasMedical: false,
    customAmenities: "",
    imageUrls: "",
  });

  const selectedOwner = useMemo(
    () => ownerOptions.find((owner) => owner.id === propertyForm.ownerId),
    [ownerOptions, propertyForm.ownerId]
  );

  const fetchOwners = useCallback(async (query = "") => {
    setLoadingOwners(true);
    try {
      const params = new URLSearchParams({ limit: "25", sortBy: "createdAt" });
      if (query) params.set("search", query);
      const res = await fetch(`/api/superadmin/users?${params}`);
      const data = await res.json();
      setOwnerOptions(data.users || []);
    } catch {
      toast.error("Failed to load accounts");
    } finally {
      setLoadingOwners(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => fetchOwners(ownerSearch), 250);
    return () => clearTimeout(timer);
  }, [fetchOwners, ownerSearch]);

  const updateAccount = (field: keyof typeof accountForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setAccountForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const updateProperty = (field: keyof typeof propertyForm) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.type === "checkbox"
      ? (event.target as HTMLInputElement).checked
      : event.target.value;
    setPropertyForm((current) => ({ ...current, [field]: value }));
  };

  const handleCreateAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingAccount(true);
    setCreatedAccount(null);

    try {
      const res = await fetch("/api/superadmin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create account");

      setCreatedAccount({
        user: data.user,
        generatedPassword: data.generatedPassword,
        generatedEmail: data.generatedEmail,
      });
      toast.success("Account created");
      setAccountForm((current) => ({ ...current, name: "", email: "", phone: "", password: "", gender: "" }));
      fetchOwners(ownerSearch);
    } catch (error: unknown) {
      toast.error(messageFromError(error, "Failed to create account"));
    } finally {
      setCreatingAccount(false);
    }
  };

  const handleCreateProperty = async (event: React.FormEvent) => {
    event.preventDefault();
    setCreatingProperty(true);
    setCreatedProperty(null);

    try {
      const res = await fetch("/api/superadmin/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(propertyForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create property");

      setCreatedProperty(data);
      toast.success("Property created");
      setPropertyForm((current) => ({
        ...current,
        name: "",
        description: "",
        price: "",
        address: "",
        city: "",
        state: "",
        pincode: "",
        capacity: "",
        availableRooms: "",
        occupancy: "",
        customAmenities: "",
        imageUrls: "",
      }));
    } catch (error: unknown) {
      toast.error(messageFromError(error, "Failed to create property"));
    } finally {
      setCreatingProperty(false);
    }
  };

  const handleBulkUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Select an Excel file first");
      return;
    }

    setUploadingBulk(true);
    setBulkResult(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/superadmin/properties/bulk", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk upload failed");

      setBulkResult(data);
      if (data.summary?.failed > 0) {
        toast.error(`${data.summary.created} created, ${data.summary.failed} failed`);
      } else {
        toast.success(`${data.summary.created} properties created`);
      }
    } catch (error: unknown) {
      toast.error(messageFromError(error, "Bulk upload failed"));
    } finally {
      setUploadingBulk(false);
    }
  };

  const downloadTemplate = () => {
    const sample = [
      "Ravi Kumar",
      "9876543210",
      "ravi.owner@example.com",
      "Sunrise Boys Hostel",
      "HOSTEL",
      "Clean hostel near campus with food and WiFi.",
      "6500",
      "18",
      "123 Main Road, Patia",
      "Bhubaneswar",
      "Odisha",
      "751024",
      "https://www.google.com/maps?q=20.353700,85.819300",
      "20.353700",
      "85.819300",
      "VERIFIED",
      "yes",
      "yes",
      "MALE",
      "2",
      "yes",
      "no",
      "yes",
      "50",
      "12",
      "CCTV, Parking, Study Table",
      "https://example.com/photo-1.jpg; https://example.com/photo-2.jpg",
    ];
    const csv = [TEMPLATE_HEADERS, sample].map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "aaspass-bulk-property-template.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: TabId; label: string; icon: ComponentType<{ className?: string }> }> = [
    { id: "account", label: "Account", icon: UserPlus },
    { id: "property", label: "Property", icon: Building2 },
    { id: "bulk", label: "Bulk Upload", icon: FileSpreadsheet },
  ];
  const amenityFields: Array<{ field: AmenityField; label: string }> = [
    { field: "isAC", label: "AC" },
    { field: "hasWifi", label: "WiFi" },
    { field: "foodIncluded", label: "Food" },
    { field: "laundryIncluded", label: "Laundry" },
    { field: "hasMedical", label: "Medical" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Create</h2>
          <p className="text-sm text-muted-foreground">Accounts, properties, and bulk property uploads</p>
        </div>
        <div className="flex gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                type="button"
                size="sm"
                variant={activeTab === tab.id ? "default" : "outline"}
                className="gap-2"
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </Button>
            );
          })}
        </div>
      </div>

      {activeTab === "account" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-primary" />Create Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateAccount} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Name *</Label>
                <Input value={accountForm.name} onChange={updateAccount("name")} placeholder="Owner or student name" />
              </div>
              <div>
                <Label>Role *</Label>
                <select value={accountForm.role} onChange={updateAccount("role")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="OWNER">Owner</option>
                  <option value="STUDENT">Student</option>
                </select>
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={accountForm.email} onChange={updateAccount("email")} placeholder="name@example.com" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={accountForm.phone} onChange={updateAccount("phone")} placeholder="9876543210" />
              </div>
              <div>
                <Label>Gender</Label>
                <select value={accountForm.gender} onChange={updateAccount("gender")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                  <option value="">Not specified</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <Label>Password</Label>
                <Input value={accountForm.password} onChange={updateAccount("password")} placeholder="Leave blank to generate" />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={creatingAccount} className="gap-2">
                  {creatingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                  Create Account
                </Button>
              </div>
            </form>

            {createdAccount && (
              <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm">
                <div className="flex items-center gap-2 font-semibold text-green-800">
                  <CheckCircle2 className="h-4 w-4" />Account ready
                </div>
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-green-900">
                  <div><span className="text-green-700">Email:</span> {createdAccount.user.email}</div>
                  <div><span className="text-green-700">Role:</span> {createdAccount.user.role}</div>
                  {createdAccount.generatedPassword && (
                    <div><span className="text-green-700">Password:</span> {createdAccount.generatedPassword}</div>
                  )}
                  {createdAccount.generatedEmail && (
                    <div><span className="text-green-700">Generated email:</span> {createdAccount.generatedEmail}</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "property" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />Add Property To Account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateProperty} className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <Label>Find account *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={ownerSearch}
                      onChange={(event) => setOwnerSearch(event.target.value)}
                      placeholder="Search by name, email, or phone"
                      className="pl-9"
                    />
                  </div>
                </div>
                <div>
                  <Label>Selected account *</Label>
                  <select
                    value={propertyForm.ownerId}
                    onChange={updateProperty("ownerId")}
                    className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  >
                    <option value="">{loadingOwners ? "Loading..." : "Select account"}</option>
                    {ownerOptions.map((owner) => (
                      <option key={owner.id} value={owner.id}>
                        {owner.name} · {owner.role} · {owner.phone || owner.email}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {selectedOwner && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
                  <span className="font-medium text-gray-900">{selectedOwner.name}</span>
                  <Badge variant="outline" className="text-[10px]">{selectedOwner.role}</Badge>
                  <span className="text-muted-foreground">{selectedOwner.email}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Property Name *</Label>
                  <Input value={propertyForm.name} onChange={updateProperty("name")} placeholder="Sunrise Boys Hostel" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type *</Label>
                    <select value={propertyForm.serviceType} onChange={updateProperty("serviceType")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {SERVICE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <select value={propertyForm.status} onChange={updateProperty("status")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                      {PROPERTY_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <Label>Price (₹) *</Label>
                  <Input type="number" value={propertyForm.price} onChange={updateProperty("price")} placeholder="6500" />
                </div>
                <div>
                  <Label>GST Rate (%)</Label>
                  <Input type="number" value={propertyForm.gstRate} onChange={updateProperty("gstRate")} placeholder="18" />
                </div>
                <div className="md:col-span-2">
                  <Label>Description</Label>
                  <Textarea value={propertyForm.description} onChange={updateProperty("description")} rows={3} placeholder="Describe the property and facilities" />
                </div>
                <div className="md:col-span-2">
                  <Label>Address *</Label>
                  <Input value={propertyForm.address} onChange={updateProperty("address")} placeholder="Street, locality, landmark" />
                </div>
                <div>
                  <Label>City *</Label>
                  <Input value={propertyForm.city} onChange={updateProperty("city")} placeholder="Bhubaneswar" />
                </div>
                <div>
                  <Label>State *</Label>
                  <Input value={propertyForm.state} onChange={updateProperty("state")} placeholder="Odisha" />
                </div>
                <div>
                  <Label>Pincode *</Label>
                  <Input value={propertyForm.pincode} onChange={updateProperty("pincode")} placeholder="751024" />
                </div>
                <div>
                  <Label>Gender Preference</Label>
                  <select value={propertyForm.forGender} onChange={updateProperty("forGender")} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Any</option>
                    <option value="MALE">Boys</option>
                    <option value="FEMALE">Girls</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <Label>Total Capacity</Label>
                  <Input type="number" value={propertyForm.capacity} onChange={updateProperty("capacity")} placeholder="50" />
                </div>
                <div>
                  <Label>Available Seats</Label>
                  <Input type="number" value={propertyForm.availableRooms} onChange={updateProperty("availableRooms")} placeholder="12" />
                </div>
                <div>
                  <Label>Occupancy</Label>
                  <Input type="number" value={propertyForm.occupancy} onChange={updateProperty("occupancy")} placeholder="2" />
                </div>
                <div>
                  <Label>Amenities</Label>
                  <Input value={propertyForm.customAmenities} onChange={updateProperty("customAmenities")} placeholder="CCTV, Parking, Study Table" />
                </div>
                <div className="md:col-span-2">
                  <Label>Image URLs</Label>
                  <Textarea value={propertyForm.imageUrls} onChange={updateProperty("imageUrls")} rows={2} placeholder="Paste image URLs separated by comma or new line" />
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                {amenityFields.map(({ field, label }) => (
                  <label key={field} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={propertyForm[field]}
                      onChange={updateProperty(field)}
                      className="rounded border-gray-300"
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={creatingProperty || !propertyForm.ownerId} className="gap-2">
                  {creatingProperty ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                  Add Property
                </Button>
              </div>
            </form>

            {createdProperty && (
              <div className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900">
                <div className="flex items-center gap-2 font-semibold text-green-800">
                  <CheckCircle2 className="h-4 w-4" />Property created
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  <span>{createdProperty.property.name}</span>
                  <Badge variant="outline" className="text-[10px]">{createdProperty.property.status}</Badge>
                  <Link href={`/superadmin/services/${createdProperty.property.id}`} className="text-primary hover:underline">
                    View service
                  </Link>
                  {createdProperty.promotedOwner && <span>Account converted to owner.</span>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === "bulk" && (
        <>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-primary" />Bulk Property Upload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBulkUpload} className="space-y-4">
                <div className="flex flex-col md:flex-row gap-3">
                  <Input ref={fileInputRef} type="file" accept=".xlsx,.csv" className="md:flex-1" />
                  <Button type="button" variant="outline" onClick={downloadTemplate} className="gap-2">
                    <Download className="h-4 w-4" />Template
                  </Button>
                  <Button type="submit" disabled={uploadingBulk} className="gap-2">
                    {uploadingBulk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  {["Owner Name", "Owner Contact Number", "Property Name", "Service Type", "Price", "Address", "City", "State", "Pincode"].map((column) => (
                    <Badge key={column} variant="outline" className="text-[10px]">{column}</Badge>
                  ))}
                  {["Google Maps Link", "Latitude", "Longitude"].map((column) => (
                    <Badge key={column} variant="secondary" className="text-[10px]">{column}</Badge>
                  ))}
                </div>
              </form>
            </CardContent>
          </Card>

          {bulkResult && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Upload Results</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">Total {bulkResult.summary.total}</Badge>
                  <Badge variant="success" className="text-[10px]">Created {bulkResult.summary.created}</Badge>
                  <Badge variant={bulkResult.summary.failed ? "destructive" : "secondary"} className="text-[10px]">
                    Failed {bulkResult.summary.failed}
                  </Badge>
                  <Badge variant="outline">Owners created {bulkResult.summary.ownersCreated}</Badge>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50/50">
                        <th className="text-left p-3 font-medium text-gray-600">Row</th>
                        <th className="text-left p-3 font-medium text-gray-600">Status</th>
                        <th className="text-left p-3 font-medium text-gray-600">Property</th>
                        <th className="text-left p-3 font-medium text-gray-600">Owner</th>
                        <th className="text-left p-3 font-medium text-gray-600">Email</th>
                        <th className="text-left p-3 font-medium text-gray-600">Password</th>
                        <th className="text-left p-3 font-medium text-gray-600">Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bulkResult.results.map((result) => (
                        <tr key={result.row} className="border-b last:border-0">
                          <td className="p-3">{result.row}</td>
                          <td className="p-3">
                            <Badge variant={result.status === "created" ? "success" : "destructive"} className="text-[10px]">
                              {result.status}
                            </Badge>
                          </td>
                          <td className="p-3 font-medium text-gray-900">{result.propertyName || "—"}</td>
                          <td className="p-3 text-gray-600">{result.ownerName || "—"}</td>
                          <td className="p-3 text-gray-600">{result.ownerEmail || "—"}</td>
                          <td className="p-3 text-gray-900">{result.generatedPassword || "—"}</td>
                          <td className="p-3 text-gray-600">
                            {result.error || (result.ownerCreated ? "Owner account created" : result.ownerPromoted ? "Owner account updated" : "Created")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
