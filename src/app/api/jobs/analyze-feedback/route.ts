import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { AiError, aiErrorMessage } from "@/lib/ai";
import { analyzeFeedback } from "@/lib/analyze-feedback";
import { embedText } from "@/lib/embeddings";
import { MAX_RETRIES } from "@/lib/qstash";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

// Embedding du retour, pour repérer les doublons. Non critique : s'il échoue, l'analyse est enregistrée sans lui.
async function embedFeedback(summary: string, content: string): Promise<number[] | null> {
  try {
    return await embedText(`${summary}\n${content}`);
  } catch (error) {
    console.error("Embedding du retour impossible :", error);
    return null;
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof AiError) {
    return error.status === 429 || error.status >= 500;
  }
  // Délai dépassé, panne réseau ou erreur inattendue : une nouvelle tentative peut réussir
  return true;
}

async function handle(request: Request) {
  const { feedbackId } = await request.json();
  const attempt = Number(request.headers.get("Upstash-Retried") ?? "0");

  // Le worker n'a pas d'utilisateur connecté : il utilise le client administrateur
  const supabase = createSupabaseAdminClient();

  const { data: feedback } = await supabase
    .from("feedback")
    .select("id, content, declared_type, analysis_status, user_id")
    .eq("id", feedbackId)
    .maybeSingle();

  // Idempotence : un retour absent ou déjà traité n'est pas analysé une seconde fois
  if (!feedback || feedback.analysis_status !== "pending") {
    return Response.json({ result: "skipped" });
  }

  try {
    const result = await analyzeFeedback(feedback, feedback.user_id);

    const { error } = await supabase.from("analyses").insert({
      feedback_id: feedback.id,
      user_id: feedback.user_id,
      category: result.category,
      severity: result.severity,
      summary: result.summary,
      repro_steps: result.repro_steps,
      target_type: result.target_type,
      target_id: result.target_id,
      verdict: result.verdict,
      evidence: result.evidence,
      suggested_reply: result.suggested_reply,
      model: process.env.AI_MODEL,
    });

    if (error) {
      throw new Error(`Enregistrement de l'analyse impossible : ${error.message}`);
    }

    const embedding = await embedFeedback(result.summary, feedback.content);

    // Ce changement de statut est l'événement que reçoit le navigateur en temps réel
    await supabase
      .from("feedback")
      .update({ analysis_status: "ready", ...(embedding && { embedding: JSON.stringify(embedding) }) })
      .eq("id", feedback.id);

    return Response.json({ result: "ready" });
  } catch (error) {
    console.error(`Échec de l'analyse (tentative ${attempt + 1}) :`, error);

    if (isRetryable(error) && attempt < MAX_RETRIES) {
      return Response.json({ result: "retry" }, { status: 500 });
    }

    await supabase
      .from("feedback")
      .update({ analysis_status: "error", error_message: aiErrorMessage(error) })
      .eq("id", feedback.id);

    return Response.json({ result: "error" });
  }
}

export const POST = verifySignatureAppRouter(handle);
