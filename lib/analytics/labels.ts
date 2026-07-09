export const GENDER_LABELS: Record<string, string> = {
  male: 'Uomo',
  female: 'Donna',
  child: 'Bimbo',
  other: 'Altro',
  unknown: 'Non indicato',
};

export const AGE_LABELS: Record<string, string> = {
  under_18: 'Meno di 18',
  '18_24': '18–24',
  '25_34': '25–34',
  '35_44': '35–44',
  '45_54': '45–54',
  '55_plus': '55+',
  unknown: 'Non indicato',
};

export const AGE_OPTIONS = [
  { value: 'under_18', label: 'Meno di 18' },
  { value: '18_24', label: '18–24' },
  { value: '25_34', label: '25–34' },
  { value: '35_44', label: '35–44' },
  { value: '45_54', label: '45–54' },
  { value: '55_plus', label: '55+' },
] as const;