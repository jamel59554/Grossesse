import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { AppText } from '@/components/ui';
import { formatFrenchDate } from '@/lib/pregnancy';
import { fontSize, radius, spacing, usePalette } from '@/theme';

export type DateFieldProps = {
  label: string;
  value: Date | null;
  /** `null` quand la saisie (web) est incomplète ou invalide. */
  onChange: (date: Date | null) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string | null;
};

/** Sélecteur de date natif (calendrier système sur Android, calendrier intégré sur iOS). */
export function DateField({ label, value, onChange, minimumDate, maximumDate, error }: DateFieldProps) {
  const { t } = useTranslation();
  const palette = usePalette();
  const scheme = useColorScheme();
  const [open, setOpen] = useState(false);
  const initial = value ?? maximumDate ?? new Date();

  function press() {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initial,
        mode: 'date',
        minimumDate,
        maximumDate,
        onValueChange: (_event, date) => onChange(date),
      });
    } else {
      setOpen((current) => !current);
    }
  }

  return (
    <View style={styles.field}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={press}
        style={[
          styles.input,
          { backgroundColor: palette.surface, borderColor: error ? palette.danger : open ? palette.primary : palette.border },
        ]}>
        <AppText muted={!value} style={{ fontSize: fontSize.body }}>
          {value ? formatFrenchDate(value) : t('common.pickDate')}
        </AppText>
        <AppText>📅</AppText>
      </Pressable>
      {open && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={initial}
          mode="date"
          display="inline"
          locale="fr-FR"
          themeVariant={scheme === 'dark' ? 'dark' : 'light'}
          accentColor={palette.primary}
          minimumDate={minimumDate}
          maximumDate={maximumDate}
          onValueChange={(_event, date) => onChange(date)}
        />
      ) : null}
      {error ? (
        <AppText variant="caption" color={palette.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.xs },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
