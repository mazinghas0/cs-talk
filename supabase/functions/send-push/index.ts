// Supabase Edge Function: send-push
// 배포: supabase functions deploy send-push
// Secrets 설정:
//   supabase secrets set VAPID_PUBLIC_KEY=<공개키>
//   supabase secrets set VAPID_PRIVATE_KEY=<비밀키>

import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!vapidPublicKey || !vapidPrivateKey || !supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: '환경변수 미설정' }), { status: 500, headers: corsHeaders });
    }

    webpush.setVapidDetails('mailto:admin@cs-talk.app', vapidPublicKey, vapidPrivateKey);

    const authHeader = { 'apikey': serviceRoleKey, 'Authorization': `Bearer ${serviceRoleKey}` };
    const apiBase = `${supabaseUrl}/rest/v1`;

    const body = await req.json();
    const { type, table, record, old_record } = body;

    let recipientUserIds: string[] = [];
    let notifTitle = '';
    let notifBody = '';
    let notifTag = '';

    if (table === 'messages' && type === 'INSERT') {
      // 새 메시지 → 같은 워크스페이스 멤버 (발송자 제외)
      const ticketRes = await fetch(`${apiBase}/tickets?id=eq.${record.ticket_id}&select=workspace_id,title`, { headers: authHeader });
      const tickets = await ticketRes.json();
      if (!tickets[0]) return new Response('ok', { headers: corsHeaders });

      const wsId = tickets[0].workspace_id;
      const membersRes = await fetch(`${apiBase}/workspace_members?workspace_id=eq.${wsId}&select=user_id`, { headers: authHeader });
      const members = await membersRes.json();

      recipientUserIds = members
        .map((m: { user_id: string }) => m.user_id)
        .filter((id: string) => id !== record.user_id);

      notifTitle = `새 메시지 — ${tickets[0].title ?? '업무 요청'}`;
      notifBody = (record.content ?? '').slice(0, 100);
      notifTag = `msg-${record.ticket_id}`;

    } else if (table === 'tickets' && type === 'INSERT') {
      // 신규 티켓 → 워크스페이스 멤버 (등록자 제외)
      const membersRes = await fetch(`${apiBase}/workspace_members?workspace_id=eq.${record.workspace_id}&select=user_id`, { headers: authHeader });
      const members = await membersRes.json();

      recipientUserIds = members
        .map((m: { user_id: string }) => m.user_id)
        .filter((id: string) => id !== record.requesting_user_id);

      notifTitle = '새 업무 요청이 등록됐습니다';
      notifBody = record.title ?? '';
      notifTag = `ticket-${record.id}`;

    } else if (table === 'tickets' && type === 'UPDATE') {
      // 담당자 배정 → 새 담당자에게만
      if (record.assignee_id && record.assignee_id !== old_record?.assignee_id) {
        recipientUserIds = [record.assignee_id];
        notifTitle = '담당자로 배정됐습니다';
        notifBody = record.title ?? '';
        notifTag = `assign-${record.id}`;
      }
    }

    if (recipientUserIds.length === 0) {
      return new Response(JSON.stringify({ sent: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // push_subscriptions 조회
    const idsParam = recipientUserIds.join(',');
    const subsRes = await fetch(
      `${apiBase}/push_subscriptions?user_id=in.(${idsParam})&select=endpoint,p256dh,auth`,
      { headers: authHeader }
    );
    const subscriptions: PushSubscription[] = await subsRes.json();

    const payload = JSON.stringify({ title: notifTitle, body: notifBody, tag: notifTag, url: '/' });

    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        )
      )
    );

    const sent = results.filter((r) => r.status === 'fulfilled').length;
    return new Response(
      JSON.stringify({ sent, total: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    console.error('send-push error:', err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
