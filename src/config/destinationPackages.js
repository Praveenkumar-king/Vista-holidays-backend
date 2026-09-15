/**
 * destinationPackages.js
 * 
 * Central catalog of packages and trusted daily prices for Vista Holidays.
 * Server is authoritative for pricing calculation.
 */

export const DESTINATION_BASE_PRICES = {
  paris: 5000,
  tokyo: 5500,
  dubai: 6000,
  bali: 3500,
  london: 5500,
  singapore: 5000,
  rome: 4800,
  barcelona: 4500,
  'new-york': 6500,
  bangkok: 3200,
  goa: 3000,
  jaipur: 2800
};

export const DEFAULT_DAILY_PRICE = 5000;

export const PACKAGE_TIERS = [
  {
    id: 'standard',
    name: 'Standard Explorer',
    multiplier: 1.0,
    badge: 'Popular',
    description: 'Comfortable stay with guided landmark tours and daily complimentary breakfast.',
    features: [
      '3-Star Boutique Hotel',
      'Guided City Walking Tour',
      'Complimentary Breakfast',
      '24/7 Digital Concierge'
    ]
  },
  {
    id: 'premium',
    name: 'Premium Comfort',
    multiplier: 1.6,
    badge: 'Recommended',
    description: 'Upgraded 4-star lodging, dedicated private transfers, and curated dinner excursions.',
    features: [
      '4-Star Premium Resort / Hotel',
      'Dedicated Chauffeur Airport Transfers',
      'Priority Fast-Track Landmark Passes',
      'All Daily Meals Included'
    ]
  },
  {
    id: 'luxury',
    name: 'Luxury Vista Signature',
    multiplier: 2.5,
    badge: 'VIP Elite',
    description: 'Ultimate 5-star experience with bespoke private guide, private yacht or safari excursion.',
    features: [
      '5-Star Luxury Suite / Villa',
      'Private Chauffeur Throughout Stay',
      'VIP Access & Michelin-Starred Dining',
      'Personal Dedicated Travel Host'
    ]
  }
];

/**
 * Get available packages with trusted daily prices for a given destination ID
 * @param {string} destinationId
 * @returns {Array} List of package options with calculated daily rates in INR
 */
export const getPackagesForDestination = (destinationId) => {
  const normId = (destinationId || '').toLowerCase().trim();
  const base = DESTINATION_BASE_PRICES[normId] || DEFAULT_DAILY_PRICE;

  return PACKAGE_TIERS.map((tier) => {
    const pricePerDay = Math.round((base * tier.multiplier) / 100) * 100;
    return {
      id: tier.id,
      name: tier.name,
      badge: tier.badge,
      description: tier.description,
      features: tier.features,
      pricePerDay,
      currency: 'INR'
    };
  });
};

/**
 * Authoritatively calculates booking totals
 * @param {object} params
 * @param {string} params.destinationId
 * @param {string} params.packageId
 * @param {number} params.days
 * @param {number} params.members
 * @returns {object} { pricePerDay, days, members, subtotal, tax, totalAmount, currency, packageName }
 */
export const calculateBookingPrice = ({
  destinationId,
  packageId = 'standard',
  days = 1,
  members = 1
}) => {
  const safeDays = Math.max(1, parseInt(days, 10) || 1);
  const safeMembers = Math.max(1, parseInt(members, 10) || 1);

  const packages = getPackagesForDestination(destinationId);
  const matched = packages.find((p) => p.id === packageId) || packages[0];

  const pricePerDay = matched.pricePerDay;
  const subtotal = pricePerDay * safeDays * safeMembers;
  const tax = 0; // Transparent zero hidden fees, or configure e.g. Math.round(subtotal * 0.05)
  const totalAmount = subtotal + tax;

  return {
    packageId: matched.id,
    packageName: matched.name,
    pricePerDay,
    days: safeDays,
    members: safeMembers,
    subtotal,
    tax,
    totalAmount,
    currency: 'INR'
  };
};

export default {
  DESTINATION_BASE_PRICES,
  PACKAGE_TIERS,
  getPackagesForDestination,
  calculateBookingPrice
};
