import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  Factory,
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  Maximize,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  BarChart3,
  ScrollText,
  Megaphone,
  BookOpen,
  Bell,
} from "lucide-react";

interface SlideData {
  id: number;
  title: string;
  slide_type: string;
  content: any;
  duration_seconds: number;
  sort_order: number;
  is_active: boolean;
}

interface ProductionOrder {
  id: number;
  production_order_number: string;
  status: string;
  quantity_kg: string;
  produced_quantity_kg: string;
  film_completion_percentage: string;
  size_caption: string;
  order_number: string;
  customer_name: string;
  customer_name_ar: string;
}

interface RollData {
  id: number;
  roll_number: string;
  weight_kg: string;
  status: string;
  created_at: string;
  machine_name: string;
  machine_name_ar: string;
  production_order_number: string;
  size_caption: string;
}

interface ProductionStats {
  active_orders: string;
  rolls_today: string;
  production_kg_today: string;
  completed_today: string;
}

const statusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "قيد الانتظار", color: "bg-yellow-500" },
  in_progress: { label: "قيد التنفيذ", color: "bg-blue-500" },
  completed: { label: "مكتمل", color: "bg-green-500" },
  cancelled: { label: "ملغي", color: "bg-red-500" },
  new: { label: "جديد", color: "bg-purple-500" },
  film_production: { label: "إنتاج الفيلم", color: "bg-indigo-500" },
  printing: { label: "طباعة", color: "bg-cyan-500" },
  cutting: { label: "تقطيع", color: "bg-orange-500" },
};

function getStatusInfo(status: string) {
  return statusMap[status] || { label: status, color: "bg-gray-500" };
}

function formatNumber(val: string | number | null | undefined) {
  const num = Number(val);
  if (isNaN(num)) return "0";
  return num.toLocaleString("ar-SA", { maximumFractionDigits: 1 });
}

function formatTime(dateStr: string) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" });
}

