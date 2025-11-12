/**
 * Risk Game Territory Data
 * Based on the classic Risk board game with 42 territories across 6 continents
 */

export type TerritoryName =
  | 'indonesia' | 'new_guinea' | 'eastern_australia' | 'western_australia'
  | 'brazil' | 'peru' | 'argentina' | 'venezuela'
  | 'egypt' | 'north_africa' | 'east_africa' | 'congo' | 'south_africa' | 'madagascar'
  | 'iceland' | 'scandinavia' | 'northern_europe' | 'western_europe' | 'southern_europe' | 'uk' | 'ukraine'
  | 'central_america' | 'eastern_us' | 'western_us' | 'alaska' | 'alberta' | 'ontario' | 'quebec' | 'northwest_territory' | 'greenland'
  | 'middle_east' | 'afghanistan' | 'ural' | 'siberia' | 'irkutsk' | 'yakutsk' | 'kamchatka' | 'mongolia' | 'japan' | 'china' | 'siam' | 'india';

export type ContinentName = 'oceania' | 'south_america' | 'africa' | 'europe' | 'north_america' | 'asia';

export interface TerritoryDefinition {
  name: TerritoryName;
  continent: ContinentName;
  neighbors: TerritoryName[];
}

export interface ContinentDefinition {
  name: ContinentName;
  displayName: string;
  territories: TerritoryName[];
  bonus: number;
}

export const territories: Record<TerritoryName, TerritoryDefinition> = {
  // OCEANIA
  indonesia: {
    name: 'indonesia',
    continent: 'oceania',
    neighbors: ['siam', 'western_australia', 'new_guinea']
  },
  new_guinea: {
    name: 'new_guinea',
    continent: 'oceania',
    neighbors: ['indonesia', 'eastern_australia', 'western_australia']
  },
  eastern_australia: {
    name: 'eastern_australia',
    continent: 'oceania',
    neighbors: ['western_australia', 'new_guinea']
  },
  western_australia: {
    name: 'western_australia',
    continent: 'oceania',
    neighbors: ['eastern_australia', 'new_guinea', 'indonesia']
  },

  // SOUTH AMERICA
  brazil: {
    name: 'brazil',
    continent: 'south_america',
    neighbors: ['peru', 'argentina', 'north_africa', 'venezuela']
  },
  peru: {
    name: 'peru',
    continent: 'south_america',
    neighbors: ['brazil', 'argentina', 'venezuela']
  },
  argentina: {
    name: 'argentina',
    continent: 'south_america',
    neighbors: ['brazil', 'peru']
  },
  venezuela: {
    name: 'venezuela',
    continent: 'south_america',
    neighbors: ['brazil', 'peru', 'central_america']
  },

  // AFRICA
  egypt: {
    name: 'egypt',
    continent: 'africa',
    neighbors: ['middle_east', 'southern_europe', 'north_africa', 'east_africa']
  },
  north_africa: {
    name: 'north_africa',
    continent: 'africa',
    neighbors: ['egypt', 'southern_europe', 'western_europe', 'east_africa', 'congo', 'brazil']
  },
  east_africa: {
    name: 'east_africa',
    continent: 'africa',
    neighbors: ['middle_east', 'egypt', 'north_africa', 'congo', 'madagascar', 'south_africa']
  },
  congo: {
    name: 'congo',
    continent: 'africa',
    neighbors: ['south_africa', 'north_africa', 'east_africa']
  },
  south_africa: {
    name: 'south_africa',
    continent: 'africa',
    neighbors: ['congo', 'madagascar', 'east_africa']
  },
  madagascar: {
    name: 'madagascar',
    continent: 'africa',
    neighbors: ['south_africa', 'east_africa']
  },

  // EUROPE
  iceland: {
    name: 'iceland',
    continent: 'europe',
    neighbors: ['greenland', 'uk', 'scandinavia']
  },
  scandinavia: {
    name: 'scandinavia',
    continent: 'europe',
    neighbors: ['iceland', 'uk', 'ukraine', 'northern_europe']
  },
  northern_europe: {
    name: 'northern_europe',
    continent: 'europe',
    neighbors: ['ukraine', 'uk', 'scandinavia', 'southern_europe', 'western_europe']
  },
  western_europe: {
    name: 'western_europe',
    continent: 'europe',
    neighbors: ['north_africa', 'uk', 'northern_europe', 'southern_europe']
  },
  southern_europe: {
    name: 'southern_europe',
    continent: 'europe',
    neighbors: ['north_africa', 'egypt', 'northern_europe', 'western_europe', 'middle_east', 'ukraine']
  },
  uk: {
    name: 'uk',
    continent: 'europe',
    neighbors: ['western_europe', 'iceland', 'northern_europe', 'scandinavia']
  },
  ukraine: {
    name: 'ukraine',
    continent: 'europe',
    neighbors: ['scandinavia', 'ural', 'northern_europe', 'southern_europe', 'afghanistan', 'middle_east']
  },

  // NORTH AMERICA
  central_america: {
    name: 'central_america',
    continent: 'north_america',
    neighbors: ['venezuela', 'eastern_us', 'western_us']
  },
  eastern_us: {
    name: 'eastern_us',
    continent: 'north_america',
    neighbors: ['central_america', 'quebec', 'ontario', 'western_us']
  },
  western_us: {
    name: 'western_us',
    continent: 'north_america',
    neighbors: ['eastern_us', 'central_america', 'ontario', 'alberta']
  },
  alaska: {
    name: 'alaska',
    continent: 'north_america',
    neighbors: ['kamchatka', 'alberta', 'northwest_territory']
  },
  alberta: {
    name: 'alberta',
    continent: 'north_america',
    neighbors: ['alaska', 'western_us', 'ontario', 'northwest_territory']
  },
  ontario: {
    name: 'ontario',
    continent: 'north_america',
    neighbors: ['greenland', 'quebec', 'alberta', 'western_us', 'eastern_us', 'northwest_territory']
  },
  quebec: {
    name: 'quebec',
    continent: 'north_america',
    neighbors: ['greenland', 'eastern_us', 'ontario']
  },
  northwest_territory: {
    name: 'northwest_territory',
    continent: 'north_america',
    neighbors: ['greenland', 'alaska', 'alberta', 'ontario']
  },
  greenland: {
    name: 'greenland',
    continent: 'north_america',
    neighbors: ['iceland', 'quebec', 'ontario', 'northwest_territory']
  },

  // ASIA
  middle_east: {
    name: 'middle_east',
    continent: 'asia',
    neighbors: ['ukraine', 'afghanistan', 'india', 'egypt', 'east_africa', 'southern_europe']
  },
  afghanistan: {
    name: 'afghanistan',
    continent: 'asia',
    neighbors: ['ukraine', 'ural', 'middle_east', 'china', 'india']
  },
  ural: {
    name: 'ural',
    continent: 'asia',
    neighbors: ['ukraine', 'siberia', 'afghanistan', 'china']
  },
  siberia: {
    name: 'siberia',
    continent: 'asia',
    neighbors: ['ural', 'mongolia', 'yakutsk', 'irkutsk', 'china']
  },
  irkutsk: {
    name: 'irkutsk',
    continent: 'asia',
    neighbors: ['yakutsk', 'siberia', 'kamchatka', 'mongolia']
  },
  yakutsk: {
    name: 'yakutsk',
    continent: 'asia',
    neighbors: ['irkutsk', 'siberia', 'kamchatka']
  },
  kamchatka: {
    name: 'kamchatka',
    continent: 'asia',
    neighbors: ['alaska', 'yakutsk', 'japan', 'irkutsk', 'mongolia']
  },
  mongolia: {
    name: 'mongolia',
    continent: 'asia',
    neighbors: ['irkutsk', 'siberia', 'kamchatka', 'china', 'japan']
  },
  japan: {
    name: 'japan',
    continent: 'asia',
    neighbors: ['kamchatka', 'mongolia']
  },
  china: {
    name: 'china',
    continent: 'asia',
    neighbors: ['ural', 'siberia', 'afghanistan', 'mongolia', 'siam', 'india']
  },
  siam: {
    name: 'siam',
    continent: 'asia',
    neighbors: ['indonesia', 'india', 'china']
  },
  india: {
    name: 'india',
    continent: 'asia',
    neighbors: ['middle_east', 'siam', 'afghanistan', 'china']
  }
};

