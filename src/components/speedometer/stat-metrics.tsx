import { Fragment } from "react";
import { View } from "react-native";

import { Text } from "@/components/ui/text";

export type Metric = {
  label: string;
  value: string;
};

function VerticalDivider() {
  return <View className="w-px self-stretch bg-primary/12" />;
}

function HorizontalDivider() {
  return <View className="h-px bg-primary/10" />;
}

function MetricItem({ label, value }: Metric) {
  return (
    <View className="flex-1 items-center px-2 py-4">
      <Text className="text-center text-[10px] font-semibold uppercase text-muted-foreground">
        {label}
      </Text>
      <Text className="mt-2 text-center text-2xl font-bold text-foreground">
        {value}
      </Text>
    </View>
  );
}

export function MetricRow({ metrics }: { metrics: Metric[] }) {
  return (
    <View className="flex-row items-stretch">
      {metrics.map((metric, index) => (
        <Fragment key={metric.label}>
          {index > 0 ? <VerticalDivider /> : null}
          <MetricItem label={metric.label} value={metric.value} />
        </Fragment>
      ))}
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <View className="mb-2 flex-row items-center gap-3">
      <Text className="text-lg font-semibold uppercase text-primary">
        {title}
      </Text>
      <View className="h-px flex-1 bg-primary/15" />
    </View>
  );
}

export function MetricSection({
  title,
  footer,
  rows,
}: {
  title: string;
  footer?: string;
  rows: Metric[][];
}) {
  return (
    <View>
      <SectionHeader title={title} />

      <View>
        {rows.map((row, index) => (
          <Fragment key={`${title}-row-${index}`}>
            {index > 0 ? <HorizontalDivider /> : null}
            <MetricRow metrics={row} />
          </Fragment>
        ))}
      </View>

      {footer ? (
        <Text variant="muted" className="mt-3 text-center text-xs">
          {footer}
        </Text>
      ) : null}
    </View>
  );
}

function MetricTableRow({
  label,
  value,
  isLast,
}: Metric & { isLast?: boolean }) {
  return (
    <View
      className={`flex-row items-center justify-between py-3.5 ${
        isLast ? "" : "border-b border-primary/10"
      }`}
    >
      <Text className="text-sm text-muted-foreground">{label}</Text>
      <Text className="text-base font-semibold text-foreground">{value}</Text>
    </View>
  );
}

export function MetricTable({
  title,
  metrics,
  footer,
}: {
  title: string;
  metrics: Metric[];
  footer?: string;
}) {
  return (
    <View>
      <SectionHeader title={title} />

      <View className="border-t border-primary/10">
        {metrics.map((metric, index) => (
          <MetricTableRow
            key={metric.label}
            label={metric.label}
            value={metric.value}
            isLast={index === metrics.length - 1}
          />
        ))}
      </View>

      {footer ? (
        <Text variant="muted" className="mt-3 text-xs">
          {footer}
        </Text>
      ) : null}
    </View>
  );
}
