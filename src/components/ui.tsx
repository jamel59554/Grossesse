import type { PropsWithChildren, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fontSize, radius, spacing, usePalette } from '@/theme';

type Variant = 'hero' | 'title' | 'heading' | 'body' | 'caption';

export function AppText({
  variant = 'body',
  muted,
  color,
  style,
  ...props
}: TextProps & { variant?: Variant; muted?: boolean; color?: string }) {
  const palette = usePalette();
  return (
    <Text
      {...props}
      style={[
        styles[variant],
        { color: color ?? (muted ? palette.textMuted : palette.text) },
        style,
      ]}
    />
  );
}

export function Screen({
  children,
  refreshing,
  onRefresh,
  scroll = true,
}: PropsWithChildren<{ refreshing?: boolean; onRefresh?: () => void; scroll?: boolean }>) {
  const palette = usePalette();
  const content = <View style={styles.content}>{children}</View>;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.screen, { backgroundColor: palette.background }]}>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          refreshControl={
            onRefresh ? <RefreshControl refreshing={refreshing ?? false} onRefresh={onRefresh} /> : undefined
          }>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, tone = 'surface' }: PropsWithChildren<{ style?: ViewStyle; tone?: 'surface' | 'alt' }>) {
  const palette = usePalette();
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: tone === 'alt' ? palette.surfaceAlt : palette.surface, borderColor: palette.border },
        style,
      ]}>
      {children}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  small,
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'success';
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
  testID?: string;
}) {
  const palette = usePalette();
  const background = {
    primary: palette.primary,
    success: palette.success,
    secondary: palette.surfaceAlt,
    ghost: 'transparent',
  }[variant];
  const color = variant === 'primary' || variant === 'success' ? palette.primaryText : palette.text;
  const inactive = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: background, opacity: inactive ? 0.5 : pressed ? 0.8 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: palette.border },
      ]}>
      {loading ? (
        <ActivityIndicator color={color} />
      ) : (
        <Text style={[styles.buttonLabel, small && styles.buttonLabelSmall, { color }]}>{label}</Text>
      )}
    </Pressable>
  );
}

export function TextField({ label, error, ...props }: TextInputProps & { label: string; error?: string | null }) {
  const palette = usePalette();
  return (
    <View style={styles.field}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <TextInput
        placeholderTextColor={palette.textMuted}
        accessibilityLabel={label}
        {...props}
        style={[
          styles.input,
          { color: palette.text, backgroundColor: palette.surface, borderColor: error ? palette.danger : palette.border },
        ]}
      />
      {error ? (
        <AppText variant="caption" color={palette.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

export function ProgressBar({ progress, color, height = 10 }: { progress: number; color?: string; height?: number }) {
  const palette = usePalette();
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, backgroundColor: palette.track }]}>
      <View style={{ width: `${clamped * 100}%`, height, borderRadius: height, backgroundColor: color ?? palette.primary }} />
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
}) {
  const palette = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? palette.primary : palette.surface,
          borderColor: selected ? palette.primary : palette.border,
        },
      ]}>
      <Text style={[styles.chipLabel, { color: selected ? palette.primaryText : palette.text }]}>{label}</Text>
    </Pressable>
  );
}

export function Section({ title, right, children }: PropsWithChildren<{ title: string; right?: ReactNode }>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="heading">{title}</AppText>
        {right}
      </View>
      {children}
    </View>
  );
}

export function Row({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Loading() {
  const palette = usePalette();
  return (
    <View style={[styles.center, { backgroundColor: palette.background }]}>
      <ActivityIndicator size="large" color={palette.primary} />
    </View>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <Card>
      <AppText>{t('common.error')}</AppText>
      <Button label={t('common.retry')} variant="ghost" small onPress={onRetry} />
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: { fontSize: fontSize.hero, fontWeight: '800' },
  title: { fontSize: fontSize.title, fontWeight: '800' },
  heading: { fontSize: fontSize.heading, fontWeight: '700' },
  body: { fontSize: fontSize.body, lineHeight: 22 },
  caption: { fontSize: fontSize.caption, lineHeight: 18 },
  screen: { flex: 1 },
  scroll: { flexGrow: 1 },
  content: { flex: 1, padding: spacing.lg, gap: spacing.lg, width: '100%', maxWidth: 640, alignSelf: 'center' },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.sm },
  button: {
    minHeight: 48,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: spacing.lg },
  buttonLabel: { fontSize: fontSize.body, fontWeight: '700' },
  buttonLabelSmall: { fontSize: fontSize.caption },
  field: { gap: spacing.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: fontSize.body,
  },
  track: { width: '100%', borderRadius: radius.pill, overflow: 'hidden' },
  chip: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipLabel: { fontSize: fontSize.caption, fontWeight: '600' },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
