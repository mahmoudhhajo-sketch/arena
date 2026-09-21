import './src/server/runtimeConfig';
import {withInitializationLock} from './src/db';
import {synchronizeGameClock} from './src/lib/gameClock';
import {record} from './src/server/records';
import {initializeRevision14} from './src/server/revision14';
import {initializeMatchMerit} from './src/server/meritRevision';
import {initializeUnreservedBids} from './src/server/solvency';
import {registerRevision13,initializeRevision13,clubMorale} from './src/server/revision13';
import {registerRevision11} from './src/server/revision11';
import {registerCommunity} from './src/server/community';
import {registerNews} from './src/server/newsStatistics';
import {backupDatabase} from './src/db/backup';
import {registerProgression,initializeRevision8} from './src/server/progression';
import {registerSharedChat} from './src/server/sharedChat';

import {registerAuth} from './src/server/auth';

import {registerLore} from './src/server/lore';

import {registerMatchPlanning} from './src/server/matchPlanning';

import {registerMagic} from './src/server/magic';

import {registerExhibitions} from './src/server/exhibitions';

import {registerArtifactMarket} from './src/server/artifactMarket';

import {registerFeatures,initializeFeatures} from './src/server/features';

import {put} from './src/server/records';

import {randomUUID} from 'node:crypto';

import express from 'express';

import {arenaConfig} from './src/constants/arenas';

import {validateLineup} from './src/engine/lineup';

import {initializeExpansion, registerExpansion, tickWorld} from './src/server/expansion';

import path from 'path';

import { existsSync, unlinkSync } from 'node:fs';

import { createServer as createViteServer } from 'vite';

import { db, initializeDatabase, closeDatabase } from './src/db';

import { worldState, clubs, players, matches, shoutboxMessages, tipsetCoupons } from './src/db/schema';

import { eq, desc, sql } from 'drizzle-orm';

import { initializeSeason1World, createHumanClub } from './src/server/worldService';

import { simulateMatch } from './src/engine/matchEngine';

import { calculatePlayerPositionRatings } from './src/engine/positionRatings';

import { generateStarterSquad } from './src/engine/playerGenerator';

import { LineupConfig, Player, PlayerAttributes, TrainableAttribute } from './src/types';



const app = express();
if(process.env.RAILWAY_ENVIRONMENT)app.set('trust proxy',1);

const PORT = Number(process.env.PORT || 3000);



app.use(express.json({limit:"1mb"}));

registerAuth(app);

registerRevision13(app);registerRevision11(app);registerSharedChat(app);
registerProgression(app);registerNews(app);registerCommunity(app);

registerLore(app);

registerMatchPlanning(app);

registerMagic(app);

registerExhibitions(app);

registerArtifactMarket(app);

registerFeatures(app);

registerExpansion(app);



function visibleAttributeValue(value: number): number {

  return Math.max(0, Math.round(value*1000)/1000);

}



function serializePlayerForOwner(raw: any): Player {

  const fullPlayer = raw as Player;

  const rawAttrs = (raw.attributes || {}) as PlayerAttributes;

  const visibleAttributes = Object.fromEntries(

    Object.entries(rawAttrs).map(([key, value]) => [key, visibleAttributeValue(Number(value))])

  ) as unknown as PlayerAttributes;



  return {

    ...fullPlayer,

    attributes: visibleAttributes,

    positionRatingsWithForm: calculatePlayerPositionRatings(fullPlayer, true),

    positionRatingsWithoutForm: calculatePlayerPositionRatings(fullPlayer, false),

  };

}





// Boot check: Ensure Season 1 Day 0 world exists on server start



// ==========================================

// API ROUTES

// ==========================================



// 1. Health check

app.get('/api/health', (req, res) => {

  res.json({ status: 'ok', time: new Date().toISOString() });

});



// 2. Get World State (Season, Round, Day, match count)

app.get('/api/world', async (req, res) => {

  try {

    const worlds = await db.select().from(worldState).limit(1);

    if (worlds.length === 0) {

      const initialized = await initializeSeason1World(false);

      return res.json(initialized);

    }

    res.json(worlds[0]);

  } catch (err: any) {

    console.error('Failed to get world state:', err);

    res.status(500).json({ error: err.message });

  }

});



// 3. Dev Reset World: Completely wipe dynamic data and recreate pristine Season 1 Day 0

app.post('/api/admin/reset-world', async (req, res) => {

  if (process.env.NODE_ENV === 'production') {

    return res.status(404).json({ error: 'Not found' });

  }

  try {

    const freshWorld = await initializeSeason1World(true);

    res.json({

      message: 'Mambenna world has been reset to Season 1, Day 0.',

      world: freshWorld,

    });

  } catch (err: any) {

    console.error('Failed to reset world:', err);

    res.status(500).json({ error: err.message });

  }

});



