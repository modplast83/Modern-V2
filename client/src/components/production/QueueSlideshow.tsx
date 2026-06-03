import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  X,
  Maximize2,
  Minimize2,
  Factory,
  Package,
  Scale,
  Clock,
  CalendarDays,
  Layers,
  Loader2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useLocalizedName } from "../../hooks/use-localized-name";
import { formatNumber } from "../../lib/formatNumber";

type Stage = "film" | "printing" | "cutting";
const STAGES: Stage[] = ["film", "printing", "cutting"];
const INTERVAL_MS = 9000;

interface QueueOrder {
  queue_id: number;
  production_order_number: string;
  final_quantity_kg: string;
  quantity_kg: string;
  customer_name?: string;
  customer_name_ar?: string;
  size_caption?: string;
  thickness?: string;
  raw_material?: string;
  master_batch_name?: string;
  master_batch_name_ar?: string;
  master_batch_color_hex?: string;
  master_batch_id?: string;
  print_colors_count?: number;
}

interface MachineStats {
  orderCount: number;
  totalKg: number;
  estimatedHours: number;
  estimatedDays: number;
  available: boolean;
  projectedFinish: string | null;
}

interface BoardMachine {
  id: string;
  name: string;
  name_ar: string;
  status: string;
  queue: QueueOrder[];
  stats: MachineStats;
}

interface Board {
  stage: Stage;
  machines: BoardMachine[];
}

interface Slide {
  stage: Stage;
  machine: BoardMachine;
}

const STAGE_THEME: Record<
  Stage,
  { gradient: string; ring: string; chip: string }
> = {
  film: {
    gradient: "from-sky-500/20 via-slate-900 to-slate-950",
    ring: "ring-sky-400/40",
    chip: "bg-sky-500/20 text-sky-200 border-sky-400/30",
  },
  printing: {
    gradient: "from-violet-500/20 via-slate-900 to-slate-950",
    ring: "ring-violet-400/40",
    chip: "bg-violet-500/20 text-violet-200 border-violet-400/30",
  },
  cutting: {
    gradient: "from-amber-500/20 via-slate-900 to-slate-950",
    ring: "ring-amber-400/40",
    chip: "bg-amber-500/20 text-amber-200 border-amber-400/30",
  },
};

function statusDot(status: string) {
  if (status === "active") return "bg-emerald-400 shadow-emerald-400/50";
  if (status === "maintenance") return "bg-amber-400 shadow-amber-400/50";
  return "bg-rose-500 shadow-rose-500/50";
}

