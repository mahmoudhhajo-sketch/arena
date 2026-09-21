// Production uses real time. A local season simulation can retain its advanced
// date without reviving expired effects or making the calendar run backwards.
const NativeDate=Date;
let offset=0,installed=false;
export function synchronizeGameClock(serverNow:number){
 if(!Number.isFinite(serverNow))return;
 offset=serverNow-NativeDate.now();
 if(installed)return;
 const ClockDate=function(this:any,...args:any[]){
  if(!new.target)return new NativeDate(NativeDate.now()+offset).toString();
  return Reflect.construct(NativeDate,args.length?args:[NativeDate.now()+offset],new.target);
 } as unknown as DateConstructor;
 Object.setPrototypeOf(ClockDate,NativeDate);(ClockDate as any).prototype=NativeDate.prototype;
 ClockDate.now=()=>NativeDate.now()+offset;
 globalThis.Date=ClockDate;installed=true;
}
