import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonRes(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonRes({ error: "Não autorizado" }, 401);

    const { evento_id, lead_id, tom = "premium" } = await req.json();
    if (!evento_id && !lead_id) return jsonRes({ error: "evento_id ou lead_id é obrigatório" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    // Verify user token
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authErr || !user) return jsonRes({ error: "Token inválido" }, 401);

    // Build context based on source (lead or evento)
    const context = lead_id ? await buildLeadContext(sb, lead_id) : await buildEventoContext(sb, evento_id);

    // Generate proposal via AI
    const proposta = await generateProposta(context, tom);
    return jsonRes({ proposta });
  } catch (e) {
    console.error("generate-proposta error:", e);
    return jsonRes({ error: e instanceof Error ? e.message : "Erro desconhecido" }, 500);
  }
});

// ─── Build context from Lead ──────────────────────────────────
async function buildLeadContext(sb: any, leadId: string) {
  const { data: lead, error } = await sb.from("leads").select("*").eq("id", leadId).single();
  if (error || !lead) throw new Error("Lead não encontrado");

  let itensCardapio: any[] = [];
  if (lead.cardapio_id) {
    const { data: cardapio } = await sb
      .from("cardapios")
      .select("nome, valor_sugerido_pp, cardapio_itens(nome)")
      .eq("id", lead.cardapio_id)
      .single();
    if (cardapio) {
      itensCardapio = [{
        nome: cardapio.nome,
        valor_pp: cardapio.valor_sugerido_pp,
        itens: (cardapio.cardapio_itens ?? []).map((i: any) => i.nome),
      }];
    }
  }

  const valorEvento = lead.valor_evento ?? 0;
  const convidados = lead.numero_convidados ?? 0;
  const precoPP = convidados > 0 ? valorEvento / convidados : 0;

  const itensInclusos = [
    "Equipe completa",
    "Copos de vidro",
    "Pratos de cerâmica",
    "Talheres de inox",
    "Todos os utensílios descartáveis necessários",
    "Rechaud",
    "Suqueiras de vidro 5 Litros",
    "Utensílios de inox",
  ];

  return {
    evento: {
      nome: lead.nome,
      tipo: lead.tipo_evento ?? "evento",
      data: lead.data_prevista,
      convidados,
      local: lead.endereco ?? "A definir",
      horario_inicio: null,
      horario_fim: null,
    },
    financeiro: {
      valor_total: valorEvento,
      preco_por_pessoa: Math.round(precoPP * 100) / 100,
      custo_total: 0,
      margem: 0,
    },
    cardapio: itensCardapio,
    equipe: [],
    itens_inclusos: itensInclusos,
  };
}

// ─── Build context from Evento ────────────────────────────────
async function buildEventoContext(sb: any, eventoId: string) {
  const [eventoRes, equipeRes, cardapioRes, custosRes] = await Promise.all([
    sb.from("eventos").select("*").eq("id", eventoId).single(),
    sb.from("evento_equipe").select("*, equipe(nome, funcao)").eq("evento_id", eventoId),
    sb.from("evento_cardapio").select("cardapio_id, cardapios(nome, valor_sugerido_pp, cardapio_itens(nome))").eq("evento_id", eventoId),
    sb.from("custos_evento").select("descricao, categoria, valor").eq("evento_id", eventoId),
  ]);

  if (eventoRes.error || !eventoRes.data) throw new Error("Evento não encontrado");

  const evento = eventoRes.data;
  const equipe = equipeRes.data ?? [];
  const cardapios = cardapioRes.data ?? [];
  const custos = custosRes.data ?? [];

  const custoTotal = custos.reduce((s: number, c: any) => s + (c.valor || 0), 0);
  const valorTotal = evento.valor_total ?? 0;
  const convidados = evento.numero_convidados ?? 0;
  const precoPP = convidados > 0 ? valorTotal / convidados : 0;
  const margem = valorTotal > 0 ? ((valorTotal - custoTotal) / valorTotal) * 100 : 0;

  const itensCardapio = cardapios.flatMap((ec: any) => {
    const c = ec.cardapios;
    if (!c) return [];
    return [{ nome: c.nome, valor_pp: c.valor_sugerido_pp, itens: (c.cardapio_itens ?? []).map((i: any) => i.nome) }];
  });

  const membrosEquipe = equipe.map((ee: any) => ({
    nome: ee.equipe?.nome ?? "—",
    funcao: ee.equipe?.funcao ?? "—",
  }));

  const itensInclusos = [
    "Equipe completa",
    "Copos de vidro",
    "Pratos de cerâmica",
    "Talheres de inox",
    "Todos os utensílios descartáveis necessários",
    "Rechaud",
    "Suqueiras de vidro 5 Litros",
    "Utensílios de inox",
  ];

  return {
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
    itens_inclusos: itensInclusos,
  };
}

// ─── Generate proposal via AI ─────────────────────────────────
async function generateProposta(context: any, tom: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

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

  const tipoKey = (context.evento.tipo ?? "").toLowerCase();
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
                abertura: { type: "string", description: "Saudação personalizada e breve introdução (2-3 parágrafos)" },
                descricao_evento: { type: "string", description: "Descrição do evento: tipo, número de convidados, data, local" },
                cardapio: { type: "string", description: "Apresentação curta e elegante do cardápio em 1 parágrafo (2-4 frases). NÃO liste os pratos individualmente — eles serão exibidos automaticamente abaixo em formato de bullets. Foque em qualidade, cuidado na seleção dos ingredientes e na experiência gastronômica que será oferecida." },
                servicos: { type: "string", description: "Serviços inclusos: equipe, estrutura, atendimento. OBRIGATÓRIO: incluir todos os itens da lista 'itens_inclusos' do contexto (copos de vidro, pratos de cerâmica, talheres de inox, rechaud, suqueiras de vidro, utensílios descartáveis, utensílios de inox) de forma organizada e valorizada" },
                investimento: { type: "string", description: "Valor total, valor por pessoa. Apresentar como investimento, não custo" },
                encerramento: { type: "string", description: "Reforço de valor e chamada para ação" },
                observacoes_finais: { type: "string", description: "Observações importantes, condições e prazos (1-2 parágrafos curtos)" },
                forma_pagamento: { type: "string", description: "Sugestão de forma de pagamento (curto, 1-2 frases)" },
              },
              required: ["abertura", "descricao_evento", "cardapio", "servicos", "investimento", "encerramento", "observacoes_finais", "forma_pagamento"],
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
    if (status === 429) throw new Error("Limite de requisições excedido. Tente novamente em alguns instantes.");
    if (status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos ao seu workspace.");
    const errText = await aiResponse.text();
    console.error("AI error:", status, errText);
    throw new Error("Erro ao gerar proposta");
  }

  const aiData = await aiResponse.json();
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) throw new Error("A IA não retornou a proposta no formato esperado");

  return JSON.parse(toolCall.function.arguments);
}