export const continents: ContinentDefinition[] = [
  {
    name: 'oceania',
    displayName: 'Oceania',
    territories: ['indonesia', 'new_guinea', 'eastern_australia', 'western_australia'],
    bonus: 2
  },
  {
    name: 'south_america',
    displayName: 'South America',
    territories: ['brazil', 'peru', 'venezuela', 'argentina'],
    bonus: 2
  },
  {
    name: 'africa',
    displayName: 'Africa',
    territories: ['egypt', 'north_africa', 'east_africa', 'congo', 'south_africa', 'madagascar'],
    bonus: 3
  },
  {
    name: 'europe',
    displayName: 'Europe',
    territories: ['iceland', 'uk', 'scandinavia', 'northern_europe', 'western_europe', 'ukraine', 'southern_europe'],
    bonus: 5
  },
  {
    name: 'north_america',
    displayName: 'North America',
    territories: ['central_america', 'eastern_us', 'western_us', 'quebec', 'ontario', 'alberta', 'northwest_territory', 'alaska', 'greenland'],
    bonus: 5
  },
  {
    name: 'asia',
    displayName: 'Asia',
    territories: ['middle_east', 'afghanistan', 'ural', 'siberia', 'irkutsk', 'yakutsk', 'kamchatka', 'mongolia', 'japan', 'china', 'siam', 'india'],
    bonus: 7
  }
];

export const allTerritoryNames: TerritoryName[] = Object.keys(territories) as TerritoryName[];
