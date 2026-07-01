import type { TFunction } from "i18next";

const DUPLICATE_DEFAULT_MARKER =
  "لا يمكن تعيين أكثر من وحدة تعبئة افتراضية";

export function isDuplicateDefaultPackagingError(error: unknown): boolean {
  const message =
    typeof error === "string"
      ? error
      : (error as { message?: string } | null | undefined)?.message;
  return typeof message === "string" && message.includes(DUPLICATE_DEFAULT_MARKER);
}

export function packagingUnitErrorToast(
  error: unknown,
  t: TFunction,
): { title: string; description?: string; variant: "destructive" } {
  if (isDuplicateDefaultPackagingError(error)) {
    return {
      title: t("definitions.items.packagingUnits.duplicateDefaultTitle"),
      description: t("definitions.items.packagingUnits.duplicateDefaultDesc"),
      variant: "destructive",
    };
  }
  const description =
    typeof error === "string"
      ? error
      : (error as { message?: string } | null | undefined)?.message;
  return {
    title: t("definitions.items.packagingUnits.saveError"),
    description,
    variant: "destructive",
  };
}
