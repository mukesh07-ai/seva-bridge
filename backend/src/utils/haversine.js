/**
 * Haversine Formula — GPS Distance Engine
 * Returns distance in kilometers between two coordinates.
 */
const haversineKm = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
};

/**
 * Calculate booking total amount.
 * Formula: Base Price + (Distance × Rate per KM)
 */
const RATE_PER_KM = 5; // ₹5 per km

const calcTotalAmount = (basePrice, distanceKm) => {
  return parseFloat((basePrice + distanceKm * RATE_PER_KM).toFixed(2));
};

module.exports = { haversineKm, calcTotalAmount };
