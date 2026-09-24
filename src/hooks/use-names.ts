import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useCouple } from '@/hooks/use-duo';

/** Prénoms du duo, avec un repli neutre tant que l'autre membre n'a pas rejoint. */
export function useNames() {
  const { t } = useTranslation();
  const { members, me, partner } = useCouple();
  const partnerName = partner?.displayName || t('common.yourPartner');
  const nameOf = useCallback(
    (userId: string | null) => members.find((m) => m.userId === userId)?.displayName || t('common.yourPartner'),
    [members, t],
  );
  return { meName: me?.displayName ?? '', partnerName, nameOf, hasPartner: partner !== undefined };
}
