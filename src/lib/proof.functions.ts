import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const uploadProof = createServerFn({ method: "POST" })
  .inputValidator((d: { hash: string; dataUrl: string }) => {
    if (!d?.hash) throw new Error("hash obrigatório");
    if (!d?.dataUrl || typeof d.dataUrl !== "string") throw new Error("arquivo inválido");
    // ~6MB cap on base64 string
    if (d.dataUrl.length > 6 * 1024 * 1024) throw new Error("Arquivo grande demais");
    return d;
  })
  .handler(async ({ data }) => {
    const uploadedAt = new Date().toISOString();

    const { data: existing, error: selErr } = await supabaseAdmin
      .from("sales")
      .select("raw_payload")
      .eq("transaction_hash", data.hash)
      .maybeSingle();
    if (selErr) throw new Error(selErr.message);

    const prevRaw =
      (existing?.raw_payload as Record<string, unknown> | null) ?? {};
    const newRaw = {
      ...prevRaw,
      proof_data_url: data.dataUrl,
      proof_uploaded_at: uploadedAt,
    };

    if (existing) {
      const { error } = await supabaseAdmin
        .from("sales")
        .update({
          raw_payload: newRaw,
          updated_at: uploadedAt,
        })
        .eq("transaction_hash", data.hash);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin.from("sales").insert({
        transaction_hash: data.hash,
        status: "waiting_payment",
        raw_payload: newRaw,
      });
      if (error) throw new Error(error.message);
    }

    return { ok: true, uploadedAt };
  });
