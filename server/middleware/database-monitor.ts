// ===============================================
// 🔹 Database Query Performance Monitor
// ===============================================
// يراقب استعلامات قاعدة البيانات البطيئة ويكتشف N+1 queries
// ===============================================

import { system_performance_metrics } from "../../shared/schema";
import { db } from "../db";

export interface QueryLog {
  query: string;
  duration: number;
  timestamp: Date;
  stackTrace?: string;
  rowCount?: number;
}

export class DatabaseMonitor {
  private static queryLogs: QueryLog[] = [];
  private static slowQueryThreshold = 100; // ms
  private static maxLogsSize = 500;
  private static queryCountWindow: Map<string, number[]> = new Map();

  static logQuery(query: string, duration: number, rowCount?: number) {
    const log: QueryLog = {
      query: this.sanitizeQuery(query),
      duration,
      timestamp: new Date(),
      rowCount,
    };

    // حفظ في السجل
    this.queryLogs.push(log);
    if (this.queryLogs.length > this.maxLogsSize) {
      this.queryLogs.shift();
    }

    // تحذير للاستعلامات البطيئة
    if (duration > this.slowQueryThreshold) {
      console.warn(
        `⚠️ [SLOW QUERY] ${duration}ms - ${query.substring(0, 100)}...`,
      );

      // حفظ الاستعلام البطيء في قاعدة البيانات
      this.saveSlowQuery(log);
    }

    // كشف N+1 queries
    this.detectNPlusOne(query);
  }

  private static sanitizeQuery(query: string): string {
    // إزالة القيم الفعلية وإبقاء الهيكل فقط
    return query
      .replace(/\$\d+/g, "?")
      .replace(/= \d+/g, "= ?")
      .replace(/= '[^']*'/g, "= '?'")
      .substring(0, 500);
  }

  private static detectNPlusOne(query: string) {
    const queryPattern = this.sanitizeQuery(query);
    const now = Date.now();
    const windowMs = 1000; // 1 second

    if (!this.queryCountWindow.has(queryPattern)) {
      this.queryCountWindow.set(queryPattern, []);
    }

    const timestamps = this.queryCountWindow.get(queryPattern)!;
    timestamps.push(now);

    // تنظيف الطوابع الزمنية القديمة
    const recentTimestamps = timestamps.filter((t) => now - t < windowMs);
    this.queryCountWindow.set(queryPattern, recentTimestamps);

    // تحذير إذا تم تنفيذ نفس الاستعلام أكثر من 10 مرات في ثانية واحدة
    if (recentTimestamps.length > 10) {
      console.error(
        `🚨 [N+1 DETECTED] Query executed ${recentTimestamps.length} times in 1 second:`,
      );
      console.error(`   ${queryPattern.substring(0, 150)}...`);
      console.error(`   💡 Consider using JOIN or batch loading`);
    }
  }

  private static async saveSlowQuery(log: QueryLog) {
    try {
      await db.insert(system_performance_metrics).values({
        metric_name: "slow_query",
        metric_category: "database",
        value: log.duration.toString(),
        unit: "ms",
        source: "database",
        tags: {
          query: log.query.substring(0, 200),
          rowCount: log.rowCount?.toString() || "0",
        },
      });
    } catch (error) {
      console.error("Failed to save slow query log:", error);
    }
  }

  static getSlowQueries(limit = 50): QueryLog[] {
    return this.queryLogs
      .filter((log) => log.duration > this.slowQueryThreshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit);
  }

  static getQueryStats() {
    const recentQueries = this.queryLogs.slice(-100);

    if (recentQueries.length === 0) {
      return {
        totalQueries: 0,
        averageTime: 0,
        slowQueries: 0,
        slowestQuery: null,
      };
    }

    const totalTime = recentQueries.reduce((sum, q) => sum + q.duration, 0);
    const slowQueries = recentQueries.filter(
      (q) => q.duration > this.slowQueryThreshold,
    );

    return {
      totalQueries: recentQueries.length,
      averageTime: Math.round(totalTime / recentQueries.length),
      slowQueries: slowQueries.length,
      slowQueriesPercent: Math.round(
        (slowQueries.length / recentQueries.length) * 100,
      ),
      slowestQuery: recentQueries.sort((a, b) => b.duration - a.duration)[0],
    };
  }

  static async analyzeQueryPatterns() {
    const queries = this.queryLogs.slice(-200);
    const patterns = new Map<
      string,
      { count: number; totalTime: number; maxTime: number }
    >();

    for (const log of queries) {
      const pattern = this.sanitizeQuery(log.query);
      if (!patterns.has(pattern)) {
        patterns.set(pattern, { count: 0, totalTime: 0, maxTime: 0 });
      }
      const stats = patterns.get(pattern)!;
      stats.count++;
      stats.totalTime += log.duration;
      stats.maxTime = Math.max(stats.maxTime, log.duration);
    }

    // تحويل إلى مصفوفة وترتيب حسب الوقت الإجمالي
    return Array.from(patterns.entries())
      .map(([pattern, stats]) => ({
        query: pattern,
        count: stats.count,
        totalTime: stats.totalTime,
        avgTime: Math.round(stats.totalTime / stats.count),
        maxTime: stats.maxTime,
      }))
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 20);
  }
}

// دالة helper لقياس وقت الاستعلام
export async function measureQuery<T>(
  queryFn: () => Promise<T>,
  queryName: string,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await queryFn();
    const duration = Date.now() - start;

    DatabaseMonitor.logQuery(queryName, duration);

    return result;
  } catch (error) {
    const duration = Date.now() - start;
    DatabaseMonitor.logQuery(`FAILED: ${queryName}`, duration);
    throw error;
  }
}
