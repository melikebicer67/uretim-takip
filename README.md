# Üretim Takip

İş emri → malzeme transferi → aşama aşama üretim → test → kalite → mamul depo akışını
seri numarası bazında izleyen üretim takip (MES) demosu. Veri modeli `ÖRNEK ÇALIŞMA.xlsx`
dosyasından alınmıştır.

- **api/** NestJS 12 + Prisma 7 + PostgreSQL 17 (`:4001/api`)
- **web/** Next.js 16 + React 19 + Tailwind 4 (`:4000`)
- Canlı güncelleme: API'deki `/api/events` SSE akışı; tüm ekranlar bir olay gelince yenilenir

## Çalıştırma

```bash
nvm use            # Node 22
yarn install       # kök: concurrently
yarn setup         # ilk sefer: veritabanı + bağımlılıklar + migrate + seed
yarn dev           # api + web birlikte
```

Sunum için üretim modunda (hızlı): `yarn demo`

### Dışarıdan erişim (geçici link)

Tarayıcı API'ye Next üzerinden (`/api`) gittiği için yalnızca 4000 portunu açmak yeterli:

```bash
yarn demo          # bir terminalde
yarn tunnel        # diğerinde → https://<rastgele>.trycloudflare.com
```

Linkte giriş/şifre yoktur, linki alan herkes veriyi değiştirebilir; sunum bitince tüneli kapatın.

Demo öncesi temiz başlangıç (Excel'deki stoklar, boş üretim/mamul depo): `yarn db:reset`

## Akış

1. **İş Emirleri**: mamul ve miktar seçilir, reçete × miktar hammadde stoğuyla karşılaştırılır.
2. **Malzeme transferi**: ihtiyaç Hammadde Depo'dan Üretim Depo'ya aktarılır, her ürüne seri no verilir (`PC-2026-000001`).
3. **İstasyonlar** (1–4. Aşama): operatör ürünü başlatır/bitirir. Bitince o aşamanın reçete kalemleri
   Üretim Depo'dan sarf edilir, ürün sonraki aşamaya geçer.
4. **Test**: QA-LP-2026-01 formu bölüm 3–4 (fonksiyonel + burn-in). Kalan ürün seçilen montaj aşamasına tamire döner
   (malzeme tekrar düşülmez).
5. **Kalite**: bölüm 2, 5, 6. KABUL edilen ürün Mamul Depo'ya girer.
6. **Parça izlenebilirliği**: montajda takılan her parçanın (anakart, RAM, SSD…) seri numarası okutulur ve
   bilgisayarın seri numarasına bağlanır. Soldaki aramaya parça seri no yazılınca takıldığı bilgisayar açılır;
   **Seri Numaraları → Parça seri no** sekmesi tüm eşleşmeleri listeler. Aynı parça iki bilgisayara takılamaz.
7. **Maliyet**: malzeme (sarf × fiyat) + işçilik (süre × saniye maaşı; maaş / 225 sa / 3600).

İş emri sayfasındaki **Demo: simüle et** düğmesi bekleyen ürünleri gerçekçi sürelerle tüm rotadan geçirir.
Ürün sayfasından (`/urun/<seri no>`) doldurulmuş kalite formu yazdırılabilir.
