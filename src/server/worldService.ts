import { db } from '../db';
import { worldState, clubs, players, matches, shoutboxMessages, tipsetCoupons } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { Race, LineupConfig, TacticsConfig, TrainableAttribute } from '../types';
import { generateStarterSquad } from '../engine/playerGenerator';
import { getRandomSettlementForRace, generateProceduralBotClubName } from '../constants/mambenna';

const DEFAULT_TACTICS: TacticsConfig = {
  uppspel: 'Normal',
  spelvag: 'Normal',
  skytte: 'Normal',
};

const DEFAULT_TRAINING_POINTS: Record<TrainableAttribute, number> = {
  snabbhet: 1,
  kondition: 1,
  markering: 1,
  passning: 1,
  teknik: 1,
  speluppfattning: 1,
  skott: 0,
  malvakt: 0,
  tuffhet: 0,
};


function buildDefaultBotLineup(playerIds: number[]): LineupConfig['slots'] {
  const slotKeys = ['goal', '2-0', '2-1', '2-2', '1-0', '1-1', '1-2', '0-0', '0-1', '0-2'];
  const slots: LineupConfig['slots'] = {};
  slotKeys.forEach((slotKey, index) => {
    slots[slotKey] = {
      slotKey,
      starterPlayerId: playerIds[index] ?? null,
      subPlayerId: null,
    };
  });
  return slots;
}

// Seed/Ensure Season 1 Day 0 world structure
export async function initializeSeason1World(forceReset = false) {
  const existingWorld = await db.select().from(worldState).limit(1);

  if (existingWorld.length > 0 && !forceReset) {
    return existingWorld[0];
  }

  if (forceReset) {
    // Delete all dynamic records in order
    await db.delete(tipsetCoupons);
    await db.delete(matches);
    await db.delete(players);
    await db.delete(clubs);
    await db.delete(shoutboxMessages);
    await db.delete(worldState);
  }

  // Create initial world state: Season 1, Round 0, Day 0, 0 matches played
  const [newWorld] = await db
    .insert(worldState)
    .values({
      season: 1,
      round: 0,
      day: 0,
      totalMatchesPlayed: 0,
    })
    .returning();

  // Populate league hierarchy with procedural bot clubs
  // Structure:
  // Kejsarserien: 10 clubs
  // Division 1: 10 clubs (Div 1:1)
  // Division 2: 10 clubs (Div 2:1)
  // Division 3: 10 clubs (Div 3:1)
  const races: Race[] = ['human', 'elf', 'dwarf', 'orc'];
  const divisions = [
    { name: 'Kejsarserien', count: 10 },
    { name: 'Division 1:1', count: 10 },
    { name: 'Division 2:1', count: 10 },
    { name: 'Division 3:1', count: 10 },
  ];

  let botIndex = 1;
  for (const div of divisions) {
    for (let pos = 1; pos <= div.count; pos++) {
      const race = races[(botIndex - 1) % races.length];
      const settlement = getRandomSettlementForRace(race);
      const { name, shortName } = generateProceduralBotClubName(race, botIndex);
      const clubId = `bot-${div.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}-${pos}`;

      const [insertedClub] = await db
        .insert(clubs)
        .values({
          id: clubId,
          userId: null,
          name,
          shortName,
          race,
          hometown: settlement.name,
          division: div.name,
          position: pos,
          gold: 200000,
          merit: 0,
          marathonPoints: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          recordString: '0/0/0',
          presentation: `${name} är ett fäste grundat inför Mambennas första säsong.`,
          ownerName: 'Imperial Fogde',
          ownerEmail: '',
          isBot: true,
          doctorInvestment: 1000,
          magicInvestment: 0,
          trainingPoints: DEFAULT_TRAINING_POINTS,
          lineup: {
            slots: {},
            underlag: 'Gräs',
            intrade: 8,
            tactics: DEFAULT_TACTICS,
          },
          coach: null,
          arena: null,
        })
        .returning();

      // Generate 20 fresh players for this bot club. Bots receive a simple legal lineup.
      const squad = generateStarterSquad(race, insertedClub.id, settlement.name);
      const botPlayerIds: number[] = [];
      for (const p of squad) {
        const [created] = await db.insert(players).values({
          clubId: insertedClub.id,
          name: p.name,
          race: p.race,
          shirtNumber: p.shirtNumber,
          hometown: p.hometown,
          nominalPosition: p.nominalPosition,
          wage: p.wage,
          isMercenary: false,
          matches: 0,
          seasonMatches: 0,
          goals: 0,
          seasonGoals: 0,
          basketGoals: 0,
          seasonBasketGoals: 0,
          assists: 0,
          seasonAssists: 0,
          form: p.form,
          totalInjury: 0,
          currentInjury: 0,
          isDeceased: false,
          attributes: p.attributes,
          artifacts: [],
        }).returning();
        botPlayerIds.push(created.id);
      }
      await db.update(clubs).set({
        lineup: {
          slots: buildDefaultBotLineup(botPlayerIds),
          underlag: 'Gräs',
          intrade: 8,
          tactics: DEFAULT_TACTICS,
        },
      }).where(eq(clubs.id, insertedClub.id));

      botIndex++;
    }
  }

  return newWorld;
}

