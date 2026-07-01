import React, { useMemo } from "react";

import { FormControl } from "../client/src/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../client/src/components/ui/select";

import type { Machine } from "./schema";
export function MachineSelect({
  value,
  onChange,
  loading,
  machines = [],
  sections = [],
  sectionKeyword,
  onlyActive = true,
}: {
  value?: number;
  onChange: (id: number) => void;
  loading?: boolean;
  machines: Machine[];
  sections?: any[];
  sectionKeyword?: string;
  onlyActive?: boolean;
}) {
  const filtered = useMemo(() => {
    let list: any[] = machines as any[];
    if (sections.length && sectionKeyword) {
      const section = sections.find((s: any) =>
        [s.name, s.name_ar]
          .filter(Boolean)
          .map((x: string) => x.toLowerCase())
          .some(
            (n: string) =>
              n.includes(sectionKeyword.toLowerCase()) ||
              (sectionKeyword === "film" && n.includes("فيلم")) ||
              (sectionKeyword === "printing" && n.includes("طباعة")) ||
              (sectionKeyword === "cutting" && n.includes("تقطيع")),
          ),
      );
      if (section) list = list.filter((m: any) => m.section_id === section.id);
    }
    if (onlyActive) list = list.filter((m: any) => m.status === "active");
    return list.filter((m: any) => m.id);
  }, [machines, sections, sectionKeyword, onlyActive]);
  return (
    <Select
      value={value != null ? String(value) : undefined}
      onValueChange={(val: string) => onChange(Number.parseInt(val, 10))}
      disabled={loading}
    >
      <FormControl>
        <SelectTrigger data-testid="select-machine">
          <SelectValue placeholder="اختر المكينة" />
        </SelectTrigger>
      </FormControl>
      <SelectContent>
        {loading ? (
          <SelectItem value="loading" disabled>
            جارِ التحميل...
          </SelectItem>
        ) : filtered.length ? (
          filtered.map((m: any) => (
            <SelectItem key={String(m.id)} value={String(m.id)}>
              {m.name_ar || m.name}
            </SelectItem>
          ))
        ) : (
          <SelectItem value="empty" disabled>
            لا توجد مكائن متاحة
          </SelectItem>
        )}
      </SelectContent>
    </Select>
  );
}
