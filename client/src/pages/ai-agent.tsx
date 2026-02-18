import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import PageLayout from "../components/layout/PageLayout";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { ScrollArea } from "../components/ui/scroll-area";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import { Bot, Send, FileText, Loader2, Download, History, User, Paperclip, X, Image, FileSpreadsheet, File, Mic, MicOff, Square, Sparkles, MessageCircle } from "lucide-react";
import type { Quote } from "../../../shared/schema";

function renderTextWithLinks(text: string) {
  const parts: { type: 'text' | 'link'; content: string; label?: string }[] = [];
  const combinedRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)|(https?:\/\/[^\s<>"{}|\\^`[\]]+?)(?=[)\],.:;!?\s]|$)/g;
  let lastIndex = 0;
  let match;
  while ((match = combinedRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
    }
    if (match[1] && match[2]) {
      parts.push({ type: 'link', content: match[2], label: match[1] });
      lastIndex = match.index + match[0].length;
    } else if (match[3]) {
      parts.push({ type: 'link', content: match[3] });
      lastIndex = match.index + match[3].length;
    }
  }
  if (lastIndex < text.length) {
    parts.push({ type: 'text', content: text.slice(lastIndex) });
  }
  return parts.map((part, index) => {
    if (part.type === 'link') {
      return (
        <a
          key={index}
          href={part.content}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:text-blue-600 underline break-all inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          {part.label || part.content}
        </a>
      );
    }
    return <span key={index}>{part.content}</span>;
  });
}

interface Message {
  role: "user" | "assistant";
  content: string;
  fileInfo?: {
    filename: string;
    mimetype: string;
    size: number;
  };
}

function ChatPanel() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>([]);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  const shouldAutoScrollRef = useRef(true);
  const handleViewportScrollCapture = () => {
    const el = viewportRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceFromBottom < 150;
  };

  const scrollToBottomIfNeeded = () => {
    const el = viewportRef.current;
    if (!el) return;
    if (shouldAutoScrollRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottomIfNeeded();
  }, [messages]);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ title: t("aiAgent.chat.error"), description: t("aiAgent.chat.fileSizeError"), variant: "destructive" });
      return;
    }
    setSelectedFile(file);
  };

  const clearFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getFileIcon = (mimetype: string) => {
    if (mimetype.startsWith("image/")) return <Image className="h-4 w-4" />;
    if (mimetype.includes("spreadsheet") || mimetype.includes("excel")) return <FileSpreadsheet className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");
      const response = await fetch("/api/ai-agent/transcribe", { method: "POST", body: formData });
      const result = await response.json();
      if (result.error) {
        toast({ title: t("aiAgent.voice.error"), description: result.error, variant: "destructive" });
      } else if (result.text) {
        setInput((prev) => prev + (prev ? " " : "") + result.text);
        toast({ title: t("aiAgent.voice.success"), description: t("aiAgent.voice.transcribed") });
      }
    } catch {
      toast({ title: t("aiAgent.voice.error"), description: t("aiAgent.voice.transcriptionError"), variant: "destructive" });
    } finally {
      setIsTranscribing(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
      const mimeType = candidates.find((m) => {
        try { return typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m); } catch { return false; }
      });
      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        if (recordingTimerRef.current) { window.clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
        const audioBlob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        if (audioBlob.size > 0) await transcribeAudio(audioBlob);
        setRecordingDuration(0);
      };
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = window.setInterval(() => { setRecordingDuration((prev) => prev + 1); }, 1000);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({ title: t("aiAgent.voice.error"), description: t("aiAgent.voice.microphoneError"), variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const sendMessage = async () => {
    if ((!input.trim() && !selectedFile) || isLoading) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    let messageContent = input.trim();
    let fileContent = "";
    let fileInfo: Message["fileInfo"] | undefined;

    if (selectedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", selectedFile);
        const uploadResponse = await fetch("/api/ai-agent/upload", { method: "POST", body: formData, signal: abortRef.current.signal });
        const uploadResult = await uploadResponse.json();
        if (uploadResult.error) {
          toast({ title: t("aiAgent.chat.error"), description: uploadResult.error, variant: "destructive" });
          setIsUploading(false);
          return;
        }
        fileContent = `\n\n[${t("aiAgent.chat.fileContent")} "${uploadResult.filename}":\n${uploadResult.content}]`;
        fileInfo = { filename: uploadResult.filename, mimetype: uploadResult.mimetype, size: uploadResult.size };
        clearFile();
      } catch (error: any) {
        if (error?.name !== "AbortError") {
          toast({ title: t("aiAgent.chat.error"), description: t("aiAgent.chat.uploadError"), variant: "destructive" });
        }
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    }

    const fullContent = messageContent + fileContent;
    const userMessage: Message = {
      role: "user",
      content: messageContent || `${t("aiAgent.chat.sentFile")} ${fileInfo?.filename}`,
      fileInfo,
    };
    setMessages((prev) => [...prev, userMessage, { role: "assistant", content: "" }]);
    setInput("");
    setIsLoading(true);
    setTimeout(() => { textareaRef.current?.focus(); }, 100);

    try {
      const messagesForApi = [
        ...messagesRef.current.map((m) => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: fullContent },
      ];
      const response = await fetch("/api/ai-agent/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesForApi }),
        signal: abortRef.current.signal,
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";
      let finalContent = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;
          try {
            const data = JSON.parse(raw);
            if (data.error) {
              toast({ title: t("aiAgent.chat.error"), description: data.error, variant: "destructive" });
              continue;
            }
            if (typeof data.content === "string") {
              finalContent = data.content;
              setMessages((prev) => {
                if (!prev.length) return prev;
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") return [...prev.slice(0, -1), { ...last, content: finalContent }];
                return [...prev, { role: "assistant", content: finalContent }];
              });
            }
          } catch {}
        }
      }
    } catch (error: any) {
      if (error?.name !== "AbortError") {
        toast({ title: t("aiAgent.chat.error"), description: t("errors.somethingWentWrong"), variant: "destructive" });
      }
      setMessages((prev) => {
        if (!prev.length) return prev;
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && !last.content) return [...prev.slice(0, -1), { ...last, content: t("errors.somethingWentWrong") }];
        return prev;
      });
    } finally {
      setIsLoading(false);
      scrollToBottomIfNeeded();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] md:h-[calc(100vh-220px)] min-h-[400px]">
      <ScrollArea
        viewportRef={viewportRef}
        className="flex-1"
      >
        <div
          className="p-3 md:p-6 space-y-3 md:space-y-4"
          dir="ltr"
          onScrollCapture={handleViewportScrollCapture}
        >
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 md:py-20 text-muted-foreground">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-6">
                <Sparkles className="h-10 w-10 md:h-12 md:w-12 text-primary/60" />
              </div>
              <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                {t("aiAgent.chat.welcome")}
              </h3>
              <p className="text-sm md:text-base text-muted-foreground mb-6 text-center max-w-md">
                {t("aiAgent.chat.canHelpWith")}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg px-4">
                {[
                  { icon: "📦", text: t("aiAgent.chat.helpItems.orders") },
                  { icon: "🏭", text: t("aiAgent.chat.helpItems.production") },
                  { icon: "📋", text: t("aiAgent.chat.helpItems.quotes") },
                  { icon: "💬", text: t("aiAgent.chat.helpItems.whatsapp") },
                  { icon: "📁", text: t("aiAgent.chat.helpItems.files") },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors cursor-default text-sm"
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-foreground/80">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 md:space-y-4 max-w-4xl mx-auto">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-2 md:gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center shadow-sm ${
                      msg.role === "user"
                        ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
                        : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>

                  <div
                    className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tl-2xl rounded-tr-sm"
                        : "bg-card border border-border/60 rounded-tr-2xl rounded-tl-sm"
                    }`}
                  >
                    {msg.fileInfo && (
                      <div className="flex items-center gap-2 mb-2 p-2 rounded-lg bg-black/10 dark:bg-white/10">
                        {getFileIcon(msg.fileInfo.mimetype)}
                        <span className="text-xs font-medium">{msg.fileInfo.filename}</span>
                        <span className="text-xs opacity-70">({formatFileSize(msg.fileInfo.size)})</span>
                      </div>
                    )}
                    {msg.content ? (
                      <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed" dir="auto">
                        {renderTextWithLinks(msg.content)}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                          <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>

      {selectedFile && (
        <div className="px-3 md:px-6 pt-2 border-t border-border/40">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-primary/5 border border-primary/20">
            {getFileIcon(selectedFile.type)}
            <span className="text-sm flex-1 truncate font-medium">{selectedFile.name}</span>
            <span className="text-xs text-muted-foreground">{formatFileSize(selectedFile.size)}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" onClick={clearFile}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {isRecording && (
        <div className="px-3 md:px-6 pt-2 border-t border-border/40">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm text-red-700 dark:text-red-300 font-medium">{t("aiAgent.voice.recording")}</span>
            <span className="text-sm text-red-600 dark:text-red-400 font-mono">{formatDuration(recordingDuration)}</span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800 rounded-lg"
              onClick={stopRecording}
            >
              <Square className="h-3 w-3 ml-1" />
              {t("aiAgent.voice.stop")}
            </Button>
          </div>
        </div>
      )}

      <div className="p-3 md:p-4 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept="image/*,.txt,.csv,.xlsx,.xls,.pdf,audio/*"
          className="hidden"
        />
        <div className="flex gap-2 items-end max-w-4xl mx-auto">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 md:h-11 md:w-11 shrink-0 rounded-xl hover:bg-primary/10 hover:text-primary"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isUploading || isRecording || isTranscribing}
            >
              {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </Button>
            <Button
              variant={isRecording ? "destructive" : "ghost"}
              size="icon"
              className={`h-10 w-10 md:h-11 md:w-11 shrink-0 rounded-xl ${!isRecording ? 'hover:bg-primary/10 hover:text-primary' : ''}`}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading || isUploading || isTranscribing}
            >
              {isTranscribing ? <Loader2 className="h-5 w-5 animate-spin" /> : isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
          </div>

          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isTranscribing ? t("aiAgent.voice.transcribing") : t("aiAgent.chat.placeholder")}
              dir="auto"
              className="min-h-[44px] max-h-[120px] resize-none rounded-xl border-2 border-border/60 focus:border-primary/50 text-sm md:text-base pr-4 pl-4 py-3"
              disabled={isLoading || isRecording || isTranscribing}
              autoFocus
            />
          </div>

          <Button
            onClick={sendMessage}
            disabled={(!input.trim() && !selectedFile) || isLoading || isRecording || isTranscribing}
            size="icon"
            className="h-10 w-10 md:h-11 md:w-11 shrink-0 rounded-xl bg-primary hover:bg-primary/90 shadow-md"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuotesHistory() {
  const { t } = useTranslation();
  const { data: quotes, isLoading } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("ar-SA");
  };

  const formatCurrency = (amount: string | number) => {
    return new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(amount)) + " SAR";
  };

  const handleDownloadPdf = async (quoteId: number) => {
    window.open(`/api/quotes/${quoteId}/pdf`, "_blank");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!quotes?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <FileText className="h-8 w-8 opacity-50" />
        </div>
        <p className="font-medium">{t("aiAgent.quotes.noQuotes")}</p>
        <p className="text-sm mt-2">{t("aiAgent.chat.useConversation")}</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)] min-h-[400px]">
      <div className="space-y-3 p-3 md:p-6">
        {quotes.map(quote => (
          <Card key={quote.id} className="hover:shadow-md transition-shadow border-border/60">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-sm" dir="ltr">{quote.document_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(quote.quote_date)}</p>
                  </div>
                </div>
                <Badge variant={quote.status === "draft" ? "secondary" : "default"} className="text-xs">
                  {quote.status === "draft" ? t("aiAgent.quotes.draft") : quote.status}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">{t("aiAgent.quotes.customer")}:</span>
                  <span className="font-medium text-xs">{quote.customer_name}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-muted-foreground text-xs">{t("aiAgent.quotes.total")}:</span>
                  <span className="font-bold text-primary text-sm" dir="ltr">{formatCurrency(quote.total_with_tax)}</span>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto rounded-lg text-xs" onClick={() => handleDownloadPdf(quote.id)}>
                <Download className="h-3 w-3 ml-1" />
                {t("aiAgent.quotes.download")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}

export default function AiAgentPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"chat" | "history">("chat");

  return (
    <PageLayout
      title={t("aiAgent.title")}
      description={t("aiAgent.description")}
    >
      <div className="max-w-5xl mx-auto" dir="rtl">
        <div className="flex gap-2 mb-4">
          <Button
            variant={activeTab === "chat" ? "default" : "outline"}
            onClick={() => setActiveTab("chat")}
            className="rounded-xl gap-2 flex-1 sm:flex-none"
          >
            <MessageCircle className="h-4 w-4" />
            {t("aiAgent.tabs.chat")}
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
            className="rounded-xl gap-2 flex-1 sm:flex-none"
          >
            <History className="h-4 w-4" />
            {t("aiAgent.tabs.quotesHistory")}
          </Button>
        </div>

        <Card className="border-border/60 shadow-sm overflow-hidden">
          {activeTab === "chat" ? (
            <CardContent className="p-0">
              <ChatPanel />
            </CardContent>
          ) : (
            <CardContent className="p-0">
              <QuotesHistory />
            </CardContent>
          )}
        </Card>
      </div>
    </PageLayout>
  );
}
