import assert from 'node:assert/strict';
import {db, initializeDatabase} from '../src/db';
import {placeProxyBid} from '../src/server/proxyBidding';
import {put, record} from '../src/server/records';

await initializeDatabase();
const club = {id: 'bidder', gold: 500_000};

await db.transaction(async tx => {
  const id = 'max-bid-player-auction-replace-bidder';
  await put('max-bid', id, {auctionId: 'auction-replace', clubId: club.id, market: 'player', maxAmount: 100_000}, tx);
  const result = await placeProxyBid({
    tx,
    auction: {id: 'auction-replace', bidderId: club.id, price: 60_000},
    club,
    amount: 120_000,
    mode: 'single',
    auctionKind: 'auction',
  });
  assert.equal(result.replacedOwnMax, true);
  assert.equal(result.auction.price, 120_000);
  assert.equal(await record(id, tx), null);
});

await db.transaction(async tx => {
  const id = 'max-bid-artifact-auction-keep-bidder';
  await put('max-bid', id, {auctionId: 'auction-keep', clubId: club.id, market: 'artifact', maxAmount: 100_000}, tx);
  const result = await placeProxyBid({
    tx,
    auction: {id: 'auction-keep', bidderId: club.id, price: 60_000},
    club,
    amount: 80_000,
    mode: 'single',
    auctionKind: 'artifact-auction',
  });
  assert.equal(result.replacedOwnMax, false);
  assert.ok(await record(id, tx));
});

console.log('PASS: a higher single bid removes the same manager\'s old max bid; a lower single bid keeps it.');
