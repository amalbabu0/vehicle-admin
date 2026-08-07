"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import type { AdminAccount } from "@/lib/admin/settings-data";

export function AdminRolesTable({ accounts, currentAdminId }: { accounts: AdminAccount[]; currentAdminId: string }) {
  const [rows, setRows] = useState(accounts);
  const [isPending, startTransition] = useTransition();

  const changeRole = (id: string, role: "admin" | "lister") => {
    const previous = rows;
    setRows((current) => current.map((row) => (row.id === id ? { ...row, role } : row)));
    startTransition(async () => {
      const response = await fetch(`/api/admin/admins/${id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.message || "Could not update role.");
        setRows(previous);
        return;
      }
      toast.success(payload.message);
    });
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Account</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((account) => (
            <TableRow key={account.id}>
              <TableCell>
                <p className="text-sm font-medium">{account.fullName ?? "Unnamed"}</p>
                <p className="text-xs text-muted-foreground">{account.email ?? "—"}</p>
              </TableCell>
              <TableCell>
                <Select
                  value={account.role}
                  disabled={isPending || account.id === currentAdminId}
                  onValueChange={(value) => changeRole(account.id, value as "admin" | "lister")}
                >
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="lister">Lister</SelectItem>
                  </SelectContent>
                </Select>
                {account.id === currentAdminId ? <p className="mt-1 text-[11px] text-muted-foreground">This is you</p> : null}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">{formatDistanceToNow(new Date(account.createdAt), { addSuffix: true })}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
