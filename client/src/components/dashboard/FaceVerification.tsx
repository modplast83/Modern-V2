import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import { Camera, CheckCircle, XCircle, AlertTriangle, RefreshCw, User, Shield } from "lucide-react";
import { useToast } from "../../hooks/use-toast";

interface FaceVerificationProps {
  userId: number;
  onVerificationSuccess: () => void;
  onVerificationFail: () => void;
  actionType: "check_in" | "check_out" | "break_start" | "break_end";
}

export default function FaceVerification({
  userId,
  onVerificationSuccess,
  onVerificationFail,
  actionType,
}: FaceVerificationProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [isOpen, setIsOpen] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "capturing" | "verifying" | "success" | "failed">("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [countdown, setCountdown] = useState<number>(3);

  const { data: hasRegisteredFace } = useQuery<{ hasRegisteredFace: boolean }>({
    queryKey: ["/api/face-verification/status", userId],
    enabled: !!userId,
  });

  const startCamera = useCallback(async () => {
    try {
      setErrorMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      if (err.name === "NotAllowedError") {
        setErrorMessage("يرجى السماح بالوصول إلى الكاميرا من إعدادات المتصفح");
      } else if (err.name === "NotFoundError") {
        setErrorMessage("لم يتم العثور على كاميرا متصلة بالجهاز");
      } else {
        setErrorMessage("حدث خطأ أثناء تشغيل الكاميرا");
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    
    if (!context) return null;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    return canvas.toDataURL("image/jpeg", 0.8);
  }, []);

  const verifyFaceMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await fetch("/api/face-verification/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          image: imageData,
          action_type: actionType,
          timestamp: new Date().toISOString(),
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل التحقق من الوجه");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      if (data.verified) {
        setVerificationStatus("success");
        toast({ title: "تم التحقق بنجاح", description: "تم التعرف على وجهك بنجاح" });
        setTimeout(() => {
          handleClose();
          onVerificationSuccess();
        }, 1500);
      } else {
        setVerificationStatus("failed");
        setErrorMessage(data.message || "لم يتم التعرف على الوجه");
      }
    },
    onError: (error: Error) => {
      setVerificationStatus("failed");
      setErrorMessage(error.message);
    },
  });

  const registerFaceMutation = useMutation({
    mutationFn: async (imageData: string) => {
      const response = await fetch("/api/face-verification/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          image: imageData,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل تسجيل الوجه");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/face-verification/status", userId] });
      toast({ title: "تم التسجيل بنجاح", description: "تم حفظ بصمة وجهك بنجاح" });
      setVerificationStatus("success");
      setTimeout(() => {
        handleClose();
        onVerificationSuccess();
      }, 1500);
    },
    onError: (error: Error) => {
      setVerificationStatus("failed");
      setErrorMessage(error.message);
    },
  });

  const startCountdownCapture = useCallback(() => {
    setVerificationStatus("capturing");
    setCountdown(3);
    
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          const image = captureImage();
          if (image) {
            setCapturedImage(image);
            setVerificationStatus("verifying");
            
            if (hasRegisteredFace?.hasRegisteredFace) {
              verifyFaceMutation.mutate(image);
            } else {
              registerFaceMutation.mutate(image);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [captureImage, hasRegisteredFace, verifyFaceMutation, registerFaceMutation]);

  const handleOpen = () => {
    setIsOpen(true);
    setVerificationStatus("idle");
    setCapturedImage(null);
    setErrorMessage("");
    setTimeout(startCamera, 100);
  };

  const handleClose = () => {
    stopCamera();
    setIsOpen(false);
    setVerificationStatus("idle");
    setCapturedImage(null);
    setErrorMessage("");
  };

  const handleRetry = () => {
    setCapturedImage(null);
    setVerificationStatus("idle");
    setErrorMessage("");
    startCamera();
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const actionLabels = {
    check_in: "تسجيل الحضور",
    check_out: "تسجيل الانصراف",
    break_start: "بدء الاستراحة",
    break_end: "إنهاء الاستراحة",
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        className="w-full flex items-center gap-2"
        variant="outline"
      >
        <Camera className="h-4 w-4" />
        <Shield className="h-4 w-4" />
        التحقق بالوجه
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              التحقق من الهوية - {actionLabels[actionType]}
            </DialogTitle>
            <DialogDescription>
              {hasRegisteredFace?.hasRegisteredFace 
                ? "يرجى النظر إلى الكاميرا للتحقق من هويتك"
                : "سيتم تسجيل بصمة وجهك لأول مرة"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {errorMessage && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="relative aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden">
              {capturedImage ? (
                <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              )}
              
              <canvas ref={canvasRef} className="hidden" />

              {verificationStatus === "capturing" && countdown > 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="text-6xl font-bold text-white animate-pulse">{countdown}</div>
                </div>
              )}

              {verificationStatus === "verifying" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <div className="flex flex-col items-center gap-2">
                    <RefreshCw className="h-8 w-8 text-white animate-spin" />
                    <span className="text-white text-sm">جاري التحقق...</span>
                  </div>
                </div>
              )}

              {verificationStatus === "success" && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/70">
                  <div className="flex flex-col items-center gap-2">
                    <CheckCircle className="h-12 w-12 text-white" />
                    <span className="text-white font-semibold">تم التحقق بنجاح</span>
                  </div>
                </div>
              )}

              {verificationStatus === "failed" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/70">
                  <div className="flex flex-col items-center gap-2">
                    <XCircle className="h-12 w-12 text-white" />
                    <span className="text-white font-semibold">فشل التحقق</span>
                  </div>
                </div>
              )}

              {!isCameraActive && verificationStatus === "idle" && !errorMessage && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <RefreshCw className="h-8 w-8 text-white animate-spin" />
                </div>
              )}

              <div className="absolute bottom-2 right-2">
                {hasRegisteredFace?.hasRegisteredFace ? (
                  <Badge className="bg-green-500">وجه مسجل</Badge>
                ) : (
                  <Badge variant="secondary">تسجيل جديد</Badge>
                )}
              </div>
            </div>

            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              {verificationStatus === "idle" && isCameraActive && (
                <>
                  <User className="h-4 w-4 inline ml-1" />
                  تأكد من وضوح وجهك في الكاميرا
                </>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            {verificationStatus === "idle" && isCameraActive && (
              <Button onClick={startCountdownCapture} className="w-full">
                <Camera className="h-4 w-4 ml-2" />
                التقاط صورة
              </Button>
            )}
            
            {verificationStatus === "failed" && (
              <Button onClick={handleRetry} variant="outline" className="w-full">
                <RefreshCw className="h-4 w-4 ml-2" />
                إعادة المحاولة
              </Button>
            )}
            
            <Button onClick={handleClose} variant="ghost" className="w-full">
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
