# NamMotors Qo'ng'iroqlar (Android)

Menejer telefonidagi qo'ng'iroqlarni va ularning yozuvlarini ERP lidlariga yuboradi.

## Qanday ishlaydi

1. Menejer ERP logini bilan kiradi → server qurilma tokenini beradi (`POST /api/mobile/login`).
2. Har bir qo'ng'iroq tugaganda (va har 15 daqiqada) fon ishchisi (`CallSyncWorker`) qo'ng'iroqlar
   jurnalidan yangi yozuvlarni `POST /api/mobile/calls` ga yuboradi.
3. Server raqam bo'yicha ochiq lidni topadi va qo'ng'iroqni unga biriktiradi. Noma'lum raqamdan
   kiruvchi/o'tkazib yuborilgan qo'ng'iroq bo'lsa — yangi lid ochiladi (manba: "Qo'ng'iroq").
   Telefon kontaktlaridagi raqamlar ("Kontaktlarda yo'q raqamlar" rejimida) shaxsiy hisoblanadi va yuborilmaydi.
4. Suhbat yozuvi telefonning o'z qo'ng'iroq yozuvchisidan (Samsung, Xiaomi, Honor…) topiladi va
   `POST /api/mobile/calls/:id/recording` orqali Cloudinary'ga (maxfiy, `authenticated`) yuklanadi.
   CRM'da lid sahifasida tinglash mumkin.

> Android 9+ oddiy ilovalarga qo'ng'iroqni o'zi yozishga ruxsat bermaydi, shuning uchun telefon
> sozlamalarida **avtomatik qo'ng'iroq yozish** yoqilgan bo'lishi kerak.

## Yig'ish (Android Studio'siz)

Talablar: macOS + Homebrew, Node 22+, pnpm. Birinchi ishga tushirishda skript JDK 21 (`openjdk@21`)
va Android SDK'ni (`android-commandlinetools`, `~/Library/Android/sdk`) o'zi o'rnatadi.

```bash
bash mobile/scripts/build-android.sh           # → mobile/release/nammotors-calls-debug.apk
bash mobile/scripts/build-android.sh release   # imzolanmagan release APK
```

Telefonga o'rnatish: APK faylni telefonga yuboring va oching ("Noma'lum manbalardan o'rnatish"ga ruxsat bering)
yoki USB orqali: `~/Library/Android/sdk/platform-tools/adb install -r mobile/release/nammotors-calls-debug.apk`.

Android Studio bilan: `cd mobile && pnpm sync && pnpm open`.

Server tomonida `.env`: `NUXT_CLOUDINARY_CLOUD_NAME`, `NUXT_CLOUDINARY_API_KEY`, `CLOUDINARY_KEY` (API secret).

Ilova Google Play'ga emas, APK sifatida tarqatish uchun mo'ljallangan: Play `READ_CALL_LOG`
ruxsatini faqat standart "Telefon" ilovalariga beradi.