// 4. Get active club by user ID (or check if user owns a club)

app.get('/api/user/:userId/club', async (req, res) => {

  try {

    const { userId } = req.params;

    const userClubs = await db.select().from(clubs).where(eq(clubs.userId, userId)).limit(1);



    if (userClubs.length === 0) {

      return res.json({ hasClub: false });

    }



    const club = userClubs[0];

    const clubPlayers = await db.select().from(players).where(eq(players.clubId, club.id));



    res.json({

      hasClub: true,

      club:{...club,morale:Math.round(await clubMorale(club.id)*10)/10},

      players: clubPlayers.map(serializePlayerForOwner),

    });

  } catch (err: any) {

    console.error('Failed to load user club:', err);

    res.status(500).json({ error: err.message });

  }

});



// 5. Create new Human Club (Season 1 Day 0 onboard flow)

// Random hometown assigned from race, 20 new players generated, placed in Division 3

app.post('/api/clubs/create', async (req, res) => {

  try {

    const { userId, managerName, clubName, shortName, race } = req.body;



    if (!userId || !managerName || !clubName || !race) {

      return res.status(400).json({ error: 'Missing required club creation parameters.' });

    }



    const created = await createHumanClub({

      userId,

      managerName,

      clubName,

      shortName: shortName || clubName,

      race,

    });



    res.json({...created, players:created.players.map(serializePlayerForOwner)});

  } catch (err: any) {

    console.error('Failed to create human club:', err);

    res.status(500).json({ error: err.message });

  }

});



// 6. Update club presentation

app.post('/api/clubs/:clubId/presentation', async (req, res) => {

  try {

    const { clubId } = req.params;

    const { presentation } = req.body;



    await db

      .update(clubs)

      .set({ presentation: presentation || '' })

      .where(eq(clubs.id, clubId));



    res.json({ success: true });

  } catch (err: any) {

    res.status(500).json({ error: err.message });

  }

});



// 7. Save Lineup

app.post('/api/clubs/:clubId/lineup', async (req, res) => {

  try {

    const { clubId } = req.params;

    const { lineup } = req.body;

    const squad = await db.select().from(players).where(eq(players.clubId, clubId));

    const invalid = validateLineup(lineup, squad as any);

    if(invalid) return res.status(400).json({error:invalid});



    await db

      .update(clubs)

      .set({ lineup })

      .where(eq(clubs.id, clubId));



    res.json({ success: true });

  } catch (err: any) {

    res.status(500).json({ error: err.message });

  }

});



// 8. Save Training Points

app.post('/api/clubs/:clubId/training', async (req, res) => {

  try {

    const { clubId } = req.params;

    const { trainingPoints } = req.body;

    const [trainingClub] = await db.select().from(clubs).where(eq(clubs.id,clubId));

    const keys=['snabbhet','kondition','markering','passning','teknik','speluppfattning','skott','malvakt','tuffhet'];

    if(!trainingPoints||Object.keys(trainingPoints).some(k=>!keys.includes(k))||keys.some(k=>!Number.isInteger(trainingPoints[k])||trainingPoints[k]<0||trainingPoints[k]>10)||Object.values(trainingPoints).reduce((a:number,b:any)=>a+b,0)>6+((trainingClub?.coach as any)?.trainingBonus||0))return res.status(400).json({error:'Ogiltig träningsfördelning.'});



    await db

      .update(clubs)

      .set({ trainingPoints })

      .where(eq(clubs.id, clubId));



    res.json({ success: true });

  } catch (err: any) {

    res.status(500).json({ error: err.message });

  }

});



// 9. Update Doctor Investment & Treat Injury

app.post('/api/clubs/:clubId/doctor', async (req, res) => {

  try {

    const { clubId } = req.params;

    const { doctorInvestment } = req.body;

    if(!Number.isInteger(doctorInvestment)||doctorInvestment<0||doctorInvestment>100000) return res.status(400).json({error:"Ogiltig läkarkostnad."});



    await db

      .update(clubs)

      .set({ doctorInvestment })

      .where(eq(clubs.id, clubId));



    res.json({ success: true });

  } catch (err: any) {

    res.status(500).json({ error: err.message });

  }

});



app.post('/api/players/:playerId/treat', (_req, res) => {

  res.status(405).json({ error: 'Direktbehandling är inte tillåten. Aktuella skador läker tidsbaserat utifrån läkarsatsningen.' });

});



// 10. Save Arena Configuration