// Creation flow for human managers joining the world:
// 1. Manager chooses username, club name, short name, race
// 2. Hometown is randomly assigned from valid settlements of chosen race (NOT user selectable)
// 3. 20 new players of that race generated
// 4. Starts with 200,000 gold, 0 merit, 0 matches, 0 wins/draws/losses, no coach, no owned arena
// 5. Assigned to an available Division 3:1 slot (replacing a bot club to maintain structure)
export async function createHumanClub(params: {
  userId: string;
  managerName: string;
  clubName: string;
  shortName: string;
  race: Race;
}) {
  const { userId, managerName, clubName, shortName, race } = params;
  if (!['human','elf','dwarf','orc'].includes(race)) throw new Error('Välj människa, alv, dvärg eller orch.');
  const [owned] = await db.select().from(clubs).where(eq(clubs.userId,userId));
  if(owned) throw new Error('Du har redan ett lag.');


  // 1. Ensure world is initialized
  await initializeSeason1World(false);
  return db.transaction(async(tx:any)=>{
    await tx.execute(sql`SELECT pg_advisory_xact_lock(719092)`);
    if((await tx.select().from(clubs).where(eq(clubs.userId,userId))).length)throw new Error('Du har redan ett lag.');


  // 2. Randomly pick valid settlement for race
  const settlement = getRandomSettlementForRace(race);

  // 3. Find a bot slot in Division 3:1 to replace
  const botToReplace = await tx
    .select()
    .from(clubs)
    .where(sql`${clubs.division} LIKE 'Division 3%' AND ${clubs.isBot} = true`)
    .limit(1);

  let clubId: string;
  let division = 'Division 3:1';
  let position = 10;

  if (botToReplace.length > 0) {
    const targetBot = botToReplace[0];
    clubId = targetBot.id;
    division = targetBot.division;
    position = targetBot.position;

    // Delete old bot's players
    await tx.delete(players).where(eq(players.clubId, clubId));

    // Update the club record for human manager
    await tx
      .update(clubs)
      .set({
        userId,
        name: clubName,
        shortName: shortName || clubName,
        race,
        hometown: settlement.name,
        division,
        position,
        gold: 200000,
        merit: 0,
        marathonPoints: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        recordString: '0/0/0',
        presentation: '',
        ownerName: managerName,
        ownerEmail: '',
        isBot: false,
        doctorInvestment: 1000,
        magicInvestment: 0,
        trainingPoints: DEFAULT_TRAINING_POINTS,
        lineup: {
          slots: {},
          underlag: 'Gräs',
          intrade: 8,
          tactics: DEFAULT_TACTICS,
        },
        coach: null,
        arena: null,
      })
      .where(eq(clubs.id, clubId));
  } else {
    throw new Error('Alla platser är upptagna.');
    clubId = `user-club-${Date.now()}`;
    await tx.insert(clubs).values({
      id: clubId,
      userId,
      name: clubName,
      shortName: shortName || clubName,
      race,
      hometown: settlement.name,
      division,
      position,
      gold: 200000,
      merit: 0,
      marathonPoints: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      recordString: '0/0/0',
      presentation: '',
      ownerName: managerName,
      ownerEmail: '',
      isBot: false,
      doctorInvestment: 1000,
      magicInvestment: 0,
      trainingPoints: DEFAULT_TRAINING_POINTS,
      lineup: {
        slots: {},
        underlag: 'Gräs',
        intrade: 8,
        tactics: DEFAULT_TACTICS,
      },
      coach: null,
      arena: null,
    });
  }

  // 4. Generate 20 new players for human club
  const squad = generateStarterSquad(race, clubId, settlement.name);

  const createdPlayers = [];
  for (let i = 0; i < squad.length; i++) {
    const p = squad[i];
    const [inserted] = await tx
      .insert(players)
      .values({
        clubId,
        name: p.name,
        race: p.race,
        shirtNumber: p.shirtNumber,
        hometown: p.hometown,
        nominalPosition: p.nominalPosition,
        wage: p.wage,
        isMercenary: false,
        matches: 0,
        seasonMatches: 0,
        goals: 0,
        seasonGoals: 0,
        basketGoals: 0,
        seasonBasketGoals: 0,
        assists: 0,
        seasonAssists: 0,
        form: p.form,
        totalInjury: 0,
        currentInjury: 0,
        isDeceased: false,
        attributes: p.attributes,
        artifacts: [],
      })
      .returning();

    createdPlayers.push(inserted);
  }

  // Human managers start with a squad but no pre-filled formation. They choose all 10 starters themselves.
  await tx
    .update(clubs)
    .set({
      lineup: {
        slots: {},
        underlag: 'Gräs',
        intrade: 8,
        tactics: DEFAULT_TACTICS,
      },
    })
    .where(eq(clubs.id, clubId));

  const [finalClub] = await tx.select().from(clubs).where(eq(clubs.id, clubId));

  return {
    club: finalClub,
    players: createdPlayers,
  };
  });
}
