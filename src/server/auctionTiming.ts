import {randomInt} from 'node:crypto';
// Imperial batches end across two days instead of all at the weekly tick.
// Player-owned auctions retain their promised seven-day duration.
export function imperialAuctionEnd(now:Date|number=new Date(),offsetMinutes=randomInt(0,48*60)){
 return new Date(+now+6*86400000+Math.max(0,Math.min(48*60-1,offsetMinutes))*60000).toISOString();
}
