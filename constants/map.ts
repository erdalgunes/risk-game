import type { Continent, TerritoryDefinition, TerritoryName, PlayerColor } from '@/types/game';

// Continents with bonuses
export const CONTINENTS: Continent[] = [
  {
    name: 'north-america',
    bonus: 5,
    territories: [
      'alaska',
      'northwest-territory',
      'greenland',
      'alberta',
      'ontario',
      'quebec',
      'western-united-states',
      'eastern-united-states',
      'central-america',
    ],
  },
  {
    name: 'south-america',
    bonus: 2,
    territories: ['venezuela', 'brazil', 'peru', 'argentina'],
  },
  {
    name: 'europe',
    bonus: 5,
    territories: [
      'iceland',
      'great-britain',
      'scandinavia',
      'northern-europe',
      'western-europe',
      'southern-europe',
      'ukraine',
    ],
  },
  {
    name: 'africa',
    bonus: 3,
    territories: ['north-africa', 'egypt', 'east-africa', 'congo', 'south-africa', 'madagascar'],
  },
  {
    name: 'asia',
    bonus: 7,
    territories: [
      'ural',
      'siberia',
      'yakutsk',
      'kamchatka',
      'irkutsk',
      'mongolia',
      'japan',
      'afghanistan',
      'china',
      'middle-east',
      'india',
      'siam',
    ],
  },
  {
    name: 'australia',
    bonus: 2,
    territories: ['indonesia', 'new-guinea', 'western-australia', 'eastern-australia'],
  },
];

