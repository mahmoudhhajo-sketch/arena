export async function sendContact(id:string,subject:string,message:string,clubId:string){
 if(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM)return false;
 const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':id},body:JSON.stringify({from:process.env.MAIL_FROM,to:['mahmoudhhajo@gmail.com'],subject:'[Arena '+id+'] '+subject,text:'Lag: '+clubId+'\n\n'+message}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw Error('Mejltjänsten kunde inte ta emot ärendet. Ärendet finns sparat lokalt.');return true;
}
