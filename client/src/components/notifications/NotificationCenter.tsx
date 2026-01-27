import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Alert } from "../ui/alert";
import { Switch } from "../ui/switch";
import {
  Bell,
  MessageSquare,
  Send,
  TestTube,
  Phone,
  Clock,
  CheckCircle,
  XCircle,
  Trash2,
  Eye,
  EyeOff,
  Wifi,
  WifiOff,
  Settings,
  Users,
  AlertCircle,
  Zap,
  Loader2,
} from "lucide-react";
import { useToast } from "../../hooks/use-toast";
import { apiRequest, queryClient } from "../../lib/queryClient";
import { useSSE, type SSENotification } from "../../hooks/use-sse";

interface Notification {
  id: number;
  title: string;
  title_ar?: string;
  message: string;
  message_ar?: string;
  type: string;
  priority: string;
  status: string;
  phone_number?: string;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  created_at: string;
  twilio_sid?: string;
  error_message?: string;
  context_type?: string;
  context_id?: string;
}

export default function NotificationCenter() {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");

  // System notification form states
  const [systemTitle, setSystemTitle] = useState("");
  const [systemMessage, setSystemMessage] = useState("");
  const [systemType, setSystemType] = useState<
    "system" | "order" | "production" | "maintenance" | "quality" | "hr"
  >("system");
  const [systemPriority, setSystemPriority] = useState<
    "low" | "normal" | "high" | "urgent"
  >("normal");
  const [recipientType, setRecipientType] = useState<"user" | "role" | "all">(
    "all",
  );
  const [recipientId, setRecipientId] = useState("");
  const [notificationSound, setNotificationSound] = useState(false);

  // Real-time notifications state
  const [realtimeNotifications, setRealtimeNotifications] = useState<
    SSENotification[]
  >([]);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Fetch initial notifications (for WhatsApp history)
  const { data: whatsappNotifications, isLoading: whatsappLoading } = useQuery<
    Notification[]
  >({
    queryKey: ["/api/notifications"],
  });

  // Fetch user notifications with real-time support
  const {
    data: userNotificationsData,
    isLoading: userNotificationsLoading,
    refetch: refetchUserNotifications,
  } = useQuery({
    queryKey: ["/api/notifications/user", { unread_only: showUnreadOnly }],
    queryFn: async () => {
      const response = await fetch(
        `/api/notifications/user?unread_only=${showUnreadOnly}&limit=100`,
        {
          credentials: "include",
        },
      );
      if (!response.ok) {
        throw new Error("Failed to fetch user notifications");
      }
      return response.json() as Promise<{
        notifications: Notification[];
        unread_count: number;
      }>;
    },
  });

  // SSE event handlers
  const handleNewNotification = useCallback(
    (notification: SSENotification) => {
      // Filter out system notifications
      if (notification.type === "system") {
        return;
      }
      
      // Add to realtime notifications
      setRealtimeNotifications((prev) => [notification, ...prev]);

      // Show toast for new notification
      toast({
        title:
          notification.icon +
          " " +
          (notification.title_ar || notification.title),
        description: notification.message_ar || notification.message,
        duration:
          notification.priority === "urgent"
            ? 10000
            : notification.priority === "high"
              ? 7000
              : 5000,
      });

      // Invalidate query to automatically refetch - more efficient than manual refetch
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/user"] });
    },
    [toast, queryClient],
  );

  const handleRecentNotifications = useCallback(
    (data: { notifications: SSENotification[]; count: number }) => {
      // Filter out system notifications
      const filteredNotifications = data.notifications.filter(
        n => n.type !== "system"
      );
      setRealtimeNotifications(filteredNotifications);
      console.log(
        `[NotificationCenter] Received ${filteredNotifications.length} non-system notifications`,
      );
    },
    [],
  );

  const handleSSEConnected = useCallback(() => {
    console.log("[NotificationCenter] SSE connected successfully");
  }, []);

  const handleSSEError = useCallback((error: Event) => {
    console.error("[NotificationCenter] SSE connection error:", error);
  }, []);

  // Memoize event handlers object to prevent infinite re-renders
  const sseEventHandlers = useMemo(
    () => ({
      onNotification: handleNewNotification,
      onRecentNotifications: handleRecentNotifications,
      onConnected: handleSSEConnected,
      onError: handleSSEError,
    }),
    [
      handleNewNotification,
      handleRecentNotifications,
      handleSSEConnected,
      handleSSEError,
    ],
  );

  // Initialize SSE connection
  const { connectionState, reconnect } = useSSE(sseEventHandlers);

  // Create system notification mutation
  const createSystemNotificationMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      message: string;
      type: string;
      priority: string;
      recipient_type: string;
      recipient_id?: string;
      sound?: boolean;
    }) => {
      return await apiRequest("/api/notifications/system", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ تم إرسال الإشعار",
        description: "تم إرسال الإشعار للنظام بنجاح",
      });
      setSystemTitle("");
      setSystemMessage("");
      setRecipientId("");
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطأ في الإرسال",
        description: error.message || "فشل في إرسال إشعار النظام",
        variant: "destructive",
      });
    },
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(
        `/api/notifications/mark-read/${notificationId}`,
        {
          method: "PATCH",
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطأ",
        description: error.message || "فشل في تعليم الإشعار كمقروء",
        variant: "destructive",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("/api/notifications/mark-all-read", {
        method: "PATCH",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/user"] });
      setRealtimeNotifications([]);
      toast({
        title: "✅ تم التحديث",
        description: "تم تعليم جميع الإشعارات كمقروءة",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطأ",
        description: error.message || "فشل في تعليم الإشعارات كمقروءة",
        variant: "destructive",
      });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return await apiRequest(`/api/notifications/delete/${notificationId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "✅ تم الحذف",
        description: "تم حذف الإشعار بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطأ في الحذف",
        description: error.message || "فشل في حذف الإشعار",
        variant: "destructive",
      });
    },
  });

  // Send WhatsApp message mutation
  const sendWhatsAppMutation = useMutation({
    mutationFn: async (data: {
      phone_number: string;
      message: string;
      title?: string;
      priority?: string;
    }) => {
      return await apiRequest("/api/notifications/whatsapp", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "✅ تم إرسال الرسالة",
        description: "تم إرسال رسالة الواتس اب بنجاح",
      });
      setMessage("");
      setTitle("");
      setPhoneNumber("");
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطأ في الإرسال",
        description: error.message || "فشل في إرسال رسالة الواتس اب",
        variant: "destructive",
      });
    },
  });

  // Send test message mutation
  const sendTestMutation = useMutation({
    mutationFn: async (phone_number: string) => {
      return await apiRequest("/api/notifications/test", {
        method: "POST",
        body: JSON.stringify({ phone_number }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      toast({
        title: "✅ رسالة الاختبار",
        description: "تم إرسال رسالة الاختبار بنجاح",
      });
    },
    onError: (error: any) => {
      toast({
        title: "❌ خطأ في الاختبار",
        description: error.message || "فشل في إرسال رسالة الاختبار",
        variant: "destructive",
      });
    },
  });

  // Handler functions
  const handleSendMessage = () => {
    if (!phoneNumber || !message) {
      toast({
        title: "⚠️ بيانات ناقصة",
        description: "يرجى إدخال رقم الهاتف والرسالة",
        variant: "destructive",
      });
      return;
    }

    sendWhatsAppMutation.mutate({
      phone_number: phoneNumber,
      message,
      title,
      priority,
    });
  };

  const handleSendSystemNotification = () => {
    if (!systemTitle || !systemMessage) {
      toast({
        title: "⚠️ بيانات ناقصة",
        description: "يرجى إدخال العنوان والرسالة",
        variant: "destructive",
      });
      return;
    }

    if (recipientType !== "all" && !recipientId) {
      toast({
        title: "⚠️ معرف المستلم مطلوب",
        description: "يرجى إدخال معرف المستخدم أو الدور",
        variant: "destructive",
      });
      return;
    }

    createSystemNotificationMutation.mutate({
      title: systemTitle,
      message: systemMessage,
      type: systemType,
      priority: systemPriority,
      recipient_type: recipientType,
      recipient_id: recipientType === "all" ? undefined : recipientId,
      sound: notificationSound,
    });
  };

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleDeleteNotification = (notificationId: number) => {
    deleteNotificationMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleReconnectSSE = () => {
    reconnect();
  };

  // Effect to update filter when showUnreadOnly changes
  useEffect(() => {
    refetchUserNotifications();
  }, [showUnreadOnly, refetchUserNotifications]);

  const handleSendTest = () => {
    if (!phoneNumber) {
      toast({
        title: "⚠️ رقم الهاتف مطلوب",
        description: "يرجى إدخال رقم الهاتف لإرسال رسالة الاختبار",
        variant: "destructive",
      });
      return;
    }

    sendTestMutation.mutate(phoneNumber);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <Send className="h-4 w-4 text-blue-500" />;
      case "delivered":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "delivered":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      case "high":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      case "normal":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Bell className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          مركز الإشعارات
        </h1>
      </div>

      {/* SSE Connection Status */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {connectionState.isConnected ? (
                <Wifi className="h-5 w-5 text-green-500" />
              ) : connectionState.isConnecting ? (
                <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
              ) : (
                <WifiOff className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-medium">
                {connectionState.isConnected
                  ? "متصل - الإشعارات الفورية نشطة"
                  : connectionState.isConnecting
                    ? "جاري الاتصال..."
                    : "غير متصل - الإشعارات الفورية معطلة"}
              </span>
            </div>
            {connectionState.error && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600">
                  {connectionState.error}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReconnectSSE}
                >
                  إعادة الاتصال
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="realtime" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="realtime"
            className="flex items-center gap-2"
            data-testid="tab-realtime"
          >
            <Bell className="h-4 w-4" />
            الإشعارات الفورية
          </TabsTrigger>
          <TabsTrigger
            value="send"
            className="flex items-center gap-2"
            data-testid="tab-send"
          >
            <MessageSquare className="h-4 w-4" />
            إرسال رسائل
          </TabsTrigger>
          <TabsTrigger
            value="system"
            className="flex items-center gap-2"
            data-testid="tab-system"
          >
            <Settings className="h-4 w-4" />
            إشعارات النظام
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="flex items-center gap-2"
            data-testid="tab-history"
          >
            <Clock className="h-4 w-4" />
            سجل الإشعارات
          </TabsTrigger>
        </TabsList>

        {/* Real-time Notifications Tab */}
        <TabsContent value="realtime" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-blue-600" />
                  الإشعارات الفورية
                  {userNotificationsData?.unread_count &&
                    userNotificationsData.unread_count > 0 && (
                      <Badge variant="destructive" className="ml-2">
                        {userNotificationsData.unread_count}
                      </Badge>
                    )}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={showUnreadOnly}
                      onCheckedChange={setShowUnreadOnly}
                      data-testid="switch-unread-only"
                    />
                    <span className="text-sm text-gray-600">
                      غير المقروء فقط
                    </span>
                  </div>
                  {(userNotificationsData?.unread_count || 0) > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleMarkAllAsRead}
                      disabled={markAllAsReadMutation.isPending}
                      data-testid="button-mark-all-read"
                    >
                      {markAllAsReadMutation.isPending && (
                        <Loader2 className="h-4 w-4 animate-spin ml-1" />
                      )}
                      تعليم الجميع كمقروء
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {userNotificationsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2">جاري تحميل الإشعارات...</span>
                </div>
              ) : (
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {userNotificationsData?.notifications &&
                  userNotificationsData.notifications.filter(n => n.type !== "system").length > 0 ? (
                    userNotificationsData.notifications
                      .filter(n => n.type !== "system")
                      .map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 border rounded-lg transition-all ${
                          !notification.read_at
                            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
                            : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        }`}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 dark:text-white">
                                {notification.title_ar || notification.title}
                              </span>
                              <Badge
                                className={getPriorityColor(
                                  notification.priority,
                                )}
                              >
                                {notification.priority}
                              </Badge>
                              <Badge
                                className={getStatusColor(notification.status)}
                              >
                                {getStatusIcon(notification.status)}
                                {notification.status}
                              </Badge>
                              {!notification.read_at && (
                                <Badge
                                  variant="secondary"
                                  className="bg-blue-100 text-blue-800"
                                >
                                  جديد
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
                              {notification.message_ar || notification.message}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500">
                              <span>نوع: {notification.type}</span>
                              <span>
                                تاريخ:{" "}
                                {new Date(
                                  notification.created_at,
                                ).toLocaleString("ar")}
                              </span>
                              {notification.context_type && (
                                <span>السياق: {notification.context_type}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!notification.read_at && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleMarkAsRead(notification.id)
                                }
                                disabled={markAsReadMutation.isPending}
                                data-testid={`button-mark-read-${notification.id}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700"
                              onClick={() =>
                                handleDeleteNotification(notification.id)
                              }
                              disabled={deleteNotificationMutation.isPending}
                              data-testid={`button-delete-${notification.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <Bell className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>لا توجد إشعارات حالياً</p>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Notifications Tab */}
        <TabsContent value="system" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-purple-600" />
                إنشاء إشعار نظام
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">عنوان الإشعار *</label>
                  <Input
                    placeholder="عنوان الإشعار"
                    value={systemTitle}
                    onChange={(e) => setSystemTitle(e.target.value)}
                    data-testid="input-system-title"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">نوع الإشعار</label>
                  <Select
                    value={systemType ?? ""}
                    onValueChange={(value: any) => setSystemType(value)}
                  >
                    <SelectTrigger data-testid="select-system-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">نظام</SelectItem>
                      <SelectItem value="order">طلب</SelectItem>
                      <SelectItem value="production">إنتاج</SelectItem>
                      <SelectItem value="maintenance">صيانة</SelectItem>
                      <SelectItem value="quality">جودة</SelectItem>
                      <SelectItem value="hr">موارد بشرية</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">محتوى الإشعار *</label>
                <Textarea
                  placeholder="اكتب محتوى الإشعار هنا..."
                  value={systemMessage}
                  onChange={(e) => setSystemMessage(e.target.value)}
                  rows={3}
                  data-testid="textarea-system-message"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">الأولوية</label>
                  <Select
                    value={systemPriority ?? ""}
                    onValueChange={(value: any) => setSystemPriority(value)}
                  >
                    <SelectTrigger data-testid="select-system-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">منخفضة</SelectItem>
                      <SelectItem value="normal">عادية</SelectItem>
                      <SelectItem value="high">عالية</SelectItem>
                      <SelectItem value="urgent">عاجلة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">المستلم</label>
                  <Select
                    value={recipientType ?? ""}
                    onValueChange={(value: any) => setRecipientType(value)}
                  >
                    <SelectTrigger data-testid="select-recipient-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">جميع المستخدمين</SelectItem>
                      <SelectItem value="user">مستخدم محدد</SelectItem>
                      <SelectItem value="role">دور محدد</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recipientType !== "all" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">معرف المستلم</label>
                    <Input
                      placeholder={
                        recipientType === "user"
                          ? "معرف المستخدم"
                          : "معرف الدور"
                      }
                      value={recipientId}
                      onChange={(e) => setRecipientId(e.target.value)}
                      type="number"
                      data-testid="input-recipient-id"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={notificationSound}
                  onCheckedChange={setNotificationSound}
                  data-testid="switch-notification-sound"
                />
                <label className="text-sm">تشغيل صوت الإشعار</label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  onClick={handleSendSystemNotification}
                  disabled={createSystemNotificationMutation.isPending}
                  className="flex-1"
                  data-testid="button-send-system-notification"
                >
                  {createSystemNotificationMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin ml-1" />
                  )}
                  <Send className="h-4 w-4 ml-1" />
                  إرسال الإشعار
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-green-600" />
                إرسال رسالة واتس اب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">رقم الهاتف *</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="+966501234567"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className="flex-1"
                      dir="ltr"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSendTest}
                      disabled={sendTestMutation.isPending}
                    >
                      <TestTube className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500">
                    مثال: +966501234567 (يجب أن يبدأ برمز الدولة)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">عنوان الرسالة</label>
                  <Input
                    placeholder="عنوان الإشعار"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">محتوى الرسالة *</label>
                <Textarea
                  placeholder="اكتب محتوى الرسالة هنا..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">الأولوية</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="low">منخفضة</option>
                  <option value="normal">عادية</option>
                  <option value="high">عالية</option>
                  <option value="urgent">عاجلة</option>
                </select>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={sendWhatsAppMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sendWhatsAppMutation.isPending
                    ? "جاري الإرسال..."
                    : "إرسال الرسالة"}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleSendTest}
                  disabled={sendTestMutation.isPending || !phoneNumber}
                  className="flex items-center gap-2"
                >
                  <TestTube className="h-4 w-4" />
                  رسالة اختبار
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>سجل الإشعارات</CardTitle>
            </CardHeader>
            <CardContent>
              {whatsappLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">جاري تحميل الإشعارات...</p>
                </div>
              ) : whatsappNotifications && whatsappNotifications.length > 0 ? (
                <div className="space-y-3">
                  {whatsappNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusIcon(notification.status)}
                            <h3 className="font-medium text-gray-900 dark:text-white">
                              {notification.title_ar || notification.title}
                            </h3>
                            <Badge
                              className={getStatusColor(notification.status)}
                            >
                              {notification.status === "sent"
                                ? "مُرسل"
                                : notification.status === "delivered"
                                  ? "مُسلم"
                                  : notification.status === "failed"
                                    ? "فاشل"
                                    : "معلق"}
                            </Badge>
                            <Badge
                              className={getPriorityColor(
                                notification.priority,
                              )}
                            >
                              {notification.priority === "urgent"
                                ? "عاجل"
                                : notification.priority === "high"
                                  ? "عالي"
                                  : notification.priority === "low"
                                    ? "منخفض"
                                    : "عادي"}
                            </Badge>
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 mb-2">
                            {notification.message_ar || notification.message}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            {notification.phone_number && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {notification.phone_number}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(notification.created_at).toLocaleString(
                                "ar",
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {notification.error_message && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                          <p className="text-red-700 dark:text-red-300 text-sm">
                            خطأ: {notification.error_message}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    لا توجد إشعارات بعد
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
