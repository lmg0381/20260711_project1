// Vercel 서버리스 함수: 사주 기반 추천 결과를 Supabase에 저장
// Supabase 비밀 키는 클라이언트에 노출되지 않고 환경변수에서만 읽습니다.
//   필수:  SUPABASE_URL               (예: https://xxxx.supabase.co)
//   필수:  SUPABASE_SERVICE_ROLE_KEY  (Project Settings > API > service_role 시크릿)
//
// 사전 준비: Supabase SQL 편집기에서 아래 테이블을 만들어 두세요.
//   create table if not exists public.saju_recommendations (
//     id bigint generated always as identity primary key,
//     created_at timestamptz not null default now(),
//     birth_date date,
//     birth_hour int,
//     lucky_numbers int[] not null default '{}',
//     numbers int[] not null default '{}',
//     bonus int,
//     best_tier text,
//     strategy text,
//     data_range text
//   );
//   alter table public.saju_recommendations enable row level security;
//   -- service_role 키는 RLS를 우회하므로 별도 정책 없이도 서버에서 INSERT 됩니다.
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    res.status(500).json({
      error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다. Vercel Settings > Environment Variables 에서 추가하세요.'
    });
    return;
  }

  try {
    const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});

    const cleanNums = a => (Array.isArray(a) ? a.map(Number).filter(n => Number.isFinite(n) && n >= 1 && n <= 45) : []);
    const row = {
      birth_date: b.birthDate || null,
      birth_hour: (b.birthHour === null || b.birthHour === undefined || b.birthHour === '') ? null : Number(b.birthHour),
      lucky_numbers: cleanNums(b.lucky),
      numbers: cleanNums(b.numbers),
      bonus: (b.bonus === null || b.bonus === undefined) ? null : Number(b.bonus),
      best_tier: b.bestTier || null,
      strategy: b.strategy || null,
      data_range: b.range == null ? null : String(b.range),
    };

    const resp = await fetch(`${url.replace(/\/$/, '')}/rest/v1/saju_recommendations`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (!resp.ok) {
      const t = await resp.text();
      res.status(resp.status).json({ error: 'Supabase 오류: ' + t.slice(0, 300) });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: '서버 오류: ' + (e && e.message ? e.message : String(e)) });
  }
};
