import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { AppText, Button, Card, Screen, TextField } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { radius, spacing, usePalette } from '@/theme';
import type { MemberRole } from '@/types/models';

const ROLES: { role: MemberRole; emoji: string }[] = [
  { role: 'carrier', emoji: '🤰' },
  { role: 'partner', emoji: '🦸' },
];

export default function RoleScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const { userId, profile, refreshMe } = useAuth();
  const [name, setName] = useState(profile?.display_name ?? '');
  const [role, setRole] = useState<MemberRole | null>(profile?.role ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function next() {
    if (!name.trim()) {
      setError(t('auth.errors.displayName'));
      return;
    }
    if (!role || !userId) return;
    setLoading(true);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ display_name: name.trim(), role })
      .eq('id', userId);
    setLoading(false);
    if (updateError) {
      setError(t('common.error'));
      return;
    }
    await refreshMe();
    router.push('/pair');
  }

  return (
    <Screen>
      <AppText variant="title">{t('onboarding.roleTitle')}</AppText>
      <AppText muted>{t('onboarding.roleSubtitle')}</AppText>
      <TextField label={t('onboarding.nameLabel')} value={name} onChangeText={setName} maxLength={40} error={error} />
      {ROLES.map((option) => {
        const selected = option.role === role;
        return (
          <Pressable
            key={option.role}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            onPress={() => setRole(option.role)}>
            <Card
              style={{
                ...styles.option,
                borderColor: selected ? palette.primary : palette.border,
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
              }}>
              <AppText style={styles.emoji}>{option.emoji}</AppText>
              <AppText variant="heading">{t(`roles.${option.role}`)}</AppText>
              <AppText muted>{t(`onboarding.${option.role}Description`)}</AppText>
            </Card>
          </Pressable>
        );
      })}
      <Button label={t('common.continue')} onPress={next} disabled={!role} loading={loading} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  option: { borderRadius: radius.lg, gap: spacing.xs },
  emoji: { fontSize: 36, lineHeight: 44 },
});
