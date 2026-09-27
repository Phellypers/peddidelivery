import { Router } from 'express';
import { z } from 'zod';
import { requireAuth,requireRoles } from '../../auth/middleware.js';
import { communicationStatus,makePhoneCall,sendEmail,sendSMS,sendWhatsApp } from './service.js';

export const communicationsRouter=Router();
const managers=[requireAuth,requireRoles('manager','peddi_admin')];
const phone=z.object({to:z.string().min(10).max(30),body:z.string().min(1).max(1500)});
communicationsRouter.get('/admin/communications/status',...managers,(_request,response)=>response.json(communicationStatus()));
communicationsRouter.post('/admin/communications/sms',...managers,async(request,response)=>{const input=phone.safeParse(request.body);if(!input.success)return response.status(400).json({error:'Número e mensagem inválidos.'});try{return response.status(202).json(await sendSMS(input.data.to,input.data.body))}catch(error){return response.status(502).json({error:error instanceof Error?error.message:'Falha no SMS.'})}});
communicationsRouter.post('/admin/communications/whatsapp',...managers,async(request,response)=>{const input=phone.safeParse(request.body);if(!input.success)return response.status(400).json({error:'Número e mensagem inválidos.'});try{return response.status(202).json(await sendWhatsApp(input.data.to,input.data.body))}catch(error){return response.status(502).json({error:error instanceof Error?error.message:'Falha no WhatsApp.'})}});
communicationsRouter.post('/admin/communications/email',...managers,async(request,response)=>{const input=z.object({to:z.string().email(),subject:z.string().min(1).max(200),content:z.string().min(1).max(20000)}).safeParse(request.body);if(!input.success)return response.status(400).json({error:'E-mail inválido.'});try{return response.status(202).json(await sendEmail(input.data.to,input.data.subject,input.data.content))}catch(error){return response.status(502).json({error:error instanceof Error?error.message:'Falha no e-mail.'})}});
communicationsRouter.post('/admin/communications/voice',...managers,async(request,response)=>{const input=phone.safeParse(request.body);if(!input.success)return response.status(400).json({error:'Número e mensagem inválidos.'});try{return response.status(202).json(await makePhoneCall(input.data.to,input.data.body))}catch(error){return response.status(502).json({error:error instanceof Error?error.message:'Falha na chamada.'})}});
