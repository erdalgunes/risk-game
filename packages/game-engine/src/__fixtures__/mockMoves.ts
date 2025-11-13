import type { Move } from '../types';

export const mockValidDeployMove: Move = {
  type: 'deploy',
  territory: 'alaska',
  troops: 3
};

export const mockValidAttackMove: Move = {
  type: 'attack',
  from: 'alaska',
  to: 'kamchatka'
};

export const mockValidFortifyMove: Move = {
  type: 'fortify',
  from: 'alaska',
  to: 'alberta',
  troops: 2
};

export const mockSkipMove: Move = {
  type: 'skip'
};

export const mockInvalidDeployMove: Move = {
  type: 'deploy',
  territory: 'alaska',
  troops: 0 // Invalid: must deploy at least 1 troop
};

export const mockInvalidAttackMove: Move = {
  type: 'attack',
  from: 'alaska',
  to: 'alaska' // Invalid: cannot attack own territory
};

export const mockInvalidFortifyMove: Move = {
  type: 'fortify',
  from: 'alaska',
  to: 'kamchatka', // Invalid: not adjacent
  troops: 1
};