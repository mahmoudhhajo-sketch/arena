import {accrueMana} from '../engine/magicEconomy';
import {eq} from 'drizzle-orm';
import {clubs,players} from '../db/schema';
import {put,record} from './records';
import {manaClusterGain,quickrootPlayer} from '../engine/manaArtifacts';
import {teamNews} from './newsStatistics';

/** Caller owns the inventory row lock. Lock club before changing its balance. */
export async function useTeamArtifact(tx:any,item:any,now=new Date()){
 if(!['quickroot','mana-cluster'].includes(item.artifactId))throw Error('Artefakten kan inte användas på laget.');
 const [club]=await tx.select().from(clubs).where(eq(clubs.id,item.clubId)).for('update');
 if(!club)throw Error('Laget saknas.');
 if(item.artifactId==='mana-cluster'){
  const state=accrueMana(await record('mana-'+club.id,tx),+now);
  const gain=manaClusterGain(state.mana);if(!gain)throw Error('Laget behöver mana innan klustret kan användas.');
  await put('mana','mana-'+club.id,{...state,mana:state.mana+gain},tx);
 }else{
  for(const p of await tx.select().from(players).where(eq(players.clubId,club.id)).for('update')){
   if(p.isDeceased||p.isMercenary)continue;
   await tx.update(players).set(quickrootPlayer(p)).where(eq(players.id,p.id));
  }
  await put('morale-change','quickroot-'+item.id,{clubId:club.id,date:now.toISOString(),penalty:0,bonus:5,source:'quickroot'},tx);
 }
 await put('artifact-item',item.id,{...item,clubId:null,consumedByClubId:club.id,consumedAt:now.toISOString(),listed:false},tx);
}

export async function awardChampionCluster(tx:any,clubId:string,season:number,now:Date){
 const id='champion-mana-cluster-'+season;if(await record(id,tx))return false;
 await put('artifact-item',id,{artifactId:'mana-cluster',clubId,playerId:null,listed:false,acquiredAt:now.toISOString(),source:'imperial-champion',season},tx);
 await teamNews(tx,clubId,id,'Kejsarens gåva: ett Manakluster','Som vinnare av Kejsarserien har laget fått ett Manakluster. Det finns i artefaktförrådet.');return true;
}
