import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Badge } from "../ui/badge";
import { Separator } from "../ui/separator";
import { useToast } from "../../hooks/use-toast";
import { apiRequest } from "../../lib/queryClient";
import {
  MessageSquare,
  Send,
  Wallet,
  CheckCircle2,
  XCircle,
  Loader2,
  Phone,
  Users,
  RefreshCw,
  Plus,
  Trash2,
} from "lucide-react";

interface SMSStatusResponse {
  success: boolean;
  configured: boolean;
  systemStatus: string;
  provider: string;
  webhookUrl?: string;
}

interface SMSBalanceResponse {
  success: boolean;
  balance?: string;
  currency?: string;
  message?: string;
}

interface SMSSendersResponse {
  success: boolean;
  senders?: any[];
  message?: string;
}

export default function SMSSettingsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [testPhone, setTestPhone] = useState("");
  const [smsForm, setSmsForm] = useState({
    phone_number: "",
    message: "",
    recipients: [] as string[],
    sender_name: "",
  });
  const [newRecipient, setNewRecipient] = useState("");

  const { data: smsStatus, isLoading: statusLoading } = useQuery<SMSStatusResponse>({
    queryKey: ["/api/sms/status"],
  });

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance } = useQuery<SMSBalanceResponse>({
    queryKey: ["/api/sms/balance"],
    enabled: !!smsStatus?.configured,
  });

  const { data: sendersData, isLoading: sendersLoading } = useQuery<SMSSendersResponse>({
    queryKey: ["/api/sms/senders"],
    enabled: !!smsStatus?.configured,
  });

  const sendTestMutation = useMutation({
    mutationFn: async (phone: string) => {
      const res = await apiRequest("/api/sms/test", {
        method: "POST",
        body: JSON.stringify({ phone_number: phone }),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('sms.toasts.sent'),
        description: t('sms.toasts.testSentSuccess'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('sms.toasts.sendFailed'),
        description: error.message || t('sms.toasts.testSendFailed'),
        variant: "destructive",
      });
    },
  });

  const sendSMSMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("/api/sms/send", {
        method: "POST",
        body: JSON.stringify(data),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t('sms.toasts.sent'),
        description: t('sms.toasts.smsSentSuccess'),
      });
      setSmsForm({ phone_number: "", message: "", recipients: [], sender_name: "" });
    },
    onError: (error: any) => {
      toast({
        title: t('sms.toasts.sendFailed'),
        description: error.message || t('sms.toasts.smsSendFailed'),
        variant: "destructive",
      });
    },
  });

  const handleSendTest = () => {
    if (!testPhone.trim()) {
      toast({
        title: t('common.error'),
        description: t('sms.toasts.enterPhone'),
        variant: "destructive",
      });
      return;
    }
    sendTestMutation.mutate(testPhone);
  };

  const handleSendSMS = () => {
    if (!smsForm.phone_number.trim() && smsForm.recipients.length === 0) {
      toast({
        title: t('common.error'),
        description: t('sms.toasts.enterAtLeastOnePhone'),
        variant: "destructive",
      });
      return;
    }
    if (!smsForm.message.trim()) {
      toast({
        title: t('common.error'),
        description: t('sms.toasts.writeMessage'),
        variant: "destructive",
      });
      return;
    }
    sendSMSMutation.mutate(smsForm);
  };

  const addRecipient = () => {
    if (newRecipient.trim() && !smsForm.recipients.includes(newRecipient.trim())) {
      setSmsForm((prev) => ({
        ...prev,
        recipients: [...prev.recipients, newRecipient.trim()],
      }));
      setNewRecipient("");
    }
  };

  const removeRecipient = (phone: string) => {
    setSmsForm((prev) => ({
      ...prev,
      recipients: prev.recipients.filter((r) => r !== phone),
    }));
  };

  const charCount = smsForm.message.length;
  const smsCount = charCount <= 70 ? 1 : Math.ceil(charCount / 67);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t('sms.serviceStatus')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className={`p-2 rounded-full ${smsStatus?.configured ? "bg-green-100" : "bg-red-100"}`}>
                {statusLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
                ) : smsStatus?.configured ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('sms.serviceStatusLabel')}
                </p>
                <p className="font-medium">
                  {statusLoading
                    ? t('sms.checking')
                    : smsStatus?.configured
                      ? t('sms.active')
                      : t('sms.notConfigured')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className="p-2 rounded-full bg-blue-100">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('sms.balance')}
                </p>
                <p className="font-medium">
                  {balanceLoading
                    ? t('common.loading')
                    : balanceData?.success
                      ? `${balanceData.balance} ${balanceData.currency}`
                      : t('sms.unavailable')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchBalance()}
                className="mr-auto"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex items-center gap-3 p-4 rounded-lg border">
              <div className="p-2 rounded-full bg-purple-100">
                <Phone className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {t('sms.senderNames')}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {sendersLoading ? (
                    <span className="text-sm">{t('common.loading')}</span>
                  ) : sendersData?.success && sendersData?.senders && sendersData.senders.length > 0 ? (
                    sendersData.senders.map((sender: any, idx: number) => {
                      let label = "";
                      if (typeof sender === "string") {
                        label = sender;
                      } else if (sender && typeof sender === "object") {
                        label = typeof sender.senderName === "string" ? sender.senderName
                          : typeof sender.name === "string" ? sender.name
                          : typeof sender.destination === "string" ? sender.destination
                          : JSON.stringify(sender);
                      } else {
                        label = String(sender);
                      }
                      return (
                        <Badge key={idx} variant="secondary" className="text-xs">
                          {label}
                        </Badge>
                      );
                    })
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {t('sms.noSenders')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {smsStatus?.webhookUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              {t('sms.webhookUrl')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              {t('sms.webhookDesc')}
            </p>
            <div className="flex gap-2 items-center">
              <Input
                value={smsStatus.webhookUrl}
                readOnly
                dir="ltr"
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(smsStatus.webhookUrl!);
                  toast({
                    title: t('sms.toasts.copied'),
                    description: t('sms.toasts.webhookCopied'),
                  });
                }}
              >
                {t('common.copy')}
              </Button>
            </div>
            <div className="mt-3 p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <>
                    <strong>{t('sms.setupStepsTitle')}:</strong>
                    <br />
                    1. {t('sms.setupStep1')} <a href="https://portal.taqnyat.sa" target="_blank" rel="noopener noreferrer" className="text-primary underline">portal.taqnyat.sa</a>
                    <br />
                    2. {t('sms.setupStep2')}
                    <br />
                    3. {t('sms.setupStep3')}
                    <br />
                    4. {t('sms.setupStep4')}
                  </>
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            {t('sms.sendTest')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Label>{t('sms.phoneForTesting')}</Label>
              <Input
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="966XXXXXXXXX"
                dir="ltr"
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleSendTest}
              disabled={sendTestMutation.isPending || !smsStatus?.configured}
            >
              {sendTestMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin ml-2" />
              ) : (
                <Send className="w-4 h-4 ml-2" />
              )}
              {t('sms.sendTest')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {t('sms.testDesc')}
          </p>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            {t('sms.sendSmsMessage')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('sms.primaryPhone')}</Label>
            <Input
              value={smsForm.phone_number}
              onChange={(e) => setSmsForm((prev) => ({ ...prev, phone_number: e.target.value }))}
              placeholder="966XXXXXXXXX"
              dir="ltr"
              className="mt-1"
            />
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {t('sms.additionalRecipients')}
            </Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={newRecipient}
                onChange={(e) => setNewRecipient(e.target.value)}
                placeholder="966XXXXXXXXX"
                dir="ltr"
                onKeyDown={(e) => e.key === "Enter" && addRecipient()}
              />
              <Button variant="outline" onClick={addRecipient} type="button">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {smsForm.recipients.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {smsForm.recipients.map((phone) => (
                  <Badge key={phone} variant="secondary" className="flex items-center gap-1">
                    <span dir="ltr">{phone}</span>
                    <button onClick={() => removeRecipient(phone)}>
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label>{t('sms.messageText')}</Label>
            <Textarea
              value={smsForm.message}
              onChange={(e) => setSmsForm((prev) => ({ ...prev, message: e.target.value }))}
              placeholder={t('sms.writeMessagePlaceholder')}
              rows={4}
              maxLength={918}
              className="mt-1"
            />
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>
                {t('sms.smsCount', { count: smsCount })}
              </span>
              <span dir="ltr">{charCount}/918</span>
            </div>
          </div>

          <div>
            <Label>{t('sms.senderNameOptional')}</Label>
            <Input
              value={smsForm.sender_name}
              onChange={(e) => setSmsForm((prev) => ({ ...prev, sender_name: e.target.value }))}
              placeholder={t('sms.leaveEmptyDefault')}
              dir="ltr"
              maxLength={20}
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleSendSMS}
            disabled={sendSMSMutation.isPending || !smsStatus?.configured}
            className="w-full"
          >
            {sendSMSMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin ml-2" />
            ) : (
              <Send className="w-4 h-4 ml-2" />
            )}
            {t('sms.sendMessage')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
