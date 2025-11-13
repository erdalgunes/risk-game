export const mockValidDeployMove = {
    type: 'deploy',
    territory: 'alaska',
    troops: 3
};
export const mockValidAttackMove = {
    type: 'attack',
    from: 'alaska',
    to: 'kamchatka'
};
export const mockValidFortifyMove = {
    type: 'fortify',
    from: 'alaska',
    to: 'alberta',
    troops: 2
};
export const mockSkipMove = {
    type: 'skip'
};
export const mockInvalidDeployMove = {
    type: 'deploy',
    territory: 'alaska',
    troops: 0 // Invalid: must deploy at least 1 troop
};
export const mockInvalidAttackMove = {
    type: 'attack',
    from: 'alaska',
    to: 'alaska' // Invalid: cannot attack own territory
};
export const mockInvalidFortifyMove = {
    type: 'fortify',
    from: 'alaska',
    to: 'kamchatka', // Invalid: not adjacent
    troops: 1
};