app.post('/api/clubs/:clubId/arena', async (req, res) => {

  try {

    const { clubId } = req.params;

    const supplied = req.body.arena;

    if (!supplied?.name?.trim() || supplied.name.length>80) return res.status(400).json({error:'Ange ett arenanamn.'});

    const arena=arenaConfig(supplied.name,supplied.landscape,supplied.underlag,supplied.typeDescription,supplied.capacity,supplied.additions||[]);

    const newGold=await db.transaction(async(tx:any)=>{

      const [club]=await tx.select().from(clubs).where(eq(clubs.id,clubId)).for('update');

      if(!club||club.gold<arena.cost) throw Error('Otillräckligt med guld.');

      await tx.update(clubs).set({arena,gold:club.gold-arena.cost}).where(eq(clubs.id,clubId));

        await put('ledger','arena-'+randomUUID(),{clubId,category:'Arenabygge',amount:-arena.cost,date:new Date().toISOString()},tx);

      return club.gold-arena.cost;

    });

    res.json({success:true,gold:newGold});

  } catch (err: any) {

    res.status(500).json({ error: err.message });

  }

});



// 11. Division Standings (Shared across all managers)

app.get('/api/divisions/:divisionName/standings', async (req, res) => {

  try {

    const { divisionName } = req.params;

    const divisionClubs = await db

      .select()

      .from(clubs)

      .where(eq(clubs.division, divisionName))

      .orderBy(desc(clubs.merit), desc(clubs.wins));



    const [w]=await db.select().from(worldState);const selected=Number(req.query.season||w.season);
    const rows=selected===w.season?divisionClubs:(await record('season-history-'+selected))?.tables?.[divisionName]||[];
    res.json(rows.map((c:any)=>({id:c.id,name:c.name,race:c.race,position:c.position,wins:c.wins,draws:c.draws,losses:c.losses,goalsFor:c.goalsFor,goalsAgainst:c.goalsAgainst})));

  } catch (err: any) {

    res.status(500).json({ error: err.message });

  }

});



// 13. Shared Tipset: Submit coupon

app.post('/api/tipset', async (req, res) => {

  try {

    const { clubId, season, round, predictions } = req.body;

    const [coupon] = await db

      .insert(tipsetCoupons)

      .values({

        clubId,

        season: season || 1,

        round: round || 1,

        predictions,

        pointsAwarded: 0,

      })

      .returning();



    res.json(coupon);

  } catch (err: any) {

    res.status(500).json({ error: err.message });

  }

});



// 14. Authoritative Match Simulation (First official match in Season 1)

app.post('/api/matches/simulate-round', async (req, res) => {

  return res.status(405).json({error:'Matcher spelas tisdag och fredag klockan 19.00.'});

  try {

    const { userClubId } = req.body;



    const [userClub] = await db.select().from(clubs).where(eq(clubs.id, userClubId)).limit(1);

    if (!userClub) return res.status(404).json({ error: 'User club not found' });



    // Pick opponent in same division

    const oppClubs = await db

      .select()

      .from(clubs)

      .where(sql`${clubs.division} = ${userClub.division} AND ${clubs.id} != ${userClub.id}`)

      .limit(1);



    if (oppClubs.length === 0) {

      return res.status(400).json({ error: 'No opponent found in division.' });

    }



    const opponent = oppClubs[0];

    const userSquad = await db.select().from(players).where(eq(players.clubId, userClub.id));

    const oppSquad = await db.select().from(players).where(eq(players.clubId, opponent.id));



    // Authoritative match simulation

    const matchReport = simulateMatch(userClub as any, opponent as any, userSquad as any, oppSquad as any);



    // Save match to database

    await db.insert(matches).values({

      id: matchReport.id,

      season: 1,

      round: 1,

      division: userClub.division,

      homeClubId: userClub.id,

      awayClubId: opponent.id,

      homeScore: matchReport.finalScore.home,

      awayScore: matchReport.finalScore.away,

      matchReport,

    });



    // Update records

    const isHomeWin = matchReport.finalScore.home > matchReport.finalScore.away;

    const isAwayWin = matchReport.finalScore.away > matchReport.finalScore.home;

    const isDraw = matchReport.finalScore.home === matchReport.finalScore.away;



    const newHomeWins = userClub.wins + (isHomeWin ? 1 : 0);

    const newHomeDraws = userClub.draws + (isDraw ? 1 : 0);

    const newHomeLosses = userClub.losses + (isAwayWin ? 1 : 0);



    await db

      .update(clubs)

      .set({

        wins: newHomeWins,

        draws: newHomeDraws,

        losses: newHomeLosses,

        goalsFor: userClub.goalsFor + matchReport.finalScore.home,

        goalsAgainst: userClub.goalsAgainst + matchReport.finalScore.away,

        recordString: `${newHomeWins}/${newHomeDraws}/${newHomeLosses}`,

        gold: userClub.gold,

        merit: userClub.merit,

      })

      .where(eq(clubs.id, userClub.id));



    const newAwayWins = opponent.wins + (isAwayWin ? 1 : 0);

    const newAwayDraws = opponent.draws + (isDraw ? 1 : 0);

    const newAwayLosses = opponent.losses + (isHomeWin ? 1 : 0);



    await db

      .update(clubs)

      .set({

        wins: newAwayWins,

        draws: newAwayDraws,

        losses: newAwayLosses,

        goalsFor: opponent.goalsFor + matchReport.finalScore.away,

        goalsAgainst: opponent.goalsAgainst + matchReport.finalScore.home,

        recordString: `${newAwayWins}/${newAwayDraws}/${newAwayLosses}`,

        merit: opponent.merit,

      })

      .where(eq(clubs.id, opponent.id));



    // Increment world match counter

    await db.update(worldState).set({

      totalMatchesPlayed: sql`${worldState.totalMatchesPlayed} + 1`,

      updatedAt: new Date(),

    });



    // Refresh updated user club

    const [updatedUserClub] = await db.select().from(clubs).where(eq(clubs.id, userClub.id));

    const updatedPlayers = await db.select().from(players).where(eq(players.clubId, userClub.id));



    res.json({

      matchReport,

      updatedClub: updatedUserClub,

      updatedPlayers: updatedPlayers.map(serializePlayerForOwner),

    });

  } catch (err: any) {

    console.error('Failed to simulate match:', err);

    res.status(500).json({ error: err.message });

  }

});



