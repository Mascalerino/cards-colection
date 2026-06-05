export type CardVariant = 'foil' | 'nonfoil';
export type CardLanguage = 'en' | 'es' | 'ja';
export type CardCondition =
  | 'Unspecified'
  | 'Mint'
  | 'Near Mint'
  | 'Lightly Played'
  | 'Moderately Played'
  | 'Heavily Played'
  | 'Damaged'
  | 'Sealed';

export interface CardEntry {
  cardId: string;
  variant: CardVariant;
  language: CardLanguage;
  condition: CardCondition;
  quantity: number;
  note?: string;
}

export interface CardCollectionEntry {
  cardId: string;
  foilEntries: CardEntry[];
  nonfoilEntries: CardEntry[];
}
