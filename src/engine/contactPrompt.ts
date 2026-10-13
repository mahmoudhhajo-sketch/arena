const normalize=(value:string)=>String(value||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const excluded=new Set(['behemot bashers','chaos all stars','mongodroid androids','mongoloid androids','hälsingarna','jens styxon','odenallfader'].map(normalize));
export function needsContactPrompt(club:any,account:any){
 return !!club&&!!account&&!club.isBot&&['Division 1 Västra','Division 2 Clamklyte'].includes(club.division)
  &&!String(account.phone||'').trim()&&!account.whatsappContactChoice
  &&![club.name,club.ownerName,account.name,account.managerName].some(name=>excluded.has(normalize(name)));
}
export function contactChoice(body:any){
 if(body?.declined===true){if(String(body.phone||'').trim())throw Error('Välj antingen att lämna nummer eller att avstå.');return {declined:true,phone:null};}
 const phone=String(body?.phone||'').trim();
 if(!/^[+0-9 ()-]{7,30}$/.test(phone)||phone.replace(/\D/g,'').length<7||phone.replace(/\D/g,'').length>15)throw Error('Ange ett giltigt telefonnummer eller välj att avstå.');
 return {declined:false,phone};
}
