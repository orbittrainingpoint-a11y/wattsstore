import { PrismaClient } from '@prisma/client';
import { targetCountries } from '../prisma/targetCountries';

const prisma = new PrismaClient();

function shippingRate(countryCode: string, currencyCode: string) {
  const gcc = ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'];
  const africa = ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW'];
  if (gcc.includes(countryCode)) return { countryCode, flatRate: currencyCode === 'AED' ? 25 : 30, freeOver: 500, estimatedDays: '2-5 business days' };
  if (africa.includes(countryCode)) return { countryCode, baseRate: 45, perKgRate: 4, freeOver: 1200, estimatedDays: '5-12 business days' };
  if (currencyCode === 'EUR') return { countryCode, flatRate: 18, freeOver: 300, estimatedDays: '3-7 business days' };
  return { countryCode, baseRate: 50, perKgRate: 5, freeOver: 1500, estimatedDays: '5-14 business days' };
}

async function main() {
  const taxSettings = { countryRates: [] as unknown[] };
  const shippingRates = { countryRates: [] as unknown[] };

  for (const [countryCode, countryName, currencyCode, currencySymbol, subdomainSlug, localeCode, vatRate] of targetCountries) {
    const country = await prisma.country.upsert({
      where: { countryCode },
      update: { countryName, currencyCode, currencySymbol, subdomainSlug, localeCode, vatRate, isActive: true },
      create: { countryCode, countryName, currencyCode, currencySymbol, subdomainSlug, localeCode, vatRate, isActive: true },
    });
    await prisma.taxRule.upsert({
      where: { countryId_taxClass: { countryId: country.id, taxClass: 'standard' } },
      update: { taxRate: vatRate, taxLabel: countryCode === 'DE' ? 'MwSt' : 'VAT', isInclusive: false },
      create: { countryId: country.id, taxClass: 'standard', taxRate: vatRate, taxLabel: countryCode === 'DE' ? 'MwSt' : 'VAT', isInclusive: false },
    });
    taxSettings.countryRates.push({ countryCode, taxClass: 'standard', taxRate: vatRate, taxLabel: countryCode === 'DE' ? 'MwSt' : 'VAT', isInclusive: false });
    shippingRates.countryRates.push(shippingRate(countryCode, currencyCode));
  }

  await prisma.setting.upsert({ where: { key: 'taxSettings' }, update: { value: taxSettings }, create: { key: 'taxSettings', value: taxSettings } });
  await prisma.setting.upsert({ where: { key: 'shippingRates' }, update: { value: shippingRates }, create: { key: 'shippingRates', value: shippingRates } });
  await prisma.setting.upsert({
    where: { key: 'localization' },
    update: { value: { autoDetectCountry: true, defaultRegion: 'ae', supportedLanguages: [{ code: 'en', label: 'English' }, { code: 'ar', label: 'Arabic' }, { code: 'fr', label: 'French' }, { code: 'de', label: 'German' }] } },
    create: { key: 'localization', value: { autoDetectCountry: true, defaultRegion: 'ae', supportedLanguages: [{ code: 'en', label: 'English' }, { code: 'ar', label: 'Arabic' }, { code: 'fr', label: 'French' }, { code: 'de', label: 'German' }] } },
  });

  console.log(`Synced ${targetCountries.length} countries with tax and shipping defaults.`);
}

main().finally(() => prisma.$disconnect());