// All territories with their connections
export const TERRITORIES: TerritoryDefinition[] = [
  // North America
  {
    name: 'alaska',
    continent: 'north-america',
    adjacentTerritories: ['northwest-territory', 'alberta', 'kamchatka'],
  },
  {
    name: 'northwest-territory',
    continent: 'north-america',
    adjacentTerritories: ['alaska', 'alberta', 'ontario', 'greenland'],
  },
  {
    name: 'greenland',
    continent: 'north-america',
    adjacentTerritories: ['northwest-territory', 'ontario', 'quebec', 'iceland'],
  },
  {
    name: 'alberta',
    continent: 'north-america',
    adjacentTerritories: ['alaska', 'northwest-territory', 'ontario', 'western-united-states'],
  },
  {
    name: 'ontario',
    continent: 'north-america',
    adjacentTerritories: [
      'northwest-territory',
      'alberta',
      'western-united-states',
      'eastern-united-states',
      'quebec',
      'greenland',
    ],
  },
  {
    name: 'quebec',
    continent: 'north-america',
    adjacentTerritories: ['ontario', 'eastern-united-states', 'greenland'],
  },
  {
    name: 'western-united-states',
    continent: 'north-america',
    adjacentTerritories: ['alberta', 'ontario', 'eastern-united-states', 'central-america'],
  },
  {
    name: 'eastern-united-states',
    continent: 'north-america',
    adjacentTerritories: ['ontario', 'quebec', 'western-united-states', 'central-america'],
  },
  {
    name: 'central-america',
    continent: 'north-america',
    adjacentTerritories: ['western-united-states', 'eastern-united-states', 'venezuela'],
  },

  // South America
  {
    name: 'venezuela',
    continent: 'south-america',
    adjacentTerritories: ['central-america', 'brazil', 'peru'],
  },
  {
    name: 'brazil',
    continent: 'south-america',
    adjacentTerritories: ['venezuela', 'peru', 'argentina', 'north-africa'],
  },
  {
    name: 'peru',
    continent: 'south-america',
    adjacentTerritories: ['venezuela', 'brazil', 'argentina'],
  },
  {
    name: 'argentina',
    continent: 'south-america',
    adjacentTerritories: ['peru', 'brazil'],
  },

  // Europe
  {
    name: 'iceland',
    continent: 'europe',
    adjacentTerritories: ['greenland', 'great-britain', 'scandinavia'],
  },
  {
    name: 'great-britain',
    continent: 'europe',
    adjacentTerritories: ['iceland', 'scandinavia', 'northern-europe', 'western-europe'],
  },
  {
    name: 'scandinavia',
    continent: 'europe',
    adjacentTerritories: ['iceland', 'great-britain', 'northern-europe', 'ukraine'],
  },
  {
    name: 'northern-europe',
    continent: 'europe',
    adjacentTerritories: [
      'great-britain',
      'scandinavia',
      'ukraine',
      'southern-europe',
      'western-europe',
    ],
  },
  {
    name: 'western-europe',
    continent: 'europe',
    adjacentTerritories: ['great-britain', 'northern-europe', 'southern-europe', 'north-africa'],
  },
  {
    name: 'southern-europe',
    continent: 'europe',
    adjacentTerritories: [
      'western-europe',
      'northern-europe',
      'ukraine',
      'north-africa',
      'egypt',
      'middle-east',
    ],
  },
  {
    name: 'ukraine',
    continent: 'europe',
    adjacentTerritories: [
      'scandinavia',
      'northern-europe',
      'southern-europe',
      'middle-east',
      'afghanistan',
      'ural',
    ],
  },

  // Africa
  {
    name: 'north-africa',
    continent: 'africa',
    adjacentTerritories: [
      'brazil',
      'western-europe',
      'southern-europe',
      'egypt',
      'east-africa',
      'congo',
    ],
  },
  {
    name: 'egypt',
    continent: 'africa',
    adjacentTerritories: ['southern-europe', 'middle-east', 'north-africa', 'east-africa'],
  },
  {
    name: 'east-africa',
    continent: 'africa',
    adjacentTerritories: [
      'egypt',
      'middle-east',
      'north-africa',
      'congo',
      'south-africa',
      'madagascar',
    ],
  },
  {
    name: 'congo',
    continent: 'africa',
    adjacentTerritories: ['north-africa', 'east-africa', 'south-africa'],
  },
  {
    name: 'south-africa',
    continent: 'africa',
    adjacentTerritories: ['congo', 'east-africa', 'madagascar'],
  },
  {
    name: 'madagascar',
    continent: 'africa',
    adjacentTerritories: ['east-africa', 'south-africa'],
  },

  // Asia
  {
    name: 'ural',
    continent: 'asia',
    adjacentTerritories: ['ukraine', 'siberia', 'china', 'afghanistan'],
  },
  {
    name: 'siberia',
    continent: 'asia',
    adjacentTerritories: ['ural', 'yakutsk', 'irkutsk', 'mongolia', 'china'],
  },
  {
    name: 'yakutsk',
    continent: 'asia',
    adjacentTerritories: ['siberia', 'kamchatka', 'irkutsk'],
  },
  {
    name: 'kamchatka',
    continent: 'asia',
    adjacentTerritories: ['yakutsk', 'irkutsk', 'mongolia', 'japan', 'alaska'],
  },
  {
    name: 'irkutsk',
    continent: 'asia',
    adjacentTerritories: ['siberia', 'yakutsk', 'kamchatka', 'mongolia'],
  },
  {
    name: 'mongolia',
    continent: 'asia',
    adjacentTerritories: ['siberia', 'irkutsk', 'kamchatka', 'japan', 'china'],
  },
  {
    name: 'japan',
    continent: 'asia',
    adjacentTerritories: ['kamchatka', 'mongolia'],
  },
  {
    name: 'afghanistan',
    continent: 'asia',
    adjacentTerritories: ['ukraine', 'ural', 'china', 'india', 'middle-east'],
  },
  {
    name: 'china',
    continent: 'asia',
    adjacentTerritories: ['ural', 'siberia', 'mongolia', 'afghanistan', 'india', 'siam'],
  },
  {
    name: 'middle-east',
    continent: 'asia',
    adjacentTerritories: [
      'ukraine',
      'southern-europe',
      'egypt',
      'east-africa',
      'afghanistan',
      'india',
    ],
  },
  {
    name: 'india',
    continent: 'asia',
    adjacentTerritories: ['middle-east', 'afghanistan', 'china', 'siam'],
  },
  {
    name: 'siam',
    continent: 'asia',
    adjacentTerritories: ['china', 'india', 'indonesia'],
  },

  // Australia
  {
    name: 'indonesia',
    continent: 'australia',
    adjacentTerritories: ['siam', 'new-guinea', 'western-australia'],
  },
  {
    name: 'new-guinea',
    continent: 'australia',
    adjacentTerritories: ['indonesia', 'western-australia', 'eastern-australia'],
  },
  {
    name: 'western-australia',
    continent: 'australia',
    adjacentTerritories: ['indonesia', 'new-guinea', 'eastern-australia'],
  },
  {
    name: 'eastern-australia',
    continent: 'australia',
    adjacentTerritories: ['new-guinea', 'western-australia'],
  },
];

// Player colors
export const PLAYER_COLORS: PlayerColor[] = ['red', 'blue', 'green', 'yellow', 'purple', 'orange'];

// Helper functions
export function getTerritoryDefinition(name: TerritoryName): TerritoryDefinition | undefined {
  return TERRITORIES.find((t) => t.name === name);
}

export function getContinent(name: string): Continent | undefined {
  return CONTINENTS.find((c) => c.name === name);
}

export function areTerritoriesAdjacent(
  territory1: TerritoryName,
  territory2: TerritoryName
): boolean {
  const def = getTerritoryDefinition(territory1);
  return def?.adjacentTerritories.includes(territory2) ?? false;
}

export function getContinentBonus(continent: string): number {
  return CONTINENTS.find((c) => c.name === continent)?.bonus ?? 0;
}
