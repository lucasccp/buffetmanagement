import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { text } = await req.json();
    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: "Texto do PDF é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `Você é um especialista em análise de cardápios de buffet. Sua tarefa é analisar o texto extraído de um PDF de cardápio e retornar um JSON estruturado.

REGRAS OBRIGATÓRIAS:
1. Identifique TODAS as categorias presentes (ex: Bebidas, Sobremesas, Entradas, Pratos Principais, Salgados, etc.)
2. Agrupe cada item na categoria correta
3. Corrija palavras quebradas ou mal formatadas
4. Infira o tipo de cada item: "comida", "bebida" ou "sobremesa"
5. NÃO invente itens que não existam no texto
6. NÃO remova itens do texto original
7. NÃO misture categorias com nomes de itens
8. Se não houver categorias claras, use "Geral"
9. Remova duplicatas
10. O nome do cardápio deve ser inferido do título do documento ou usar "Cardápio Importado"

Exemplos de inferência de tipo:
- Água, Suco, Refrigerante, Cerveja, Vinho → "bebida"
- Bolo, Pudim, Mousse, Sorvete, Brigadeiro → "sobremesa"
- Todo o resto → "comida"

Exemplos de correção:
- "Água sa borizada" → "Água saborizada"
- "Refri gerante" → "Refrigerante"`;

    const userPrompt = `Analise o seguinte texto extraído de um PDF de cardápio e retorne o JSON estruturado:

${text}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "estruturar_cardapio",
              description: "Retorna o cardápio estruturado em categorias e itens",
              parameters: {
                type: "object",
                properties: {
                  nome_cardapio: {
                    type: "string",
                    description: "Nome do cardápio inferido do documento",
                  },
                  categorias: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nome: {
                          type: "string",
                          description: "Nome da categoria (ex: Bebidas, Sobremesas)",
                        },
                        itens: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              nome: { type: "string", description: "Nome do item" },
                              tipo: {
                                type: "string",
                                enum: ["comida", "bebida", "sobremesa"],
                                description: "Tipo do item",
                              },
                            },
                            required: ["nome", "tipo"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["nome", "itens"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["nome_cardapio", "categorias"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "estruturar_cardapio" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output");
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    // Post-processing: deduplicate and validate
    for (const cat of parsed.categorias) {
      const seen = new Set<string>();
      cat.itens = (cat.itens || []).filter((item: any) => {
        if (!item.nome || item.nome.trim().length === 0) return false;
        const key = item.nome.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }

    // Remove empty categories
    parsed.categorias = parsed.categorias.filter((c: any) => c.itens && c.itens.length > 0);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("parse-cardapio-ai error:", e);
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
