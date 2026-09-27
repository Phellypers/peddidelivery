import twilio from 'twilio';
import sendgrid from '@sendgrid/mail';
import { env } from '../../config/env.js';

export type CommunicationResult={success:true;id:string;channel:'sms'|'whatsapp'|'email'|'voice';status?:string};

function e164(value:string){const digits=String(value||'').replace(/\D/g,'');const normalized=(digits.length===10||digits.length===11)?`55${digits}`:digits;if(!/^\d{10,15}$/.test(normalized))throw new Error('Número de destino inválido. Use DDI, DDD e número.');return `+${normalized}`}
function twilioClient(){if(!env.twilioAccountSid||!env.twilioAuthToken)throw new Error('Twilio não configurado: informe TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN.');return twilio(env.twilioAccountSid,env.twilioAuthToken)}
function logFailure(channel:string,error:unknown){const details=error as {code?:unknown;status?:unknown;message?:unknown};console.error(`[Communications:${channel}] Falha`,{code:details?.code,status:details?.status,message:String(details?.message||error)})}

/** No Trial, o destino precisa estar em Verified Caller IDs ou autorizado no Sandbox. */
export async function sendSMS(to:string,body:string):Promise<CommunicationResult>{
 try{if(!env.twilioPhoneNumber)throw new Error('TWILIO_PHONE_NUMBER não configurado.');if(!body?.trim())throw new Error('Mensagem SMS vazia.');const result=await twilioClient().messages.create({from:e164(env.twilioPhoneNumber),to:e164(to),body:body.trim()});return{success:true,id:result.sid,channel:'sms',status:result.status}}
 catch(error){logFailure('sms',error);throw error}
}

/** O destinatário deve ingressar no Twilio Sandbox; o SDK exige o prefixo whatsapp:. */
export async function sendWhatsApp(to:string,body:string):Promise<CommunicationResult>{
 try{const sender=env.twilioWhatsAppNumber||env.twilioPhoneNumber;if(!sender)throw new Error('TWILIO_WHATSAPP_NUMBER não configurado.');if(!body?.trim())throw new Error('Mensagem WhatsApp vazia.');const result=await twilioClient().messages.create({from:`whatsapp:${e164(sender)}`,to:`whatsapp:${e164(to)}`,body:body.trim()});return{success:true,id:result.sid,channel:'whatsapp',status:result.status}}
 catch(error){logFailure('whatsapp',error);throw error}
}

export async function sendEmail(to:string,subject:string,content:string):Promise<CommunicationResult>{
 try{if(!env.sendgridApiKey||!env.sendgridEmailFrom)throw new Error('SendGrid não configurado: informe SENDGRID_API_KEY e SENDGRID_EMAIL_FROM.');if(!to||!subject?.trim()||!content?.trim())throw new Error('Destinatário, assunto e conteúdo são obrigatórios.');sendgrid.setApiKey(env.sendgridApiKey);const[result]=await sendgrid.send({to,from:env.sendgridEmailFrom,subject:subject.trim(),text:content.trim(),html:`<div style="font-family:Arial,sans-serif;white-space:pre-wrap">${content.replace(/[&<>]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]!))}</div>`});return{success:true,id:String(result.headers['x-message-id']||''),channel:'email',status:String(result.statusCode)}}
 catch(error){logFailure('email',error);throw error}
}

/** No Trial, chamadas só alcançam números verificados em Verified Caller IDs. */
export async function makePhoneCall(to:string,message:string):Promise<CommunicationResult>{
 try{if(!env.twilioPhoneNumber)throw new Error('TWILIO_PHONE_NUMBER não configurado.');if(!message?.trim())throw new Error('Mensagem de voz vazia.');const response=new twilio.twiml.VoiceResponse();response.say({language:'pt-BR',voice:'Polly.Camila'},message.trim());const call=await twilioClient().calls.create({from:e164(env.twilioPhoneNumber),to:e164(to),twiml:response.toString()});return{success:true,id:call.sid,channel:'voice',status:call.status}}
 catch(error){logFailure('voice',error);throw error}
}

export function communicationStatus(){return{twilio:Boolean(env.twilioAccountSid&&env.twilioAuthToken&&env.twilioPhoneNumber),whatsapp:Boolean(env.twilioAccountSid&&env.twilioAuthToken&&(env.twilioWhatsAppNumber||env.twilioPhoneNumber)),sendgrid:Boolean(env.sendgridApiKey&&env.sendgridEmailFrom)}}
