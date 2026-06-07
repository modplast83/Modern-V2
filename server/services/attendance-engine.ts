// محرك حساب الحضور: يجمّع سجلات الحضور الخام (التي تنشئها لوحة الموظف عبر
// تسجيل الدخول/الخروج) ويحسبها مقابل وردية الموظف المُجدولة لكل يوم، مع دعم
// الورديات الليلية العابرة لمنتصف الليل. منطق الحساب الصرف موجود في
// `shared/shifts.ts`؛ هذا الملف مسؤول فقط عن تجميع الصفوف ومطابقتها بنوافذ الورديات.

import {
  computeShiftMetrics,
  getShiftName,
  getShiftWindow,
  isShiftType,
  type ShiftType,
} from "@shared/shifts";

export interface RawAttendanceRow {
  id: number;
  user_id: number;
  status: string;
  check_in_time: Date | string | null;
  check_out_time: Date | string | null;
  lunch_start_time: Date | string | null;
  lunch_end_time: Date | string | null;
  break_start_time: Date | string | null;
  break_end_time: Date | string | null;
  total_withdrawn_minutes: number | null;
  date: string;
}

/** خريطة الوردية لكل شهر: المفتاح "YYYY-M" → نوع الوردية. */
export type MonthlyShiftMap = Map<string, ShiftType>;

export interface DailyAttendanceResult {
  date: string;
  scheduled: boolean;
  shift: ShiftType | null;
  shiftName: string;
  status: string; // عربي: غير مجدول / غائب / غير مكتمل / حاضر
  present: boolean;
  complete: boolean;
  checkIn: string | null;
  checkOut: string | null;
  lateMinutes: number;
  earlyLeaveMinutes: number;
  withdrawnMinutes: number;
  workedHours: number;
  overtimeHours: number;
}

export interface AttendanceTotals {
  rangeDays: number;
  scheduledDays: number;
  presentDays: number;
  absentDays: number;
  incompleteDays: number;
  totalLateMinutes: number;
  totalEarlyLeaveMinutes: number;
  totalWithdrawnMinutes: number;
  totalWorkedHours: number;
  totalOvertimeHours: number;
}

export interface EmployeeAttendanceResult {
  days: DailyAttendanceResult[];
  totals: AttendanceTotals;
}

