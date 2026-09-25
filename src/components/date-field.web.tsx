import { useState } from 'react';

import type { DateFieldProps } from '@/components/date-field';
import { TextField } from '@/components/ui';
import { formatFrenchDate, parseFrenchDate } from '@/lib/pregnancy';

/** Sur le web, pas de sélecteur natif : saisie JJ/MM/AAAA. */
export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const [text, setText] = useState(value ? formatFrenchDate(value) : '');
  return (
    <TextField
      label={label}
      placeholder="JJ/MM/AAAA"
      value={text}
      onChangeText={(next) => {
        setText(next);
        onChange(parseFrenchDate(next));
      }}
      keyboardType="numbers-and-punctuation"
      maxLength={10}
      error={error}
    />
  );
}
