// Supabase Edge Function: ai-briefing
// 배포 방법:
//   supabase functions deploy ai-briefing
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) {
      return new Response(
        JSON.stringify({ error: 'ANTHROPIC_API_KEY가 설정되지 않았습니다.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { tickets } = await req.json()

    const activeTickets = tickets.filter((t: { status: string }) => t.status === 'in_progress')
    const resolvedTickets = tickets.filter((t: { status: string }) => t.status === 'resolved')
    const urgentTickets = activeTickets.filter((t: { priority: string }) => t.priority === 'urgent')
    const highTickets = activeTickets.filter((t: { priority: string }) => t.priority === 'high')

    const ticketSummary = activeTickets
      .slice(0, 8)
      .map((t: { priority: string; title: string; description: string }) =>
        `- [${t.priority}] ${t.title}: ${t.description.substring(0, 80)}`
      )
      .join('\n')

    const prompt = `다음은 CS 팀의 현재 업무 현황입니다.

[업무 통계]
- 진행중: ${activeTickets.length}건
- 완료: ${resolvedTickets.length}건
- 긴급: ${urgentTickets.length}건
- 높음: ${highTickets.length}건

[진행중 업무 목록]
${ticketSummary || '없음'}

위 내용을 바탕으로 한국어로 간결한 CS 브리핑을 3~5문장으로 작성해주세요.
다음 순서로: 1) 현황 요약, 2) 가장 시급한 업무 (있다면), 3) 오늘 집중 액션.
마크다운 기호(#, *, -) 없이 순수 텍스트로, 친근하고 실용적으로 작성해주세요.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await response.json()
    const briefing = data.content?.[0]?.text || '브리핑 생성에 실패했습니다.'

    return new Response(
      JSON.stringify({ briefing }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
