import {
  getCountryFromHeaders,
  isCinetpayCountry,
  planCountryDetection,
  suggestPaymentMethod,
} from './geo.util';

describe('geo.util', () => {
  describe('isCinetpayCountry', () => {
    it('returns true for WAEMU/CEMAC', () => {
      expect(isCinetpayCountry('SN')).toBe(true);
      expect(isCinetpayCountry('cm')).toBe(true);
      expect(isCinetpayCountry('CI')).toBe(true);
    });

    it('returns true for extra CinetPay countries', () => {
      expect(isCinetpayCountry('CD')).toBe(true);
      expect(isCinetpayCountry('GN')).toBe(true);
    });

    it('returns false for other countries', () => {
      expect(isCinetpayCountry('US')).toBe(false);
      expect(isCinetpayCountry('FR')).toBe(false);
    });

    it('returns false for null/undefined/empty', () => {
      expect(isCinetpayCountry(null)).toBe(false);
      expect(isCinetpayCountry(undefined)).toBe(false);
      expect(isCinetpayCountry('')).toBe(false);
    });
  });

  describe('suggestPaymentMethod', () => {
    it('should suggest CinetPay for WAEMU countries', () => {
      expect(suggestPaymentMethod('SN')).toBe('cinetpay');
      expect(suggestPaymentMethod('CI')).toBe('cinetpay');
      expect(suggestPaymentMethod('BF')).toBe('cinetpay');
    });

    it('should suggest CinetPay for CEMAC countries', () => {
      expect(suggestPaymentMethod('CM')).toBe('cinetpay');
      expect(suggestPaymentMethod('TD')).toBe('cinetpay');
    });

    it('should suggest Stripe for non-African countries', () => {
      expect(suggestPaymentMethod('US')).toBe('stripe');
      expect(suggestPaymentMethod('FR')).toBe('stripe');
      expect(suggestPaymentMethod('GB')).toBe('stripe');
    });

    it('should default to Stripe if country unknown', () => {
      expect(suggestPaymentMethod(null)).toBe('stripe');
      expect(suggestPaymentMethod(undefined)).toBe('stripe');
      expect(suggestPaymentMethod('')).toBe('stripe');
    });

    it('should be case-insensitive', () => {
      expect(suggestPaymentMethod('sn')).toBe('cinetpay');
      expect(suggestPaymentMethod('Sn')).toBe('cinetpay');
    });
  });

  describe('planCountryDetection', () => {
    it('prefers a valid profile country over IP', () => {
      expect(
        planCountryDetection({ userCountryCode: 'sn', doNotTrack: true, consent: true })
      ).toEqual({ action: 'profile', countryCode: 'SN' });
    });

    it('skips IP when DNT is enabled', () => {
      expect(
        planCountryDetection({ userCountryCode: null, doNotTrack: true, consent: true })
      ).toEqual({ action: 'skip' });
    });

    it('skips IP when consent is declined or undecided', () => {
      expect(
        planCountryDetection({ userCountryCode: null, doNotTrack: false, consent: false })
      ).toEqual({ action: 'skip' });
      expect(
        planCountryDetection({ userCountryCode: null, doNotTrack: false, consent: null })
      ).toEqual({ action: 'skip' });
    });

    it('fetches IP only after explicit consent', () => {
      expect(
        planCountryDetection({ userCountryCode: null, doNotTrack: false, consent: true })
      ).toEqual({ action: 'fetch-ip' });
    });
  });

  describe('getCountryFromHeaders', () => {
    it('extracts country from CF-IPCountry', () => {
      expect(getCountryFromHeaders({ headers: { 'cf-ipcountry': 'SN' } })).toBe('SN');
    });

    it('extracts country from X-Country', () => {
      expect(getCountryFromHeaders({ headers: { 'x-country': 'us' } })).toBe('US');
    });

    it('extracts country from X-Geo-Country', () => {
      expect(getCountryFromHeaders({ headers: { 'x-geo-country': 'CI' } })).toBe('CI');
    });

    it('returns null if no geo header present', () => {
      expect(getCountryFromHeaders({ headers: {} })).toBeNull();
    });

    it('prioritizes CF-IPCountry over X-Country', () => {
      expect(
        getCountryFromHeaders({
          headers: { 'cf-ipcountry': 'SN', 'x-country': 'US' },
        })
      ).toBe('SN');
    });

    it('treats Cloudflare unknown/Tor codes as missing', () => {
      expect(getCountryFromHeaders({ headers: { 'cf-ipcountry': 'XX' } })).toBeNull();
      expect(getCountryFromHeaders({ headers: { 'cf-ipcountry': 'T1' } })).toBeNull();
    });

    it('rejects non ISO alpha-2 values', () => {
      expect(getCountryFromHeaders({ headers: { 'cf-ipcountry': 'SEN' } })).toBeNull();
      expect(getCountryFromHeaders({ headers: { 'x-country': '' } })).toBeNull();
    });
  });
});
