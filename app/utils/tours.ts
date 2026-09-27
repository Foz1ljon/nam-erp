// Guided tours (driver.js). Each step points at an element marked with `data-tour="<name>"`.
// Steps whose element is missing or hidden (e.g. a button the user has no permission for) are skipped.

export interface TourStep {
  /** Value of the `data-tour` attribute; omit for a centered intro/outro popover. */
  el?: string
  title: string
  text: string
}

export const TOURS = {
  // ------------------------------------------------------------------ Umumiy
  dashboard: [
    {
      title: 'NamMotors ERP ga xush kelibsiz',
      text: "Bu tizim zavoddagi butun jarayonni bog'laydi: xomashyo kirimi → liteyka → pishka stroy → CHPU → sklad → yig'uv → bo'yoq va qadoq → tayyor ombor → sotuv. Har bir hodim o'z bo'limida ishini kiritadi va keyingi bo'limga topshiradi.",
    },
    {
      el: 'sidebar',
      title: 'Asosiy menyu',
      text: "Bu yerda faqat sizning lavozimingizga ruxsat berilgan bo'limlar ko'rinadi. «Ishlab chiqarish» ichida har bir sex alohida sahifaga ega, «Topshirish / qabul» — bo'limlar orasidagi mahsulot almashinuvi, «Ombor» — qoldiq va kirimlar.",
    },
    {
      el: 'user-menu',
      title: 'Sizning profilingiz',
      text: "Ismingiz va lavozimingiz. Shu yerdan parolni o'zgartirasiz va tizimdan chiqasiz. Ishni tugatgach, ayniqsa umumiy kompyuterda, albatta «Chiqish» ni bosing.",
    },
    {
      el: 'dash-transfers',
      title: 'Qabul kutayotgan topshirishlar',
      text: "Sizga yoki bo'limingizga boshqa bo'limdan yuborilgan, lekin hali qabul qilinmagan mahsulotlar soni. Sariq rangda bo'lsa — kimdir sizni kutyapti. Bosing va «Qabul qilish» yoki «Rad etish» ni tanlang.",
    },
    {
      el: 'dash-qc',
      title: 'Sifat nazorati navbati',
      text: "Tekshiruvni kutayotgan operatsiyalar soni (pishka stroydan keyin, yig'ishdan keyin va dvigatellarning to'liq sinovi). Sifat nazoratchisi shu raqam nolga tushguncha ishlaydi.",
    },
    {
      el: 'dash-sales',
      title: 'Oylik sotuv',
      text: "Joriy oyda tasdiqlangan, jo'natilgan va yakunlangan buyurtmalar summasi hamda qancha to'langani.",
    },
    {
      el: 'dash-leads',
      title: 'Faol lidlar',
      text: "Hali sotilmagan va yo'qotilmagan potensial mijozlar soni va taxminiy summasi. Bosing — CRM kanban taxtasi ochiladi.",
    },
    {
      el: 'dash-production',
      title: 'Bugungi ishlab chiqarish',
      text: "Har bir bosqichda bugun qancha mahsulot tayyorlangani va nechta operatsiya kiritilgani. Kartani bosing — shu bosqich sahifasi ochiladi.",
    },
    {
      el: 'dash-finished',
      title: 'Tayyor mahsulot ombori',
      text: "Sotishga tayyor elektr dvigatel va nasoslar soni (to'liq sinovdan o'tib omborga tushganlari).",
    },
    {
      el: 'dash-lowstock',
      title: 'Kam qolgan zaxiralar',
      text: "Minimal zaxiradan kam qolgan xomashyo, material va detallar. Ta'minotchi shu ro'yxat bo'yicha xarid rejalashtiradi. Minimal miqdor «Ma'lumotnomalar → Mahsulotlar» da belgilanadi.",
    },
    {
      el: 'dash-locations',
      title: "Bo'limlardagi qoldiq",
      text: "Har bir sex va omborda hozir qancha kg va dona mahsulot turgani. Batafsil ro'yxat — «Ombor → Qoldiqlar».",
    },
    {
      el: 'dash-recent',
      title: "So'nggi operatsiyalar",
      text: "Zavod bo'yicha oxirgi kiritilgan ishlar: kim, qaysi bosqichda, nima tayyorladi.",
    },
    {
      el: 'ai-fab',
      title: 'AI yordamchi',
      text: "O'ng pastki burchakdagi jonli tugma — sun'iy intellekt yordamchisi. Istalgan sahifadan bosib savol bering: «kecha kim nima qildi», «qarzdor mijozlar», «Excel qilib ber». Yashil nuqta — yordamchi onlayn.",
    },
    {
      el: 'page-help',
      title: 'Yordam tugmasi',
      text: "Har bir sahifada shu tugma bor. Qaysi tugma nima qilishini unutib qo'ysangiz, uni bosing — tizim sizni sahifa bo'ylab qayta olib o'tadi.",
    },
  ],

  // ------------------------------------------------------------------ Ishlab chiqarish
  flow: [
    {
      title: 'Ishlab chiqarish oqimi',
      text: "Bu sahifa zavodning butun zanjirini bitta ekranda ko'rsatadi: raqamlar — mahsulot qaysi tartibda o'tishi. Har bir kartada shu bo'limda hozir turgan mahsulotlar ko'rinadi.",
    },
    {
      el: 'flow-qc-alert',
      title: 'Sifat nazorati ogohlantirishi',
      text: "Tekshiruvni kutayotgan operatsiyalar bo'lsa, shu yerda ko'rinadi. «Ko'rish» — sifat nazorati sahifasiga o'tadi.",
    },
    {
      el: 'flow-grid',
      title: "Bo'limlar kartalari",
      text: "Har bir karta — bitta sex yoki ombor. Ko'k tugmalar (masalan, «Quyish», «Tozalash») shu sexdagi operatsiya sahifasini ochadi. Pastdagi ro'yxat — bo'limdagi eng ko'p qoldiqlar.",
    },
  ],

  stage: [
    {
      title: 'Bosqich sahifasi',
      text: "Bu yerda shu sexda bajarilgan barcha ishlar (operatsiyalar) ko'rinadi va yangi ish kiritiladi. Bitta operatsiya = «nimadan (sarf) → nima tayyorladim (natija) → qancha qirindi chiqdi».",
    },
    {
      el: 'stage-new',
      title: 'Yangi operatsiya',
      text: "Smenada tayyorlagan mahsulotingizni kiritish uchun bosing. O'ng tomonda forma ochiladi. Bu tugma faqat shu sex hodimlariga (va rahbar/adminga) ko'rinadi.",
    },
    {
      el: 'stage-filters',
      title: 'Filtrlar',
      text: "Sana oralig'i va ishchi bo'yicha operatsiyalarni saralash. Masalan, bugungi smenada kim qancha ishlaganini ko'rish uchun.",
    },
    {
      el: 'stage-totals',
      title: 'Jami natija',
      text: "Filtr bo'yicha tanlangan davrda har bir mahsulotdan jami qancha tayyorlangani.",
    },
    {
      el: 'stage-table',
      title: 'Operatsiyalar jadvali',
      text: "Har bir qatorning chap tomonidagi strelkani bosing — sarf, natija, qirindi, seriya raqamlari va kimga topshirilgani ochiladi. «Sifat» ustuni — tekshiruv holati. Printer belgisi — birkalarni chop etish (qadoqlash bosqichida).",
    },
  ],

  operationForm: [
    {
      el: 'op-source',
      title: 'Sarf qaysi joydan olinadi',
      text: "Xomashyo va detallar qaysi bo'limning qoldig'idan yechiladi. Odatda o'z sexingiz tanlangan bo'ladi. Qoldiq yetmasa, tizim saqlashga ruxsat bermaydi.",
    },
    {
      el: 'op-worker',
      title: 'Ishchi',
      text: "Ishni kim bajargan. Odatda o'zingiz. Brigadir boshqa ishchi nomidan kiritsa, shu yerdan tanlaydi — hisobotda unumdorlik shu ishchiga yoziladi.",
    },
    {
      el: 'op-outputs',
      title: '1. Natija',
      text: "Nima tayyorladingiz va qancha: masalan, «Dvigatel korpusi AIR80 (quyma) — 10 dona». «Mahsulot qo'shish» bilan bir nechta turdagi mahsulot kiritish mumkin.",
    },
    {
      el: 'op-auto',
      title: 'Avtomatik hisoblash',
      text: "Yoqilgan bo'lsa, sarf mahsulot retsepti (BOM) bo'yicha o'zi hisoblanadi: 10 ta korpus → 205 kg chugun. Haqiqiy sarf farq qilsa, o'chiring va qo'lda kiriting.",
    },
    {
      el: 'op-inputs',
      title: '2. Sarf',
      text: "Ishlatilgan xomashyo, detal va materiallar. Har bir tanlovda bo'limdagi mavjud qoldiq ko'rinadi. Qizil — qoldiq yetmaydi: avval ombordan topshirishni so'rang.",
    },
    {
      el: 'op-wastes',
      title: '3. Qirindi va brak',
      text: "Liteykaga qaytadigan qirindi, litnik, ortiqcha quyma va brak (kg). Ular liteyka qoldig'iga qo'shiladi va qayta eritishda ishlatiladi.",
    },
    {
      el: 'op-qc',
      title: 'Sifat nazoratiga yuborish',
      text: "Yoqilsa, natija avval «Sifat nazorati» zonasiga tushadi. Nazoratchi tekshirgach, yaroqlisini tanlangan bo'limga o'tkazadi, brakini liteykaga qaytaradi. Pishka stroy va yig'ishdan keyin, dvigatellarni qadoqlashdan keyin avtomatik yoqiladi.",
    },
    {
      el: 'op-handover',
      title: 'Keyingi bo\'limga topshirish',
      text: "Tayyor mahsulotni saqlash bilan bir vaqtda keyingi bo'limga topshiradi (masalan, liteyka → pishka stroy). Qabul qiluvchini tanlasangiz, faqat o'sha hodim tasdiqlaydi; tanlamasangiz — bo'limdagi istalgan hodim. Qabul qilinguncha mahsulot «yo'lda» bo'ladi.",
    },
    {
      el: 'op-note',
      title: 'Izoh',
      text: "Smena, pech raqami, partiya, muammolar — keyinchalik kerak bo'ladigan har qanday ma'lumot.",
    },
    {
      el: 'op-submit',
      title: 'Saqlash',
      text: "Bosganda qoldiqlar darhol o'zgaradi: sarf yechiladi, natija qo'shiladi, qirindi liteykaga tushadi. Qadoqlashda seriya raqamli birkalar yaratiladi va chop etish oynasi ochiladi.",
    },
  ],

  // ------------------------------------------------------------------ Sifat nazorati
  qc: [
    {
      title: 'Sifat nazorati',
      text: "Bu yerda tekshiruvni kutayotgan mahsulotlar ko'rinadi. Nazoratchi har birini tekshirib, yaroqli va brak miqdorini kiritadi.",
    },
    {
      el: 'qc-tabs',
      title: "Bo'limlar",
      text: "«Navbat» — operatsiyalardan kelgan mahsulotlar. «Nazorat zonasidagi boshqa mahsulotlar» — operatsiyaga bog'lanmagan (masalan, qaytarilgan) mahsulotlar. «Tarix» — barcha o'tkazilgan tekshiruvlar.",
    },
    {
      el: 'qc-card',
      title: 'Operatsiya kartasi',
      text: "Qaysi bo'lim, kim tayyorlagan, tekshiruvdan keyin qayerga borishi va har bir mahsulotdan qanchasi tekshirilgani.",
    },
    {
      el: 'qc-inspect',
      title: 'Tekshirish',
      text: "Bosing va natijani kiriting. Bir operatsiyani bir necha marta qisman tekshirish mumkin (masalan, 10 tadan avval 6 tasini).",
    },
  ],

  qcForm: [
    {
      el: 'qc-passed',
      title: 'Yaroqli va brak',
      text: "Nechta mahsulot talabga javob berdi va nechtasi brak. Brak miqdorini kiritsangiz, yaroqlisi avtomatik kamayadi.",
    },
    {
      el: 'qc-location',
      title: "Yaroqli mahsulot qayerga",
      text: "Tekshiruvdan o'tganlar darhol shu bo'limga o'tadi (masalan, pishka stroydan keyin — CHPU, yig'ishdan keyin — bo'yoq, sinovdan keyin — tayyor ombor).",
    },
    {
      el: 'qc-action',
      title: 'Brak bilan nima qilinadi',
      text: "«Liteykaga qayta eritishga» — brak kg ga aylantirilib liteyka qoldig'iga qo'shiladi. «Brak izolyatoriga» — mahsulot o'zgarmagan holda alohida joyga ajratiladi, keyin qayta ishlash mumkin.",
    },
    {
      el: 'qc-scrap',
      title: "Qirindi turi va og'irligi",
      text: "Qaysi qirindi sifatida hisoblanadi. Og'irlikni bo'sh qoldirsangiz, mahsulotning bir dona og'irligi × brak soni bo'yicha avtomatik hisoblanadi.",
    },
    {
      el: 'qc-reason',
      title: 'Nuqson sababi',
      text: "Tayyor sabablardan birini bosing yoki o'zingiz yozing. Hisobotda eng ko'p uchraydigan nuqsonlar shu ma'lumotdan chiqadi.",
    },
    {
      el: 'qc-submit',
      title: 'Natijani saqlash',
      text: "Saqlangach mahsulotlar darhol ko'chiriladi. Operatsiyaning barcha mahsuloti tekshirilgach, u navbatdan chiqadi.",
    },
  ],

  // ------------------------------------------------------------------ Topshirish
  transfers: [
    {
      title: 'Topshirish va qabul qilish',
      text: "Bo'limlar orasida mahsulot jonli topshiriladi: jo'natuvchi yuboradi → mahsulot «yo'lda» → qabul qiluvchi sanab ko'rib tasdiqlaydi. Shunday qilib, har bir mahsulot kimda turgani doim aniq bo'ladi.",
    },
    {
      el: 'transfer-new',
      title: 'Yangi topshirish',
      text: "Bo'limingizdagi mahsulotni boshqa bo'limga berish uchun. Masalan, omborchi yig'uvga sim va detallar beradi. (Operatsiya formasida «darhol topshirish» ni yoqsangiz, bu alohida kerak emas.)",
    },
    {
      el: 'transfer-scope',
      title: 'Kiruvchi / chiquvchi',
      text: "«Menga kelgan» — sizga yoki bo'limingizga yuborilganlar (qabul qilish kerak). «Men topshirgan» — siz yuborganlar va ularning holati. «Barchasi» — hammasi.",
    },
    {
      el: 'transfer-status',
      title: "Holat bo'yicha filtr",
      text: "Qabul kutilmoqda, qabul qilindi, rad etildi yoki bekor qilindi.",
    },
    {
      el: 'transfer-table',
      title: 'Topshirishlar',
      text: "Qayerdan → qayerga, nimalar, kim topshirdi va kim qabul qildi. Rad etilganlarda sabab qizil rangda yoziladi.",
    },
    {
      el: 'transfer-accept',
      title: 'Qabul qilish',
      text: "Mahsulotni sanab, miqdor to'g'ri bo'lsa bosing — u bo'limingiz qoldig'iga tushadi. Shundan so'ng javobgarlik sizda.",
    },
    {
      el: 'transfer-reject',
      title: 'Rad etish',
      text: "Miqdor yoki sifat mos kelmasa, sababini yozib rad eting. Mahsulot jo'natuvchining qoldig'iga qaytadi.",
    },
    {
      el: 'transfer-cancel',
      title: 'Bekor qilish',
      text: "Xato yuborgan bo'lsangiz, qabul qilinmaguncha bekor qilishingiz mumkin. Mahsulot sizga qaytadi.",
    },
  ],

  transferForm: [
    { el: 'tf-from', title: 'Qayerdan', text: "Mahsulot qaysi bo'limdan chiqadi. Oddiy hodim faqat o'z bo'limidan topshira oladi." },
    { el: 'tf-to', title: 'Qayerga', text: "Mahsulotni qabul qiladigan bo'lim." },
    {
      el: 'tf-receiver',
      title: 'Qabul qiluvchi hodim',
      text: "Ixtiyoriy. Tanlasangiz, faqat shu hodim tasdiqlay oladi. Bo'sh qoldirsangiz — bo'limdagi istalgan hodim.",
    },
    {
      el: 'tf-lines',
      title: 'Mahsulotlar',
      text: "Nimani va qancha topshirasiz. Tanlovda bo'limdagi mavjud qoldiq ko'rinadi — undan ko'p topshirib bo'lmaydi.",
    },
    { el: 'tf-submit', title: 'Topshirish', text: "Bosganda mahsulot bo'limingizdan yechiladi va qabul qiluvchi tasdiqlaguncha «yo'lda» turadi." },
  ],

  // ------------------------------------------------------------------ Ombor
  stock: [
    { title: 'Ombor qoldiqlari', text: "Barcha sex va omborlarda hozir nima va qancha turgani, uning qiymati bilan." },
    { el: 'stock-location', title: 'Joy', text: "Faqat bitta bo'lim yoki ombor qoldig'ini ko'rish." },
    { el: 'stock-type', title: 'Turi', text: 'Xomashyo, quyma, yarim tayyor, detal, material, tayyor mahsulot yoki qirindi.' },
    { el: 'stock-search', title: 'Qidirish', text: 'Kod yoki nom bo\'yicha tezkor qidiruv.' },
    {
      el: 'stock-view',
      title: "Ko'rinish",
      text: "«Joylar bo'yicha» — har bir bo'limdagi qoldiq alohida qator. «Mahsulot bo'yicha» — bitta mahsulot butun zavodda jami qancha va qaysi joylarda. Minimal zaxiradan kam bo'lsa, sariq rangda.",
    },
    { el: 'stock-table', title: 'Jadval', text: "Ustun sarlavhasini bosib saralash mumkin. Qiymat = qoldiq × tannarx (yoki sotuv narxi)." },
  ],

  receipts: [
    {
      title: 'Kirim (xarid)',
      text: "Tashqaridan kelgan har bir yuk shu yerda qayd etiladi: chugun, metallar, obmotka simi, jeleza, parrak, podshipnik va boshqalar.",
    },
    {
      el: 'receipt-new',
      title: 'Yangi kirim',
      text: "Yuk kelganda bosing: yetkazib beruvchi, ombor va har bir mahsulotning miqdori hamda narxini kiriting. Saqlangach qoldiq darhol oshadi va narx mahsulot tannarxi sifatida yangilanadi.",
    },
    { el: 'receipt-range', title: 'Davr', text: 'Ma\'lum sana oralig\'idagi kirimlarni ko\'rish.' },
    { el: 'receipt-table', title: 'Kirimlar', text: 'Strelkani bosing — hujjatdagi har bir qator, narxi va summasi ochiladi.' },
  ],

  receiptForm: [
    { el: 'rf-supplier', title: 'Yetkazib beruvchi', text: "Kimdan kelgan. Ro'yxatda bo'lmasa, avval «Ma'lumotnomalar → Kontragentlar» da qo'shing." },
    { el: 'rf-location', title: 'Qaysi omborga', text: "Xomashyo — odatda «Xomashyo ombori», sim, jeleza va detallar — «Sklad»." },
    { el: 'rf-lines', title: 'Mahsulotlar', text: "Har bir qator: mahsulot, miqdor va birlik narxi. Pastda jami summa hisoblanadi." },
    { el: 'rf-note', title: 'Izoh', text: 'Yuk xati raqami, avtomobil raqami, haydovchi va h.k.' },
    { el: 'rf-submit', title: 'Saqlash', text: 'Qoldiq darhol oshadi, harakat jurnaliga yoziladi.' },
  ],

  adjustments: [
    {
      title: 'Inventarizatsiya',
      text: "Haqiqiy sanoq tizimdagi qoldiqdan farq qilsa, shu yerda tuzatiladi. Farq avtomatik kirim yoki chiqim sifatida jurnalga yoziladi — hech narsa izsiz o'zgarmaydi.",
    },
    {
      el: 'adj-new',
      title: 'Yangi inventarizatsiya',
      text: "Joyni tanlang — tizimdagi qoldiqlar chiqadi. Haqiqiy sanoqni kiriting; faqat farqi borlari saqlanadi. Hisobda yo'q mahsulotni yuqoridagi tanlov orqali qo'shish mumkin.",
    },
    { el: 'adj-table', title: 'Tarix', text: "Har bir inventarizatsiyada nima qancha edi va qancha bo'ldi." },
  ],

  moves: [
    {
      title: 'Harakatlar jurnali',
      text: "Qoldiqni o'zgartirgan har bir harakat: kirim, topshirish, ishlab chiqarish, sifat nazorati, inventarizatsiya, sotuv. Kim, qachon, qayerda — hammasi saqlanadi va o'chirilmaydi.",
    },
    { el: 'moves-filters', title: 'Filtrlar', text: "Joy, mahsulot, hujjat turi va sana bo'yicha. Masalan, bitta mahsulotning butun yo'lini kuzatish uchun." },
    { el: 'moves-table', title: 'Jurnal', text: 'Yashil (+) — qoldiq oshgan, qizil (−) — kamaygan.' },
  ],

  serials: [
    {
      title: 'Seriya raqamlari',
      text: "Qadoqlashda har bir dvigatel va nasosga noyob raqam beriladi (NM-YYOO-000001). Shu raqam birkada chop etiladi va kafolat bo'yicha murojaatda mahsulot tarixini topishga yordam beradi.",
    },
    { el: 'serial-search', title: 'Qidirish', text: 'Mijoz aytgan raqam bo\'yicha: qachon ishlab chiqarilgani va kimga sotilganini topasiz.' },
    { el: 'serial-status', title: 'Holat', text: "«Omborda» yoki «Sotilgan». Sotuvda raqamlar eng eskisidan boshlab avtomatik biriktiriladi." },
    { el: 'serial-table', title: 'Jadval', text: 'Operatsiya raqami, sotuv buyurtmasi va sotilgan sana.' },
  ],

  // ------------------------------------------------------------------ Ma'lumotnomalar
  items: [
    {
      title: 'Mahsulot va materiallar',
      text: "Tizimdagi hamma narsa shu ro'yxatda: xomashyo, quymalar, yarim tayyor, sotib olinadigan detallar, materiallar, tayyor mahsulotlar va qirindi.",
    },
    { el: 'items-new', title: 'Yangi', text: "Yangi mahsulot yoki material qo'shish: kod, nom, turi, birligi, og'irligi, narxlari, minimal zaxira." },
    { el: 'items-filters', title: 'Filtr va qidiruv', text: "Turi bo'yicha saralash va nom yoki kod bo'yicha qidirish." },
    {
      el: 'items-table',
      title: 'Ro\'yxat',
      text: "«Retsept» — mahsulotni tayyorlash uchun har bir bosqichda nima qancha sarflanishi (BOM). Operatsiya formasidagi avtomatik sarf shu retseptdan olinadi. «Tahrirlash» — mahsulot ma'lumotlarini o'zgartirish.",
    },
  ],

  counterparties: [
    { title: 'Kontragentlar', text: "Mijozlar va yetkazib beruvchilar kartasi: nomi, STIR, telefon, mas'ul shaxs, manzil." },
    { el: 'cp-new', title: 'Yangi', text: "Yangi mijoz yoki yetkazib beruvchi qo'shish. Lid sotuvga aylanganda mijoz kartasi avtomatik yaratiladi." },
    { el: 'cp-filters', title: 'Filtr', text: 'Turi bo\'yicha va nom, telefon yoki STIR bo\'yicha qidirish.' },
    { el: 'cp-table', title: 'Ro\'yxat', text: '«Tahrirlash» orqali ma\'lumotlarni yangilang.' },
  ],

  locations: [
    {
      title: "Bo'limlar va omborlar",
      text: "Zavoddagi har bir sex va ombor — alohida qoldiqqa ega joy. «Tizim» belgisi borlari ishlab chiqarish oqimida ishlatiladi: ularning kodini o'zgartirib yoki o'chirib bo'lmaydi.",
    },
    { el: 'loc-new', title: 'Yangi joy', text: "Masalan, ikkinchi ombor yoki yangi sex qo'shish." },
    { el: 'loc-table', title: 'Ro\'yxat', text: "Tartib raqami menyularda va oqim sahifasida ketma-ketlikni belgilaydi." },
  ],

  users: [
    {
      title: 'Hodimlar',
      text: "Har bir hodimga login va rol beriladi. Rol hodim qaysi sahifalarni ko'rishi va qaysi bosqichda ish kirita olishini belgilaydi: masalan, quyuvchi faqat liteyka operatsiyalarini kiritadi.",
    },
    { el: 'users-new', title: 'Yangi hodim', text: "F.I.Sh., login, parol, rol va bo'limni (ish joyini) kiriting. Bo'lim — hodim qaysi joyning topshirishlarini qabul qilishini belgilaydi." },
    { el: 'users-table', title: 'Ro\'yxat', text: "«Tahrirlash» — rolni, bo'limni o'zgartirish, parolni tiklash yoki ishdan ketgan hodimni bloklash (o'chirilmaydi — tarix saqlanadi)." },
  ],

  // ------------------------------------------------------------------ Sotuv va CRM
  sales: [
    {
      title: 'Sotuv buyurtmalari',
      text: "Tayyor dvigatel va nasoslar, yarim tayyor mahsulotlar va liteyka quymalari shu yerdan sotiladi. Buyurtma yo'li: qoralama → tasdiqlangan → jo'natilgan → yakunlangan.",
    },
    { el: 'sales-new', title: 'Yangi buyurtma', text: "Mijoz, mahsulotlar, narx va qaysi ombordan chiqishini kiritasiz." },
    { el: 'sales-stats', title: 'Ko\'rsatkichlar', text: "Filtr bo'yicha buyurtmalar summasi, to'langan qismi va mijozlarning qarzi." },
    { el: 'sales-filters', title: 'Filtrlar', text: 'Holat, mijoz va sana bo\'yicha.' },
    { el: 'sales-table', title: 'Buyurtmalar', text: "Qatorni bosing — buyurtma kartasi ochiladi. «To'langan» sariq bo'lsa — qarz bor." },
  ],

  salesOrder: [
    { el: 'so-customer', title: 'Mijoz', text: "Buyurtmachi. Yangi mijozni avval «Kontragentlar» da yoki lid orqali yarating." },
    { el: 'so-discount', title: 'Chegirma', text: "Buyurtma summasidan ayiriladigan umumiy chegirma (so'mda)." },
    {
      el: 'so-lines',
      title: 'Buyurtma tarkibi',
      text: "Har bir qatorda: mahsulot, qaysi joydan (masalan, tayyor ombor yoki quyma uchun liteyka), miqdor va narx. Narx mahsulot kartasidagi sotuv narxidan avtomatik olinadi.",
    },
    { el: 'so-save', title: 'Saqlash', text: 'Qoralama holatida istalgancha tahrirlash mumkin.' },
    { el: 'so-confirm', title: 'Tasdiqlash', text: "Mijoz bilan kelishilgach bosing. Shundan keyin tarkibni o'zgartirib bo'lmaydi." },
    {
      el: 'so-ship',
      title: "Jo'natish",
      text: "Mahsulot mijozga berilganda bosing: ko'rsatilgan omborlardan chiqim qilinadi, dvigatel va nasoslarga seriya raqamlari biriktiriladi. Qoldiq yetmasa, tizim ruxsat bermaydi.",
    },
    { el: 'so-payment', title: "To'lov qabul qilish", text: "Naqd, karta yoki bank o'tkazmasi. Qisman to'lovlar ham qabul qilinadi; qoldiq qarz o'ng tomonda ko'rinadi." },
    { el: 'so-complete', title: 'Yakunlash', text: "Jo'natilgan va hisob-kitob tugagan buyurtmani yopish." },
    { el: 'so-cancel', title: 'Bekor qilish', text: "Faqat jo'natilmagan buyurtmani bekor qilish mumkin." },
    { el: 'so-payments', title: "To'lovlar tarixi", text: "Kim, qachon, qancha va qanday usulda qabul qilgani." },
  ],

  leads: [
    {
      title: 'Lidlar (CRM)',
      text: "Potensial mijozlar: qo'ng'iroq qilgan, Telegram'da yozgan, ko'rgazmada tanishgan har bir kishi shu yerda saqlanadi va sotuvgacha kuzatiladi.",
    },
    { el: 'leads-new', title: 'Yangi lid', text: "Mijoz ismi, telefoni, nima kerakligi, manbasi va taxminiy summasini kiriting." },
    { el: 'leads-search', title: 'Qidirish', text: 'Ism, telefon yoki kompaniya bo\'yicha.' },
    { el: 'leads-manager', title: 'Menejer', text: "Faqat bitta menejerning lidlarini ko'rish." },
    { el: 'leads-view', title: "Ko'rinish", text: '«Kanban» — ustunlar bo\'yicha, «Jadval» — ro\'yxat ko\'rinishida.' },
    {
      el: 'leads-board',
      title: 'Kanban taxtasi',
      text: "Har bir ustun — lid holati: Yangi → Bog'lanildi → Ehtiyoj aniqlandi → Taklif yuborildi → Sotildi / Yo'qotildi. Kartani sichqoncha bilan boshqa ustunga sudrab holatini o'zgartiring. Kartani bosing — lid kartasi ochiladi.",
    },
  ],

  lead: [
    { el: 'lead-edit', title: 'Tahrirlash', text: "Lid ma'lumotlari, holati va mas'ul menejerni o'zgartirish." },
    {
      el: 'lead-order',
      title: 'Sotuv buyurtmasi yaratish',
      text: "Mijoz rozi bo'lganda bosing: lid asosida mijoz kartasi yaratiladi va yangi buyurtma ochiladi. Buyurtma jo'natilganda lid avtomatik «Sotildi» bo'ladi.",
    },
    {
      el: 'lead-activity',
      title: 'Faoliyat qo\'shish',
      text: "Har bir qo'ng'iroq, uchrashuv va xabarni yozib boring. «Vazifa» yoki «Uchrashuv» uchun muddat qo'ying — eslatma bo'lib turadi.",
    },
    { el: 'lead-timeline', title: 'Tarix', text: "Lid bilan bo'lgan barcha muloqot. Vazifalarni bajarilgach belgilang." },
    { el: 'lead-info', title: "Ma'lumot", text: "Telefon raqamini bosib to'g'ridan-to'g'ri qo'ng'iroq qilish mumkin (telefonda)." },
    { el: 'lead-orders', title: 'Buyurtmalar', text: 'Shu lid bo\'yicha yaratilgan sotuv buyurtmalari.' },
  ],

  clients: [
    {
      title: 'Mijozlar (B2B)',
      text: "Barcha mijozlar bitta joyda: korxonalar, dilerlar, fermerlar va xususiy xaridorlar. Har birining rekvizitlari, shartnomasi, savdolar tarixi va qarzi saqlanadi.",
    },
    { el: 'clients-new', title: 'Yangi mijoz', text: "Mijoz kartasini ochish: nomi, STIR, bank rekvizitlari, shartnoma, to'lov muddati, kredit limiti va mas'ul menejer. Lid sotuvga aylanganda karta avtomatik ham yaratiladi." },
    { el: 'clients-stats', title: "Ko'rsatkichlar", text: "Filtr bo'yicha mijozlar soni, ularning jami xaridlari va sizga qancha qarzi borligi." },
    { el: 'clients-filters', title: 'Filtrlar', text: "Nomi yoki STIR bo'yicha qidirish, shaxs turi, soha, menejer. «Faqat qarzdorlar» — qarzni undirish ro'yxati." },
    { el: 'clients-table', title: "Ro'yxat", text: "Qarz qizil rangda. Ustun sarlavhasini bosib saralang (masalan, eng katta mijozlar). Qatorni bosing — mijoz kartasi ochiladi." },
  ],

  client: [
    { el: 'client-stats', title: "Mijoz ko'rsatkichlari", text: "Jami savdo, to'langan, qarz (kredit limiti bilan) va oxirgi buyurtma. Qarz limitdan oshsa, yuqorida qizil ogohlantirish chiqadi." },
    { el: 'client-order', title: 'Yangi buyurtma', text: "Shu mijoz tanlangan holda yangi sotuv buyurtmasi ochiladi." },
    { el: 'client-edit', title: 'Tahrirlash', text: "Rekvizitlar, shartnoma, kredit limiti, mas'ul menejer va aloqa ma'lumotlarini yangilash." },
    {
      el: 'client-tabs',
      title: 'Mijoz tarixi',
      text: "Buyurtmalar, to'lovlar, eng ko'p olgan mahsulotlari, lidlari va Telegram/Instagram yozishmalari — hammasi bir joyda.",
    },
    { el: 'client-contacts', title: 'Aloqa', text: "Telefon yoki emailni bosib darhol qo'ng'iroq qilish yoki yozish mumkin." },
    { el: 'client-requisites', title: 'Rekvizitlar va shartnoma', text: "Hisob-faktura va shartnoma uchun kerakli barcha ma'lumotlar." },
  ],

  inbox: [
    {
      title: 'Xabarlar',
      text: "Telegram va Instagram profilingizga mijozlar yozgan xabarlar shu yerga tushadi. Yangi yozgan har bir odam avtomatik lid bo'lib, sizga biriktiriladi.",
    },
    { el: 'inbox-profiles', title: 'Profillarni ulash', text: "Hali profilingiz ulanmagan bo'lsa, shu yerdan Telegram yoki Instagram'ni ulang." },
    { el: 'inbox-list', title: 'Suhbatlar', text: "Eng yangi yozishmalar tepada. Ko'k raqam — o'qilmagan xabarlar soni. «Faqat o'qilmaganlar» — javob kutayotgan mijozlar." },
    { el: 'inbox-header', title: 'Mijoz haqida', text: "Kim yozgani, telefoni, qaysi profilga yozgani va lid holati. Lidni bosib uning kartasiga o'tasiz." },
    { el: 'inbox-customer', title: "Mijoz kartasiga bog'lash", text: "Yozgan odam mavjud mijozingiz bo'lsa, uni tanlang — yozishma mijoz kartasida ham ko'rinadi." },
    { el: 'inbox-thread', title: 'Yozishma', text: "Chapda mijoz xabarlari, o'ngda sizniki (telefondan yozganlaringiz ham shu yerda). Qizil — yuborilmagan xabar, sababi bilan." },
    { el: 'inbox-reply', title: 'Javob yozish', text: "Enter — yuborish, Shift+Enter — yangi qator. Xabar mijozga sizning Telegram/Instagram profilingizdan boradi." },
  ],

  channels: [
    {
      title: 'Profillarni ulash',
      text: "Har bir sotuv menejeri o'zining shaxsiy Telegram va Instagram profilini ulaydi. Shundan keyin mijozlar yozgan xabarlar CRM'ga tushadi va javobni shu yerdan yozasiz.",
    },
    {
      el: 'channels-telegram',
      title: 'Telegram profilini ulash',
      text: "Telefon raqamingizni kiriting → Telegram'ga kelgan kodni yozing (ikki bosqichli parol bo'lsa, uni ham). Standart holatda faqat telefon kontaktlaringizda yo'q odamlarning (yangi mijozlar) xabarlari tushadi — shaxsiy yozishmalaringiz CRM'ga kirmaydi.",
    },
    {
      el: 'channels-instagram',
      title: 'Instagram profilini ulash',
      text: "Instagram'ning rasmiy oynasi ochiladi: login qilib ruxsat berasiz. Akkaunt Professional (Business yoki Creator) bo'lishi kerak — buni Instagram ilovasida bepul yoqish mumkin.",
    },
    { el: 'channels-list', title: 'Ulangan profillar', text: "Holati, nechta suhbat borligi. «Sozlash» — qaysi yozishmalar tushishi va avtomatik salomlashish. «Uzish» — profilni CRM'dan chiqarish (tarix saqlanadi)." },
    { el: 'channels-admin', title: 'Administrator sozlamalari', text: "Bir marta sozlanadi: tizimning internet manzili, Telegram api_id/api_hash va Instagram (Meta) ilovasi kalitlari." },
  ],

  ai: [
    {
      title: 'AI yordamchi',
      text: "Zavod haqida oddiy tilda so'rang: «bugun kim nima qildi», «brak nega ko'paydi», «qaysi mijozda qarz bor». Yordamchi ERP ma'lumotlarini o'zi tekshirib javob beradi va hech narsani o'zgartirmaydi.",
    },
    { el: 'ai-suggestions', title: 'Namuna savollar', text: "Bittasini bosing — darhol javob olasiz. O'zingiz ham istalgan savolni yozishingiz mumkin." },
    { el: 'ai-input', title: 'Savol yozish', text: "«…Excel qilib ber» yoki «…hujjat qil» desangiz, yordamchi jadval tayyorlab yuklab olish havolasini beradi." },
    { el: 'ai-mic', title: 'Ovoz bilan so\'rash', text: "🎤 ni bosing, savolni o'zbekcha ayting, keyin yana bosing. Ovoz matnga aylanadi, javob esa ovoz chiqarib o'qib beriladi. Har bir javob ostidagi «Eshitish» tugmasi ham uni o'qib beradi." },
    { el: 'ai-chats', title: 'Suhbatlar tarixi', text: "Har bir suhbat saqlanadi, keyin davom ettirish mumkin. Oldingi savollarni hisobga olib javob beradi." },
    { el: 'ai-settings', title: 'AI modelini sozlash', text: "Qaysi sun'iy intellekt ishlashini tanlang: bepul Gemini, Groq, OpenRouter, o'z serveringizdagi Ollama yoki pullik Claude. «Saqlash va tekshirish» ulanishni darhol sinaydi." },
  ],

  // ------------------------------------------------------------------ Hisobotlar
  reports: [
    { title: 'Hisobotlar', text: "Rahbariyat uchun asosiy ko'rsatkichlar tanlangan davr bo'yicha." },
    { el: 'reports-range', title: 'Davr', text: 'Odatda joriy oy. Istalgan sana oralig\'ini tanlang — barcha hisobotlar qayta hisoblanadi.' },
    {
      el: 'reports-tabs',
      title: 'Hisobot turlari',
      text: "«Ishlab chiqarish» — har bir bosqichda nima qancha tayyorlandi va qancha qirindi qaytdi. «Hodimlar unumdorligi» — kim qancha ishladi. «Sifat» — brak foizi va asosiy nuqsonlar. «Sotuv» — kunlar, mahsulotlar va menejerlar bo'yicha. «Ombor qiymati» — qoldiqlar pul hisobida.",
    },
  ],
} satisfies Record<string, TourStep[]>

export type TourKey = keyof typeof TOURS
