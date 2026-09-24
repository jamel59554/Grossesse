import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AppText, Button, Card, Screen, TextField } from '@/components/ui';
import { errorCode, supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

const KNOWN_ERRORS = ['invalid_code', 'couple_full', 'already_in_couple', 'role_required'];

export default function PairScreen() {
  const { t } = useTranslation();
  const { refreshMe } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function join() {
    setError(null);
    setLoading(true);
    const { error: joinError } = await supabase.rpc('join_couple', { p_code: code });
    if (joinError) {
      setLoading(false);
      const codeKey = errorCode(joinError);
      setError(KNOWN_ERRORS.includes(codeKey) ? t(`onboarding.errors.${codeKey}`) : t('common.error'));
      return;
    }
    // La garde de navigation bascule vers les onglets dès que l'adhésion est connue.
    await refreshMe();
  }

  return (
    <Screen>
      <AppText variant="title">{t('onboarding.pairTitle')}</AppText>
      <AppText muted>{t('onboarding.pairSubtitle')}</AppText>
      <Card>
        <AppText style={{ fontSize: 32 }}>🏡</AppText>
        <Button label={t('onboarding.create')} onPress={() => router.push('/pregnancy')} />
      </Card>
      <Card>
        <AppText style={{ fontSize: 32 }}>🔑</AppText>
        <TextField
          label={t('onboarding.codeLabel')}
          placeholder={t('onboarding.codePlaceholder')}
          value={code}
          onChangeText={(value) => setCode(value.toUpperCase())}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={6}
          error={error}
        />
        <Button
          variant="secondary"
          label={t('onboarding.join')}
          onPress={join}
          disabled={code.trim().length !== 6}
          loading={loading}
        />
      </Card>
      <Button variant="ghost" label={t('onboarding.back')} onPress={() => router.back()} />
    </Screen>
  );
}
