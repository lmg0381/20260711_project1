// Vercel 서버리스 함수: 브라우저 <-> OpenAI 사이의 안전한 프록시
// API 키는 절대 클라이언트에 노출되지 않으며, Vercel 환경변수에서만 읽습니다.
//   필수:  OPENAI_API_KEY   (OpenAI API 키)
//   선택:  OPENAI_MODEL     (기본값 gpt-5.4-mini)
module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST 요청만 허용됩니다.' });
    return;
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'OPENAI_API_KEY 환경변수가 설정되지 않았습니다. Vercel 프로젝트 Settings > Environment Variables 에서 추가한 뒤 재배포하세요.'
    });
    return;
  }
  const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const messages = Array.isArray(body.messages) ? body.messages.slice(-12) : [];
    const context = body.context || {};

    const payload = {
      model,
      messages: [{ role: 'system', content: buildSystemPrompt(context) }, ...messages],
    };

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json();
    if (!resp.ok) {
      res.status(resp.status).json({ error: (data && data.error && data.error.message) || 'OpenAI API 오류' });
      return;
    }

    const reply = (data && data.choices && data.choices[0] && data.choices[0].message
      && data.choices[0].message.content || '').trim() || '(응답이 비어 있어요)';
    res.status(200).json({ reply });
  } catch (e) {
    res.status(500).json({ error: '서버 오류: ' + (e && e.message ? e.message : String(e)) });
  }
};

// 사용자 컨텍스트를 바탕으로 시스템 프롬프트 구성
function buildSystemPrompt(c) {
  c = c || {};
  const L = [];
  L.push('당신은 한국 로또 6/45 "행운번호 챗봇"입니다. 사용자의 생년월일·태어난 시간을 바탕으로 사주/운세 분위기로 번호를 재미있게 풀어주는, 친근하고 따뜻한 챗봇입니다.');
  L.push('규칙:');
  L.push('1) 로또 번호는 반드시 아래 [추천 번호]에 주어진 숫자만 사용하고, 숫자를 새로 지어내지 마세요.');
  L.push('2) 한국어로 2~5문장, 따뜻하고 간결하게. 이모지는 1~2개까지만.');
  L.push('3) 운세는 재미를 위한 것이며 실제 당첨 확률과는 무관함을, 대화 중 가끔(매번은 아님) 자연스럽게 상기시켜 주세요.');
  L.push('4) 사용자가 번호를 원하면 [추천 번호]를 제시하고, 생일 기반 행운수와 엮어 이유를 이야기해 주세요.');
  L.push('');
  L.push('[사용자 정보]');
  L.push('생년월일: ' + (c.date || '미상'));
  L.push('태어난 시간: ' + (c.hour == null ? '모름' : c.hour + '시'));
  L.push('생일 기반 행운수: ' + ((c.lucky && c.lucky.join(', ')) || '없음'));
  if (c.latestDraw) {
    L.push('참고-최근 당첨(' + c.latestDraw.round + '회): ' +
      (c.latestDraw.numbers || []).join(', ') + ' + 보너스 ' + c.latestDraw.bonus);
  }
  L.push('');
  if (c.recommendation) {
    L.push('[추천 번호] (이 숫자만 사용하세요)');
    L.push('메인 6개: ' + c.recommendation.six.join(', '));
    L.push('보너스: ' + c.recommendation.bonus);
    L.push('이 조합의 역대 최고 성적: ' + c.recommendation.bestTier);
  } else {
    L.push('[추천 번호] 없음 — 이번 답변에서는 새 번호를 제시하지 말고 대화만 이어가세요.');
  }
  return L.join('\n');
}
