"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, Filter, Download, ChevronLeft, ChevronRight,
  Eye, Edit, ShieldAlert, AlertTriangle, Trash2, Loader2,
  Crown, Users as UsersIcon, Building2, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const FREE_QUOTA_DAYS = 90;
function getFreeDaysLeft(createdAt: string): { daysLeft: number; color: string } {
  const expiry = new Date(new Date(createdAt).getTime() + FREE_QUOTA_DAYS * 24 * 60 * 60 * 1000);
  const daysLeft = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
  const color = daysLeft === 0 ? "text-gray-400" : daysLeft <= 7 ? "text-red-600" : daysLeft <= 30 ? "text-amber-600" : "text-green-600";
  return { daysLeft, color };
}

interface UserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isPremium: boolean;
  isBlocked: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { bookings: number; reviews: number; properties: number };
}

export default function SuperAdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [plan, setPlan] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [sortBy, setSortBy] = useState("createdAt");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: "20", sortBy });
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (plan) params.set("plan", plan);
    if (status) params.set("status", status);

    try {
      const res = await fetch(`/api/superadmin/users?${params}`);
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setTotal(data.pagination?.total || 0);
    } catch {
      toast.error("Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, [page, search, role, plan, status, sortBy]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (role) params.set("role", role);
    if (plan) params.set("plan", plan);
    if (status) params.set("status", status);
    window.open(`/api/superadmin/users/export?${params}`, "_blank");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">User Management</h2>
          <p className="text-sm text-muted-foreground">{total.toLocaleString()} total users</p>
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-2">
          <Download className="h-3.5 w-3.5" />Export CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSearch} className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={role}
              onChange={(e) => { setRole(e.target.value); setPage(1); }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Roles</option>
              <option value="STUDENT">Student</option>
              <option value="OWNER">Owner</option>
            </select>
            <select
              value={plan}
              onChange={(e) => { setPlan(e.target.value); setPage(1); }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Plans</option>
              <option value="premium">Premium</option>
              <option value="free">Free</option>
            </select>
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <Button type="submit" size="sm" className="h-10">
              <Filter className="h-3.5 w-3.5 mr-1" />Filter
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left p-3 font-medium text-gray-600">User</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden md:table-cell">Phone</th>
                  <th className="text-left p-3 font-medium text-gray-600">Role</th>
                  <th className="text-left p-3 font-medium text-gray-600">Plan</th>
                  <th className="text-left p-3 font-medium text-gray-600">Status</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Bookings</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Services</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Joined</th>
                  <th className="text-left p-3 font-medium text-gray-600 hidden lg:table-cell">Free Days</th>
                  <th className="text-right p-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3"><Skeleton className="h-5 w-40" /></td>
                      <td className="p-3 hidden md:table-cell"><Skeleton className="h-5 w-24" /></td>
                      <td className="p-3"><Skeleton className="h-5 w-16" /></td>
                      <td className="p-3"><Skeleton className="h-5 w-16" /></td>
                      <td className="p-3"><Skeleton className="h-5 w-16" /></td>
                      <td className="p-3 hidden lg:table-cell"><Skeleton className="h-5 w-12" /></td>
                      <td className="p-3 hidden lg:table-cell"><Skeleton className="h-5 w-20" /></td>
                      <td className="p-3 hidden lg:table-cell"><Skeleton className="h-5 w-14" /></td>
                      <td className="p-3"><Skeleton className="h-5 w-20" /></td>
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-500">
                      <UsersIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => router.push(`/superadmin/users/${user.id}`)}>
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </td>
                      <td className="p-3 hidden md:table-cell text-gray-600">{user.phone || "—"}</td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-[10px]">{user.role}</Badge>
                      </td>
                      <td className="p-3">
                        {user.isPremium ? (
                          <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">
                            <Crown className="h-2.5 w-2.5 mr-0.5" />Premium
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px]">Free</Badge>
                        )}
                      </td>
                      <td className="p-3">
                        <Badge
                          variant={user.isBlocked ? "destructive" : "success"}
                          className="text-[10px]"
                        >
                          {user.isBlocked ? "Suspended" : "Active"}
                        </Badge>
                      </td>
                      <td className="p-3 hidden lg:table-cell text-gray-600">
                        {user._count.bookings}
                      </td>
                      <td className="p-3 hidden lg:table-cell text-gray-600">
                        {user.role === "OWNER" ? (
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Building2 className="h-2.5 w-2.5" />{user._count.properties}
                          </Badge>
                        ) : "—"}
                      </td>
                      <td className="p-3 hidden lg:table-cell text-gray-600 text-xs">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        {(() => {
                          const { daysLeft, color } = getFreeDaysLeft(user.createdAt);
                          return (
                            <div className={cn("flex items-center gap-1 text-xs font-medium", color)}>
                              <Clock className="h-3 w-3" />
                              {daysLeft > 0 ? `${daysLeft}d` : "Expired"}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/superadmin/users/${user.id}`}>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title="View Profile">
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
