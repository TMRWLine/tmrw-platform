const catalogue = {
  drop_mt_2200: {
    title: 'MT-22 Heavyweight Contrast Hood', athleteName: 'Marcus Thorne', clubName: 'Bankstown Bruins',
    collabPartner: 'Earls Collection', priceAud: 180, baseCostAud: 45, collabRoyaltyPct: 15,
    frontImageUrl: 'https://images.unsplash.com/photo-1556905055-8f358a7a47b2?auto=format&fit=crop&w=1000&q=85',
  },
  drop_sb_2095: {
    title: 'SB Track Club Vintage Wash Tee', athleteName: 'Sienna Blake', clubName: 'Manly Warringah Athletics',
    priceAud: 95, baseCostAud: 25, collabRoyaltyPct: 0,
    frontImageUrl: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=1000&q=85',
  },
};

export function catalogueItems(items) {
  if (!Array.isArray(items) || items.length < 1 || items.length > 50) throw new Error('Invalid capsule items');
  return items.map((item) => {
    const sku = item?.sku ?? item?.id;
    if (typeof sku !== 'string' || !Object.hasOwn(catalogue, sku)) throw new Error('Unknown capsule SKU');
    if (!Number.isInteger(item.qty) || item.qty < 1 || item.qty > 100) throw new Error('Invalid capsule quantity');
    const size = item.size ?? 'L';
    const venuePack = size === '25x VENUE CURVE (3S·8M·9L·5XL)';
    if (venuePack && item.qty % 25 !== 0) throw new Error('Venue packs require multiples of 25 garments');
    if (!venuePack && !['XS', 'S', 'M', 'L', 'XL', 'XXL'].includes(size)) throw new Error('Invalid capsule size');
    return { ...catalogue[sku], id: sku, qty: item.qty, size };
  });
}
