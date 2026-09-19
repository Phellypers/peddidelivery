import crypto from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { query } from '../db/client.js';
import { verifyAccessToken } from '../auth/tokens.js';

const normalizeEndpoint = (request:Request) => `${request.method} ${request.path.replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi,':id')}`;
let metrics=new Map<string,{endpoint:string;statusGroup:number;count:number;latency:number}>();
export async function flushRateLimitMetrics() {
  const pending=metrics;metrics=new Map();
  for(const item of pending.values()) {
    try {await query(`INSERT INTO api_request_metrics(endpoint,status_group,minute_start,request_count,latency_ms_sum)
      VALUES($1,$2,date_trunc('minute',now()),$3,$4)
      ON CONFLICT(endpoint,status_group,minute_start) DO UPDATE SET request_count=api_request_metrics.request_count+EXCLUDED.request_count,latency_ms_sum=api_request_metrics.latency_ms_sum+EXCLUDED.latency_ms_sum`,
      [item.endpoint,item.statusGroup,item.count,item.latency]);}
    catch {const key=`${item.endpoint}:${item.statusGroup}`,current=metrics.get(key);metrics.set(key,current?{...current,count:current.count+item.count,latency:current.latency+item.latency}:item);}
  }
}
const requestLimit = (role:string,endpoint:string) => {
  if (endpoint.includes('/auth/login')) return 10;
  if (endpoint.startsWith('POST /api/v1/orders') || endpoint.includes('/entities/Order')) return 15;
  if (endpoint.includes('/upload')) return 20;
  if (role==='manager' || role==='peddi_admin') return 180;
  if (role==='customer' || role==='courier') return 120;
  return 60;
};
const tokenIdentity = (request:Request) => {
  const header=request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    const loginEmail=request.path.endsWith('/auth/login')&&typeof request.body?.email==='string'?request.body.email.trim().toLowerCase():'';
    return {user:loginEmail?`login:${loginEmail}`:'anonymous',role:'anonymous'};
  }
  try {const token=verifyAccessToken(header.slice(7));return {user:String(token.sub),role:String(token.role)};} catch {return {user:'anonymous',role:'anonymous'};}
};

export async function rateLimit(request:Request,response:Response,next:NextFunction) {
  if (request.path==='/health' || request.method==='OPTIONS') return next();
  const endpoint=normalizeEndpoint(request),identity=tokenIdentity(request);
  const ipHash=crypto.createHash('sha256').update(request.ip || request.socket.remoteAddress || 'unknown').digest('hex').slice(0,24);
  const identityHash=crypto.createHash('sha256').update(`${identity.user}:${ipHash}`).digest('hex');
  const limit=requestLimit(identity.role,endpoint),started=Date.now();
  try {
    const result=await query<{request_count:number}>(`INSERT INTO api_rate_limits(identity_hash,endpoint,window_start,request_count)
      VALUES($1,$2,date_trunc('minute',now()),1)
      ON CONFLICT(identity_hash,endpoint,window_start) DO UPDATE SET request_count=api_rate_limits.request_count+1
      RETURNING request_count`,[identityHash,endpoint]);
    const remaining=Math.max(0,limit-Number(result.rows[0].request_count));
    response.setHeader('RateLimit-Limit',limit);response.setHeader('RateLimit-Remaining',remaining);
    if (remaining===0 && Number(result.rows[0].request_count)>limit) {
      response.setHeader('Retry-After','60');response.status(429).json({error:'Muitas solicitações. Aguarde um minuto e tente novamente.'});
    } else next();
  } catch { next(); }
  response.once('finish',()=>{const statusGroup=Math.floor(response.statusCode/100),key=`${endpoint}:${statusGroup}`,current=metrics.get(key);
    metrics.set(key,current?{...current,count:current.count+1,latency:current.latency+Date.now()-started}:{endpoint,statusGroup,count:1,latency:Date.now()-started});});
}