export default function QueueSlideshow({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const ln = useLocalizedName();
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const filmQ = useQuery<{ data: Board }>({
    queryKey: ["/api/production-queues/board", { stage: "film" }],
    enabled: isOpen,
    refetchInterval: isOpen ? 60000 : false,
  });
  const printingQ = useQuery<{ data: Board }>({
    queryKey: ["/api/production-queues/board", { stage: "printing" }],
    enabled: isOpen,
    refetchInterval: isOpen ? 60000 : false,
  });
  const cuttingQ = useQuery<{ data: Board }>({
    queryKey: ["/api/production-queues/board", { stage: "cutting" }],
    enabled: isOpen,
    refetchInterval: isOpen ? 60000 : false,
  });
  const queries = { film: filmQ, printing: printingQ, cutting: cuttingQ };
  const isLoading =
    isOpen && [filmQ, printingQ, cuttingQ].some((q) => q.isLoading);

  const slides: Slide[] = [];
  STAGES.forEach((stage) => {
    const b = queries[stage].data?.data;
    if (!b) return;
    [...b.machines]
      .sort((a, c) => c.stats.orderCount - a.stats.orderCount)
      .forEach((machine) => slides.push({ stage, machine }));
  });

  const go = (dir: number) => {
    if (slides.length === 0) return;
    setCurrent((c) => (c + dir + slides.length) % slides.length);
  };

  useEffect(() => {
    if (isOpen) {
      setCurrent(0);
      setPlaying(true);
    }
  }, [isOpen]);

  useEffect(() => {
    if (current >= slides.length && slides.length > 0) setCurrent(0);
  }, [slides.length, current]);

  useEffect(() => {
    if (!isOpen || !playing || slides.length <= 1) return;
    const id = setInterval(
      () => setCurrent((c) => (c + 1) % slides.length),
      INTERVAL_MS,
    );
    return () => clearInterval(id);
  }, [isOpen, playing, slides.length]);

  useEffect(() => {
    if (!isOpen) return;
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, [isOpen]);

  const handleClose = () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    onClose();
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, slides.length]);

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  const toggleFs = async () => {
    try {
      if (!document.fullscreenElement) await containerRef.current?.requestFullscreen();
      else await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  };

  if (!isOpen) return null;

  const slide = slides[current];
  const theme = slide ? STAGE_THEME[slide.stage] : STAGE_THEME.film;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-[120] flex flex-col bg-gradient-to-br ${theme.gradient} text-white`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">
              {t("production.queues.slideshow.title")}
            </h1>
            <p className="text-sm text-white/60">
              {now.toLocaleTimeString()} · {now.toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => go(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20"
            data-testid="slideshow-prev"
            aria-label={t("production.queues.slideshow.prev")}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20"
            data-testid="slideshow-playpause"
            aria-label={
              playing
                ? t("production.queues.slideshow.pause")
                : t("production.queues.slideshow.play")
            }
          >
            {playing ? (
              <Pause className="h-5 w-5" />
            ) : (
              <Play className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={() => go(1)}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20"
            data-testid="slideshow-next"
            aria-label={t("production.queues.slideshow.next")}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={toggleFs}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 transition hover:bg-white/20"
            data-testid="slideshow-fullscreen"
            aria-label={t("production.queues.slideshow.fullscreen")}
          >
            {isFs ? (
              <Minimize2 className="h-5 w-5" />
            ) : (
              <Maximize2 className="h-5 w-5" />
            )}
          </button>
          <button
            onClick={handleClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-500/80 transition hover:bg-rose-500"
            data-testid="slideshow-close"
            aria-label={t("production.queues.slideshow.exit")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="relative flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-white/70" />
          </div>
        ) : !slide ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-white/60">
            <Factory className="h-16 w-16" />
            <p className="text-2xl">
              {t("production.queues.slideshow.empty")}
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, y: 40, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -30, scale: 0.98 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="flex h-full flex-col px-6 py-5 md:px-10"
            >
              {/* Machine header */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span
                    className={`h-4 w-4 rounded-full shadow-lg ${statusDot(
                      slide.machine.status,
                    )}`}
                  />
                  <div>
                    <h2 className="text-4xl font-black leading-none md:text-5xl">
                      {ln(slide.machine.name_ar, slide.machine.name)}
                    </h2>
                    <span
                      className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${theme.chip}`}
                    >
                      <Factory className="h-4 w-4" />
                      {t(`production.queues.${slide.stage}`)}
                    </span>
                  </div>
                </div>
                <div className="text-right text-white/60">
                  <div className="text-5xl font-black tabular-nums text-white/90">
                    {current + 1}
                    <span className="text-2xl text-white/40">
                      {" / "}
                      {slides.length}
                    </span>
                  </div>
                  <p className="text-sm">
                    {t("production.queues.slideshow.machineLabel")}
                  </p>
                </div>
              </div>

              {/* Stat tiles */}
              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
                <StatTile
                  icon={<Package className="h-6 w-6" />}
                  value={String(slide.machine.stats.orderCount)}
                  label={t("production.queues.ordersStat")}
                />
                <StatTile
                  icon={<Scale className="h-6 w-6" />}
                  value={formatNumber(slide.machine.stats.totalKg)}
                  label={t("common.kg")}
                />
                <StatTile
                  icon={<Clock className="h-6 w-6" />}
                  value={formatNumber(slide.machine.stats.estimatedHours)}
                  label={t("production.queues.hours")}
                />
                <StatTile
                  icon={<CalendarDays className="h-6 w-6" />}
                  value={
                    slide.machine.stats.estimatedDays > 0
                      ? String(slide.machine.stats.estimatedDays)
                      : "—"
                  }
                  label={t("production.queues.days")}
                />
              </div>

              {/* Queue orders */}
              <div className="mt-6 flex min-h-0 flex-1 flex-col">
                <h3 className="mb-3 text-lg font-semibold text-white/80">
                  {t("production.queues.slideshow.queueOrders")}
                </h3>
                {slide.machine.queue.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-white/15 text-white/40">
                    {t("production.queues.slideshow.noOrders")}
                  </div>
                ) : (
                  <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-3 overflow-hidden sm:grid-cols-2 xl:grid-cols-3">
                    {slide.machine.queue.slice(0, 9).map((order, idx) => (
                      <OrderTile
                        key={order.queue_id}
                        order={order}
                        rank={idx + 1}
                        stage={slide.stage}
                        t={t}
                        ln={ln}
                      />
                    ))}
                    {slide.machine.queue.length > 9 && (
                      <div className="flex items-center justify-center rounded-xl border border-white/15 bg-white/5 text-lg font-semibold text-white/70">
                        {t("production.queues.slideshow.moreOrders", {
                          count: slide.machine.queue.length - 9,
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Progress + dots */}
      <div className="border-t border-white/10">
        <div className="h-1 w-full bg-white/10">
          {playing && slides.length > 1 && (
            <motion.div
              key={current}
              className="h-full bg-white/80"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: INTERVAL_MS / 1000, ease: "linear" }}
            />
          )}
        </div>
        {slides.length > 1 && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 px-4 py-3">
            {slides.map((s, i) => (
              <button
                key={`${s.stage}-${s.machine.id}`}
                onClick={() => setCurrent(i)}
                aria-label={`${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === current ? "w-6 bg-white" : "w-2 bg-white/30"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatTile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center gap-2 text-white/50">{icon}</div>
      <div className="mt-1 text-3xl font-black tabular-nums">{value}</div>
      <div className="text-sm text-white/50">{label}</div>
    </div>
  );
}

function OrderTile({
  order,
  rank,
  stage,
  t,
  ln,
}: {
  order: QueueOrder;
  rank: number;
  stage: Stage;
  t: (k: string, opts?: Record<string, unknown>) => string;
  ln: (a?: string | null, e?: string | null) => string;
}) {
  const customer = ln(order.customer_name_ar, order.customer_name);
  const colorName = ln(order.master_batch_name_ar, order.master_batch_name);
  return (
    <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
      <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white/10 text-sm font-bold">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-base font-bold">
            {order.production_order_number}
          </span>
          <span className="flex-shrink-0 text-sm text-white/70">
            {formatNumber(parseFloat(order.final_quantity_kg) || 0)}{" "}
            {t("common.kg")}
          </span>
        </div>
        {customer && (
          <div className="truncate text-sm text-white/80">{customer}</div>
        )}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/50">
          {order.size_caption && (
            <span className="font-bold text-red-400">{order.size_caption}</span>
          )}
          {order.thickness && (
            <span className="font-semibold text-white/70">
              {t("production.queues.thickness")}:{" "}
              {formatNumber(parseFloat(order.thickness) || 0)}
            </span>
          )}
          {order.raw_material && (
            <span className="font-bold text-orange-400">
              {order.raw_material}
            </span>
          )}
          {(colorName || order.master_batch_color_hex) && (
            <span className="inline-flex items-center gap-1">
              {order.master_batch_color_hex && (
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full border border-white/40"
                  style={{ backgroundColor: order.master_batch_color_hex }}
                />
              )}
              {colorName || order.master_batch_id}
            </span>
          )}
          {stage === "printing" &&
            typeof order.print_colors_count === "number" &&
            order.print_colors_count > 0 && (
              <span className="rounded bg-white/10 px-1.5 py-0.5">
                {order.print_colors_count} {t("production.queues.printColors")}
              </span>
            )}
        </div>
      </div>
    </div>
  );
}
