import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListEventPromoCodes, getListEventPromoCodesQueryKey, useCreatePromoCode, useDeletePromoCode } from "@workspace/api-client-react";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";

interface PromoCodesTabProps {
  eventId: string;
}

export function PromoCodesTab({ eventId }: PromoCodesTabProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    type: "percentage" as "percentage" | "fixed",
    value: "",
    maxUses: "",
    expiresAt: "",
  });

  const { data: codes = [], isLoading } = useListEventPromoCodes(eventId, {
    query: { queryKey: getListEventPromoCodesQueryKey(eventId), enabled: !!eventId },
  });

  const createCode = useCreatePromoCode();
  const deleteCode = useDeletePromoCode();

  const handleCreate = () => {
    const valueNum = Number(form.value);
    if (!form.code.trim() || !valueNum) {
      toast({ title: "Fill in all required fields", variant: "destructive" });
      return;
    }
    const finalValue = form.type === "fixed" ? Math.round(valueNum * 100) : Math.round(valueNum);
    createCode.mutate({
      id: eventId,
      data: {
        code: form.code.trim().toUpperCase(),
        type: form.type,
        value: finalValue,
        maxUses: form.maxUses ? Number(form.maxUses) : undefined,
        expiresAt: form.expiresAt || undefined,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Promo code created" });
        setDialogOpen(false);
        setForm({ code: "", type: "percentage", value: "", maxUses: "", expiresAt: "" });
        queryClient.invalidateQueries({ queryKey: getListEventPromoCodesQueryKey(eventId) });
      },
      onError: (err) => {
        toast({ title: "Failed", description: (err.data as any)?.error || "Try again", variant: "destructive" });
      },
    });
  };

  const handleDelete = (codeId: string) => {
    deleteCode.mutate({ id: eventId, codeId }, {
      onSuccess: () => {
        toast({ title: "Promo code deleted" });
        queryClient.invalidateQueries({ queryKey: getListEventPromoCodesQueryKey(eventId) });
      },
      onError: (err) => {
        toast({ title: "Failed", description: (err.data as any)?.error || "Try again", variant: "destructive" });
      },
    });
  };

  const formatDiscount = (type: string, value: number) => {
    if (type === "percentage") return `${value}% off`;
    return `$${(value / 100).toFixed(2)} off`;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Tag className="h-4 w-4" /> Promo Codes
        </h2>
        <button
          onClick={() => setDialogOpen(true)}
          className="inline-flex items-center gap-1.5 text-sm font-medium px-4 py-1.5 aurora-gradient text-white rounded-full hover:opacity-90 transition-opacity"
        >
          <Plus className="h-3.5 w-3.5" /> Create Code
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-gray-300" /></div>
      ) : codes.length === 0 ? (
        <div className="text-center p-12 text-gray-400 text-sm">
          <Tag className="h-8 w-8 mx-auto mb-3 text-gray-200" />
          No promo codes yet — create one to offer discounts.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-50 hover:bg-transparent">
                <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Code</TableHead>
                <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Discount</TableHead>
                <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Uses</TableHead>
                <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Expires</TableHead>
                <TableHead className="text-xs font-semibold text-gray-400 uppercase tracking-wider py-3">Status</TableHead>
                <TableHead className="text-right py-3" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {codes.map((c) => (
                <TableRow key={c.id} className="border-gray-50 hover:bg-gray-50/50">
                  <TableCell className="font-mono font-bold text-gray-900 py-4">{c.code}</TableCell>
                  <TableCell className="text-gray-600 py-4">{formatDiscount(c.type, c.value)}</TableCell>
                  <TableCell className="text-gray-500 py-4">
                    {c.usedCount}{c.maxUses != null ? ` / ${c.maxUses}` : ""}
                  </TableCell>
                  <TableCell className="text-gray-500 py-4 text-sm">
                    {c.expiresAt ? format(new Date(c.expiresAt), "MMM d, yyyy") : "Never"}
                  </TableCell>
                  <TableCell className="py-4">
                    {c.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">Active</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-500">Inactive</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right py-4">
                    <button
                      className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      onClick={() => handleDelete(c.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="aurora-heading text-2xl">Create Promo Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Code</Label>
              <Input
                placeholder="e.g. EARLYBIRD20"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="rounded-xl h-11 font-mono"
              />
              <p className="text-xs text-gray-400 mt-1">Letters and numbers only, will be uppercased</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Discount type</Label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value as "percentage" | "fixed", value: "" }))}
                  className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-black/10 bg-white"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Fixed amount ($)</option>
                </select>
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">
                  {form.type === "percentage" ? "Discount %" : "Discount ($)"}
                </Label>
                <Input
                  type="number"
                  min={form.type === "percentage" ? 1 : 0.01}
                  max={form.type === "percentage" ? 100 : undefined}
                  step={form.type === "percentage" ? 1 : 0.01}
                  placeholder={form.type === "percentage" ? "e.g. 20" : "e.g. 5.00"}
                  value={form.value}
                  onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Max uses (optional)</Label>
                <Input
                  type="number"
                  min={1}
                  placeholder="Unlimited"
                  value={form.maxUses}
                  onChange={e => setForm(f => ({ ...f, maxUses: e.target.value }))}
                  className="rounded-xl h-11"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-1.5 block">Expires (optional)</Label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
                  className="rounded-xl h-11"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" className="rounded-full h-10 px-6" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreate}
              disabled={createCode.isPending}
              className="rounded-full h-10 px-6 aurora-gradient border-0 text-white font-medium hover:opacity-90"
            >
              {createCode.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Code
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
