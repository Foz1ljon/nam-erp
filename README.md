# NamMotors ERP / CRM

Elektr dvigatel va suv nasoslari ishlab chiqaruvchi zavod uchun ERP + CRM tizimi.
Stek: **Nuxt 4 · Vue 3 · Naive UI · Tailwind CSS v4 · TypeScript · Nitro · MongoDB (Mongoose) · Zod**.

## Demo ma'lumotlar

```bash
pnpm dev            # bitta terminalda
pnpm demo:seed      # ikkinchisida: 14 kunlik zavod ishini haqiqiy API orqali yaratadi
```

Skript har bir bosqichni mas'ul hodim nomidan bajaradi (kirim → liteyka → topshirish/qabul → pishka stroy → sifat nazorati → CHPU → sklad → obmotka/yig'ish → bo'yash → birka/sinov → tayyor ombor), shuningdek B2B mijozlar, lidlar, sotuvlar, to'lovlar va Telegram/Instagram yozishmalarini yaratadi, keyin har bir kunni o'tgan sanaga suradi. Ikkinchi marta ishga tushirish: `pnpm demo:seed --force`. Sozlamalar: `BASE_URL`, `DAYS`, `NUXT_MONGO_URI`.

## Ishga tushirish

```bash
pnpm install
cp .env.example .env      # NUXT_MONGO_URI va NUXT_SESSION_PASSWORD ni sozlang
pnpm dev                  # http://localhost:3000
```

Birinchi ishga tushishda baza avtomatik to'ldiriladi (bo'limlar, mahsulotlar, retseptlar).
`NUXT_SEED_DEMO=true` bo'lsa, demo hodimlar, boshlang'ich qoldiqlar, kontragentlar va lidlar ham yaratiladi.

| Login | Parol | Rol |
|---|---|---|
| `admin` | `admin123` (yoki `NUXT_ADMIN_PASSWORD`) | Administrator |
| `rahbar`, `ombor`, `taminot`, `liteyka`, `pishka`, `chpu`, `yiguv`, `boyoq`, `sifat`, `sotuv` | `nammotors` | demo hodimlar |

> Production'da demo'ni o'chiring (`NUXT_SEED_DEMO=false`) va admin parolini o'zgartiring.

## Ishlab chiqarish oqimi

```
Xomashyo ombori ──(topshirish)──▶ LITEYKA: quyish (kg → quyma dona)
                                     ▲         │ quymani sotish mumkin
      qirindi, brak, ortiqcha quyma  │         ▼ topshirish
                                     └── PISHKA STROY: tozalash ──▶ SIFAT NAZORATI
                                                                        │ yaroqli
                                                                        ▼
                                          CHPU: rezba ochish ──▶ SKLAD (yarim tayyor, sim, jeleza, detallar)
                                                                        │ topshirish      ▲ kirim (xarid)
                                                                        ▼
                                  YIG'UV: obmotka ──▶ yig'ish ──▶ SIFAT NAZORATI
                                                                        ▼
                                  BO'YOQ: bo'yash ──▶ birka + qadoq (seriya №) ──▶ [dvigatel: to'liq sinov] ──▶ TAYYOR OMBOR ──▶ SOTUV
```

- **Operatsiya** (`/production/[bosqich]`) — ishchi natijani kiritadi; sarf retsept (BOM) bo'yicha avtomatik hisoblanadi, qirindi liteykaga qaytadi.
- **Topshirish** (`/transfers`) — bo'limlar orasida jonli topshirish: jo'natuvchi yuboradi, qabul qiluvchi tasdiqlaydi yoki rad etadi. Tasdiqlanguncha mahsulot «yo'lda».
- **Sifat nazorati** (`/qc`) — yaroqlisi keyingi bo'limga, braki liteykaga qirindi (kg) yoki brak izolyatoriga o'tadi.
- **Tayyorlab topshirish** — operatsiya formasida «Tayyor bo'lgach darhol keyingi bo'limga topshirish» yoqilgan bo'lsa (liteyka → pishka stroy, CHPU → sklad, yig'ish → bo'yoq, qadoq → tayyor ombor), natija saqlanishi bilan keyingi bo'limga yuboriladi va u yerdagi hodim qabul qiladi.
- **Yordam turlari (driver.js)** — har bir sahifada «Yordam» tugmasi va formalarda «Formani qanday to'ldirish kerak?» tugmasi sahifadagi har bir tugma va maydonni ketma-ket tushuntiradi. Hodim sahifani birinchi ochganda tur bir marta avtomatik boshlanadi; ruxsati yo'q tugmalar turda ko'rsatilmaydi. Matnlar: `app/utils/tours.ts`, elementlar `data-tour="..."` bilan belgilanadi.
- **Seriya raqamlari** — qadoqlashda har bir dvigatel/nasosga `NM-YYMM-000001` raqami beriladi, birkalar chop etiladi, sotuvda FIFO bo'yicha mijozga biriktiriladi.

## Modullar

