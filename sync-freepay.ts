import { supabaseAdmin } from "./src/integrations/supabase/client.server";
import { processWebhookEvent } from "./src/lib/webhook.server";

async function forceSync() {
  const { data: sales } = await supabaseAdmin
    .from("sales")
    .select("*")
    .eq("status", "waiting_payment")
    .order("created_at", { ascending: false })
    .limit(50);

  const freepaySales = sales?.filter(s => (s.raw_payload as any)?.provider === 'freepay') || [];

  if (freepaySales.length === 0) {
    console.log("No pending freepay sales found.");
    return;
  }

  console.log(`Checking ${freepaySales.length} pending freepay sales...`);

  for (const sale of freepaySales) {
    const pub = process.env.FREEPAY_PUBLIC_KEY;
    const sec = process.env.FREEPAY_SECRET_KEY;
    if (!pub || !sec) {
      console.error("FREEPAY keys not configured in environment.");
      return;
    }

    const auth = "Basic " + Buffer.from(`${pub}:${sec}`).toString("base64");
    const hash = sale.transaction_hash;

    try {
      const res = await fetch(`https://api.freepaybrasil.com/v1/payment-transaction/get/${hash}`, {
        headers: { Authorization: auth }
      });

      if (!res.ok) {
        console.log(`[${hash}] Failed to fetch from Freepay: ${res.status}`);
        continue;
      }

      const json = await res.json();
      const status = json.data?.status || json.status;
      
      console.log(`[${hash}] Current status: ${status}`);

      if (status === "PAID" || status === "APPROVED") {
        console.log(`[${hash}] Found PAID order! Processing...`);
        await processWebhookEvent({
          hash,
          status: "paid",
          paymentMethod: "pix",
          rawPayload: json
        });
        console.log(`[${hash}] ✅ Synced as PAID`);
      }
    } catch (e) {
      console.error(`[${hash}] Error checking status:`, e);
    }
  }
}

forceSync();
