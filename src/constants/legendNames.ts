import {imperialDisciplineKey} from './imperialDisciplines';

// Handwritten, single-word epithets in indefinite form. Never combine name parts.
export const LEGEND_NAMES:Record<string,string[]>={
 Snabbhet:[
  'Vindfot','Vindfånge','Raskben','Blixtfot','Stormvinge','Lättfot','Snabbfot','Fjädersteg','Daggdans','Skymningssprång',
  'Hjortfot','Svalvinge','Gryningsbud','Silversteg','Stigfinnare','Molnlöpare','Fjäderfot','Vindföre','Harfot','Dimmsteg',
  'Solsteg','Bråddjupsdans','Bäcksprång','Lövsus','Åskföre','Snöspår','Långkliv','Morgonvind','Korpvinge','Forslöpare',
  'Vidfot','Fjällvind','Rimfot','Regnflykt','Glödsteg','Vägfarare','Nattflykt','Kvilfot','Gräsviskare','Stjärnfall',
  'Horisontjägare','Vildsprång','Tusensteg','Frihjort','Månstråk','Silversporre','Våril','Disvinge','Flyktfot','Ljungeld',
 ],
 Passning:[
  'Silkestråd','Vägvisare','Guldhand','Ödesvävare','Trädsång','Bollviskare','Genväg','Silverbana','Klarsyn','Nålsöga',
  'Samklang','Stjärnled','Brobyggare','Dubbelsyn','Knutlösare','Gryningstråd','Edsbindare','Vänsterhand','Drömvävare','Falkbud',
  'Bågmästare','Framsyn','Svanbåge','Trådfinnare','Månstrimma','Gläntbud','Spindelsilke','Guldtråd','Hjärtlänk','Kedjebindare',
  'Säkerhand','Kvicksilver','Stigöppnare','Fjärrbud','Ljusled','Trollslända','Spelvävare','Hoppbud','Vänhand','Vägbindare',
  'Regnbåge','Lönnstig','Kroklist','Skymningsbud','Duvvinge','Bollpoet','Stillabud','Sidenhand','Lönnvävare','Vindsändare',
 ],
 Skytte:[
  'Falköga','Solspjut','Drakbett','Månpil','Stjärnskott','Gyllenhand','Tyståska','Korgbane','Långskott','Ödespil',
  'Eldtunga','Skarpöga','Komet','Järnsikte','Hökblick','Rödblixt','Bågfurste','Målsökare','Stormslunga','Dödvinkel',
  'Solsting','Nattpil','Fjärrträff','Kronkrossare','Gryningsspjut','Segerskott','Nålspets','Skymningsjägare','Kopparöga','Tornfällare',
  'Stålregn','Draktunga','Månristare','Rödfjäder','Gyllenbåge','Domseld','Måltjuv','Glödöga','Askpil','Korgfällare',
  'Bågstorm','Silversikte','Nätbrännare','Vildskott','Falkklo','Blixtkast','Rimspjut','Örnblick','Långarm','Segergnist',
 ],
 Målvakt:[
  'Järnmur','Silverhand','Bergfast','Portvakt','Granithjärta','Sköldbärare','Nattvakt','Tryggfamn','Bollfångare','Gråklippa',
  'Gränsvakt','Kungsport','Stenhand','Stormankare','Månvakt','Örnklo','Kopparsköld','Tröskelvakt','Räddare','Järnfamn',
  'Morgonvakt','Granitnäve','Löfteshållare','Fjällväktare','Stängnäve','Skymningsport','Rikssköld','Vinterborg','Bastion','Fångstmästare',
  'Sköldhjärta','Stillafamn','Bergrot','Stenlöfte','Järnport','Säkerfamn','Klipphand','Vallväktare','Grindvakt','Falkfångare',
  'Ekhjärta','Snabbhand','Bollbindare','Kronväktare','Ormsköld','Dubbelfamn','Tornvakt','Rimväktare','Sistaankare','Edsvakt',
 ],
 Markering:[
  'Skuggföljare','Spårlösare','Järngrepp','Bolltjuv','Vägstängare','Nattöga','Fällmästare','Stålklo','Kedjebrytare','Gråvarg',
  'Avskärare','Stigväktare','Korpblick','Lodjursöga','Spårhund','Silkesfälla','Stiglös','Rävlist','Bollskugga','Järnring',
  'Gränsdragare','Tjuvhand','Bakspår','Stålblick','Nattnät','Låsmästare','Försåt','Vilseledare','Bantjuv','Lodjurssteg',
  'Knutnäve','Hållfast','Fångstnät','Ingenmansmark','Ödesbrytare','Skuggsteg','Spårfinnare','Törngrepp','Smygklo','Tjuvblick',
  'Nätkastare','Stigspärr','Listvävare','Fångstklo','Passvakt','Bolljägare','Lönngrepp','Vägklippare','Skuggklo','Rävöga',
 ],
 Tvekamp:[
  'Järnkäke','Åsknäve','Bergbrytare','Benknäckare','Stålhjärta','Tungnäve','Vildhjärta','Klanbane','Ekrot','Stormtämjare',
  'Drakrygg','Sköldknäckare','Gråbjörn','Blodsek','Rödhand','Hammarslag','Jordskakare','Ärrkung','Fjällrese','Brottmästare',
  'Vargtämjare','Järnvilja','Dunder','Stenbock','Käftkrossare','Björnfamn','Klanskräck','Asknäve','Trollfällare','Bronsnacke',
  'Kampglöd','Åskvrål','Bergakraft','Granitrygg','Vargbroder','Märgbrytare','Segervrål','Järnrot','Stridsarvinge','Bisterhand',
  'Björnklo','Benkross','Hårdnacke','Hammarnäve','Bergbane','Stormkäft','Ärrväktare','Blodtand','Kampvilja','Sköldbane',
 ],
};
export function legendName(event:string,seed:number,used:string[]=[]){
 const all=LEGEND_NAMES[imperialDisciplineKey(event)]||LEGEND_NAMES.Tvekamp;
 const available=all.filter(n=>!used.some(name=>name===n||name.endsWith(' '+n)));
 const pool=available.length?available:all;
 return pool[Math.abs(seed)%pool.length];
}
