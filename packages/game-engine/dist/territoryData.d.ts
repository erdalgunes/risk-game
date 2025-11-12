/**
 * Risk Game Territory Data
 * Based on the classic Risk board game with 42 territories across 6 continents
 */
export type TerritoryName = 'indonesia' | 'new_guinea' | 'eastern_australia' | 'western_australia' | 'brazil' | 'peru' | 'argentina' | 'venezuela' | 'egypt' | 'north_africa' | 'east_africa' | 'congo' | 'south_africa' | 'madagascar' | 'iceland' | 'scandinavia' | 'northern_europe' | 'western_europe' | 'southern_europe' | 'uk' | 'ukraine' | 'central_america' | 'eastern_us' | 'western_us' | 'alaska' | 'alberta' | 'ontario' | 'quebec' | 'northwest_territory' | 'greenland' | 'middle_east' | 'afghanistan' | 'ural' | 'siberia' | 'irkutsk' | 'yakutsk' | 'kamchatka' | 'mongolia' | 'japan' | 'china' | 'siam' | 'india';
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
export declare const territories: Record<TerritoryName, TerritoryDefinition>;
export declare const continents: ContinentDefinition[];
export declare const allTerritoryNames: TerritoryName[];
//# sourceMappingURL=territoryData.d.ts.map