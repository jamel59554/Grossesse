import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { AppText, Button, Card, TextField, Screen } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/theme';

type Mode = 'signIn' | 'signUp';

const emailSchema = z.email();

export default function AuthScreen() {
  const { t } = useTranslation();
  const palette = usePalette();
  const [mode, setMode] = useState<Mode>('signUp');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const next: Record<string, string | null> = {
      email: emailSchema.safeParse(email.trim()).success ? null : t('auth.errors.email'),
      password: password.length >= 8 ? null : t('auth.errors.password'),
      displayName: mode === 'signUp' && !displayName.trim() ? t('auth.errors.displayName') : null,
    };
    setErrors(next);
    setMessage(null);
    if (Object.values(next).some(Boolean)) return;

    setLoading(true);
    const credentials = { email: email.trim(), password };
    const { data, error } =
      mode === 'signIn'
        ? await supabase.auth.signInWithPassword(credentials)
        : await supabase.auth.signUp({ ...credentials, options: { data: { display_name: displayName.trim() } } });
    setLoading(false);

    if (error) {
      setMessage(
        error.code === 'invalid_credentials'
          ? t('auth.errors.invalid_credentials')
          : t('auth.errors.generic', { message: error.message }),
      );
    } else if (mode === 'signUp' && !data.session) {
      setMessage(t('auth.checkEmail'));
      setMode('signIn');
    }
  }

  return (
    <Screen>
      <AppText variant="hero" style={{ marginTop: 32 }}>
        🤰💞
      </AppText>
      <AppText variant="title">{t('appName')}</AppText>
      <AppText muted>{t('tagline')}</AppText>
      <Card>
        <AppText variant="heading">{mode === 'signIn' ? t('auth.signInTitle') : t('auth.signUpTitle')}</AppText>
        {mode === 'signUp' ? (
          <TextField
            label={t('auth.displayName')}
            value={displayName}
            onChangeText={setDisplayName}
            autoComplete="given-name"
            maxLength={40}
            error={errors.displayName}
          />
        ) : null}
        <TextField
          label={t('auth.email')}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          error={errors.email}
        />
        <TextField
          label={t('auth.password')}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
          error={errors.password}
          onSubmitEditing={submit}
        />
        {message ? <AppText color={palette.secondary}>{message}</AppText> : null}
        <Button label={mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')} onPress={submit} loading={loading} />
        <Button
          variant="ghost"
          label={mode === 'signIn' ? t('auth.toSignUp') : t('auth.toSignIn')}
          onPress={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            setErrors({});
          }}
        />
      </Card>
      <AppText variant="caption" muted>
        {t('common.disclaimer')}
      </AppText>
    </Screen>
  );
}
