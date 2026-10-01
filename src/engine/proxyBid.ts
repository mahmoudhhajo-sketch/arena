export type BidMode='single'|'max';
export const nextBid=(price:number)=>Math.ceil(price*1.05);
export function resolveProxyPrice(auction:any,clubId:string,amount:number,mode:BidMode,incumbentMax?:number){
 let bidderId=auction.bidderId,price=auction.price;
 if(auction.bidderId===clubId){if(mode==='single')price=amount;}
 else if(!auction.bidderId){bidderId=clubId;price=auction.price;}
 else if(mode==='max'){
  const defending=Number(incumbentMax??auction.price);
  if(amount>defending){bidderId=clubId;price=Math.min(amount,nextBid(defending));}
  else price=Math.min(defending,nextBid(amount));
 }else if(incumbentMax!==undefined&&amount<=Number(incumbentMax))price=Math.min(Number(incumbentMax),nextBid(amount));
 else{bidderId=clubId;price=amount;}
 return {bidderId,price};
}
