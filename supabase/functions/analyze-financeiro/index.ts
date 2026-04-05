import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user session
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get aggregated financial data via SQL function
    const serviceClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: snapshot, error: rpcError } = await serviceClient.rpc(
      "get_ai_financial_snapshot"
    );

    if (rpcError) {
      console.error("RPC error:", rpcError);
      return new Response(
        JSON.stringify({ error: "Erro ao buscar dados financeiros" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const financialData = snapshot;

    // Check if there's enough data
    if (!financialData || financialData.eventos === 0) {
      return new Response(
        JSON.stringify({
          resumo:
            "Ainda não há eventos cadastrados no sistema. Cadastre eventos, custos e pagamentos para que a análise financeira possa ser gerada.",
          problemas: [],
          oportunidades: [],
          alertas: [],
          recomendacoes: [
            "Cadastre seus primeiros eventos para começar a acompanhar as finanças do seu buffet.",
          ],
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `Você é um consultor financeiro especialista em fluxo de caixa de buffet.
Analise EXCLUSIVAMENTE os dados fornecidos. NÃO invente números. NÃO use informações externas.
Todas as suas respostas devem ser específicas, acionáveis e baseadas nos dados reais.
Valores monetários devem ser formatados em Reais (R$).

Considere:
- "faturamento_total" = valor total contratado dos eventos
- "recebido" = dinheiro efetivamente recebido (parcelas pagas)
- "a_receber" = parcelas pendentes
- "atrasado" = parcelas em atraso (inadimplência)
- "custos" = total de custos registrados
- "entradas" / "saidas" = movimentações reais do caixa
- "saldo_atual" = entradas - saídas (dinheiro real disponível)
- "saldo_futuro" = saldo_atual + a_receber
- "lucro" = faturamento - custos
- "margem" = percentual de lucro sobre faturamento
- "eventos_prejuizo" = eventos onde custo > valor contratado

Responda SEMPRE com o seguinte JSON (sem markdown, sem code blocks):
{
  "resumo": "texto com análise geral da saúde financeira",
  "problemas": ["problema 1", "problema 2"],
  "oportunidades": ["oportunidade 1"],
  "alertas": ["alerta 1"],
  "recomendacoes": ["recomendação 1", "recomendação 2"]
}

Se os dados forem insuficientes para alguma seção, retorne array vazio [].
Seja direto, prático e use os números reais dos dados.`;

    const userPrompt = `Analise os seguintes dados financeiros do meu buffet e gere insights acionáveis:

${JSON.stringify(financialData, null, 2)}`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "financial_analysis",
                description: "Return the structured financial analysis",
                parameters: {
                  type: "object",
                  properties: {
                    resumo: { type: "string", description: "Executive summary of the financial health" },
                    problemas: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of identified problems",
                    },
                    oportunidades: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of opportunities",
                    },
                    alertas: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of alerts",
                    },
                    recomendacoes: {
                      type: "array",
                      items: { type: "string" },
                      description: "List of actionable recommendations",
                    },
                  },
                  required: ["resumo", "problemas", "oportunidades", "alertas", "recomendacoes"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "financial_analysis" } },
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      const body = await aiResponse.text();
      console.error("AI gateway error:", status, body);

      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos nas configurações." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "Erro ao gerar análise com IA" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    
    // Extract from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    let analysis;

    if (toolCall?.function?.arguments) {
      try {
        analysis = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse tool call arguments");
      }
    }

    // Fallback: try to parse from content
    if (!analysis) {
      const content = aiData.choices?.[0]?.message?.content ?? "";
      try {
        const cleaned = content.replace(/```json\n?/g, "").replace(/```/g, "").trim();
        analysis = JSON.parse(cleaned);
      } catch {
        analysis = {
          resumo: content || "Não foi possível gerar a análise.",
          problemas: [],
          oportunidades: [],
          alertas: [],
          recomendacoes: [],
        };
      }
    }

    return new Response(JSON.stringify(analysis), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-financeiro error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
