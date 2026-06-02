/**
 * Seed: countries + tax rules, admin/sales users, brands, categories (with variant schemas),
 * sample products with variants + regional pricing, a coupon, and FAQ entries.
 * Idempotent — safe to re-run (upserts on unique keys).
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { targetCountries } from './targetCountries';

const prisma = new PrismaClient();

function defaultShippingRate(countryCode: string, currencyCode: string) {
  const gcc = ['AE', 'SA', 'QA', 'KW', 'BH', 'OM'];
  const africa = ['DZ', 'AO', 'BJ', 'BW', 'BF', 'BI', 'CM', 'CV', 'CF', 'TD', 'KM', 'CG', 'CD', 'CI', 'DJ', 'EG', 'GQ', 'ER', 'SZ', 'ET', 'GA', 'GM', 'GH', 'GN', 'GW', 'KE', 'LS', 'LR', 'LY', 'MG', 'MW', 'ML', 'MR', 'MU', 'MA', 'MZ', 'NA', 'NE', 'NG', 'RW', 'ST', 'SN', 'SC', 'SL', 'SO', 'ZA', 'SS', 'SD', 'TZ', 'TG', 'TN', 'UG', 'ZM', 'ZW'];
  if (gcc.includes(countryCode)) return { countryCode, flatRate: currencyCode === 'AED' ? 25 : 30, freeOver: 500, estimatedDays: '2-5 business days' };
  if (africa.includes(countryCode)) return { countryCode, baseRate: 45, perKgRate: 4, freeOver: 1200, estimatedDays: '5-12 business days' };
  if (currencyCode === 'EUR') return { countryCode, flatRate: 18, freeOver: 300, estimatedDays: '3-7 business days' };
  return { countryCode, baseRate: 50, perKgRate: 5, freeOver: 1500, estimatedDays: '5-14 business days' };
}

async function main() {
  // ── Countries ──
  const countries = targetCountries.map(([countryCode, countryName, currencyCode, currencySymbol, subdomainSlug, localeCode, vatRate]) => ({
    countryCode,
    countryName,
    currencyCode,
    currencySymbol,
    subdomainSlug,
    localeCode,
    vatRate,
  }));
  const countryMap: Record<string, number> = {};
  for (const c of countries) {
    const country = await prisma.country.upsert({ where: { countryCode: c.countryCode }, update: c, create: c });
    countryMap[c.countryCode] = country.id;
    await prisma.taxRule.upsert({
      where: { countryId_taxClass: { countryId: country.id, taxClass: 'standard' } },
      update: { taxRate: c.vatRate, taxLabel: c.countryCode === 'DE' ? 'MwSt' : 'VAT' },
      create: { countryId: country.id, taxClass: 'standard', taxRate: c.vatRate, taxLabel: c.countryCode === 'DE' ? 'MwSt' : 'VAT' },
    });
  }

  // ── Users ──
  const adminHash = await bcrypt.hash('Admin@12345', 12);
  await prisma.user.upsert({
    where: { email: 'admin@wattsstore.com' },
    update: { passwordHash: adminHash, firstName: 'Super', lastName: 'Admin', role: 'super_admin', isActive: true, isEmailVerified: true },
    create: { email: 'admin@wattsstore.com', passwordHash: adminHash, firstName: 'Super', lastName: 'Admin', role: 'super_admin', isEmailVerified: true },
  });
  await prisma.user.upsert({
    where: { email: 'sales@wattsstore.com' },
    update: { passwordHash: adminHash, firstName: 'Sales', lastName: 'Agent', role: 'sales_agent', isActive: true, isEmailVerified: true },
    create: { email: 'sales@wattsstore.com', passwordHash: adminHash, firstName: 'Sales', lastName: 'Agent', role: 'sales_agent', isEmailVerified: true },
  });
  const customerHash = await bcrypt.hash('Customer@123', 12);
  await prisma.user.upsert({
    where: { email: 'customer@example.com' },
    update: { passwordHash: customerHash, firstName: 'Test', lastName: 'Customer', role: 'customer', isActive: true, isEmailVerified: true },
    create: { email: 'customer@example.com', passwordHash: customerHash, firstName: 'Test', lastName: 'Customer', role: 'customer', isEmailVerified: true },
  });
  const demoUsers = [
    { email: 'buyer.ae@example.com', firstName: 'Aisha', lastName: 'Khan', phone: '+971501112233' },
    { email: 'procurement@example.com', firstName: 'Omar', lastName: 'Nasser', phone: '+971504445566' },
    { email: 'solar.buyer@example.com', firstName: 'Maya', lastName: 'Shah', phone: '+971507778899' },
  ];
  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash: customerHash, role: 'customer', isActive: true, isEmailVerified: true },
      create: { ...user, passwordHash: customerHash, role: 'customer', isEmailVerified: true },
    });
  }

  // ── Brands ──
  const brandData = [
    { name: 'Wipro Lighting', slug: 'wipro-lighting', originCountry: 'India', isFeatured: true, sortOrder: 1 },
    { name: 'CHINT', slug: 'chint', originCountry: 'China', isFeatured: true, sortOrder: 2 },
    { name: 'Siemens', slug: 'siemens', originCountry: 'Germany', isFeatured: true, sortOrder: 3 },
    { name: 'Havells', slug: 'havells', originCountry: 'India', isFeatured: true, sortOrder: 4 },
    { name: 'Schneider Electric', slug: 'schneider-electric', originCountry: 'Germany', isFeatured: true, sortOrder: 5 },
    { name: 'ABB', slug: 'abb', originCountry: 'Germany', isFeatured: true, sortOrder: 6 },
    { name: 'Polycab', slug: 'polycab', originCountry: 'India', isFeatured: true, sortOrder: 7 },
    { name: 'LONGi Solar', slug: 'longi-solar', originCountry: 'China', isFeatured: true, sortOrder: 8 },
    { name: 'SMA Solar', slug: 'sma-solar', originCountry: 'Germany', isFeatured: true, sortOrder: 9 },
    { name: 'Legrand', slug: 'legrand', originCountry: 'Germany', isFeatured: true, sortOrder: 10 },
  ];
  const brandMap: Record<string, number> = {};
  for (const b of brandData) {
    const brand = await prisma.brand.upsert({ where: { slug: b.slug }, update: b, create: b });
    brandMap[b.slug] = brand.id;
  }

  // ── Categories (with variant schemas) ──
  const lightingSchema = [
    { field: 'wattage', label: 'Wattage (W)', type: 'string', required: true, options: ['50W', '100W', '150W', '200W'], filterEnabled: true },
    { field: 'ip_rating', label: 'IP Rating', type: 'string', required: true, options: ['IP54', 'IP65', 'IP66', 'IP67', 'IP68'], filterEnabled: true },
    { field: 'voltage', label: 'Input Voltage', type: 'string', required: true, options: ['110V', '220V', '240V'], filterEnabled: true },
    { field: 'color_temperature', label: 'Colour Temperature (K)', type: 'string', required: false, options: ['3000K', '4000K', '5000K', '6500K'], filterEnabled: true },
  ];
  const solarSchema = [
    { field: 'wattage_wp', label: 'Wattage (Wp)', type: 'string', required: true, options: ['300Wp', '400Wp', '550Wp'], filterEnabled: true },
    { field: 'cell_type', label: 'Cell Type', type: 'string', required: true, options: ['Mono', 'Poly', 'Bifacial'], filterEnabled: true },
  ];
  const electricalSchema = [
    { field: 'rating', label: 'Rating', type: 'string', required: true, options: ['16A', '32A', '63A', '125A'], filterEnabled: true },
    { field: 'voltage', label: 'Voltage', type: 'string', required: true, options: ['230V', '400V'], filterEnabled: true },
  ];
  const cableSchema = [
    { field: 'size', label: 'Cable Size', type: 'string', required: true, options: ['2.5mm2', '4mm2', '6mm2', '10mm2'], filterEnabled: true },
    { field: 'length', label: 'Length', type: 'string', required: true, options: ['50m', '100m'], filterEnabled: true },
  ];
  const categoryData = [
    { name: 'Industrial Lighting', slug: 'industrial-lighting', description: 'Explosion-proof, floodlights and high-bay systems.', imageUrl: '/img/categories/industrial-lighting.svg', schema: lightingSchema },
    { name: 'Commercial Lighting', slug: 'commercial-lighting', description: 'Panels, downlights and workplace illumination.', imageUrl: '/img/categories/commercial-lighting.svg', schema: lightingSchema },
    { name: 'Solar Equipment', slug: 'solar-equipment', description: 'Panels, inverters, batteries and off-grid kits.', imageUrl: '/img/categories/solar-equipment.svg', schema: solarSchema },
    { name: 'Wiring Accessories', slug: 'wiring-accessories', description: 'Glands, connectors and installation accessories.', imageUrl: '/img/categories/wiring-accessories.svg', schema: electricalSchema },
    { name: 'Power & Control', slug: 'power-control', description: 'Breakers, distribution and industrial control.', imageUrl: '/img/categories/power-control.svg', schema: electricalSchema },
    { name: 'Cables & Wiring', slug: 'cables-wiring', description: 'Power, control and solar cabling.', imageUrl: '/img/categories/cables-wiring.svg', schema: cableSchema },
    { name: 'Renewable Accessories', slug: 'renewable-accessories', description: 'Mounting, isolators and EV/solar accessories.', imageUrl: '/img/categories/renewable-accessories.svg', schema: electricalSchema },
    { name: 'Deals & Bundles', slug: 'deals', description: 'Curated project bundles and active offers.', imageUrl: '/img/categories/deals.svg', schema: electricalSchema },
  ];
  const categoryMap: Record<string, number> = {};
  for (const [index, category] of categoryData.entries()) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, description: category.description, imageUrl: category.imageUrl, variantSpecificationSchema: category.schema, sortOrder: index + 1, showInMenu: true },
      create: { name: category.name, slug: category.slug, description: category.description, imageUrl: category.imageUrl, variantSpecificationSchema: category.schema, sortOrder: index + 1, showInMenu: true },
    });
    categoryMap[category.slug] = row.id;
  }

  const subCategories = [
    { parent: 'solar-equipment', name: 'Solar Panels', slug: 'solar-panels', description: 'Mono, bifacial and rooftop PV modules.', sortOrder: 1, schema: solarSchema },
    { parent: 'solar-equipment', name: 'Solar Inverters', slug: 'solar-inverters', description: 'Hybrid, string and three-phase solar inverters.', sortOrder: 2, schema: solarSchema },
    { parent: 'solar-equipment', name: 'Solar Batteries', slug: 'solar-batteries', description: 'Wall-mount and modular lithium storage.', sortOrder: 3, schema: solarSchema },
    { parent: 'solar-equipment', name: 'Mounting & Balance of System', slug: 'solar-mounting-bos', description: 'Rails, connectors, isolators and BOS parts.', sortOrder: 4, schema: electricalSchema },
    { parent: 'solar-panels', name: 'Monocrystalline Panels', slug: 'monocrystalline-panels', description: 'High-efficiency mono PV panels.', sortOrder: 1, schema: solarSchema },
    { parent: 'solar-panels', name: 'Bifacial Panels', slug: 'bifacial-panels', description: 'Dual-glass and bifacial modules.', sortOrder: 2, schema: solarSchema },
    { parent: 'monocrystalline-panels', name: '550Wp Modules', slug: '550wp-solar-modules', description: '550Wp class panels for commercial systems.', sortOrder: 1, schema: solarSchema },
    { parent: 'industrial-lighting', name: 'Hazardous Area Lighting', slug: 'hazardous-area-lighting', description: 'ATEX and high-IP luminaires for industrial sites.', sortOrder: 1, schema: lightingSchema },
    { parent: 'industrial-lighting', name: 'Warehouse High Bay', slug: 'warehouse-high-bay-lighting', description: 'High-bay lighting for warehouses and factories.', sortOrder: 2, schema: lightingSchema },
    { parent: 'power-control', name: 'Circuit Protection', slug: 'circuit-protection', description: 'MCBs, SPDs and control protection.', sortOrder: 1, schema: electricalSchema },
  ];
  for (const category of subCategories) {
    const parentId = categoryMap[category.parent];
    if (!parentId) continue;
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description,
        parentId,
        variantSpecificationSchema: category.schema,
        sortOrder: category.sortOrder,
        showInMenu: true,
        isActive: true,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        parentId,
        variantSpecificationSchema: category.schema,
        sortOrder: category.sortOrder,
        showInMenu: true,
      },
    });
    categoryMap[category.slug] = row.id;
  }

  // ── Sample products ──
  async function seedProduct(opts: {
    slug: string;
    title: string;
    skuBase: string;
    categoryId: number;
    brandSlug: string;
    brandOrigin: string;
    imageUrls: string[];
    featured?: boolean;
    bestSeller?: boolean;
    totalSold?: number;
    variants: { sku: string; attributes: Record<string, string>; weightKg: number; price: number; compareAt?: number; stock: number; baseShip: number; perKg: number }[];
  }) {
    const product = await prisma.product.upsert({
      where: { slug: opts.slug },
      update: {
        title: opts.title,
        categoryId: opts.categoryId,
        brandId: brandMap[opts.brandSlug],
        brandOrigin: opts.brandOrigin,
        isFeatured: opts.featured ?? false,
        isBestSeller: opts.bestSeller ?? false,
        isNewArrival: true,
        totalSold: opts.totalSold ?? 0,
      },
      create: {
        slug: opts.slug,
        title: opts.title,
        skuBase: opts.skuBase,
        categoryId: opts.categoryId,
        brandId: brandMap[opts.brandSlug],
        brandOrigin: opts.brandOrigin,
        shortDescription: `${opts.title} — industrial grade, certified.`,
        fullDescription: `<p>${opts.title} engineered for demanding industrial environments.</p>`,
        isFeatured: opts.featured ?? false,
        isBestSeller: opts.bestSeller ?? false,
        isNewArrival: true,
        totalSold: opts.totalSold ?? 0,
        metaTitle: `${opts.title} | WattsStore`,
      },
    });
    for (const [imageIndex, imageUrl] of opts.imageUrls.entries()) {
      await prisma.productImage.upsert({
        where: { id: product.id * 1000 + imageIndex },
        update: { imageUrl, altText: opts.title, sortOrder: imageIndex, isPrimary: imageIndex === 0 },
        create: {
          id: product.id * 1000 + imageIndex,
          productId: product.id,
          imageUrl,
          altText: opts.title,
          sortOrder: imageIndex,
          isPrimary: imageIndex === 0,
        },
      }).catch(() => undefined);
    }

    for (const v of opts.variants) {
      const variant = await prisma.productVariant.upsert({
        where: { variantSku: v.sku },
        update: {},
        create: { productId: product.id, variantSku: v.sku, attributes: v.attributes, weightKg: v.weightKg },
      });
      for (const cc of ['AE', 'KE', 'DE']) {
        await prisma.regionalInventoryPricing.upsert({
          where: { productVariantId_countryId: { productVariantId: variant.id, countryId: countryMap[cc] } },
          update: { retailPrice: v.price, compareAtPrice: v.compareAt, stockOnHand: v.stock, baseShippingCost: v.baseShip, perKgAdder: v.perKg, isAvailable: true },
          create: {
            productVariantId: variant.id,
            countryId: countryMap[cc],
            retailPrice: v.price,
            compareAtPrice: v.compareAt,
            costPrice: v.price * 0.6,
            stockOnHand: v.stock,
            baseShippingCost: v.baseShip,
            perKgAdder: v.perKg,
          },
        });
      }
    }
    return product;
  }

  const sampleProducts = [
    { slug: 'explosion-proof-led-floodlight', title: 'Explosion-Proof LED Floodlight 100W', sku: 'WS-EXP-FL', cat: 'industrial-lighting', brand: 'wipro-lighting', origin: 'Indian', images: ['/img/products/catalog/explosion-proof-led-floodlight.jpg'], attrs: { wattage: '100W', ip_rating: 'IP66', voltage: '220V', color_temperature: '5000K' }, price: 345, compareAt: 420, stock: 42 },
    { slug: 'atex-linear-luminaire-50w', title: 'ATEX Linear Luminaire 50W', sku: 'WS-ATX-LN', cat: 'industrial-lighting', brand: 'siemens', origin: 'German', images: ['/img/products/catalog/atex-linear-luminaire.jpg'], attrs: { wattage: '50W', ip_rating: 'IP67', voltage: '240V', color_temperature: '4000K' }, price: 485, compareAt: 540, stock: 24 },
    { slug: 'warehouse-high-bay-150w', title: 'Warehouse High-Bay LED 150W', sku: 'WS-HB-150', cat: 'industrial-lighting', brand: 'havells', origin: 'Indian', images: ['/img/products/catalog/warehouse-high-bay.jpg', '/img/products/catalog/warehouse-high-bay-alt.jpg'], attrs: { wattage: '150W', ip_rating: 'IP65', voltage: '220V', color_temperature: '5000K' }, price: 290, compareAt: 350, stock: 55 },
    { slug: 'led-office-panel-40w', title: 'Commercial LED Panel 40W', sku: 'WS-PNL-40', cat: 'commercial-lighting', brand: 'wipro-lighting', origin: 'Indian', images: ['/img/products/catalog/commercial-led-panel.jpg'], attrs: { wattage: '50W', ip_rating: 'IP54', voltage: '220V', color_temperature: '4000K' }, price: 88, compareAt: 110, stock: 120 },
    { slug: 'retail-track-light-30w', title: 'Retail Track Light 30W', sku: 'WS-TRK-30', cat: 'commercial-lighting', brand: 'havells', origin: 'Indian', images: ['/img/products/catalog/retail-track-light.jpg'], attrs: { wattage: '50W', ip_rating: 'IP54', voltage: '220V', color_temperature: '3000K' }, price: 76, stock: 85 },
    { slug: 'emergency-exit-light-ip65', title: 'Emergency Exit Light IP65', sku: 'WS-EMG-IP65', cat: 'commercial-lighting', brand: 'legrand', origin: 'German', images: ['/img/products/catalog/emergency-exit-light.jpg'], attrs: { wattage: '50W', ip_rating: 'IP65', voltage: '230V', color_temperature: '5000K' }, price: 125, stock: 62 },
    { slug: 'monocrystalline-solar-panel-550wp', title: 'Monocrystalline Solar Panel 550Wp', sku: 'WS-SP-550', cat: 'solar-equipment', brand: 'chint', origin: 'Chinese', images: ['/img/products/catalog/mono-solar-panel-550.jpg', '/img/products/catalog/mono-solar-panel-400-rear.jpg'], attrs: { wattage_wp: '550Wp', cell_type: 'Mono' }, price: 620, compareAt: 720, stock: 60 },
    { slug: 'bifacial-solar-module-550wp', title: 'Bifacial Solar Module 550Wp', sku: 'WS-BF-550', cat: 'solar-equipment', brand: 'longi-solar', origin: 'Chinese', images: ['/img/products/catalog/bifacial-solar-module-550.jpg', '/img/products/catalog/bifacial-solar-module-550-rear.jpg'], attrs: { wattage_wp: '550Wp', cell_type: 'Bifacial' }, price: 710, compareAt: 790, stock: 40 },
    { slug: 'hybrid-inverter-5kw', title: 'Hybrid Solar Inverter 5kW', sku: 'WS-INV-5K', cat: 'solar-equipment', brand: 'sma-solar', origin: 'German', images: ['/img/products/catalog/hybrid-inverter-5kw.jpg', '/img/products/catalog/hybrid-inverter-5kw-connections.jpg'], attrs: { wattage_wp: '400Wp', cell_type: 'Mono' }, price: 3180, compareAt: 3490, stock: 16 },
    { slug: 'lithium-battery-module-5kwh', title: 'Lithium Battery Module 5kWh', sku: 'WS-BAT-5K', cat: 'solar-equipment', brand: 'chint', origin: 'Chinese', images: ['/img/products/catalog/lithium-battery-5kwh.jpg', '/img/products/catalog/lithium-battery-5kwh-connections.jpg'], attrs: { wattage_wp: '300Wp', cell_type: 'Mono' }, price: 4450, stock: 18 },
    { slug: 'monocrystalline-solar-panel-400wp', title: 'Monocrystalline Solar Panel 400Wp', sku: 'WS-SP-400', cat: 'solar-equipment', brand: 'longi-solar', origin: 'Chinese', images: ['/img/products/catalog/mono-solar-panel-400.jpg', '/img/products/catalog/mono-solar-panel-400-rear.jpg'], attrs: { wattage_wp: '400Wp', cell_type: 'Mono' }, price: 475, compareAt: 540, stock: 72 },
    { slug: 'mppt-charge-controller-80a', title: 'MPPT Solar Charge Controller 80A', sku: 'WS-MPPT-80', cat: 'solar-equipment', brand: 'chint', origin: 'Chinese', images: ['/img/products/catalog/mppt-charge-controller.jpg'], attrs: { wattage_wp: '300Wp', cell_type: 'Mono' }, price: 530, compareAt: 610, stock: 38 },
    { slug: 'three-phase-string-inverter-10kw', title: 'Three-Phase String Inverter 10kW', sku: 'WS-INV-10K', cat: 'solar-equipment', brand: 'sma-solar', origin: 'German', images: ['/img/products/catalog/string-inverter-10kw.jpg'], attrs: { wattage_wp: '550Wp', cell_type: 'Mono' }, price: 5490, compareAt: 6120, stock: 11 },
    { slug: 'wall-mount-lithium-battery-10kwh', title: 'Wall-Mount Lithium Battery 10kWh', sku: 'WS-BAT-10K', cat: 'solar-equipment', brand: 'chint', origin: 'Chinese', images: ['/img/products/catalog/lithium-battery-10kwh.jpg'], attrs: { wattage_wp: '400Wp', cell_type: 'Mono' }, price: 7890, compareAt: 8390, stock: 14 },
    { slug: 'portable-solar-power-station-2kwh', title: 'Portable Solar Power Station 2kWh', sku: 'WS-PWR-2K', cat: 'solar-equipment', brand: 'longi-solar', origin: 'Chinese', images: ['/img/products/catalog/portable-power-station.jpg'], attrs: { wattage_wp: '300Wp', cell_type: 'Mono' }, price: 3690, compareAt: 4100, stock: 20 },
    { slug: 'ip68-cable-gland-kit', title: 'IP68 Cable Gland Kit', sku: 'WS-GLD-IP68', cat: 'wiring-accessories', brand: 'legrand', origin: 'German', images: ['/img/products/catalog/ip68-cable-gland-kit.jpg'], attrs: { rating: '32A', voltage: '400V' }, price: 32, compareAt: 39, stock: 240 },
    { slug: 'mc4-connector-pair', title: 'MC4 Solar Connector Pair', sku: 'WS-MC4-P', cat: 'wiring-accessories', brand: 'chint', origin: 'Chinese', images: ['/img/products/catalog/mc4-connector-pair.jpg'], attrs: { rating: '32A', voltage: '400V' }, price: 18, stock: 430 },
    { slug: 'industrial-junction-box-ip66', title: 'Industrial Junction Box IP66', sku: 'WS-JB-IP66', cat: 'wiring-accessories', brand: 'schneider-electric', origin: 'German', images: ['/img/products/catalog/industrial-junction-box.jpg'], attrs: { rating: '63A', voltage: '400V' }, price: 115, compareAt: 140, stock: 95 },
    { slug: 'mcb-32a-double-pole', title: 'MCB 32A Double Pole', sku: 'WS-MCB-32', cat: 'power-control', brand: 'siemens', origin: 'German', images: ['/img/products/catalog/mcb-double-pole.jpg'], attrs: { rating: '32A', voltage: '400V' }, price: 79, compareAt: 92, stock: 210 },
    { slug: 'distribution-board-12-way', title: 'Distribution Board 12-Way', sku: 'WS-DB-12', cat: 'power-control', brand: 'schneider-electric', origin: 'German', images: ['/img/products/catalog/distribution-board.jpg'], attrs: { rating: '63A', voltage: '400V' }, price: 385, stock: 34 },
    { slug: 'surge-protection-device-63a', title: 'Surge Protection Device 63A', sku: 'WS-SPD-63', cat: 'power-control', brand: 'abb', origin: 'German', images: ['/img/products/catalog/surge-protection-device.jpg'], attrs: { rating: '63A', voltage: '400V' }, price: 168, compareAt: 199, stock: 52 },
    { slug: 'xlpe-power-cable-10mm', title: 'XLPE Power Cable 10mm2 / 100m', sku: 'WS-XLPE-10', cat: 'cables-wiring', brand: 'polycab', origin: 'Indian', images: ['/img/products/catalog/xlpe-power-cable.jpg'], attrs: { size: '10mm2', length: '100m' }, price: 690, compareAt: 770, stock: 31 },
    { slug: 'solar-dc-cable-6mm', title: 'Solar DC Cable 6mm2 / 100m', sku: 'WS-DC-6', cat: 'cables-wiring', brand: 'polycab', origin: 'Indian', images: ['/img/products/catalog/solar-dc-cable.jpg'], attrs: { size: '6mm2', length: '100m' }, price: 415, stock: 75 },
    { slug: 'solar-mounting-rail-kit', title: 'Solar Mounting Rail Kit', sku: 'WS-RAIL-KIT', cat: 'renewable-accessories', brand: 'longi-solar', origin: 'Chinese', images: ['/img/products/catalog/solar-mounting-rail.jpg'], attrs: { rating: '32A', voltage: '400V' }, price: 245, compareAt: 290, stock: 58 },
    { slug: 'dc-isolator-switch-32a', title: 'DC Isolator Switch 32A', sku: 'WS-ISO-32', cat: 'renewable-accessories', brand: 'abb', origin: 'German', images: ['/img/products/catalog/dc-isolator-switch.jpg'], attrs: { rating: '32A', voltage: '400V' }, price: 138, stock: 44 },
    { slug: 'warehouse-lighting-bundle', title: 'Warehouse Lighting Starter Bundle', sku: 'WS-BDL-LGT', cat: 'deals', brand: 'wipro-lighting', origin: 'Indian', images: ['/img/products/catalog/warehouse-lighting-bundle.jpg'], attrs: { rating: '63A', voltage: '230V' }, price: 1260, compareAt: 1540, stock: 12 },
    { slug: 'solar-rooftop-install-kit', title: 'Solar Rooftop Install Bundle', sku: 'WS-BDL-SOL', cat: 'deals', brand: 'longi-solar', origin: 'Chinese', images: ['/img/products/catalog/solar-rooftop-bundle.jpg'], attrs: { rating: '32A', voltage: '400V' }, price: 2780, compareAt: 3190, stock: 9 },
  ];
  for (const [index, item] of sampleProducts.entries()) {
    await seedProduct({
      slug: item.slug,
      title: item.title,
      skuBase: item.sku,
      categoryId: categoryMap[item.cat],
      brandSlug: item.brand,
      brandOrigin: item.origin,
      imageUrls: item.images,
      featured: index < 10,
      bestSeller: index % 3 === 0,
      totalSold: 320 - index * 11,
      variants: [
        { sku: `${item.sku}-STD`, attributes: item.attrs, weightKg: item.cat === 'solar-equipment' ? 22 : 4, price: item.price, compareAt: item.compareAt, stock: item.stock, baseShip: 12, perKg: 2 },
      ],
    });
  }

  // ── Coupon + FAQ ──
  await prisma.coupon.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: { code: 'WELCOME10', description: '10% off your first order', discountType: 'percentage', discountValue: 10, maxDiscountCap: 100, usageLimitPerUser: 1 },
  });
  const faqs = [
    { categoryName: 'Orders & Shipping', question: 'How do I track my order?', answer: 'Use the Track Order page with your order number and email, or sign in to view orders under My Account → Orders. Once shipped, the carrier deep-link is also available on the order detail page.' },
    { categoryName: 'Orders & Shipping', question: 'How long does delivery take?', answer: 'UAE: 2–5 business days. Kenya: 5–10 business days. Germany: 3–7 business days. International freight quoted per RFQ.' },
    { categoryName: 'Orders & Shipping', question: 'Why must I verify my shipping address?', answer: 'After payment we email a verification link to confirm the address. This prevents fraud and typos. Orders do not ship until the link is clicked.' },
    { categoryName: 'B2B Quotes', question: 'How do bulk quotes work?', answer: 'Add items to your Quote Basket and submit an RFQ — our sales team responds within one business hour and issues a formal PDF invoice the same business day.' },
    { categoryName: 'B2B Quotes', question: 'How are payment terms agreed?', answer: 'Submit the requested delivery and commercial details in the RFQ. Approved terms, if offered, are stated on the formal quotation.' },
    { categoryName: 'Payments', question: 'Which payment methods are accepted?', answer: 'Stripe card checkout is available for retail purchases. Formal quotations convert to bank-transfer orders after acceptance.' },
    { categoryName: 'Payments', question: 'When is my card charged?', answer: 'For Stripe/PayTabs, the card is charged on order confirmation. For bank transfer, the order is created in pending state and confirmed by our finance team once funds arrive.' },
    { categoryName: 'Certifications', question: 'How can I confirm product certification?', answer: 'Review documents uploaded on each product page and ask sales to confirm any required documentation before purchase.' },
    { categoryName: 'Returns', question: 'What is your return window?', answer: 'Standard 7-day return window for unopened items. Custom-configured and ATEX-rated products are non-returnable. See Returns Policy for the full list.' },
  ];
  for (const [i, f] of faqs.entries()) {
    await prisma.faqEntry.upsert({ where: { id: i + 1 }, update: f, create: { ...f, sortOrder: i } });
  }

  // ── Default banners (hero + strip) ──
  const banners = [
    {
      placement: 'home_hero',
      eyebrow: 'Industrial · Live',
      title: 'Built for the work site. Sourced for the spec sheet.',
      subtitle: 'Industrial lighting, solar arrays, MCBs and cabling with regional catalog pricing and formal quotation support.',
      imageUrl: '/img/banners/cms/industrial-hero.jpg',
      ctaLabel: 'Explore the Catalog',
      linkUrl: '/ae/categories/industrial-lighting',
      tone: 'blue',
      sortOrder: 0,
      isActive: true,
    },
    {
      placement: 'home_hero',
      eyebrow: 'Solar · 2026',
      title: 'Solar that pays back. Engineered to scale.',
      subtitle: 'Panels, hybrid inverters, lithium banks and mounting systems — sized for any project from rooftop to utility.',
      imageUrl: '/img/banners/cms/solar-hero.jpg',
      ctaLabel: 'Shop Solar',
      linkUrl: '/ae/categories/solar-equipment',
      tone: 'mint',
      sortOrder: 1,
      isActive: true,
    },
    {
      placement: 'home_hero',
      eyebrow: 'B2B · Same Day',
      title: 'Bulk pricing. Real documentation. Zero guesswork.',
      subtitle: 'Submit an RFQ — receive a formal PDF invoice the same business day with full certifications.',
      imageUrl: '/img/banners/cms/b2b-hero.jpg',
      ctaLabel: 'Submit RFQ',
      linkUrl: '/ae/quote-basket',
      tone: 'violet',
      sortOrder: 2,
      isActive: true,
    },
    {
      placement: 'home_strip',
      eyebrow: 'Oil & Gas',
      title: 'Hazardous-Area Lighting',
      imageUrl: '/img/banners/cms/hazardous-lighting.jpg',
      ctaLabel: 'View ATEX SKUs',
      linkUrl: '/ae/categories/industrial-lighting?brandOrigin=German',
      tone: 'blue',
      sortOrder: 0,
      isActive: true,
    },
    {
      placement: 'home_strip',
      eyebrow: 'Renewable',
      title: 'Solar EPC Stack',
      imageUrl: '/img/banners/cms/solar-hero.jpg',
      ctaLabel: 'See Solar',
      linkUrl: '/ae/categories/solar-equipment',
      tone: 'mint',
      sortOrder: 1,
      isActive: true,
    },
    {
      placement: 'home_strip',
      eyebrow: 'Real Estate',
      title: 'Commercial Lighting',
      imageUrl: '/img/banners/cms/industrial-hero.jpg',
      ctaLabel: 'View Builds',
      linkUrl: '/ae/categories/commercial-lighting',
      tone: 'violet',
      sortOrder: 2,
      isActive: true,
    },
    {
      placement: 'home_strip',
      eyebrow: 'Factory',
      title: 'Power & Control',
      imageUrl: '/img/banners/cms/power-control.jpg',
      ctaLabel: 'Browse',
      linkUrl: '/ae/categories/power-control',
      tone: 'yellow',
      sortOrder: 3,
      isActive: true,
    },
    {
      placement: 'home_mosaic',
      eyebrow: 'Featured / Q2',
      title: 'Industrial Lighting Drop 2026',
      imageUrl: '/img/banners/cms/hazardous-lighting.jpg',
      ctaLabel: 'Shop the Drop',
      linkUrl: '/ae/categories/industrial-lighting',
      tone: 'blue',
      sortOrder: 0,
      isActive: true,
    },
    {
      placement: 'home_mosaic',
      eyebrow: 'B2B',
      title: 'Bulk Quote Requests',
      imageUrl: '/img/banners/cms/b2b-hero.jpg',
      ctaLabel: 'Submit RFQ',
      linkUrl: '/ae/quote-basket',
      tone: 'yellow',
      sortOrder: 1,
      isActive: true,
    },
    {
      placement: 'home_mosaic',
      eyebrow: 'Renewable',
      title: 'Solar Equipment',
      imageUrl: '/img/banners/cms/solar-hero.jpg',
      ctaLabel: 'Explore Solar',
      linkUrl: '/ae/categories/solar-equipment',
      tone: 'mint',
      sortOrder: 2,
      isActive: true,
    },
    {
      placement: 'home_promo',
      eyebrow: 'Limited / Q2',
      title: 'Solar bulk orders / Save 18%',
      imageUrl: '/img/banners/cms/solar-hero.jpg',
      ctaLabel: 'Shop Solar Deals',
      linkUrl: '/ae/categories/solar-equipment',
      tone: 'blue',
      sortOrder: 0,
      isActive: true,
    },
    {
      placement: 'home_promo',
      eyebrow: 'Now Live',
      title: 'AI Solar Site Planner',
      imageUrl: '/img/banners/cms/support-rfq.jpg',
      ctaLabel: 'Try the Planner',
      linkUrl: '/ae/solar-planner',
      tone: 'yellow',
      sortOrder: 1,
      isActive: true,
    },
    {
      placement: 'promo',
      eyebrow: 'Project Pricing',
      title: 'Need bulk pricing? Build an RFQ.',
      imageUrl: '/img/banners/cms/b2b-hero.jpg',
      ctaLabel: 'Submit RFQ',
      linkUrl: '/ae/quote-basket',
      tone: 'blue',
      sortOrder: 0,
      isActive: true,
    },
    {
      placement: 'promo',
      eyebrow: 'Solar Savings',
      title: 'Solar project deals / Save up to 18%',
      imageUrl: '/img/banners/cms/solar-hero.jpg',
      ctaLabel: 'Shop Solar',
      linkUrl: '/ae/categories/solar-equipment',
      tone: 'mint',
      sortOrder: 1,
      isActive: true,
    },
    {
      placement: 'sidebar',
      eyebrow: 'B2B',
      title: 'Buying 10+ units? Get project pricing.',
      imageUrl: '/img/banners/cms/b2b-hero.jpg',
      ctaLabel: 'Convert to RFQ',
      linkUrl: '/ae/quote-basket',
      tone: 'dark',
      sortOrder: 0,
      isActive: true,
    },
    {
      placement: 'sidebar',
      eyebrow: 'Support',
      title: 'Talk with our project team.',
      imageUrl: '/img/banners/cms/support-rfq.jpg',
      ctaLabel: 'Contact Support',
      linkUrl: '/ae/contact',
      tone: 'blue',
      sortOrder: 1,
      isActive: true,
    },
    {
      placement: 'category',
      eyebrow: 'Procurement Officers',
      title: 'Building a project? Get a Bulk Quote.',
      imageUrl: '/img/banners/cms/power-control.jpg',
      ctaLabel: 'Submit RFQ',
      linkUrl: '/ae/quote-basket',
      tone: 'dark',
      sortOrder: 0,
      isActive: true,
    },
    {
      placement: 'pdp',
      eyebrow: 'Bulk Pricing',
      title: 'Need 10+ units? Get a Bulk Quote.',
      imageUrl: '/img/banners/cms/power-control.jpg',
      ctaLabel: 'Add to Quote Basket',
      linkUrl: '/ae/quote-basket',
      tone: 'dark',
      sortOrder: 0,
      isActive: true,
    },
  ];
  for (const [i, b] of banners.entries()) {
    // Upsert by deterministic id so re-runs are idempotent.
    await prisma.banner.upsert({
      where: { id: i + 1 },
      update: b,
      create: { ...b, countryIds: [] },
    });
  }

  // ── Default legal pages ──
  const legalPages: Array<{ slug: string; title: string; intro: string; updatedLabel: string; sections: { heading: string; paragraphs: string[] }[] }> = [
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      updatedLabel: 'May 2026',
      intro: 'What data we collect, how we use it, and how you can manage it. Plain English.',
      sections: [
        { heading: 'Data we collect', paragraphs: ['Account details (name, email, phone) when you register.', 'Order/quote data (line items, address, contact) when you transact.', 'Anonymous analytics (page views, device, IP-derived country) to improve the site.'] },
        { heading: 'How we use it', paragraphs: ['Fulfill orders, send invoices, ship goods.', 'Respond to RFQs and support requests.', 'Send transactional emails (order status, verification, password reset).', 'Email marketing — only with explicit opt-in.'] },
        { heading: 'Storage & security', paragraphs: ['Passwords are bcrypt-hashed (cost 12). We never store raw card data — payments go through Stripe/PayTabs (PCI DSS).', 'JWT cookies are HttpOnly, Secure, SameSite=Strict.', 'All traffic is TLS 1.3 in transit.'] },
        { heading: 'Cookies', paragraphs: ['Strictly necessary cookies for auth and cart. Optional analytics cookies require consent.'] },
        { heading: 'Sharing with third parties', paragraphs: ['Payment processors (Stripe, PayTabs), shipping carriers, and tax authorities where legally required. Never sold or shared for marketing.'] },
        { heading: 'Your rights', paragraphs: ['Access, correction, deletion and portability of your data — write to privacy@wattsstore.com.'] },
        { heading: 'Retention', paragraphs: ['Order records are kept for 7 years (legal/tax requirement). Account data is deleted on request unless tied to open orders or warranty claims.'] },
        { heading: 'Contact', paragraphs: ['Questions? Email privacy@wattsstore.com or our Data Protection Officer at dpo@wattsstore.com.'] },
      ],
    },
    {
      slug: 'terms-of-service',
      title: 'Terms of Service',
      updatedLabel: 'May 2026',
      intro: 'The rules that govern your use of WattsStore.',
      sections: [
        { heading: 'Acceptance', paragraphs: ['By browsing or purchasing on wattsstore.com you agree to these terms. If you do not agree, do not use the service.'] },
        { heading: 'Account', paragraphs: ['You are responsible for activity under your account. Keep your password secret.'] },
        { heading: 'Orders & pricing', paragraphs: ['Prices are listed in the regional currency shown. We reserve the right to refuse or cancel orders with manifest pricing errors.', 'B2B quotes are valid for the period stated on the quote (typically 30 days).'] },
        { heading: 'Shipping & delivery', paragraphs: ['Shipping costs calculated at checkout. Orders ship after shipping-address verification.'] },
        { heading: 'Returns & warranty', paragraphs: ['Standard 7-day return window for unopened items. Custom-configured / ATEX-rated SKUs are non-returnable.', 'Manufacturer warranty applies per product (typically 2 years).'] },
        { heading: 'Acceptable use', paragraphs: ['No scraping, automated checkout, or fraudulent payment instruments.'] },
        { heading: 'Intellectual property', paragraphs: ['All content (text, images, code, layout) is © WattsStore FZE.'] },
        { heading: 'Liability', paragraphs: ['WattsStore is not liable for consequential or indirect damages. Maximum liability is the order value.'] },
        { heading: 'Governing law', paragraphs: ['These terms are governed by the laws of the UAE. Disputes are resolved in Dubai courts unless a mandatory consumer-protection law states otherwise.'] },
      ],
    },
    {
      slug: 'returns-policy',
      title: 'Returns & Warranty',
      updatedLabel: 'May 2026',
      intro: "How to return items, when items can't be returned, and how warranty claims work.",
      sections: [
        { heading: 'Window', paragraphs: ['Standard 7-day return window from delivery for unopened, undamaged items in original packaging.'] },
        { heading: 'Non-returnable items', paragraphs: ['Custom-configured products.', 'ATEX-rated and IECEx-rated explosive-atmosphere products.', 'Items showing signs of installation or use.'] },
        { heading: 'How to initiate', paragraphs: ['Email returns@wattsstore.com with your order number and reason. We respond within 1 business hour.'] },
        { heading: 'Refund timeline', paragraphs: ['Refunds processed to the original payment method within 5–10 business days of receiving the returned goods.'] },
        { heading: 'Damaged in transit', paragraphs: ['Photograph the package before opening if there is visible damage. Email photos to support@wattsstore.com within 48 hours.'] },
        { heading: 'Manufacturer warranty', paragraphs: ['Most products carry a 2-year manufacturer warranty. Solar panels: 5-year product / 25-year linear performance.'] },
        { heading: 'B2B orders', paragraphs: ['Bulk-quote orders carry contract-specific terms. Refer to your formal PDF invoice.'] },
      ],
    },
    {
      slug: 'shipping-policy',
      title: 'Shipping Policy',
      updatedLabel: 'May 2026',
      intro: 'Lead times, costs, regional coverage and the shipping-verification step.',
      sections: [
        { heading: 'Where we ship', paragraphs: ['UAE · Kenya · Germany · plus international freight on request for project-scale orders.'] },
        { heading: 'Lead times', paragraphs: ['UAE: 2–5 business days. Kenya: 5–10 business days. Germany: 3–7 business days.'] },
        { heading: 'Cost', paragraphs: ['Calculated per item at checkout based on base shipping cost + weight × per-kg adder. Free delivery on qualifying orders.'] },
        { heading: 'Shipping verification', paragraphs: ['After payment, you will receive an email with a one-click link to verify the shipping address. Orders do not ship until this link is clicked.'] },
        { heading: 'Tracking', paragraphs: ['Once dispatched, you receive an email with the carrier and tracking number. Also available via Track Order or My Account.'] },
        { heading: 'Failed delivery', paragraphs: ['If a courier cannot deliver after 3 attempts, the order returns to our warehouse and we refund minus return shipping.'] },
        { heading: 'Bulk / project freight', paragraphs: ['For pallet- or container-scale orders, freight is quoted as part of the RFQ.'] },
      ],
    },
    {
      slug: 'cookie-policy',
      title: 'Cookie Policy',
      updatedLabel: 'May 2026',
      intro: 'Which cookies we use and what they do.',
      sections: [
        { heading: 'Strictly necessary', paragraphs: ['Session cookies for login state, cart contents, and CSRF protection. These cannot be disabled.'] },
        { heading: 'Functional', paragraphs: ['Region selection, recently viewed products, locale preference.'] },
        { heading: 'Analytics', paragraphs: ['Aggregated usage data (page views, search queries) — anonymised and opt-in in regulated regions.'] },
        { heading: 'Managing cookies', paragraphs: ['You can clear cookies from your browser settings. Disabling strictly necessary cookies will break login and cart.'] },
      ],
    },
    {
      slug: 'warranty-policy',
      title: 'Warranty Policy',
      updatedLabel: 'May 2026',
      intro: 'Manufacturer warranty terms by category and how to make a claim.',
      sections: [
        { heading: 'Default warranty', paragraphs: ['Most products carry a 2-year manufacturer warranty against defects in materials and workmanship.'] },
        { heading: 'Solar', paragraphs: ['Panels: 5-year product / 25-year linear performance. Inverters: 5–10 years per model. Batteries: 5 years / 6,000 cycles.'] },
        { heading: 'Lighting', paragraphs: ['Industrial luminaires: 3 years. Commercial LED: 2 years. Drivers: 2 years.'] },
        { heading: 'Making a claim', paragraphs: ['Email warranty@wattsstore.com with the order number, serial number, and a description of the defect. We coordinate the RMA with the manufacturer.'] },
      ],
    },
  ];
  legalPages.push({
    slug: 'about',
    title: 'About WattsStore',
    updatedLabel: 'May 2026',
    intro: 'An industrial catalog engineered for procurement: certified electrical, lighting and solar products across four regional markets.',
    sections: [
      { heading: 'Built for the work site', paragraphs: ['WattsStore began as a procurement studio for MEP consultants who needed reliable technical documents and regional stock in one place.', 'Every catalog item is selected for practical field use, from hazardous-area luminaires to commercial solar systems.'] },
      { heading: 'Original documentation', paragraphs: ['Certifications, specification sheets and formal invoicing belong in the buying journey, not in a follow-up email chase. We make that information part of every order and quote workflow.'] },
      { heading: 'Regional inventory', paragraphs: ['Pricing, tax, lead times and available stock are scoped to UAE, Kenya, Germany and Global markets so buyers can order with realistic delivery expectations.'] },
      { heading: 'Procurement support', paragraphs: ['Procurement teams can submit bulk RFQs for line-item pricing and formal PDF quotations from the sales desk.'] },
    ],
  });

  for (const p of legalPages) {
    await prisma.legalPage.upsert({
      where: { slug: p.slug },
      update: { title: p.title, intro: p.intro, sections: p.sections, updatedLabel: p.updatedLabel, isPublished: true },
      create: { slug: p.slug, title: p.title, intro: p.intro, sections: p.sections, updatedLabel: p.updatedLabel, isPublished: true },
    });
  }

  // -- Homepage testimonials --
  const testimonials = [
    { name: 'Rajeev Menon', role: 'Procurement Lead', company: 'ADNOC Onshore', quote: 'Same-day quotes and certified documentation make industrial lighting procurement straightforward.', rating: 5, sortOrder: 0 },
    { name: 'Maria Hofmann', role: 'MEP Consultant', company: 'Berlin', quote: 'The catalog depth and regional stock visibility make solar specification work much faster.', rating: 5, sortOrder: 1 },
    { name: 'James Otieno', role: 'Site Manager', company: 'Konza Technopolis', quote: 'Quality matches the datasheet every time, across lighting and switchgear orders.', rating: 4.8, sortOrder: 2 },
  ];
  for (const [i, testimonial] of testimonials.entries()) {
    await prisma.testimonial.upsert({
      where: { id: i + 1 },
      update: { ...testimonial, isActive: true, isFeatured: true },
      create: { ...testimonial, countryIds: [], isActive: true, isFeatured: true },
    });
  }

  // -- Media library starter assets --
  const media = [
    { url: '/img/banners/cms/industrial-hero.jpg', filename: 'industrial-hero.jpg', mimeType: 'image/jpeg', folder: 'banners', altText: 'Industrial lighting hero' },
    { url: '/img/banners/cms/solar-hero.jpg', filename: 'solar-hero.jpg', mimeType: 'image/jpeg', folder: 'banners', altText: 'Solar equipment hero' },
    { url: '/img/banners/cms/b2b-hero.jpg', filename: 'b2b-hero.jpg', mimeType: 'image/jpeg', folder: 'banners', altText: 'B2B quote hero' },
    { url: '/img/banners/cms/hazardous-lighting.jpg', filename: 'hazardous-lighting.jpg', mimeType: 'image/jpeg', folder: 'banners', altText: 'Hazardous area lighting' },
    { url: '/img/banners/cms/power-control.jpg', filename: 'power-control.jpg', mimeType: 'image/jpeg', folder: 'banners', altText: 'Power control cabinets' },
    { url: '/img/banners/cms/support-rfq.jpg', filename: 'support-rfq.jpg', mimeType: 'image/jpeg', folder: 'banners', altText: 'Support and RFQ' },
    { url: '/img/blog/lighting.svg', filename: 'lighting.svg', mimeType: 'image/svg+xml', folder: 'blog', altText: 'Lighting editorial cover' },
  ];
  for (const [i, asset] of media.entries()) {
    await prisma.mediaAsset.upsert({
      where: { id: i + 1 },
      update: asset,
      create: { ...asset, tags: ['seed'] },
    });
  }

  // -- Public site settings consumed by the shared storefront layout --
  const settings = {
    announcementBar: { enabled: true, items: ['Live Regional Product Catalog', 'Request Formal B2B Pricing', 'Manage Products and Content in Admin'] },
    contact: { phone: '+971 50 000 0000', whatsapp: '971500000000', email: 'hello@wattsstore.com', salesEmail: 'sales@wattsstore.com', headquarters: 'Dubai Free Zone, UAE' },
    trustBadges: [
      { label: 'Regional Catalog', image: '/img/trust/delivery.svg' },
      { label: 'Product Documents', image: '/img/trust/warranty.svg' },
      { label: 'B2B Quotes', image: '/img/trust/quote.svg' },
      { label: 'Admin Managed', image: '/img/trust/certified.svg' },
      { label: 'Secure Checkout', image: '/img/trust/secure.svg' },
      { label: 'Multiple Markets', image: '/img/trust/regions.svg' },
    ],
    footer: { description: 'Industrial electrical, lighting and solar equipment catalog with regional pricing and B2B quotation workflows.', social: {}, certifications: [] },
    offerPopup: {
      enabled: false,
      title: 'Need project pricing?',
      body: 'Send your cart to RFQ and our sales team will prepare a formal quotation.',
      ctaLabel: 'Request Quote',
      ctaUrl: '/ae/quote-basket',
      frequencyHours: 24,
    },
    quoteAutomation: {
      enabled: true,
      autoSend: true,
      maxAutoValue: 50000,
      validityDays: 30,
      discountTiers: [
        { minQuantity: 100, discountPercent: 10 },
        { minQuantity: 25, discountPercent: 5 },
        { minQuantity: 10, discountPercent: 2 },
      ],
    },
    orderDocuments: {
      autoGenerateInvoiceOnOrder: true,
      autoGenerateCourierReceiptOnShipment: true,
      defaultCourier: 'Aramex',
      receiptFooter: 'Generated by WattsStore. Use this document for warehouse handover and courier dispatch.',
      showPricesOnCourierReceipt: false,
    },
    taxSettings: {
      countryRates: countries.map((country) => ({ countryCode: country.countryCode, taxClass: 'standard', taxRate: country.vatRate, taxLabel: country.countryCode === 'DE' ? 'MwSt' : 'VAT', isInclusive: false })),
    },
    shippingRates: {
      countryRates: countries.map((country) => defaultShippingRate(country.countryCode, country.currencyCode)),
    },
    localization: {
      autoDetectCountry: true,
      defaultRegion: 'ae',
      supportedLanguages: [
        { code: 'en', label: 'English' },
        { code: 'ar', label: 'Arabic' },
        { code: 'fr', label: 'French' },
        { code: 'de', label: 'German' },
      ],
    },
  };
  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }

  // Keep CMS demo data clean for handoff: admins can add real content later.
  await prisma.faqEntry.deleteMany();
  await prisma.blogPost.deleteMany();
  await prisma.legalPage.deleteMany();
  await prisma.testimonial.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.forumReply.deleteMany();
  await prisma.forumThread.deleteMany();

  console.log('✅ Seed complete. Admin: admin@wattsstore.com / Admin@12345');
  console.log(`   • ${sampleProducts.length} products · ${banners.length} banners · clean CMS demo tables · ${demoUsers.length + 1} customer accounts`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
