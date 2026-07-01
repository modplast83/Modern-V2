import { PriorityLabels, getStatusLabel } from "@mpbf/shared";
import { format } from "date-fns";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";

import { useQualityIssues } from "@/api/hooks/useQuality";
import { Screen } from "@/components/layout/Screen";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Loader } from "@/components/ui/Loader";
import { FontSize, Spacing } from "@/constants/spacing";
import { useTheme } from "@/utils/useTheme";

export default function QualityScreen() {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const lang = i18n.language === "en" ? "en" : "ar";
  const { data, isLoading, refetch } = useQualityIssues();
  const [refreshing, setRefreshing] = useState(false);

  return (
    <Screen
      refreshing={refreshing}
      onRefresh={async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
      }}
    >
      {isLoading ? (
        <Loader />
      ) : !data || data.length === 0 ? (
        <EmptyState title={t("common.noData")} icon="warning-outline" />
      ) : (
        data.map((q) => {
          const sev = getStatusLabel(PriorityLabels, q.severity, lang);
          return (
            <Card key={q.id}>
              <View style={styles.row}>
                <Text
                  style={[styles.title, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {q.title ||
                    (q.issue_number ? `#${q.issue_number}` : `#${q.id}`)}
                </Text>
                <Badge label={sev.label} color={sev.color} />
              </View>
              <Text
                style={[styles.body, { color: colors.text }]}
                numberOfLines={3}
              >
                {q.description}
              </Text>
              <Text style={[styles.meta, { color: colors.textMuted }]}>
                {format(new Date(q.created_at), "yyyy-MM-dd HH:mm")} •{" "}
                {q.status}
              </Text>
            </Card>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: "700",
    flex: 1,
    marginEnd: Spacing.sm,
  },
  body: { fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.sm },
  meta: { fontSize: FontSize.xs },
});