function CurrentDateTime() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex items-center gap-4 text-white/90">
      <div className="text-2xl font-bold tabular-nums">
        {now.toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </div>
      <div className="text-lg opacity-80">
        {now.toLocaleDateString("ar-SA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

function ProductionStatsSlide({ stats }: { stats: ProductionStats | undefined }) {
  const items = [
    { icon: Factory, label: "أوامر نشطة", value: stats?.active_orders || "0", color: "from-blue-600 to-blue-800" },
    { icon: Package, label: "لفات اليوم", value: stats?.rolls_today || "0", color: "from-green-600 to-green-800" },
    { icon: TrendingUp, label: "إنتاج اليوم (كجم)", value: formatNumber(stats?.production_kg_today), color: "from-purple-600 to-purple-800" },
    { icon: BarChart3, label: "مكتمل اليوم", value: stats?.completed_today || "0", color: "from-orange-600 to-orange-800" },
  ];

  return (
    <div className="grid grid-cols-2 gap-8 p-8">
      {items.map((item, i) => (
        <div
          key={i}
          className={`bg-gradient-to-br ${item.color} rounded-3xl p-10 flex flex-col items-center justify-center shadow-2xl transform hover:scale-105 transition-transform`}
          style={{ animation: `fadeSlideUp 0.6s ease-out ${i * 0.15}s both` }}
        >
          <item.icon className="w-16 h-16 text-white/80 mb-4" />
          <div className="text-7xl font-black text-white mb-3 tabular-nums">{item.value}</div>
          <div className="text-2xl text-white/90 font-medium">{item.label}</div>
        </div>
      ))}
    </div>
  );
}

function RecentProductionSlide({ orders }: { orders: ProductionOrder[] }) {
  return (
    <div className="p-6">
      <div className="grid gap-3">
        {orders.map((order, i) => {
          const status = getStatusInfo(order.status);
          const progress = Number(order.film_completion_percentage) || 0;
          return (
            <div
              key={order.id}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 flex items-center gap-6 border border-white/10"
              style={{ animation: `fadeSlideRight 0.5s ease-out ${i * 0.08}s both` }}
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <span className="text-xl font-bold text-white">{order.production_order_number}</span>
                  <span className={`${status.color} text-white text-sm px-3 py-1 rounded-full font-medium`}>
                    {status.label}
                  </span>
                </div>
                <div className="text-white/70 text-base truncate">
                  {order.customer_name_ar || order.customer_name} — {order.size_caption}
                </div>
              </div>
              <div className="flex-shrink-0 text-left w-40">
                <div className="text-white/60 text-sm mb-1">التقدم</div>
                <div className="w-full bg-white/20 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <div className="text-white font-bold text-lg mt-1">{formatNumber(progress)}%</div>
              </div>
              <div className="flex-shrink-0 text-left w-28">
                <div className="text-white/60 text-sm">الكمية</div>
                <div className="text-white font-bold text-lg">{formatNumber(order.quantity_kg)} كجم</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LatestRollsSlide({ rolls }: { rolls: RollData[] }) {
  return (
    <div className="p-6">
      <div className="grid grid-cols-2 gap-4">
        {rolls.map((roll, i) => {
          const status = getStatusInfo(roll.status);
          return (
            <div
              key={roll.id}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10"
              style={{ animation: `fadeSlideUp 0.5s ease-out ${i * 0.1}s both` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl font-bold text-white">{roll.roll_number}</span>
                <span className={`${status.color} text-white text-xs px-3 py-1 rounded-full`}>
                  {status.label}
                </span>
              </div>
              <div className="space-y-2 text-white/80 text-base">
                <div className="flex justify-between">
                  <span>الوزن:</span>
                  <span className="font-bold text-white">{formatNumber(roll.weight_kg)} كجم</span>
                </div>
                <div className="flex justify-between">
                  <span>الماكينة:</span>
                  <span>{roll.machine_name_ar || roll.machine_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>الوقت:</span>
                  <span>{formatTime(roll.created_at)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AnnouncementSlide({ content }: { content: any }) {
  const iconMap: Record<string, any> = {
    announcement: Megaphone,
    warning: AlertTriangle,
    info: BookOpen,
    notification: Bell,
  };
  const Icon = iconMap[content?.icon] || Megaphone;
  const colorMap: Record<string, string> = {
    blue: "from-blue-600 to-blue-900",
    red: "from-red-600 to-red-900",
    green: "from-green-600 to-green-900",
    yellow: "from-yellow-600 to-yellow-900",
    purple: "from-purple-600 to-purple-900",
  };
  const gradient = colorMap[content?.color] || "from-blue-600 to-blue-900";

  return (
    <div className={`h-full flex items-center justify-center p-12 bg-gradient-to-br ${gradient} rounded-3xl mx-6`}>
      <div className="text-center max-w-4xl" style={{ animation: "fadeScaleIn 0.8s ease-out" }}>
        <Icon className="w-24 h-24 text-white/80 mx-auto mb-8" />
        <h2 className="text-5xl font-black text-white mb-6 leading-tight">{content?.title || ""}</h2>
        <p className="text-3xl text-white/90 leading-relaxed whitespace-pre-wrap">{content?.message || ""}</p>
        {content?.footer && (
          <div className="mt-8 text-xl text-white/60 border-t border-white/20 pt-6">{content.footer}</div>
        )}
      </div>
    </div>
  );
}

function InstructionsSlide({ content }: { content: any }) {
  const instructions = content?.items || [];
  return (
    <div className="p-8">
      <div className="max-w-5xl mx-auto space-y-5">
        {instructions.map((item: string, i: number) => (
          <div
            key={i}
            className="flex items-start gap-5 bg-white/10 rounded-2xl p-6 border border-white/10"
            style={{ animation: `fadeSlideRight 0.5s ease-out ${i * 0.12}s both` }}
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-black text-white">
              {i + 1}
            </div>
            <p className="text-2xl text-white/90 leading-relaxed pt-2">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DisplayScreen() {
  const { t } = useTranslation();
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [transitionClass, setTransitionClass] = useState("opacity-100");
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: slides = [] } = useQuery<SlideData[]>({
    queryKey: ["/api/display/slides/active"],
    refetchInterval: 30000,
  });

  const { data: recentProduction = [] } = useQuery<ProductionOrder[]>({
    queryKey: ["/api/display/live/recent-production"],
    refetchInterval: 20000,
  });

  const { data: latestRolls = [] } = useQuery<RollData[]>({
    queryKey: ["/api/display/live/latest-rolls"],
    refetchInterval: 15000,
  });

  const { data: productionStats } = useQuery<ProductionStats>({
    queryKey: ["/api/display/live/production-stats"],
    refetchInterval: 15000,
  });

  const goToSlide = useCallback((index: number) => {
    setTransitionClass("opacity-0 scale-95");
    setTimeout(() => {
      setCurrentSlideIndex(index);
      setTransitionClass("opacity-100 scale-100");
    }, 400);
  }, []);

  const nextSlide = useCallback(() => {
    if (slides.length === 0) return;
    goToSlide((currentSlideIndex + 1) % slides.length);
  }, [currentSlideIndex, slides.length, goToSlide]);

  const prevSlide = useCallback(() => {
    if (slides.length === 0) return;
    goToSlide((currentSlideIndex - 1 + slides.length) % slides.length);
  }, [currentSlideIndex, slides.length, goToSlide]);

  useEffect(() => {
    if (isPaused || slides.length === 0) return;
    const currentSlide = slides[currentSlideIndex];
    const duration = (currentSlide?.duration_seconds || 10) * 1000;

    timerRef.current = setTimeout(nextSlide, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentSlideIndex, isPaused, slides, nextSlide]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") prevSlide();
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") nextSlide();
      if (e.key === " ") { e.preventDefault(); setIsPaused(p => !p); }
      if (e.key === "f" || e.key === "F") toggleFullscreen();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [nextSlide, prevSlide, toggleFullscreen]);

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  const currentSlide = slides[currentSlideIndex];

  const renderSlideContent = () => {
    if (!currentSlide) return null;
    switch (currentSlide.slide_type) {
      case "production_stats":
        return <ProductionStatsSlide stats={productionStats} />;
      case "recent_production":
        return <RecentProductionSlide orders={recentProduction} />;
      case "latest_rolls":
        return <LatestRollsSlide rolls={latestRolls} />;
      case "announcement":
        return <AnnouncementSlide content={currentSlide.content} />;
      case "instructions":
        return <InstructionsSlide content={currentSlide.content} />;
      case "notification":
        return <AnnouncementSlide content={currentSlide.content} />;
      default:
        return <AnnouncementSlide content={currentSlide.content} />;
    }
  };

  const slideTypeIcons: Record<string, any> = {
    production_stats: BarChart3,
    recent_production: Package,
    latest_rolls: Factory,
    announcement: Megaphone,
    instructions: BookOpen,
    notification: Bell,
  };
  const SlideIcon = slideTypeIcons[currentSlide?.slide_type || ""] || Factory;

  if (slides.length === 0) {
    return (
      <div
        ref={containerRef}
        className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center"
        dir="rtl"
      >
        <div className="text-center text-white/60">
          <Factory className="w-24 h-24 mx-auto mb-6 opacity-40" />
          <h2 className="text-3xl font-bold mb-3">لا توجد شرائح عرض</h2>
          <p className="text-xl">قم بإضافة شرائح من لوحة التحكم</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex flex-col overflow-hidden select-none"
      dir="rtl"
    >
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeScaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes progressBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>

      <div className="flex items-center justify-between px-8 py-4 bg-black/30 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Factory className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">شاشة العرض</h1>
            <div className="text-sm text-white/50">نظام إدارة المصنع</div>
          </div>
        </div>

        <CurrentDateTime />

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPaused(p => !p)}
            className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
          >
            {isPaused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <button
            onClick={toggleFullscreen}
            className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-white/70 hover:bg-white/20 hover:text-white transition-all"
          >
            <Maximize className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative">
        <div className="px-8 pt-4 pb-2 flex items-center gap-3">
          <SlideIcon className="w-7 h-7 text-white/70" />
          <h2 className="text-3xl font-bold text-white">{currentSlide?.title}</h2>
          {isPaused && (
            <span className="bg-yellow-500/30 text-yellow-300 text-sm px-3 py-1 rounded-full border border-yellow-500/30">
              متوقف مؤقتاً
            </span>
          )}
        </div>

        <div className={`flex-1 transition-all duration-400 ease-out ${transitionClass}`}>
          {renderSlideContent()}
        </div>

        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 text-white/60 hover:bg-black/60 hover:text-white flex items-center justify-center transition-all opacity-0 hover:opacity-100"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-black/40 text-white/60 hover:bg-black/60 hover:text-white flex items-center justify-center transition-all opacity-0 hover:opacity-100"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>

      <div className="px-8 py-4 bg-black/30 backdrop-blur-sm border-t border-white/10">
        <div className="flex items-center justify-center gap-3 mb-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                i === currentSlideIndex ? "bg-blue-500 w-10" : "bg-white/30 w-2.5 hover:bg-white/50"
              }`}
            />
          ))}
        </div>
        {!isPaused && (
          <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
              style={{
                animation: `progressBar ${currentSlide?.duration_seconds || 10}s linear`,
                animationIterationCount: 1,
              }}
              key={`${currentSlideIndex}-${Date.now()}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}