function toDate(value: Date | string | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function pairMinutes(
  a: Date | string | null,
  b: Date | string | null,
): number {
  const da = toDate(a);
  const db = toDate(b);
  if (da && db) return Math.max(0, (db.getTime() - da.getTime()) / 60000);
  return 0;
}

function monthKey(year: number, month1: number): string {
  return `${year}-${month1}`;
}

/** يضيف عدد أيام إلى سلسلة "YYYY-MM-DD" بأمان (UTC) ويعيد سلسلة جديدة. */
function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * يحسب نتيجة الحضور لموظف واحد عبر مدى تواريخ.
 * @param rows سجلات الحضور الخام للموظف ضمن المدى (مع يوم هامش قبل/بعد).
 * @param shiftByMonth خريطة وردية الموظف لكل شهر.
 * @param from تاريخ البداية "YYYY-MM-DD".
 * @param to تاريخ النهاية "YYYY-MM-DD" (شامل).
 */
export function computeEmployeeAttendance(
  rows: RawAttendanceRow[],
  shiftByMonth: MonthlyShiftMap,
  from: string,
  to: string,
  graceMinutes = 0,
): EmployeeAttendanceResult {
  const days: DailyAttendanceResult[] = [];

  // طبّع صفوف الحضور إلى لحظات لمرة واحدة.
  const normalized = rows.map((r) => ({
    checkIn: toDate(r.check_in_time),
    checkOut: toDate(r.check_out_time),
    breakMinutes:
      pairMinutes(r.lunch_start_time, r.lunch_end_time) +
      pairMinutes(r.break_start_time, r.break_end_time),
    withdrawn: r.total_withdrawn_minutes || 0,
  }));

  let cursor = from;
  let guard = 0;
  while (cursor <= to && guard < 400) {
    guard++;
    const [y, m] = cursor.split("-").map(Number);
    const shift = shiftByMonth.get(monthKey(y, m)) ?? null;

    if (!shift || !isShiftType(shift)) {
      days.push({
        date: cursor,
        scheduled: false,
        shift: null,
        shiftName: "—",
        status: "غير مجدول",
        present: false,
        complete: false,
        checkIn: null,
        checkOut: null,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        withdrawnMinutes: 0,
        workedHours: 0,
        overtimeHours: 0,
      });
      cursor = addDays(cursor, 1);
      continue;
    }

    const { start, end } = getShiftWindow(shift, cursor);
    // هامش ساعتين لاستيعاب الحضور المبكر/الانصراف المتأخر حول نافذة الوردية.
    const lo = start.getTime() - 2 * 3600000;
    const hi = end.getTime() + 2 * 3600000;

    let earliestIn: Date | null = null;
    let latestOut: Date | null = null;
    let breakMinutes = 0;
    let withdrawnMinutes = 0;

    for (const row of normalized) {
      const inT = row.checkIn;
      const outT = row.checkOut;
      const inWindow =
        (inT && inT.getTime() >= lo && inT.getTime() <= hi) ||
        (outT && outT.getTime() >= lo && outT.getTime() <= hi);
      if (!inWindow) continue;

      if (inT && inT.getTime() >= lo && inT.getTime() <= hi) {
        if (!earliestIn || inT.getTime() < earliestIn.getTime()) {
          earliestIn = inT;
        }
      }
      if (outT && outT.getTime() >= lo && outT.getTime() <= hi) {
        if (!latestOut || outT.getTime() > latestOut.getTime()) {
          latestOut = outT;
        }
      }
      breakMinutes += row.breakMinutes;
      withdrawnMinutes += row.withdrawn;
    }

    const metrics = computeShiftMetrics({
      shift,
      dateStr: cursor,
      checkIn: earliestIn,
      checkOut: latestOut,
      breakMinutes,
      withdrawnMinutes,
      graceMinutes,
    });

    let status: string;
    if (!metrics.present) status = "غائب";
    else if (!metrics.complete) status = "غير مكتمل";
    else status = "حاضر";

    days.push({
      date: cursor,
      scheduled: true,
      shift,
      shiftName: getShiftName(shift, "ar"),
      status,
      present: metrics.present,
      complete: metrics.complete,
      checkIn: earliestIn ? earliestIn.toISOString() : null,
      checkOut: latestOut ? latestOut.toISOString() : null,
      lateMinutes: metrics.lateMinutes,
      earlyLeaveMinutes: metrics.earlyLeaveMinutes,
      withdrawnMinutes,
      workedHours: metrics.workedHours,
      overtimeHours: metrics.overtimeHours,
    });

    cursor = addDays(cursor, 1);
  }

  const totals: AttendanceTotals = {
    rangeDays: days.length,
    scheduledDays: 0,
    presentDays: 0,
    absentDays: 0,
    incompleteDays: 0,
    totalLateMinutes: 0,
    totalEarlyLeaveMinutes: 0,
    totalWithdrawnMinutes: 0,
    totalWorkedHours: 0,
    totalOvertimeHours: 0,
  };

  for (const d of days) {
    if (!d.scheduled) continue;
    totals.scheduledDays++;
    if (d.present && d.complete) totals.presentDays++;
    else if (d.present && !d.complete) totals.incompleteDays++;
    else totals.absentDays++;
    totals.totalLateMinutes += d.lateMinutes;
    totals.totalEarlyLeaveMinutes += d.earlyLeaveMinutes;
    totals.totalWithdrawnMinutes += d.withdrawnMinutes;
    totals.totalWorkedHours += d.workedHours;
    totals.totalOvertimeHours += d.overtimeHours;
  }
  totals.totalWorkedHours = round2(totals.totalWorkedHours);
  totals.totalOvertimeHours = round2(totals.totalOvertimeHours);

  return { days, totals };
}
