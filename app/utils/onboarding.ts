import type { Role } from '#shared/utils/constants'

export interface RoleGuide {
  /** Where the user starts working after the introduction. */
  home: string
  headline: string
  steps: { title: string; text: string; to?: string }[]
}

export const ROLE_GUIDES: Record<Role, RoleGuide> = {
  admin: {
    home: '/',
    headline: "Siz tizimni boshqarasiz: hodimlar, ruxsatlar, ma'lumotnomalar va integratsiyalar.",
    steps: [
      { title: "Hodimlarni qo'shing", text: "Har bir hodimga login, rol va bo'lim bering. Rol — u nimalarni ko'rishi va qaysi bosqichda ishlashini belgilaydi.", to: '/users' },
      { title: "Ma'lumotnomalarni to'ldiring", text: "Mahsulotlar, retseptlar (BOM), kontragentlar va bo'limlar — butun tizim shularga tayanadi.", to: '/catalog/items' },
      { title: 'Integratsiyalarni ulang', text: "Telegram/Instagram uchun kalitlar va AI modeli (bepul Gemini) — bir marta sozlanadi.", to: '/crm/channels' },
      { title: 'Nazorat qiling', text: "Bosh sahifa va hisobotlar zavodning butun holatini ko'rsatadi.", to: '/reports' },
    ],
  },
  director: {
    home: '/',
    headline: "Siz butun zavodni bitta ekrandan ko'rasiz: ishlab chiqarish, sifat, ombor, sotuv va hodimlar ishi.",
    steps: [
      { title: 'Bosh sahifa', text: "Bugun nima ishlab chiqarildi, nima qabul kutyapti, qancha sotildi — hammasi birinchi ekranda.", to: '/' },
      { title: 'AI yordamchi', text: "O'ng pastki burchakdagi tugma: «kecha kim nima qildi?», «qarzdorlarni Excel qil» deb yozing yoki ovoz bilan ayting.", to: '/ai' },
      { title: 'Hisobotlar', text: "Ishlab chiqarish, hodimlar unumdorligi, brak foizi, sotuv va ombor qiymati — istalgan davr uchun.", to: '/reports' },
      { title: 'Sotuv va mijozlar', text: "Lidlar voronkasi, B2B mijozlar, qarzdorlik va menejerlarning yozishmalari.", to: '/crm/clients' },
    ],
  },
  warehouse: {
    home: '/warehouse/stock',
    headline: "Siz sklad uchun javobgarsiz: qabul qilasiz, bo'limlarga berasiz va qoldiqni to'g'ri saqlaysiz.",
    steps: [
      { title: 'Qabul qilish', text: "CHPU'dan yarim tayyor detallar, bo'yoqxonadan tayyor nasoslar kelsa — «Topshirish / qabul» da sanab, qabul qiling.", to: '/transfers' },
      { title: "Bo'limlarga berish", text: "Yig'uvga detal, sim, jeleza; bo'yoqxonaga bo'yoq va qadoq — «Yangi topshirish» orqali.", to: '/transfers' },
      { title: 'Kirim', text: "Tashqaridan kelgan detal va materiallarni yetkazib beruvchi va narxi bilan kiriting.", to: '/warehouse/receipts' },
      { title: 'Inventarizatsiya', text: "Haqiqiy sanoq farq qilsa — shu yerda tuzating, har bir farq jurnalga yoziladi.", to: '/warehouse/adjustments' },
    ],
  },
  supply: {
    home: '/warehouse/receipts',
    headline: "Siz xomashyo va sotib olinadigan detallar bilan ta'minlaysiz.",
    steps: [
      { title: 'Kirim', text: "Chugun, metall, sim, podshipnik, parrak kelganda — yetkazib beruvchi, miqdor va narx bilan kiriting.", to: '/warehouse/receipts' },
      { title: 'Liteykaga topshirish', text: "Xomashyo omboridan liteykaga chugun berish — «Yangi topshirish». Quyuvchi qabul qiladi.", to: '/transfers' },
      { title: 'Kam qolgan zaxiralar', text: "Bosh sahifadagi ro'yxat nima tugayotganini ko'rsatadi — xaridni shunga qarab rejalang.", to: '/' },
    ],
  },
  foundry: {
    home: '/production/casting',
    headline: 'Siz liteykada quyasiz: chugundan dvigatel va nasos korpuslari, qopqoqlar.',
    steps: [
      { title: 'Chugunni qabul qiling', text: "Xomashyo omboridan chugun kelganda «Topshirish / qabul» da tasdiqlang.", to: '/transfers' },
      { title: 'Quyishni kiriting', text: "«Yangi operatsiya»: nechta quyma tayyorladingiz. Sarflangan chugun retsept bo'yicha o'zi hisoblanadi.", to: '/production/casting' },
      { title: 'Pishka stroyga topshiring', text: "Formada «darhol keyingi bo'limga topshirish» yoqilgan — pishka stroy qabul qiladi.", to: '/production/casting' },
      { title: 'Qirindi qaytadi', text: "Litnik, brak va qirindilar liteykaga qaytib, qayta eritiladi — qoldiqda ko'rinadi.", to: '/warehouse/stock' },
    ],
  },
  fettling: {
    home: '/production/cleaning',
    headline: "Siz pishka stroyda quymalarni qum va shlakdan tozalaysiz.",
    steps: [
      { title: 'Quymalarni qabul qiling', text: "Liteykadan kelgan quymalarni sanab, «Qabul qilish» ni bosing.", to: '/transfers' },
      { title: 'Tozalashni kiriting', text: "«Yangi operatsiya»: nechta quyma tozalandi va qancha qirindi chiqdi.", to: '/production/cleaning' },
      { title: 'Sifat nazorati', text: "Tozalangan quymalar avtomatik sifat nazoratiga boradi, o'tganlari CHPU'ga yuboriladi.", to: '/qc' },
    ],
  },
  cnc: {
    home: '/production/cnc',
    headline: "Siz CHPU stanoklarida rezba ochasiz — quyma yarim tayyor detalga aylanadi.",
    steps: [
      { title: 'Ishni kiriting', text: "«Yangi operatsiya»: qaysi detaldan nechta ishlov berdingiz.", to: '/production/cnc' },
      { title: 'Skladga topshiring', text: "Tayyor detallar skladga topshiriladi, omborchi qabul qiladi.", to: '/transfers' },
    ],
  },
  assembly: {
    home: '/production/assembly',
    headline: "Siz yig'uv bo'limida obmotka qilasiz va dvigatel hamda nasoslarni yig'asiz.",
    steps: [
      { title: 'Detallarni qabul qiling', text: "Skladdan kelgan korpus, rotor, podshipnik, sim va jelezani «Topshirish / qabul» da tasdiqlang.", to: '/transfers' },
      { title: 'Obmotka', text: "Statorlarni kiriting — sim va jeleza sarfi o'zi hisoblanadi.", to: '/production/winding' },
      { title: "Yig'ish", text: "Nechta dvigatel va nasos yig'ildi — kiritasiz, ular sifat nazoratiga, keyin bo'yoqxonaga boradi.", to: '/production/assembly' },
    ],
  },
  painter: {
    home: '/production/painting',
    headline: "Siz bo'yaysiz, birka yopishtirasiz va qadoqlaysiz.",
    steps: [
      { title: "Bo'yash", text: "Sifat nazoratidan o'tgan mahsulotlarni bo'yaganingizni kiriting.", to: '/production/painting' },
      { title: 'Birka va qadoq', text: "Har bir mahsulotga seriya raqami beriladi, birkalarni shu yerdan chop etasiz.", to: '/production/packaging' },
      { title: 'Omborga', text: "Dvigatellar to'liq sinovdan o'tadi, nasoslar esa to'g'ridan-to'g'ri tayyor omborga topshiriladi.", to: '/transfers' },
    ],
  },
  qc: {
    home: '/qc',
    headline: "Siz sifatni nazorat qilasiz: tozalashdan keyin, yig'ishdan keyin va dvigatellarning to'liq sinovi.",
    steps: [
      { title: 'Navbat', text: "Tekshiruv kutayotgan har bir operatsiya shu yerda. «Tekshirish» ni bosing.", to: '/qc' },
      { title: "O'tdi / brak", text: "Yaroqli va brak sonini kiriting. Yaroqlisi keyingi bo'limga o'zi o'tadi, brak liteykaga yoki izolyatorga.", to: '/qc' },
      { title: 'Nuqson sababi', text: "Sababni tanlang — hisobotda qaysi nuqson ko'p uchrayotgani ko'rinadi.", to: '/reports' },
    ],
  },
  sales: {
    home: '/crm/leads',
    headline: "Siz mijozlar bilan ishlaysiz: lidlardan sotuvgacha, to'lovlar va qarzdorlik.",
    steps: [
      { title: 'Profilingizni ulang', text: "Telegram va Instagram profilingizni ulang — mijozlar yozgan xabarlar CRM'ga tushadi va lid bo'ladi.", to: '/crm/channels' },
      { title: 'Lidlar', text: "Har bir qo'ng'iroq va yozishmani lidga yozing, kartani ustunlar bo'ylab suring.", to: '/crm/leads' },
      { title: 'Mijozlar', text: "B2B mijozlarning rekvizitlari, shartnomasi, xaridlari va qarzi — bitta kartada.", to: '/crm/clients' },
      { title: 'Buyurtma → jo\'natish → to\'lov', text: "Buyurtmani tasdiqlang, jo'nating (ombordan o'zi chiqim qilinadi) va to'lovlarni qabul qiling.", to: '/sales' },
    ],
  },
}
