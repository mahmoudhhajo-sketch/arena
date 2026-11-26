export function mailReadyToSend(m:any,now=Date.now()){
 return !!m&&!m.sentAt&&Number(m.attempts||0)<5&&(!m.retryAt||+new Date(m.retryAt)<=now)&&(!m.notBefore||+new Date(m.notBefore)<=now);
}
export function mimeBody(text:string,html?:string){
 const encode=(value:string)=>(Buffer.from(value).toString('base64').match(/.{1,76}/g)||['']).join('\r\n');
 const part=(type:string,value:string)=>['Content-Type: '+type+'; charset=UTF-8','Content-Transfer-Encoding: base64','',encode(value)].join('\r\n');
 if(!html)return part('text/plain',text);
 const boundary='arena-mail-alternative-96';
 return ['Content-Type: multipart/alternative; boundary="'+boundary+'"','','--'+boundary,part('text/plain',text),'--'+boundary,part('text/html',html),'--'+boundary+'--'].join('\r\n');
}
