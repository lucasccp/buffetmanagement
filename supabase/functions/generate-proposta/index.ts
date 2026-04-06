import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { evento_id, tom = "premium" } = await req.json();
    if (!evento_id) {
      return new Response(JSON.stringify({ error: "evento_id é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Verify user token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all event data in parallel
    const [eventoRes, equipeRes, cardapioRes, custosRes, pagamentosRes] = await Promise.all([
      sb.from("eventos").select("*").eq("id", evento_id).single(),
      sb.from("evento_equipe").select("*, equipe(nome, funcao)").eq("evento_id", evento_id),
      sb.from("evento_cardapio").select("cardapio_id, cardapios(nome, valor_sugerido_pp, cardapio_itens(nome))").eq("evento_id", evento_id),
      sb.from("custos_evento").select("descricao, categoria, valor").eq("evento_id", evento_id),
      sb.from("pagamentos_evento").select("valor, status").eq("evento_id", evento_id),
    ]);

    if (eventoRes.error || !eventoRes.data) {
      return new Response(JSON.stringify({ error: "Evento não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const evento = eventoRes.data;
    const equipe = equipeRes.data ?? [];
    const cardapios = cardapioRes.data ?? [];
    const custos = custosRes.data ?? [];
    const pagamentos = pagamentosRes.data ?? [];

    const custoTotal = custos.reduce((s: number, c: any) => s + (c.valor || 0), 0);
    const valorTotal = evento.valor_total ?? 0;
    const convidados = evento.numero_convidados ?? 0;
    const precoPP = convidados > 0 ? valorTotal / convidados : 0;
    const margem = valorTotal > 0 ? ((valorTotal - custoTotal) / valorTotal) * 100 : 0;

    const itensCardapio = cardapios.flatMap((ec: any) => {
      const c = ec.cardapios;
      if (!c) return [];
      const itens = (c.cardapio_itens ?? []).map((i: any) => i.nome);
      return [{ nome: c.nome, valor_pp: c.valor_sugerido_pp, itens }];
    });

    const membrosEquipe = equipe.map((ee: any) => ({
      nome: ee.equipe?.nome ?? "—",
      funcao: ee.equipe?.funcao ?? "—",
    }));

    const context = {
      evento: {
        nome: evento.nome_evento,
        tipo: evento.tipo_evento ?? "evento",
        data: evento.data_evento,
        convidados,
        local: evento.local ?? "A definir",
        horario_inicio: evento.horario_inicio,
        horario_fim: evento.horario_fim,
      },
      financeiro: {
        valor_total: valorTotal,
        preco_por_pessoa: Math.round(precoPP * 100) / 100,
        custo_total: custoTotal,
        margem: Math.round(margem * 10) / 10,
      },
      cardapio: itensCardapio,
      equipe: membrosEquipe,
    };

    const tomDescriptions: Record<string, string> = {
      premium: "Tom sofisticado, elegante e premium. Use linguagem refinada que transmita exclusividade e alto padrão.",
      simples: "Tom amigável e acessível. Linguagem clara e direta, sem ser rebuscada.",
      direto: "Tom profissional e objetivo. Vá direto ao ponto, sem floreios.",
    };

    const tipoInstructions: Record<string, string> = {
      casamento: "Para casamentos, use tom emocional e elegante. Destaque a importância do momento e como o buffet vai torná-lo inesquecível.",
      corporativo: "Para eventos corporativos, seja profissional e direto. Foque em eficiência, qualidade e pontualidade.",
      aniversario: "Para aniversários, use tom leve e acolhedor. Destaque a celebração e a alegria do momento.",
    };

    const tipoKey = (evento.tipo_evento ?? "").toLowerCase();
    const tipoInstruction = tipoInstructions[tipoKey] ?? "Adapte a linguagem ao tipo de evento de forma profissional.";

    const systemPrompt = `Você é um especialista em vendas de buffet de alto padrão. Sua função é criar propostas comerciais persuasivas e personalizadas.

REGRAS:
- NÃO invente dados que não existem no contexto fornecido
- NÃO altere valores financeiros
- Use APENAS os dados fornecidos
- ${tomDescriptions[tom] ?? tomDescriptions.premium}
- ${tipoInstruction}
- A proposta deve valorizar o serviço e destacar diferenciais
- Escreva em português brasileiro`;

    const userPrompt = `Gere uma proposta comercial completa para o seguinte evento. Use APENAS os dados fornecidos:

${JSON.stringify(context, null, 2)}

Gere a proposta usando a função generate_proposta.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              name: "generate_proposta",
              description: "Gera uma proposta comercial estruturada para buffet",
              parameters: {
                type: "object",
                properties: {
                  abertura: {
                    type: "string",
                    description: "Saudação personalizada e breve introdução (2-3 parágrafos)",
                  },
                  descricao_evento: {
                    type: "string",
                    description: "Descrição do evento: tipo, número de convidados, data, local",
                  },
                  cardapio: {
                    type: "string",
                    description: "Apresentação do cardápio com itens organizados e destaque de qualidade",
                  },
                  servicos: {
                    type: "string",
                    description: "Serviços inclusos: equipe, estrutura, atendimento",
                  },
                  investimento: {
                    type: "string",
                    description: "Valor total, valor por pessoa. Apresentar como investimento, não custo",
                  },
                  encerramento: {
                    type: "string",
                    description: "Reforço de valor e chamada para ação",
                  },
                },
                required: ["abertura", "descricao_evento", "cardapio", "servicos", "investimento", "encerramento"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "generate_proposta" } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao seu workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI error:", status, errText);
      return new Response(JSON.stringify({ error: "Erro ao gerar proposta" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "A IA não retornou a proposta no formato esperado" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const proposta = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ proposta }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-proposta error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
