'use strict';
const crypto = require('node:crypto');

function fail(code, status = 400) { throw Object.assign(new Error(code), { code, status }); }
// Listings are non-binding advertisements. No reservation or settlement is implied.
function createMarketService({ store, world, changed = () => {} }) {
  async function execute(identity, input) {
    if (!identity?.accountId || !identity.handle) fail('guest_session_required', 401);
    if (!input || typeof input !== 'object' || Array.isArray(input)) fail('invalid_market_operation');
    // Until a two-account transaction exists, neither buys nor offers can succeed.
    if (input.op === 'buy' || input.op === 'offer') fail('market_settlement_unavailable', 503);
    if (input.op === 'list') {
      const listing = input.listing;
      if (!listing || typeof listing !== 'object' || Array.isArray(listing)) fail('invalid_listing');
      const allowed = ['assetId', 'price', 'seller'];
      if (Object.keys(listing).some(key => !allowed.includes(key))) fail('unknown_listing_field');
      if (typeof listing.assetId !== 'string' || !listing.assetId || listing.assetId.length > 200) fail('invalid_asset_id');
      if (!Number.isSafeInteger(listing.price) || listing.price < 1 || listing.price > 2_000_000_000) fail('invalid_price');
      const economy = await store.readEconomy(identity.accountId);
      if (!economy || economy.accountId !== identity.accountId) fail('account_missing', 403);
      let asset, cat;
      for (const [key, kind] of [['items', 'equip'], ['dragons', 'dragon'], ['eggs', 'egg']]) {
        const found = (economy[key] || []).find(row => row.assetId === listing.assetId);
        if (found) { asset = found.data; cat = kind; break; }
      }
      if (!asset) fail('asset_not_owned', 403);
      if (asset.funding !== 'earned') fail('asset_not_transferable', 409);
      if (asset.tradeLocked || asset.dead || asset.old || asset.busy || asset.task || asset.inK || asset.hatching || asset.heirloomId) fail('asset_unavailable', 409);
      if (cat === 'dragon' && asset.equip && Object.values(asset.equip).some(value => value != null)) fail('asset_equipped', 409);
      if (cat === 'equip' && (economy.dragons || []).some(row => Object.values(row.data.equip || {}).some(uid => uid != null && String(uid) === String(asset.uid)))) fail('asset_equipped', 409);
      world.marketListings ||= [];
      if (world.marketListings.some(row => row.assetId === listing.assetId)) fail('asset_already_listed', 409);
      if (world.marketListings.length >= 40) fail('market_full', 409);
      const next = { id: 'mk_' + crypto.randomUUID(), assetId: listing.assetId,
        seller: identity.handle, sellerAccountId: identity.accountId, price: listing.price,
        cat, title: String(asset.name || asset.id || cat).slice(0, 100), settlementReady: false };
      world.marketListings.unshift(next);
      changed({ op: 'list', listing: next });
      return { listing: next, listings: world.marketListings, settlementReady: false };
    }
    if (input.op === 'cancel') {
      if (typeof input.id !== 'string' || !input.id) fail('invalid_listing_id');
      const index = (world.marketListings || []).findIndex(row => row.id === input.id);
      if (index < 0) fail('listing_missing', 404);
      if (world.marketListings[index].sellerAccountId !== identity.accountId) fail('listing_not_owned', 403);
      const [item] = world.marketListings.splice(index, 1);
      changed({ op: 'cancel', id: input.id });
      return { item, listings: world.marketListings };
    }
    fail('unsupported_market_operation');
  }
  return { execute };
}
module.exports = { createMarketService };
