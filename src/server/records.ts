import {db} from '../db';import {gameRecords} from '../db/schema';import {eq} from 'drizzle-orm';
export async function records(kind:string,tx:any=db):Promise<any[]>{return (await tx.select().from(gameRecords).where(eq(gameRecords.kind,kind))).map((r:any)=>({id:r.id,...r.payload}))}
export async function put(kind:string,id:string,payload:any,tx:any=db){await tx.insert(gameRecords).values({id,kind,payload}).onConflictDoUpdate({target:gameRecords.id,set:{payload}})}
export async function record(id:string,tx:any=db){const [r]=await tx.select().from(gameRecords).where(eq(gameRecords.id,id));return r?{id:r.id,...r.payload}:null;}

