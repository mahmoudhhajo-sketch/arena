export const LICENSE_TASKS = [
 {id:'player',chapter:1,title:'Lär känna en spelare',hint:'Öppna en av dina spelares profiler. Egenskaperna hjälper dig att välja var på planen spelaren gör mest nytta.',target:'spelare'},
 {id:'lineup',chapter:1,title:'Spara tio startspelare',hint:'Öppna nästa match och placera tio olika spelare. Spara gärna Standard 1, som används när du inte har en särskild matchuppställning.',target:'planning'},
 {id:'reserves',chapter:1,title:'Ge laget reserver',hint:'Välj minst en reserv i varje bemannad ruta och spara. Samma reserv får täcka flera rutor, men får inte samtidigt vara startspelare.',target:'planning'},
 {id:'training',chapter:1,title:'Fördela veckans träning',hint:'Fördela minst en träningsplupp och spara. Matchpositionerna påverkar vilka egenskaper spelarna kan träna.',target:'traning'},
 {id:'opponent',chapter:2,title:'Undersök nästa motståndare',hint:'Öppna motståndarens klubb och bekanta dig med truppen. Fundera på vilka av dina spelare som kan möta deras styrkor.',target:'opponent'},
 {id:'preparation',chapter:2,title:'Spara din matchplan',hint:'Spara uppställningen för nästa match. Välj uppspel, spelväg och avslut som passar dina spelare; det finns ingen obligatorisk taktik.',target:'planning'},
 {id:'match',chapter:2,title:'Spela din första seriematch',hint:'Seriematcher spelas på schemalagda dagar. Under väntan kan du fortsätta med ekonomin och marknaden i kapitel III.',target:'matcher'},
 {id:'report',chapter:2,title:'Läs matchen och statistiken',hint:'Efter slutsignalen: öppna matchreferatet och välj Lagstatistik eller Spelarstatistik. Jämför försök, lyckade handlingar och resultat.',target:'report'},
 {id:'economy',chapter:3,title:'Lär känna klubbens ekonomi',hint:'Öppna ekonomi och granska inkomster och återkommande kostnader. Lämna utrymme i kassan för kommande veckor.',target:'ekonomi'},
 {id:'market',chapter:3,title:'Undersök transfermarknaden',hint:'Öppna en spelare som är till salu. Jämför egenskaper och lön med din trupp. Du behöver inte lägga något bud.',target:'transfer'},
 {id:'goal',chapter:3,title:'Välj din riktning',hint:'Vad vill du främst arbeta med denna säsong? Detta är din egen målsättning, ingen extra spelbonus.',target:'goal'},
] as const;
export const LICENSE_CHAPTERS=['Dina första order','Den första drabbningen','Vägen till makten'];
export const LICENSE_GOALS=['Utveckla mina egna spelare','Bygga en hållbar ekonomi','Hitta en taktik som passar laget','Förstärka truppen med genomtänkta köp'];
export function licenseComplete(done:Record<string,string>){return LICENSE_TASKS.every(t=>!!done[t.id]);}
