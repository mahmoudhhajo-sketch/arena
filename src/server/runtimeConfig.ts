import 'dotenv/config';
if(!process.env.PUBLIC_ORIGIN && process.env.RAILWAY_PUBLIC_DOMAIN){
 process.env.PUBLIC_ORIGIN='https://'+process.env.RAILWAY_PUBLIC_DOMAIN;
}
if(process.env.PUBLIC_ORIGIN)process.env.PUBLIC_ORIGIN=process.env.PUBLIC_ORIGIN.replace(/\/+$/,'');
if(process.env.RAILWAY_ENVIRONMENT&&!process.env.PUBLIC_ORIGIN)throw Error('Generate a Railway public domain or configure PUBLIC_ORIGIN before starting Arena.');
