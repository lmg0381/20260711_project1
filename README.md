# 🎱 로또 데이터 분석 추첨기

실제 과거 당첨 데이터(동행복권 로또 6/45)를 분석해 번호를 추천하는 웹 도구입니다.
바이브 코딩 실습으로 제작했습니다.

> ⚠️ 로또는 매 회차가 완전히 독립적인 무작위 추첨이라, 과거 데이터로 다음 번호를
> **실제로 예측하는 것은 불가능**합니다(도박사의 오류). 이 도구의 통계 분석은 당첨 확률을
> 높여주지 않으며, 기대 회수율은 약 50%로 항상 손해입니다. **재미로만** 사용하세요.

## 기능

- **실제 데이터 분석**: 1회차(2002)부터 최신까지 전체 당첨 결과를 로우 데이터로 사용
- **분석 구간 선택**: 최근 10 / 100 / 1000회 / 전체
- **추첨 전략**
  - 🔥 핫넘버 — 자주 나온 번호 위주
  - ❄️ 콜드넘버 — 안 나오고 오래된 번호 위주
  - ⚖️ 균형 — 실제 출현 빈도에 비례
- **보너스 번호 포함** (6개 + 보너스)
- **실제 당첨 패턴 필터**: 번호합(100~175)·홀짝·고저 비율이 역대 당첨 범위를 따르도록 필터링
- **역대 최고 성적 조회**: 추천 조합을 과거 전 회차와 대조해 몇 등까지 됐을지 + 해당 회차 표시
- **고급 옵션**: 고정수(축 베팅) · 제외수 · 연속번호 금지
- **🔮 행운번호 챗봇 (GPT 연동)**: 생년월일·태어난 시간(모름 가능)을 입력받아, 생일에서 뽑은
  "행운수"에 가중치를 더해 통계 분석과 함께 추천. GPT가 사주 관점의 해설을 붙이고 자유 대화도 가능
  (같은 생일=같은 운명번호, 재미용). AI 미연결 시 로컬 기본 안내로 자동 폴백.

## 챗봇(GPT) 배포 설정 — Vercel

챗봇의 AI 응답은 **서버리스 함수 `api/chat.js`**가 처리합니다. API 키는 브라우저에 노출되지
않고 Vercel 환경변수에서만 읽습니다.

1. Vercel 프로젝트 → **Settings → Environment Variables**
2. 다음을 추가:
   | 이름 | 값 | 필수 |
   |------|-----|------|
   | `OPENAI_API_KEY` | 본인 OpenAI API 키(`sk-...`) | ✅ |
   | `OPENAI_MODEL` | 사용할 모델 ID (기본값 `gpt-5.4-mini`) | 선택 |
3. **Redeploy** 하면 챗봇이 GPT로 동작합니다.

> ⚠️ 로컬(`file://`)이나 키 미설정 시에는 `/api/chat`가 없거나 오류이므로,
> 챗봇은 자동으로 로컬 기본 안내로 폴백합니다.
> `OPENAI_MODEL`은 본인 계정에서 실제 지원되는 모델 ID로 맞춰 주세요.

## 추천 결과 저장 — Supabase

챗봇이 번호를 추천할 때마다 결과가 **서버리스 함수 `api/save-reading.js`**를 통해
Supabase에 저장됩니다(키는 서버에서만 사용, 클라이언트 미노출).

**1) Supabase 테이블 생성** — SQL 편집기에서 실행:

```sql
create table if not exists public.saju_recommendations (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  birth_date date,
  birth_hour int,
  lucky_numbers int[] not null default '{}',
  numbers int[] not null default '{}',
  bonus int,
  best_tier text,
  strategy text,
  data_range text
);
alter table public.saju_recommendations enable row level security;
-- service_role 키는 RLS를 우회하므로 별도 정책 없이도 서버에서 INSERT 됩니다.
```

**2) Vercel 환경변수 추가** (Settings → Environment Variables):

| 이름 | 값 | 필수 |
|------|-----|------|
| `SUPABASE_URL` | Supabase Project URL (`https://xxxx.supabase.co`) | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API → **service_role** 시크릿 | ✅ |

**3) Redeploy** 하면 저장이 활성화됩니다.

> 🔒 `service_role` 키는 관리자 권한이라 절대 클라이언트/깃에 노출하지 마세요(환경변수에만).
> 저장 실패는 조용히 무시되어 챗봇 사용에는 영향이 없습니다.
> 생년월일·시간은 개인정보이므로, 실제 서비스라면 이용자에게 수집 안내를 제공하세요.
- **상세 통계**: 번호별 출현 빈도 차트, 평균 번호합/홀짝 등 (접이식)

## 사용법

`index.html`을 브라우저에서 열면 됩니다. 별도 설치 불필요.
Vercel 등에 배포하면 루트 주소(`/`)에서 바로 열립니다.

## 파일 구성

| 파일 | 설명 |
|------|------|
| `index.html` | 분석 로직 + UI + 챗봇 (메인) |
| `lotto_data.js` | 로또 전체 당첨 결과 데이터 |
| `api/chat.js` | GPT 프록시 서버리스 함수 (Vercel) |
| `api/save-reading.js` | 추천 결과를 Supabase에 저장하는 서버리스 함수 |

## 데이터 출처

- 동행복권 로또 6/45 당첨 결과
- 데이터셋: [github.com/smok95/lotto](https://github.com/smok95/lotto)
