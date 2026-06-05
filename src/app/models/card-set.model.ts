export interface CardSet {
  id: string;
  name: string;
  setCode: string;
  cardmarketUrl: string;
  totalCards?: number;
  ownedCards: number;
  cardMarketExpansionId: number;
}
