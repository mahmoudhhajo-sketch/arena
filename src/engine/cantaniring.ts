/** The ring retaliates once against the winner, never recursively. */
export function cantaniringRetaliation(artifacts: readonly string[] = []): number {
  return artifacts.includes('cantaniring') ? 1 : 0;
}

const tales = [
  '{winner} höjer armen i triumf över {bearer}. Då vaknar Cantaniringen: en blodröd ljusbåge hugger tillbaka och segergesten bryts av smärta.',
  'Slagsmålet är vunnet av {winner}, men {bearer}s Cantaniring kräver sitt pris. En osynlig egg river genom förövarens skydd.',
  '{bearer} tappar fotfästet under anfallet. Cantaniringen svarar med ett dovt klockslag, och {winner} vacklar undan med en färsk skada.',
  '{winner} tror att duellen är över. Från {bearer}s hand slår ringens röda sken ut som en piska och träffar segraren.',
  'Ett jubel hinner stiga för {winner} innan Cantaniringen blänker på {bearer}s hand. Jublet dör när segraren griper om sin skadade arm.',
  '{winner} pressar ned {bearer} i marken. Ringens ristningar glöder till, och ett hugg utan synligt vapen tvingar vinnaren att släppa taget.',
  'Damm virvlar kring {bearer} efter nederlaget. Genom dammet far en strimma av Cantaniringens kraft och lämnar {winner} skadad.',
  '{winner} går segrande ur slagsmålet, men blodssigillet på {bearer}s ring är obevekligt. Dess vedergällning träffar innan segraren hinner vända sig om.',
  '{bearer}s Cantaniring sjunger med en tunn, olycksbådande ton. {winner} har vunnit duellen, men nästa steg slutar i smärta när ringens kraft biter.',
  'När {winner} utdelar det avgörande greppet flammar Cantaniringen på {bearer}s finger upp. Förövaren ryggar tillbaka, skadad av sin egen seger.',
  '{bearer} besegras, men ringens gamla löfte bryts inte. Ett rött avtryck blossar upp på {winner}, som tvingas stappla bort från närkampen.',
  'Segern tillhör {winner}. Ändå kommer ingen lättnad: Cantaniringen på {bearer}s hand sänder sin hämnd genom luften och sårar segraren.',
  'Ett mörkt sken samlas kring {bearer}s knutna hand. {winner} hinner knappt släppa greppet innan Cantaniringens kraft slår tillbaka.',
  '{winner} reser sig efter den vunna duellen. Under sig ser segraren {bearer}s ring glöda, och ett plötsligt hugg genom benet avbryter flykten därifrån.',
  'Kampen lämnar {bearer} besegrad. Cantaniringen betalar omedelbart tillbaka våldet: {winner} kröker sig när dess blodröda kraft träffar.',
  '{winner} får sista ordet i slagsmålet, men inte i ringens uråldriga räkenskap. Från {bearer}s finger slår vedergällningen ut och sårar vinnaren.',
];

export function cantaniringCommentary(bearer: string, winner: string, variant: number): string {
  return tales[Math.abs(Math.floor(variant)) % tales.length]
    .replaceAll('{bearer}', bearer).replaceAll('{winner}', winner);
}
