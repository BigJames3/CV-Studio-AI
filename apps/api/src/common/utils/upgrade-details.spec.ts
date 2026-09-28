import { upgradeDetails } from './upgrade-details';

describe('upgradeDetails', () => {
  it('points free and pro users to the pricing page', () => {
    expect(upgradeDetails('cv:create', 'free')).toEqual({
      feature: 'cv:create',
      tier: 'free',
      upgradeUrl: '/pricing',
    });
    expect(upgradeDetails('cv:create', 'pro')).toMatchObject({ upgradeUrl: '/pricing' });
  });

  it('gives Business (top plan) no upgrade link', () => {
    expect(upgradeDetails('cv:create', 'business')).toEqual({
      feature: 'cv:create',
      tier: 'business',
    });
  });
});
