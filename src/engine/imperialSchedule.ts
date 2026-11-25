import {dailyUpdates} from './calendar';
/** One discipline at each Swedish 06:00 update after the league's last match. */
export function imperialSchedule(finalMatch:Date){
 return dailyUpdates(finalMatch,new Date(+finalMatch+8*86400000)).slice(0,6);
}
