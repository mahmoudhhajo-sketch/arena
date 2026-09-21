import { Race } from '../types';

const RACE_NAME_COMPONENTS: Record<Race, { prefixes: string[]; suffixes: string[]; fullNames?: string[] }> = {
  elf: {
    prefixes: [
      'Aia', 'Alva', 'Alt', 'Fiol', 'Cel', 'Fin', 'Glor', 'Mith', 'Eöl', 'Gal',
      'Thran', 'Leg', 'El', 'Cele', 'Lind', 'Nim', 'Syl', 'Ael', 'Ith', 'Lór',
      'Val', 'Eran', 'Aer', 'Fael', 'Cael', 'Mor', 'Tin', 'Sil', 'Rin', 'Dael'
    ],
    suffixes: [
      'rin', 'bereth', 'ion', 'del', 'las', 'dor', 'we', 'fin', 'thir', 'wen',
      'dil', 'mir', 'loth', 'vorn', 'mar', 'riel', 'dan', 'randir', 'nor', 'lyn'
    ],
  },
  orc: {
    prefixes: [
      'Naz', 'Boh', 'Gur', 'Raz', 'Cly', 'Bat', 'Ugl', 'Gor', 'Zha', 'Shov',
      'Ghaz', 'Gurg', 'Klog', 'Mog', 'Vrag', 'Durg', 'Skab', 'Krul', 'Thrak', 'Grish',
      'Borg', 'Morv', 'Dra', 'Ruk', 'Snag', 'Skor', 'Vaz', 'Blod', 'Hrak', 'Zug'
    ],
    suffixes: [
      'lokh', 'in', 'cliun', 'hbag', 'bag', 'rynk', 'uk', 'glôk', 'zoork', 'ilanch',
      'nak', 'or', 'gash', 'bash', 'gar', 'grim', 'rot', 'mush', 'krug', 'dush'
    ],
  },
  dwarf: {
    prefixes: [
      'Til', 'Dwa', 'Baf', 'Gro', 'Thor', 'Kaz', 'Hiro', 'Bal', 'Dain', 'Gloin',
      'Fund', 'Gim', 'Bror', 'Krag', 'Sten', 'Malm', 'Järn', 'Fjäll', 'Häll', 'Bor',
      'Mor', 'Grum', 'Thar', 'Durn', 'Skall', 'Brak', 'Vond', 'Log', 'Hrod', 'Keld'
    ],
    suffixes: [
      'borin', 'lin', 'ur', 'mugh', 'grim', 'ador', 'berg', 'in', 'dur', 'und',
      'li', 'ri', 'karl', 'fäste', 'hammar', 'skägg', 'hjälm', 'sten', 'gruv', 'järn'
    ],
  },
  human: {
    prefixes: [
      'Tob', 'Ur', 'Teg', 'Sze', 'Ald', 'Val', 'Bern', 'Sven', 'Rik', 'Har',
      'Gör', 'Hjal', 'Mår', 'Tor', 'Osk', 'Esk', 'Sig', 'Gun', 'Borg', 'Fol',
      'Hen', 'Kar', 'Mag', 'Esk', 'Vil', 'Dav', 'Mik', 'Pet', 'Kri', 'Len'
    ],
    suffixes: [
      'be', 'wan', 'elad', 'wait', 'or', 'demar', 'nt', 'ard', 'mar', 'ald',
      'sten', 'vard', 'mund', 'frid', 'il', 'rik', 'son', 'man', 'holm', 'kvist'
    ],
  },
  goblin: {
    prefixes: ['Sniz', 'Grik', 'Skrit', 'Blix', 'Razz', 'Krik', 'Skiv', 'Pik', 'Nib', 'Tizz', 'Vrix', 'Zil', 'Snark', 'Fiz', 'Kez', 'Drix', 'Snik', 'Nox', 'Zib', 'Kraz', 'Vez', 'Prik', 'Tvik', 'Jik', 'Frizz', 'Qrik', 'Klix', 'Sprak', 'Yik', 'Vizz'],
    suffixes: ['it', 'nak', 'lik', 'zar', 'tok', 'spit', 'rak', 'kik', 'nip', 'zle', 'izz', 'vik', 'rek', 'snip', 'zzle', 'nix', 'drek', 'sik', 'vek', 'zik', 'gret', 'lak', 'znak', 'kit', 'zzik', 'drik', 'lek', 'zrin'],
  },
  troll: {
    prefixes: ['Bront', 'Klog', 'Glurp', 'Mogg', 'Drugg', 'Trog', 'Grom', 'Hulk', 'Krag', 'Slugg', 'Horg', 'Brol', 'Drom', 'Klum', 'Vorn', 'Murg', 'Ul', 'Thrug', 'Ogr', 'Hrom', 'Brug', 'Dolg', 'Krogg', 'Yrg', 'Tull', 'Norg', 'Frog', 'Gull', 'Rugg', 'Skum'],
    suffixes: ['en', 'or', 'ur', 'ath', 'ok', 'mash', 'dun', 'tor', 'bula', 'skalle', 'rum', 'goth', 'rok', 'rund', 'drom', 'hult', 'varg', 'gorr', 'thum', 'gol', 'lung', 'gro', 'morn', 'dorg', 'gund', 'hul', 'ron', 'garn', 'grim', 'norg'],
  },
};

