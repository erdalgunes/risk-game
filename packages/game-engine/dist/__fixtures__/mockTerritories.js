export const mockFullContinentOwnership = {
    north_america: ['alaska', 'alberta', 'central_america', 'eastern_us', 'greenland', 'northwest_territory', 'ontario', 'quebec', 'western_us'],
    south_america: ['argentina', 'brazil', 'peru', 'venezuela'],
    europe: ['iceland', 'uk', 'scandinavia', 'northern_europe', 'western_europe', 'ukraine', 'southern_europe'],
    africa: ['egypt', 'north_africa', 'east_africa', 'congo', 'south_africa', 'madagascar'],
    asia: ['middle_east', 'afghanistan', 'ural', 'siberia', 'irkutsk', 'yakutsk', 'kamchatka', 'mongolia', 'japan', 'china', 'siam', 'india'],
    oceania: ['indonesia', 'new_guinea', 'eastern_australia', 'western_australia']
};
export const mockSplitContinent = {
    north_america_split: {
        player1: ['alaska', 'alberta', 'northwest_territory'],
        player2: ['central_america', 'eastern_us', 'western_us', 'ontario', 'quebec', 'greenland']
    }
};
export const mockIsolatedTerritories = ['iceland', 'japan', 'madagascar'];
export const mockAdjacentTerritories = {
    alaska: ['kamchatka', 'alberta', 'northwest_territory'],
    alberta: ['alaska', 'western_us', 'ontario', 'northwest_territory'],
    ontario: ['greenland', 'quebec', 'alberta', 'western_us', 'eastern_us', 'northwest_territory']
};
