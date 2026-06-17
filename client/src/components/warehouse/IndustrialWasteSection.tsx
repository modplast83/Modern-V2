import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Trash2,
  Loader2,
  Hash,
  User,
  Calendar,
  Recycle,
} from "lucide-react";

import { Button } from "../ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "../ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui/alert-dialog";
import { useToast } from "../../hooks/use-toast";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { formatNumberAr } from "../../../../shared/number-utils";

type WasteVoucherIn = {
  id: number;
  voucher_number: string;
  waste_type: string;
  quantity: string;
  unit: string;
  source: string | null;
  notes: string | null;
  voucher_date: string;
  received_by_name?: string | null;
  received_by_username?: string | null;
};

type WasteVoucherOut = {
  id: number;
  voucher_number: string;
  waste_type: string;
  quantity: string;
  unit: string;
  company_name: string;
  driver_name: string | null;
  vehicle_number: string | null;
  notes: string | null;
  voucher_date: string;
  issued_by_name?: string | null;
  issued_by_username?: string | null;
};

const IN_KEY = ["/api/warehouse/vouchers/industrial-waste-in"];
const OUT_KEY = ["/api/warehouse/vouchers/industrial-waste-out"];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function IndustrialWasteSection() {
  const { t } = useTranslation();
  const [inDialogOpen, setInDialogOpen] = useState(false);
  const [outDialogOpen, setOutDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <Tabs defaultValue="iw-rec" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 sm:inline-flex sm:flex-nowrap sm:h-10">
          <TabsTrigger
            value="iw-rec"
            className="text-xs px-2 py-1.5 sm:text-sm sm:px-3"
          >
            <ArrowDownToLine className="h-4 w-4 ml-1 shrink-0" />
            {t("warehouse.industrialWaste.recVouchers")}
          </TabsTrigger>
          <TabsTrigger
            value="iw-del"
            className="text-xs px-2 py-1.5 sm:text-sm sm:px-3"
          >
            <ArrowUpFromLine className="h-4 w-4 ml-1 shrink-0" />
            {t("warehouse.industrialWaste.delVouchers")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="iw-rec">
          <div className="mb-3">
            <Button
              onClick={() => setInDialogOpen(true)}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-create-waste-in"
            >
              <ArrowDownToLine className="h-4 w-4 ml-2" />
              {t("warehouse.industrialWaste.recReceiptBtn")}
            </Button>
          </div>
          <WasteInList />
        </TabsContent>

        <TabsContent value="iw-del">
          <div className="mb-3">
            <Button
              onClick={() => setOutDialogOpen(true)}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-create-waste-out"
            >
              <ArrowUpFromLine className="h-4 w-4 ml-2" />
              {t("warehouse.industrialWaste.delIssueBtn")}
            </Button>
          </div>
          <WasteOutList />
        </TabsContent>
      </Tabs>

      <WasteInDialog open={inDialogOpen} onOpenChange={setInDialogOpen} />
      <WasteOutDialog open={outDialogOpen} onOpenChange={setOutDialogOpen} />
    </div>
  );
}

function WasteInList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: vouchers = [], isLoading } = useQuery<WasteVoucherIn[]>({
    queryKey: IN_KEY,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(
        `/api/warehouse/vouchers/industrial-waste-in/${id}`,
        { method: "DELETE" },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IN_KEY });
      toast({ title: t("warehouse.industrialWaste.deleteSuccess") });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({
        title: t("warehouse.industrialWaste.deleteError"),
        description: err?.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          {t("warehouse.industrialWaste.noVouchers")}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vouchers.map((v) => (
          <Card key={v.id} data-testid={`card-waste-in-${v.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-1">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  {v.voucher_number}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 h-8 w-8"
                  onClick={() => setDeleteId(v.id)}
                  data-testid={`button-delete-waste-in-${v.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {v.voucher_date}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Recycle className="h-4 w-4 text-green-600 shrink-0" />
                <span className="font-medium">{v.waste_type}</span>
              </div>
              <div>
                {t("warehouse.industrialWaste.quantity")}:{" "}
                <Badge variant="secondary">
                  {formatNumberAr(parseFloat(v.quantity), 2)} {v.unit}
                </Badge>
              </div>
              {v.source && (
                <div className="text-muted-foreground">
                  {t("warehouse.industrialWaste.source")}: {v.source}
                </div>
              )}
              {v.notes && (
                <div className="text-muted-foreground">{v.notes}</div>
              )}
              {v.received_by_name && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />
                  {v.received_by_name}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("warehouse.industrialWaste.confirmDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("warehouse.industrialWaste.confirmDeleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function WasteOutList() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: vouchers = [], isLoading } = useQuery<WasteVoucherOut[]>({
    queryKey: OUT_KEY,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest(
        `/api/warehouse/vouchers/industrial-waste-out/${id}`,
        { method: "DELETE" },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUT_KEY });
      toast({ title: t("warehouse.industrialWaste.deleteSuccess") });
      setDeleteId(null);
    },
    onError: (err: any) => {
      toast({
        title: t("warehouse.industrialWaste.deleteError"),
        description: err?.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (vouchers.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          {t("warehouse.industrialWaste.noVouchers")}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {vouchers.map((v) => (
          <Card key={v.id} data-testid={`card-waste-out-${v.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-1">
                  <Hash className="h-4 w-4 text-muted-foreground" />
                  {v.voucher_number}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-600 hover:text-red-700 h-8 w-8"
                  onClick={() => setDeleteId(v.id)}
                  data-testid={`button-delete-waste-out-${v.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {v.voucher_date}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex items-center gap-2">
                <Recycle className="h-4 w-4 text-red-600 shrink-0" />
                <span className="font-medium">{v.waste_type}</span>
              </div>
              <div>
                {t("warehouse.industrialWaste.quantity")}:{" "}
                <Badge variant="secondary">
                  {formatNumberAr(parseFloat(v.quantity), 2)} {v.unit}
                </Badge>
              </div>
              <div className="text-muted-foreground">
                {t("warehouse.industrialWaste.company")}: {v.company_name}
              </div>
              {v.driver_name && (
                <div className="text-muted-foreground">
                  {t("warehouse.industrialWaste.driver")}: {v.driver_name}
                </div>
              )}
              {v.vehicle_number && (
                <div className="text-muted-foreground">
                  {t("warehouse.industrialWaste.vehicle")}: {v.vehicle_number}
                </div>
              )}
              {v.notes && (
                <div className="text-muted-foreground">{v.notes}</div>
              )}
              {v.issued_by_name && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <User className="h-3 w-3" />
                  {v.issued_by_name}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("warehouse.industrialWaste.confirmDeleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("warehouse.industrialWaste.confirmDeleteDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin ml-2" />
              )}
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function WasteInDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [wasteType, setWasteType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("كيلو");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [voucherDate, setVoucherDate] = useState(todayStr());

  const reset = () => {
    setWasteType("");
    setQuantity("");
    setUnit("كيلو");
    setSource("");
    setNotes("");
    setVoucherDate(todayStr());
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "/api/warehouse/vouchers/industrial-waste-in",
        {
          method: "POST",
          body: JSON.stringify({
            waste_type: wasteType.trim(),
            quantity: quantity.trim(),
            unit: unit.trim() || "كيلو",
            source: source.trim() || null,
            notes: notes.trim() || null,
            voucher_date: voucherDate,
          }),
        },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: IN_KEY });
      toast({ title: t("warehouse.industrialWaste.createSuccess") });
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: t("warehouse.industrialWaste.createError"),
        description: err?.message,
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    wasteType.trim().length > 0 && parseFloat(quantity) > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("warehouse.industrialWaste.recFormTitle")}</DialogTitle>
          <DialogDescription>
            {t("warehouse.industrialWaste.recFormDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("warehouse.industrialWaste.wasteType")} *</Label>
            <Input
              value={wasteType}
              onChange={(e) => setWasteType(e.target.value)}
              data-testid="input-waste-in-type"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t("warehouse.industrialWaste.quantity")} *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                data-testid="input-waste-in-quantity"
              />
            </div>
            <div>
              <Label>{t("warehouse.industrialWaste.unit")}</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                data-testid="input-waste-in-unit"
              />
            </div>
          </div>
          <div>
            <Label>{t("warehouse.industrialWaste.source")}</Label>
            <Input
              value={source}
              onChange={(e) => setSource(e.target.value)}
              data-testid="input-waste-in-source"
            />
          </div>
          <div>
            <Label>{t("warehouse.industrialWaste.date")}</Label>
            <Input
              type="date"
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              data-testid="input-waste-in-date"
            />
          </div>
          <div>
            <Label>{t("warehouse.industrialWaste.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="input-waste-in-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            className="bg-green-600 hover:bg-green-700"
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            data-testid="button-submit-waste-in"
          >
            {createMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            )}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WasteOutDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [wasteType, setWasteType] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("كيلو");
  const [companyName, setCompanyName] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [voucherDate, setVoucherDate] = useState(todayStr());

  const reset = () => {
    setWasteType("");
    setQuantity("");
    setUnit("كيلو");
    setCompanyName("");
    setDriverName("");
    setVehicleNumber("");
    setNotes("");
    setVoucherDate(todayStr());
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest(
        "/api/warehouse/vouchers/industrial-waste-out",
        {
          method: "POST",
          body: JSON.stringify({
            waste_type: wasteType.trim(),
            quantity: quantity.trim(),
            unit: unit.trim() || "كيلو",
            company_name: companyName.trim(),
            driver_name: driverName.trim() || null,
            vehicle_number: vehicleNumber.trim() || null,
            notes: notes.trim() || null,
            voucher_date: voucherDate,
          }),
        },
      );
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OUT_KEY });
      toast({ title: t("warehouse.industrialWaste.createSuccess") });
      reset();
      onOpenChange(false);
    },
    onError: (err: any) => {
      toast({
        title: t("warehouse.industrialWaste.createError"),
        description: err?.message,
        variant: "destructive",
      });
    },
  });

  const canSubmit =
    wasteType.trim().length > 0 &&
    parseFloat(quantity) > 0 &&
    companyName.trim().length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("warehouse.industrialWaste.delFormTitle")}</DialogTitle>
          <DialogDescription>
            {t("warehouse.industrialWaste.delFormDesc")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>{t("warehouse.industrialWaste.wasteType")} *</Label>
            <Input
              value={wasteType}
              onChange={(e) => setWasteType(e.target.value)}
              data-testid="input-waste-out-type"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t("warehouse.industrialWaste.quantity")} *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                data-testid="input-waste-out-quantity"
              />
            </div>
            <div>
              <Label>{t("warehouse.industrialWaste.unit")}</Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                data-testid="input-waste-out-unit"
              />
            </div>
          </div>
          <div>
            <Label>{t("warehouse.industrialWaste.company")} *</Label>
            <Input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              data-testid="input-waste-out-company"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>{t("warehouse.industrialWaste.driver")}</Label>
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                data-testid="input-waste-out-driver"
              />
            </div>
            <div>
              <Label>{t("warehouse.industrialWaste.vehicle")}</Label>
              <Input
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                data-testid="input-waste-out-vehicle"
              />
            </div>
          </div>
          <div>
            <Label>{t("warehouse.industrialWaste.date")}</Label>
            <Input
              type="date"
              value={voucherDate}
              onChange={(e) => setVoucherDate(e.target.value)}
              data-testid="input-waste-out-date"
            />
          </div>
          <div>
            <Label>{t("warehouse.industrialWaste.notes")}</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              data-testid="input-waste-out-notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              reset();
              onOpenChange(false);
            }}
          >
            {t("common.cancel")}
          </Button>
          <Button
            className="bg-red-600 hover:bg-red-700"
            disabled={!canSubmit || createMutation.isPending}
            onClick={() => createMutation.mutate()}
            data-testid="button-submit-waste-out"
          >
            {createMutation.isPending && (
              <Loader2 className="h-4 w-4 animate-spin ml-2" />
            )}
            {t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
