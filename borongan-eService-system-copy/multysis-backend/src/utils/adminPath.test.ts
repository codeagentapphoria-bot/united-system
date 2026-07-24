import {
  adminPathToServiceCode,
  matchesAllowedPath,
  normalizeAdminPath,
  serviceCodeToAdminPath,
} from './adminPath';

describe('adminPath helpers', () => {
  it('normalizes case, query strings, whitespace, and trailing slashes', () => {
    expect(normalizeAdminPath(' /Admin/E-Government/BPLS/?tab=applications ')).toBe(
      '/admin/e-government/bpls'
    );
  });

  it('matches exact allowed paths', () => {
    expect(matchesAllowedPath('/admin/e-government/bpls', ['/admin/e-government/bpls'])).toBe(true);
    expect(matchesAllowedPath('/admin/e-government/eboss', ['/admin/e-government/bpls'])).toBe(false);
  });

  it('matches dynamic one-segment allowed paths', () => {
    expect(matchesAllowedPath('/admin/e-government/bpls', ['/admin/e-government/:serviceCode'])).toBe(true);
    expect(matchesAllowedPath('/admin/e-government/bpls/extra', ['/admin/e-government/:serviceCode'])).toBe(false);
  });

  it('converts service codes to admin paths', () => {
    expect(serviceCodeToAdminPath('BIRTH_CERTIFICATE')).toBe('/admin/e-government/birth-certificate');
  });

  it('converts service admin paths to service codes', () => {
    expect(adminPathToServiceCode('/admin/e-government/birth-certificate')).toBe('BIRTH_CERTIFICATE');
    expect(adminPathToServiceCode('/admin/dashboard')).toBeNull();
    expect(adminPathToServiceCode('/admin/e-government/:serviceCode')).toBeNull();
  });
});