export function generatePlayerName(race: Race): string {
  const comp = RACE_NAME_COMPONENTS[race] || RACE_NAME_COMPONENTS.human;
  const pIndex = Math.floor(Math.random() * comp.prefixes.length);
  const sIndex = Math.floor(Math.random() * comp.suffixes.length);
  const prefix = comp.prefixes[pIndex];
  const suffix = comp.suffixes[sIndex];
  
  // Clean formatting: capitalization
  const families:Record<Race,string[]>= {
 elf:['Lövsång','Silvergren','Månljus','Björkskugga','Stjärnlöv','Daggvind','Skogsljus','Näverpil','Solglänta','Sälgrot','Mossfot','Dimslöja','Fjäderfall','Aftonbris','Videsång','Källglans','Almblad','Nattpil','Gryningsljus','Eklund'],
 human:['Bergström','Hagtorn','Lindmark','Gråfalk','Varglund','Sjöfarare','Eldvakt','Norrvik','Stormfält','Björnvall','Stenbro','Ljunghed','Askengren','Kustvakt','Kopparås','Rosenhäll','Rävberg','Havsbris','Nordanvind','Vinterdal'],
 dwarf:['Järnhand','Kopparskägg','Malmhjärta','Hammarfall','Granitsköld','Mitrilfot','Bergbrytare','Glödsmide','Stenpanna','Djupgrävare','Kolnäve','Silverhammare','Gråberg','Runristare','Bronsstäd','Flintskägg','Granitfot','Guldåder','Malmkross','Stålsköld'],
 orc:['Blodtand','Svartnäve','Rödyxa','Benknäckare','Gråbet','Askskalle','Krigsklo','Järnkäft','Sotöga','Stormvrål','Skuggbett','Eldtunga','Grusnäve','Krosshand','Vargblod','Mörkbrodd','Taggrygg','Bensköld','Dunderkäft','Korpöga'],
 goblin:['Kuggtand','Kvickfot','Spiknäsa','Kopparknapp','Krutstänk','Grönsticka','Tennöra','Rostfinger','Tassel','Krypskott','Flintflisa','Skrotvakt','Piprök','Nålspets','Långfinger','Rävlist','Kiselöga','Skruvskalle','Kvicksilver','Glasöga'],
 troll:['Mossrygg','Rotfot','Stenmage','Dyhand','Träskmun','Tallnäve','Barkhud','Gråstam','Sumpfot','Jordöra','Bergnacke','Dimmossa','Torvskalle','Granrot','Våtsten','Dunderfot','Jättesteg','Lerknoge','Kärrrygg','Tuvtand']};
 const middle=['','a','e','i','o','ar','en','ir','or','un','al','el'][Math.floor(Math.random()*12)];
 return prefix+middle+suffix;
}
