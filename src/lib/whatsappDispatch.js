// WhatsApp dispatch module — structure ready for future API integration.
// When the WhatsApp Business API gateway is connected, update sendWhatsAppMessage
// to make the actual HTTP call. No other code in the app needs to change.

export function isWhatsAppConfigured() {
  // Returns true when WhatsApp API credentials are configured.
  // TODO: Check for API credentials (env var or store config) when gateway is connected.
  return false;
}

export async function sendWhatsAppMessage(phone, message) {
  if (!phone || !message) return { success: false, reason: 'missing_params' };
  const formatted = formatPhoneForWhatsApp(phone);

  if (!isWhatsAppConfigured()) {
    // Structure ready — when the gateway is connected, replace this stub
    // with the actual API call. The rest of the app already calls this function.
    console.info('[WhatsApp] Dispatch prepared (gateway not connected):', { to: formatted, message });
    return { success: false, reason: 'whatsapp_not_configured', to: formatted };
  }

  // TODO: Replace with actual WhatsApp Business API call, e.g.:
  // const res = await fetch('https://graph.facebook.com/v18.0/<phone_id>/messages', {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ messaging_product: 'whatsapp', to: formatted, type: 'text', text: { body: message } })
  // });
  // return { success: res.ok };
  return { success: false, reason: 'not_implemented' };
}

export function formatPhoneForWhatsApp(phone) {
  if (!phone) return '';
  let cleaned = String(phone).replace(/\D/g, '');
  // Assume Brazil (55) if no country code
  if (cleaned.length === 11 || cleaned.length === 10) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
}