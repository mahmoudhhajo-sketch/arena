export const DIVISION_NAMES = [
'Kejsarserien','Division 1 Östra','Division 1 Södra','Division 1 Västra',
...['Clamklyte','Hillgrunby','Berunia','Skogsmunte','Skeppsvye','Västlycke','Stormråde','Vattnaglod','Skogskymning'].map(n=>'Division 2 '+n),
...['Nordstorme','Glibra','Gloume','Vemjelsen','Stryxlya','Diacomb','Alymoon','Bortomgårda','Tvillingstäderna','Larutappe','Shraknek','Miltrand','Silverlöv','Mossvalla','Hällsund','Rimdal','Askbranten','Gråhammar','Lövvik','Tjärnäs','Korpudden','Eldskreva','Daggdalen','Stenport','Myrgläntan','Vindhult','Skymningsvik'].map(n=>'Division 3 '+n)
];
export const LEGACY_DIVISIONS:Record<string,string>={'Division 1:1':DIVISION_NAMES[1],'Division 2:1':DIVISION_NAMES[4],'Division 3:1':DIVISION_NAMES[13]};

export function parentDivision(name:string){const index=DIVISION_NAMES.indexOf(name);return index>0?DIVISION_NAMES[Math.floor((index-1)/3)]:null;}
export function childDivisions(name:string){return DIVISION_NAMES.filter(n=>parentDivision(n)===name);}

