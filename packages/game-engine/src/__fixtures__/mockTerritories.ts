import type { TerritoryId } from '../types';

export const mockFullContinentOwnership = {
  north_america: ['alaska', 'alberta', 'central_america', 'eastern_us', 'greenland', 'northwest_territory', 'ontario', 'quebec', 'western_us'] as TerritoryId[],
  south_america: ['argentina', 'brazil', 'peru', 'venezuela'] as TerritoryId[],
  europe: ['iceland', 'uk', 'scandinavia', 'northern_europe', 'western_europe', 'ukraine', 'southern_europe'] as TerritoryId[],
  africa: ['egypt', 'north_africa', 'east_africa', 'congo', 'south_africa', 'madagascar'] as TerritoryId[],
  asia: ['middle_east', 'afghanistan', 'ural', 'siberia', 'irkutsk', 'yakutsk', 'kamchatka', 'mongolia', 'japan', 'china', 'siam', 'india'] as TerritoryId[],
  oceania: ['indonesia', 'new_guinea', 'eastern_australia', 'western_australia'] as TerritoryId[]
};

export const mockSplitContinent = {
  north_america_split: {
    player1: ['alaska', 'alberta', 'northwest_territory'] as TerritoryId[],
    player2: ['central_america', 'eastern_us', 'western_us', 'ontario', 'quebec', 'greenland'] as TerritoryId[]
  }
};

export const mockIsolatedTerritories = ['iceland', 'japan', 'madagascar'] as TerritoryId[];

export const mockAdjacentTerritories = {
  alaska: ['kamchatka', 'alberta', 'northwest_territory'] as TerritoryId[],
  alberta: ['alaska', 'western_us', 'ontario', 'northwest_territory'] as TerritoryId[],
  ontario: ['greenland', 'quebec', 'alberta', 'western_us', 'eastern_us', 'northwest_territory'] as TerritoryId[]
};