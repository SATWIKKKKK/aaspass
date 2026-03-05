"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

export default function ExpiringPremiumPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/superadmin/premium?filter=expiring&limit=100")
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
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Expiring Premium (7 Days)
          </h2>
          <p className="text-sm text-muted-foreground">{users.length} subscriptions expiring soon</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : users.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-gray-500">No subscriptions expiring in the next 7 days</CardContent></Card>
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
                  <th className="text-left p-3 font-medium text-gray-600">Days Left</th>
                </tr>
              </thead>
              <tbody>
                {users.map((g: any) => {
                  const daysLeft = g.expiryDate ? Math.max(0, Math.ceil((new Date(g.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
                  return (
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
                      <td className="p-3 text-xs text-gray-600">{g.expiryDate ? formatDate(g.expiryDate) : "—"}</td>
                      <td className="p-3">
                        {daysLeft !== null && (
                          <Badge variant={daysLeft <= 2 ? "destructive" : "secondary"} className="text-[10px]">
                            {daysLeft} day{daysLeft !== 1 ? "s" : ""}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
