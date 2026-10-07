import type { MatchEvent } from '../types';

function hash(value: string): number {
  let out = 2166136261;
  for (let i = 0; i < value.length; i++) {
    out ^= value.charCodeAt(i);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
}

function compose(event: MatchEvent, index: number, openings: string[], middles: string[], endings: string[]): string {
  const seed = hash(`${event.id}:${event.type}:${index}`);
  return `${openings[seed % openings.length]} ${middles[Math.floor(seed / 17) % middles.length]} ${endings[Math.floor(seed / 101) % endings.length]}`;
}

/**
 * Turns an already selected match event into prose. Reporting frequency is
 * decided later by reportEvent, so this library can grow without adding more
 * visible entries to a match report.
 */
export function describeEvent(event: MatchEvent, index: number): string {
  const p = event.playerName || 'Spelaren';
  const q = event.opponentPlayerName || 'motståndaren';

  switch ((event as any).type as string) {
    case 'GOAL_NORMAL':
      return compose(event, index, [
        `${p} drog den kedjade bollen tätt intill kroppen och väntade ut ${q}.`,
        `${p} kom stormande genom trängseln med två försvarare i hälarna.`,
        `${p} stod ett hjärtslag stilla, som om arenans oväsen plötsligt hade tystnat.`,
        `En lös boll föll framför ${p}, som högg till innan försvarslinjen hann sluta sig.`,
        `${p} tog emot med ryggen mot målet och kände ${q} tätt bakom sig.`,
      ], [
        `Ett snabbt riktningsbyte öppnade en smal väg och avslutet kom lågt och hårt.`,
        `Med en skenmanöver åt kanten lurades ${q} ur balans innan armen slog fram.`,
        `Kedjan ven genom luften när skottet borrade sig genom en skog av händer.`,
        `Trots en tung stöt behölls balansen och bollen skickades mot den bortre öppningen.`,
        `Ett kort steg bort från markeringen gav precis det utrymme som behövdes för kastet.`,
      ], [
        `Bollen försvann in i nätet och de gamla murarna svarade på publikens segervrål.`,
        `${q} nådde den inte; målramen sjöng av träffen medan slitna fanor vecklades ut.`,
        `Ett sprucket stridshorn tog upp jublet när lagkamraterna rusade fram.`,
        `Nätet bågnade och hela kortsidan reste sig i facklornas sken.`,
        `${q} blev stående när arenans segerklocka började ringa.`,
      ]);

    case 'GOAL_BASKET':
      return compose(event, index, [
        `${p} smög ut mot kanten medan försvarets blickar följde striden i mitten.`,
        `${p} bröt sin löpning tvärt och fick ett ögonblick ensam vid sidokorgen.`,
        `En studsande boll hamnade hos ${p} nära linjen när trängseln drog åt andra hållet.`,
        `${p} låtsades söka det stora målet men vred kroppen mot sidokorgen.`,
        `Med ena foten nästan ute vid kanten fångade ${p} bollen högt över huvudet.`,
      ], [
        `Kastet steg över utsträckta händer och hängde länge mot den mörka himlen.`,
        `En mjuk handledsrörelse gav bollen en hög båge över den rusande bevakaren.`,
        `Bollen skickades från en snäv vinkel och tog insidan av den skakande ringen.`,
        `Två försvarare hann fram, men försöket var redan på väg över deras huvuden.`,
        `Kedjan glimrade i fackelljuset när bollen började sjunka mot korgen.`,
      ], [
        `Ett klart metalliskt klirr gav svaret och korgens färgbaner vändes.`,
        `Bollen föll igenom och läktarna stampade fram en uråldrig segerramsa.`,
        `Korgen erövrades till ett utdraget jubel från lagets kortsida.`,
        `Ringen skakade medan laget tog både poängen och herraväldet över korgen.`,
        `Korgvakten höjde lagets färg när motståndarna skyndade tillbaka mot mitten.`,
      ]);

    case 'SAVE_NORMAL':
      return compose(event, index, [
        `${p} stod kvar på mållinjen och läste ${q}s minsta rörelse.`,
        `Skottet från ${q} kom genom ett virrvarr av kroppar och syntes sent.`,
        `${p} tog två snabba steg fram när ${q} drog armen bakåt.`,
        `${q} fick ren träff och skickade bollen mot det bortre hörnet.`,
        `Den kedjade bollen ändrade riktning framför ${p} och såg ut att smita in.`,
      ], [
        `Målvakten kastade sig raklång och fick båda händerna bakom stöten.`,
        `En instinktiv hand sköt upp och styrde försöket bort från mållinjen.`,
        `Vinkeln stängdes i sista stund och bollen träffade den framrusande kroppen.`,
        `Med ett kraftigt avstamp nådde målvakten längre än någon på läktaren trodde var möjligt.`,
        `Bollen låstes mot marken trots att anfallarna redan kastade sig efter returen.`,
      ], [
        `Räddningen möttes av ett lättat vrål från försvararnas läktare.`,
        `${q} slog ut med armarna medan ${p} reste sig med bollen i säkert grepp.`,
        `Kedjan slog hårt mot handsken men målet hölls rent.`,
        `Försvararna hann samla sig medan målvaktens namn rullade över arenan.`,
        `Bollen styrdes över ramen och försvann in bland de främsta åskådarna.`,
      ]);

    case 'SAVE_BASKET':
      return compose(event, index, [
        `${p} följde den höga bollbanan hela vägen mot sidokorgen.`,
        `Försöket såg ut att falla rätt när ${p} kom rusande från mitten.`,
        `${p} backade under den sjunkande bollen med blicken låst vid ringen.`,
        `Bollen tog nästan vägen över ${p} efter kastet från kanten.`,
        `${p} stod inklämd mellan en anfallare och den eftertraktade sidokorgen.`,
      ], [
        `Ett vågat språng räckte för att slå undan den med fingertopparna.`,
        `Med båda händerna möttes bollen precis innan den nådde metallen.`,
        `Försvararen höll sin plats, tog stöten och vann kampen om bollbanan.`,
        `En utsträckt arm petade försöket över korgens kant.`,
        `Bollen studsade på ringen men slets bort innan den hann falla igenom.`,
      ], [
        `Korgflaggan låg kvar orörd medan försvaret drog en lättad suck.`,
        `Den lösa bollen skickades bort mot sidlinjen och faran var över.`,
        `Ett förvånat sus gick genom publiken när den till synes säkra poängen försvann.`,
        `Försvaret hann ordna leden på nytt innan nästa våg kom.`,
        `${p} landade tungt men behöll kontrollen och avvärjde erövringen.`,
      ]);

    case 'SHOT_NORMAL':
      return compose(event, index, [
        `${p} fick ett öppet mål framför sig när den sista försvararen försvann ur vägen.`,
        `Trängseln skingrades plötsligt och lämnade ${p} ensam med hela målet.`,
        `${p} hann först till en lös boll framför det övergivna nätet.`,
        `Bänken reste sig redan när ${p} drog armen bakåt mot det tomma målet.`,
        `${p} såg den obevakade öppningen och försökte avsluta innan försvaret hann hem.`,
      ], [
        `Greppet om kedjan brast i själva kastögonblicket och bollen skruvade sig åt sidan.`,
        `En sista knuff förstörde balansen och avslutet fick aldrig rätt riktning.`,
        `Spelaren valde kraft framför kyla och skickade försöket högt över ramen.`,
        `Bollen tog en förrädisk studs i den sönderrivna marken på väg mot mål.`,
        `Avslutet kom för tidigt och passerade målet med en knapp handsbredd.`,
      ], [
        `Ett förtvivlat rop steg från bänken när chansen rann ut.`,
        `Bollen slog i utsidan av stolpen och studsade tillbaka ut i spelet.`,
        `Publikens jubel fastnade i halsen och ersattes av ett långt samfällt stön.`,
        `Försvararna hann tillbaka medan ${p} stod kvar och stirrade efter bollen.`,
        `Den gyllene möjligheten försvann bort över kortlinjen.`,
      ]);

    case 'FIGHT_RESULT': {
      const injured = Boolean((event as any).important);
      return injured
        ? compose(event, index, [
            `${p} och ${q} låste armarna kring den kedjade bollen mitt i trängseln.`,
            `${q} gick in hårt från sidan, men ${p} hann vända sig mot sammanstötningen.`,
            `Närkampen började med ett ryck i bollen och växte till en rå brottningsduell.`,
            `${p} stod som en portvakt när ${q} kom rusande i full fart.`,
            `Ett virrvarr av armar och kedjor dolde ${p} och ${q} från läktaren.`,
          ], [
            `${p} bröt greppet, sänkte tyngdpunkten och svarade med en våldsam höftstöt.`,
            `Kropparna kolliderade med ett dovt brak innan ${p} använde farten mot sin motståndare.`,
            `Efter en lång kraftmätning kom ett tungt svep som ryckte undan ${q}s fotfäste.`,
            `${p} tog emot stöten, vred undan och drev ${q} handlöst ned i gruset.`,
            `Ett plötsligt greppskifte avgjorde kampen och skickade ${q} mot marken.`,
          ], [
            `${q} blev liggande medan spelet fortsatte och bårbärarna rusade in.`,
            `Smällen tystade läktaren ett ögonblick; ${q} kunde inte resa sig utan hjälp.`,
            `Läkarna vinkades fram när ${p} återvände till spelet med bollen.`,
            `${q} bars mot sidlinjen under en blandning av burop och vilda segerrop.`,
            `När dammet lade sig stod ${p} kvar, medan ${q} behövde lämna planen.`,
          ])
        : compose(event, index, [
            `${p} och ${q} slet åt varsitt håll i den kedjade bollen.`,
            `${q} försökte pressa bort ${p} med ren styrka vid mittlinjen.`,
            `${p} mötte ${q} axel mot axel framför den vrålande kortsidan.`,
            `Duellen mellan ${p} och ${q} försvann in i ett moln av damm.`,
            `${q} fick ett tidigt grepp, men ${p} vägrade släppa bollen.`,
          ], [
            `${p} höll sin linje, flyttade greppet och tvingade långsamt motståndaren ur balans.`,
            `Ett snabbt steg åt sidan lät ${p} använda ${q}s egen fart i kraftmätningen.`,
            `Kedjan stramade tills ett sista ryck gav ${p} övertaget.`,
            `${p} arbetade sig under motståndarens tyngdpunkt och bröt det hårda greppet.`,
            `Efter flera våldsamma sekunder rullade ${p} undan och kom upp först.`,
          ], [
            `Bollen blev kvar hos vinnaren, men båda spelarna kunde fortsätta.`,
            `${q} reste sig genast och jakten gick vidare utan avbrott.`,
            `Domaren lät spelet löpa när ${p} tog kontroll över situationen.`,
            `Ingen skadades, men budskapet från närkampen gick fram.`,
            `${p} vann marken och förde spelet vidare medan publiken vrålade.`,
          ]);
    }

    case 'RUN_SUCCESS':
      return compose(event, index, [
        `${p} satte fart längs kanten med bollen tätt intill kroppen.`,
        `${p} tog emot mitt i trängseln och såg en smal korridor framåt.`,
        `En lös boll blev startskottet för ${p}s vilda rusning genom mittzonen.`,
        `${p} stannade tvärt framför sin bevakare och bytte riktning.`,
        `${p} skyddade bollen med axeln när två motståndare försökte stänga vägen.`,
      ], [
        `Ett explosivt första steg lämnade den närmaste markeringen på efterkälken.`,
        `Spelaren tråcklade sig mellan utsträckta armar utan att tappa rytmen.`,
        `En skenmanöver öppnade passagen och försvaret tvingades vända.`,
        `Trots en tackling höll balansen och löpningen fortsatte genom nästa zon.`,
        `Lagkamraternas rörelse användes som sköld för att smita genom luckan.`,
      ], [
        `Läktarens dån växte när anfallet vann värdefull mark.`,
        `Bollen fördes säkert närmare mål innan försvaret hann samla sig.`,
        `De jagande spelarna tappade flera alnar under framstöten.`,
        `Hela motståndarlaget tvingades falla tillbaka mot den egna kortsidan.`,
        `${p} kom ut på andra sidan med kontroll och gott om alternativ.`,
      ]);

    case 'PASS_SUCCESS':
      return compose(event, index, [
        `${p} såg ${q} röra sig mellan två försvarare.`,
        `${p} höll undan sin bevakare medan ${q} startade en löpning.`,
        `Med ryggen mot spelet anade ${p} var ${q} befann sig.`,
        `${p} drog åt sig två markeringar och skapade utrymme för ${q}.`,
        `En till synes stängd passningsväg öppnades när ${q} bytte tempo.`,
      ], [
        `Bollen skickades genom den smala glipan med en kort och hård rörelse.`,
        `En hög passning seglade över trängseln och ned mot den fria ytan.`,
        `Blicken gick åt ena hållet men kedjan svepte passningen åt det andra.`,
        `Passningen släpptes i exakt samma ögonblick som försvarslinjen steg fram.`,
        `Bollen skar diagonalt över planen, precis utom räckhåll för brytningen.`,
      ], [
        `${q} tog emot säkert och lät anfallet behålla sin fart.`,
        `Mottagningen satt på språng innan någon motståndare hann ingripa.`,
        `${q} drog ned bollen och vände genast upp mot mål.`,
        `Försvaret fick vända sig om medan bollen redan var under ${q}s kontroll.`,
        `Publiken belönade samspelet när laget flyttade fram sina positioner.`,
      ]);

    case 'INTERCEPTION':
      return compose(event, index, [
        `${p} läste anfallet långt innan passningen lämnade handen.`,
        `${p} följde bollhållarens höfter och väntade på den svaga beröringen.`,
        `En öppen väg verkade finnas tills ${p} klev fram ur motståndarens blind­sida.`,
        `${p} föll tillbaka ett steg och lockade fram den riskfyllda passningen.`,
        `Bollhållaren försökte tråckla sig förbi, men ${p} stod kvar i vägen.`,
      ], [
        `Ett snabbt ingrepp bröt bollbanan och lämnade motståndarna på fel fot.`,
        `En utsträckt hand petade loss bollen innan mottagaren hann sluta greppet.`,
        `Tacklingen satt med ren tajming och skilde spelaren från bollen.`,
        `${p} tog kroppen emellan och vann både marken och den lösa bollen.`,
        `Kedjans svängning avslöjade kastet och brytningen kom i precis rätt ögonblick.`,
      ], [
        `Spelet vände innan det anfallande laget hann samla sig.`,
        `Ett motanfall började omedelbart under ett växande vrål.`,
        `Den lovande framstöten dog och bollen fördes åt motsatt håll.`,
        `Lagkamraterna spred sig medan ${p} säkrade kontrollen.`,
        `Försvararnas kortsida jublade åt den rena brytningen.`,
      ]);

    case 'UPPKAST':
      return compose(event, index, [
        `Domaren skickade den kedjade bollen högt över mittpunkten.`,
        `Ett gemensamt vrål steg när bollen lämnade domarens hand.`,
        `${p} stod stadigt genom knuffarna inför uppkastet.`,
        `Bollen glimmade i fackelljuset över de samlade innermittarna.`,
        `${p} läste domarens handled och tog sats ett ögonblick före alla andra.`,
      ], [
        `${p} nådde högst och styrde bollen bort från den värsta trängseln.`,
        `Ett sent men välriktat språng gav den avgörande fingertoppen.`,
        `Teknik och styrka förenades när bollen slets ned ur luften.`,
        `Trots kroppskontakten höll ${p} armen fri och vann luftduellen.`,
        `Motståndaren nådde nästan lika högt, men ${p} hade den bättre vinkeln.`,
      ], [
        `Medspelarna spred ut sig och nästa anfall tog form.`,
        `Laget fick kontroll medan motståndarna skyndade tillbaka.`,
        `Bollen säkrades på rätt sida av mittlinjen.`,
        `Publiken svarade när ${p} landade med herraväldet över bollen.`,
        `Kampen om mitten var vunnen för stunden.`,
      ]);

    case 'INJURY':
      return compose(event, index, [
        `${p} försökte resa sig efter den hårda närkampen men benet bar inte.`,
        `När trängseln skingrades satt ${p} kvar i den sönderrivna marken.`,
        `${p} tog några stapplande steg mot spelet innan smärtan satte stopp.`,
        `Lagkamraterna vinkade genast mot bänken när ${p} blev liggande.`,
        `${p} reste sig först, men tvingades snart ned på knä igen.`,
      ], [
        `Läkarna tog sig fram mellan spelarna och gjorde snabbt tecken för byte.`,
        `Bårbärarna kallades in medan domaren lät bollen föras bort från platsen.`,
        `Efter en kort undersökning stod det klart att matchen var över för spelaren.`,
        `Försöket att fortsätta övergavs när nästa rörelse fick smärtan att blossa upp.`,
        `Bänken insåg allvaret och började genast söka efter en ersättare.`,
      ], [
        `${p} lämnade planen till publikens blandade rop.`,
        `Laget tvingades ordna om sina led inför nästa avkast.`,
        `En plats i formationen stod plötsligt tom.`,
        `Arenans dån sjönk medan spelaren bars mot sidlinjen.`,
        `Matchen fortsatte, men förlusten märktes genast i uppställningen.`,
      ]);

    case 'SUBSTITUTION':
      return compose(event, index, [
        `${q} kunde inte fortsätta och tecknet kom omedelbart från bänken.`,
        `Medan ${q} fördes mot sidlinjen gjorde sig ${p} redo vid markeringen.`,
        `Formationens tomma plats fylldes när ${p} kallades fram från reserverna.`,
        `Bänken reagerade snabbt på förlusten av ${q}.`,
        `${p} kastade av sig manteln när lagkamraterna ropade efter förstärkning.`,
      ], [
        `Ersättaren sprang in genom dammet och sökte genast sin ruta.`,
        `${p} fick några snabba ord på vägen in och tog plats utan dröjsmål.`,
        `Lagkamraterna flyttade sig ett halvt steg och slöt leden kring den nye spelaren.`,
        `Bytet genomfördes medan motståndarna redan samlades inför nästa anfall.`,
        `${p} pekade ut markeringen och tog över uppgiften som lämnats efter ${q}.`,
      ], [
        `Spelet blåstes igång igen innan läktarna hunnit tystna.`,
        `Laget var åter fulltaligt i rutan, men prövningen hade lämnat spår.`,
        `Nästa boll blev genast ett test för den nyinsatte.`,
        `Bänken följde spänt hur den förändrade formationen satte sig.`,
        `Ett nytt kapitel i periodens strid tog sin början.`,
      ]);

    case 'PERIOD_START': {
      const lines = [
        `Domarens horn skar genom sorlet och period ${event.period} tog sin början.`,
        `Facklorna fladdrade längs muren när domaren blåste igång period ${event.period}.`,
        `Spelarna slöt leden kring mittpunkten. Ett skarpt tecken inledde period ${event.period}.`,
        `Läktarna reste sig på nytt när period ${event.period} blåstes igång.`,
        `Den kedjade bollen bars till mitten och domaren kallade fram lagen till period ${event.period}.`,
      ];
      return lines[(hash(`${event.id}:${index}`) + index) % lines.length];
    }

    case 'PERIOD_END': {
      const lead = [
        `Hornet ljöd över arenan och spelarna sänkte armarna.`,
        `Domarens signal bröt igenom oväsendet och striden stannade upp.`,
        `Kedjan föll mot marken när perioden blåstes av.`,
        `Läktarnas rop levde kvar medan lagen drog sig mot sina bänkar.`,
        `Ett långt hornstöt satte punkt för periodens kamp.`,
      ];
      return `${lead[(hash(`${event.id}:${index}`) + index) % lead.length]} ${event.text}`;
    }

    case 'RESTART':
      return compose(event, index, [
        `Bollen slets ur klungan och studsade fri mot mittzonen.`,
        `En hårt spänd kedja lossnade plötsligt mellan två händer.`,
        `Trängseln löstes upp i ett moln av damm och lämnade bollen oskyddad.`,
        `Ett missförstånd gjorde att bollen rullade ensam över mittlinjen.`,
        `Ingen vann den första duellen och bollen studsade mellan flera ben.`,
      ], [
        `Spelarna kastade sig efter den medan planens tyngdpunkt flyttades.`,
        `En snabb motståndare hann först och tog hand om den lösa kedjan.`,
        `Domaren lät den råa kampen fortsätta när ett nytt lag vann kontroll.`,
        `En förrädisk studs tog bollen förbi den närmaste utsträckta handen.`,
        `Andrabollen föll rätt för laget som redan börjat vända spelet.`,
      ], [
        `Anfallet fick byggas om från grunden.`,
        `Spelet satte fart åt motsatt håll.`,
        `Båda formationerna tvingades snabbt ordna om sig.`,
        `En ny framstöt växte fram ur kaoset.`,
        `Mittzonen fylldes åter av jagande spelare.`,
      ]);

    case 'ATMOSPHERE': {
      const afraid = /orolig|tveksam|rädd|mörka portar/i.test(event.text);
      return afraid
        ? compose(event, index, [
            `${p} kastade en orolig blick mot arenans mörka portar.`,
            `Ett plötsligt vrål från kortsidan fick ${p} att stelna mitt i steget.`,
            `${p} såg upp mot de väldiga skräckbaneren över muren.`,
            `Arenans dova muller låg som åska över ${p}.`,
            `Tusentals röster tog upp ${p}s namn i en hotfull ramsa.`,
          ], [
            `Greppet om bollen hårdnade och ett enkelt val blev onödigt svårt.`,
            `Motståndarnas skuggor tycktes växa medan beslutet dröjde.`,
            `Stegen blev kortare och kommunikationen med laget försvann i oväsendet.`,
            `Tvekan smög sig in i rörelsen och motståndarna märkte den genast.`,
            `Facklornas fladdrande sken gjorde trängseln framför spelaren ännu hotfullare.`,
          ], [
            `Ett viktigt ögonblick gick förlorat under läktarnas hån.`,
            `Spelaren fortsatte, men med mindre kraft i nästa aktion.`,
            `Arenans skräck hade satt ett tydligt avtryck.`,
            `Laget fick arbeta hårdare för att hålla anfallet levande.`,
            `Modet höll, men kroppen svarade långsammare.`,
          ])
        : compose(event, index, [
            `${p} rätade på ryggen under arenans segerbaner.`,
            `Läktarnas sång växte när ${p} tog emot bollen.`,
            `${p} hörde sitt namn rulla från kortsidan.`,
            `Ett gammalt segerskri steg från publiken kring ${p}.`,
            `${p} slog näven mot bröstet framför de vajande fanorna.`,
          ], [
            `Tvekan försvann och spelaren vågade söka den svårare öppningen.`,
            `Hemmafolkets rytmiska stampande gav kraft till ännu en framstöt.`,
            `Beslutet kom snabbare och hela laget tycktes följa efter.`,
            `Arenans ära gjorde den riskfyllda vägen till den självklara.`,
            `Ett trött anfall fick nytt liv av stödet från muren.`,
          ], [
            `Motståndarna tvingades falla tillbaka.`,
            `Modet spred sig vidare genom formationen.`,
            `Publiken reste sig när anfallet vann mark.`,
            `Nästa duell möttes utan minsta tvekan.`,
            `Segerropen följde spelaren vidare över planen.`,
          ]);
    }

    default:
      return event.text;
  }
}
