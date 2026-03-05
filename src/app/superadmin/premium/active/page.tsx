"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Crown, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export default function ActivePremiumPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/premium?filter=active&limit=100")
      .then((r) => r.json())
      .then((d) => setUsers(d.grants || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/superadmin/premium">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Active Premium Users</h2>
          <p className="text-sm text-muted-foreground">{users.length} users with active premium</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : users.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-gray-500">No active premium users found</CardContent></Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50/50">
                  <th className="text-left p-3 font-medium text-gray-600">User</th>
                  <th className="text-left p-3 font-medium text-gray-600">Type</th>
                  <th className="text-left p-3 font-medium text-gray-600">Granted</th>
                  <th className="text-left p-3 font-medium text-gray-600">Expires</th>
                  <th className="text-left p-3 font-medium text-gray-600">Granted By</th>
                </tr>
              </thead>
              <tbody>
                {users.map((g: any) => (
                  <tr key={g.id} className="border-b hover:bg-gray-50/50">
                    <td className="p-3">
                      <Link href={`/superadmin/users/${g.user?.id}`} className="hover:underline">
                        <p className="font-medium text-gray-900">{g.user?.name}</p>
                        <p className="text-xs text-muted-foreground">{g.user?.email}</p>
                      </Link>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-[10px]">{g.grantType}</Badge>
                    </td>
                    <td className="p-3 text-xs text-gray-600">{formatDate(g.createdAt)}</td>
                    <td className="p-3 text-xs">
                      {g.expiryDate ? formatDate(g.expiryDate) : <Badge className="bg-yellow-100 text-yellow-700 text-[10px]">Lifetime</Badge>}
                    </td>
                    <td className="p-3 text-xs text-gray-600">{g.grantedBy?.name || "System"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
