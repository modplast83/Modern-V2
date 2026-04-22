import { CheckCircle, AlertCircle, Info, XCircle, X } from "lucide-react";

import { Alert, AlertDescription } from "./alert";
import { Button } from "./button";

interface NotificationProps {
  type: "success" | "error" | "warning" | "info";
  title?: string;
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

const iconMap = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
};

const colorMap = {
  success: "border-success bg-success/10 text-success",
  error: "border-danger bg-danger/10 text-danger",
  warning: "border-warning bg-warning/10 text-warning",
  info: "border-primary bg-primary/10 text-primary",
};

export function Notification({
  type,
  title,
  message,
  onClose,
  autoClose = true,
  duration = 5000,
}: NotificationProps) {
  const Icon = iconMap[type];

  return (
    <Alert
      className={`fixed top-4 left-4 right-4 lg:left-auto lg:right-4 lg:w-96 z-50 ${colorMap[type]}`}
    >
      <div className="flex items-center">
        <Icon className="h-4 w-4 flex-shrink-0" />
        <div className="mr-3 flex-1">
          {title && <p className="font-medium text-sm">{title}</p>}
          <AlertDescription className="text-sm">{message}</AlertDescription>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="mr-auto p-1 h-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Alert>
  );
}
