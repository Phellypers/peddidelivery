import { peddiApi } from '@/services/api/peddiApi';

export function isWhatsAppConfigured(){return true}
export async function sendWhatsAppMessage(phone,message){
 if(!phone||!message)return{success:false,reason:'missing_params'};
 try{return await peddiApi.request('/api/v1/admin/communications/whatsapp',{method:'POST',headers:{Authorization:`Bearer ${localStorage.getItem('peddi_access_token')||''}`},body:JSON.stringify({to:phone,body:message})})}
 catch(error){console.error('[WhatsApp] Falha no envio',{message:error.message});return{success:false,reason:'send_failed',message:error.message}}
}
export function formatPhoneForWhatsApp(phone){if(!phone)return'';let cleaned=String(phone).replace(/\D/g,'');if(cleaned.length===10||cleaned.length===11)cleaned=`55${cleaned}`;return cleaned}