// Matches history

app.get('/api/clubs/:clubId/matches', async (req, res) => {

  try {

    const { clubId } = req.params;

    const playedMatches = await db

      .select()

      .from(matches)

      .where(sql`${matches.homeClubId} = ${clubId} OR ${matches.awayClubId} = ${clubId}`)

      .orderBy(desc(matches.playedAt));



    res.json(playedMatches);

  } catch (err: any) {

    res.status(500).json({ error: err.message });

  }

});



// ==========================================

// VITE SPA MIDDLEWARE / STATIC ASSETS

// ==========================================

async function startServer() {

  await withInitializationLock(async()=>{
  await initializeDatabase();
  const simulatedClock=await record('local-test-clock');if(simulatedClock&&!process.env.PUBLIC_ORIGIN)synchronizeGameClock(Date.now()+simulatedClock.offset);

  await initializeSeason1World(false);

  await initializeExpansion();

  await initializeFeatures();
  await initializeRevision8();await initializeUnreservedBids();await initializeMatchMerit();await initializeRevision13();await initializeRevision14();

  });
  await tickWorld();
  await backupDatabase();

  const backupTimer=setInterval(()=>void backupDatabase().catch(console.error),30*60*1000);
  let activeTick: Promise<any> = Promise.resolve();

  const ticker = setInterval(()=>{activeTick=activeTick.then(()=>tickWorld()).catch(console.error)},30000);

  if (process.env.NODE_ENV !== 'production') {

    const vite = await createViteServer({

      server: { middlewareMode: true },

      appType: 'spa',

    });

    app.use(vite.middlewares);

  } else {

    const distPath = path.join(process.cwd(), 'dist');

    app.use(express.static(distPath));

    app.get('*', (req, res) => {

      res.sendFile(path.join(distPath, 'index.html'));

    });

  }



  const listener = app.listen(PORT, process.env.RAILWAY_ENVIRONMENT ? '0.0.0.0' : (process.env.HOST || '127.0.0.1'), () => {

    console.log(`Mambenna game server running on http://localhost:${PORT}`);

  });

  let stopping=false;

  const stopFile=path.resolve('./data/stop-server');

  if(existsSync(stopFile))unlinkSync(stopFile);

  const shutdown=async()=>{

    if(stopping)return;stopping=true;clearInterval(ticker);clearInterval(stopWatcher);clearInterval(backupTimer);

    console.log('Sparar och stänger Arena...');

    await new Promise<void>((resolve,reject)=>listener.close(e=>e?reject(e):resolve()));

    await activeTick;await backupDatabase();await closeDatabase();process.exit(0);

  };

  const stopWatcher=setInterval(()=>{if(existsSync(stopFile)){unlinkSync(stopFile);shutdown().catch(console.error)}},1000);

  process.once('SIGINT',()=>void shutdown());process.once('SIGTERM',()=>void shutdown());

  listener.once('error',async e=>{console.error(e);clearInterval(ticker);clearInterval(stopWatcher);clearInterval(backupTimer);await closeDatabase();process.exit(1)});

}



startServer().catch((error) => { console.error(error); process.exit(1); });