| Modul | Sahifa |
|---|---|
| Bosh sahifa (KPI, navbatlar, kam qolgan zaxira) | `/` |
| Ishlab chiqarish oqimi va 7 bosqich | `/production`, `/production/:stage` |
| Sifat nazorati | `/qc` |
| Topshirish / qabul | `/transfers` |
| Ombor: qoldiq, kirim, inventarizatsiya, jurnal, seriyalar | `/warehouse/*` |
| Sotuv buyurtmalari (tasdiqlash, jo'natish, to'lovlar, qarzdorlik) | `/sales` |
| CRM lidlar (kanban, faoliyat, vazifalar, buyurtmaga aylantirish) | `/crm/leads` |
| Ma'lumotnomalar: mahsulotlar + retsept (BOM), kontragentlar, bo'limlar | `/catalog/*` |
| Hisobotlar: ishlab chiqarish, hodimlar unumdorligi, sifat, sotuv, ombor qiymati | `/reports` |
| Hodimlar va rollar | `/users` |

## Mijozlar (B2B), Telegram / Instagram va AI yordamchi

- **Mijozlar** (`/crm/clients`) — rekvizitlar (STIR, bank, MFO, OKED), shartnoma, to'lov muddati, kredit limiti, mas'ul menejer. Mijoz kartasida buyurtmalar, to'lovlar, qarz, eng ko'p olgan mahsulotlar, lidlar va yozishmalar ko'rinadi.
- **Profillar** (`/crm/channels`) — sotuv menejeri o'zining **shaxsiy** profilini ulaydi:
  - *Telegram*: telefon → kod → (2FA parol). MTProto (GramJS) orqali; ERP Telegram'da «NamMotors ERP» qurilmasi bo'lib ko'rinadi. Standart holatda faqat telefon kontaktlarida yo'q odamlarning (yangi mijozlar) yozishmalari olinadi.
    Admin bir marta [my.telegram.org/apps](https://my.telegram.org/apps) dan `api_id` / `api_hash` kiritadi.
  - *Instagram*: «Instagram orqali kirish» (rasmiy Instagram Login). Akkaunt **Professional** (Business/Creator) bo'lishi, ERP esa https manzilga ega bo'lishi kerak; admin Meta ilovasining App ID/Secret'ini kiritadi va sahifada ko'rsatilgan Redirect URI / Webhook URL'ni Meta'ga qo'shadi. Javob faqat mijozning oxirgi xabaridan keyingi 24 soat ichida.
  - Yangi yozgan har bir odam avtomatik **lid** bo'ladi; javoblar `/crm/inbox` dan menejerning o'z nomidan yuboriladi. Sessiya va tokenlar bazada AES-256-GCM bilan shifrlangan (`NUXT_SESSION_PASSWORD` dan olingan kalit — uni o'zgartirsangiz, profillarni qayta ulash kerak).
- **AI yordamchi** (`/ai`, rahbar va admin) — «kecha liteykada kim nima qildi», «brak nega oshdi», «qarzdor mijozlarni Excel qil» kabi savollarga ERP ma'lumotlaridan javob beradi. Faqat o'qiydi; Excel fayllarni yaratib yuklab olish havolasini beradi.
  Provayderlar (sozlamalar oynasidan tanlanadi, kalit shifrlangan saqlanadi):

  | Provayder | Narx | Izoh |
  |---|---|---|
  | Google Gemini (`gemini-2.5-flash`) | bepul limit | Boshlash uchun tavsiya: o'zbek tilini yaxshi tushunadi. Bepul tarifda so'rovlardan Google foydalanishi mumkin |
  | Groq (`llama-3.3-70b-versatile`) | bepul limit | Juda tez |
  | OpenRouter (`…:free` modellar) | bepul limit | Bepul modellar ro'yxati tez-tez o'zgaradi |
  | Ollama (`qwen2.5:14b`) | bepul, lokal | Ma'lumot tashqariga chiqmaydi, kuchli kompyuter kerak |
  | Anthropic Claude (`claude-opus-5`) | pullik | Eng yuqori sifat |
  | Boshqa OpenAI-mos API | — | LM Studio, vLLM, DeepSeek va h.k. |

- **Ovoz bilan ishlash** — AI oynasida 🎤: savol ovoz bilan beriladi (Gemini zavod atamalari lug'ati bilan matnga aylantiradi, Groq Whisper ham qo'llab-quvvatlanadi), javob avtomatik ovozda o'qiladi; har bir javob ostida «Eshitish» tugmasi bor. Ovoz brauzerda 16 kHz WAV qilib yoziladi — barcha brauzerlarda ishlaydi.
- **Moslashuvchan interfeys** — telefonda chiqadigan menyu, planshetda ikonkali panel, kompyuterda to'liq panel.

## Arxitektura

- `shared/utils` — rollar, bosqichlar konfiguratsiyasi (`stages.ts`), ruxsatlar matritsasi (`permissions.ts`), formatlash. Klient va server birgalikda ishlatadi.
- `server/utils/models.ts` — Mongoose sxemalari. `server/utils/stock.ts` — ombor harakatlari: har bir chiqim `qty >= n` sharti bilan atomar `$inc`, xatoda kompensatsiya (standalone MongoDB'da ham manfiy qoldiq bo'lmaydi). Har bir harakat `stockmoves` jurnaliga yoziladi.
- `server/api/**` — Nitro endpointlar, Zod validatsiya, `{ success, data }` javob formati, `requireAuth(event, permission)` bilan ruxsat tekshiruvi.
- `app/` — Nuxt sahifalari, Naive UI komponentlari, Pinia (`stores/refs.ts` — ma'lumotnomalar keshi), `useApiData` (SSR-xavfsiz GET) va `useApiAction` (mutatsiya + xabar).
