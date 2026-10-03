// QA-LP-2026-01 Laptop Üretim Kalite Kontrol ve Onay Formu (ÖRNEK ÇALIŞMA.xlsx / Sayfa2)
// TEST istasyonu 3. ve 4. bölümleri, KALİTE istasyonu 2., 5. ve 6. bölümleri doldurur.

export interface ChecklistItem {
  code: string;
  title: string;
  detail: string;
}

export interface ChecklistSection {
  no: number;
  title: string;
  description: string;
  items: ChecklistItem[];
}

export const TEST_SECTIONS: ChecklistSection[] = [
  {
    no: 3,
    title: 'Fonksiyonel ve Donanım Testleri (OQC)',
    description:
      'Cihaz çalıştırılarak ilgili test yazılımları ve manuel kontroller vasıtasıyla test edilmiştir.',
    items: [
      { code: 'bios', title: 'BIOS / UEFI Doğrulama', detail: "Seri numaraları, RAM ve SSD kapasiteleri BIOS'ta doğru tanındı mı?" },
      { code: 'lcd', title: 'Ekran (LCD) Kontrolü', detail: 'Ölü piksel, ışık sızması veya renk bozulması var mı?' },
      { code: 'keyboard', title: 'Klavye & Touchpad', detail: 'Tüm tuşlar aktif mi? Touchpad çoklu dokunmatik hareketleri algılıyor mu?' },
      { code: 'audio', title: 'Ses ve Mikrofon', detail: 'Sağ/sol hoparlörlerden temiz ses geliyor mu? Mikrofon kaydı sorunsuz mu?' },
      { code: 'ports', title: 'Bağlantı Noktaları', detail: 'Tüm USB, Type-C, HDMI ve Audio jak girişleri çalışıyor mu?' },
      { code: 'wireless', title: 'Kablosuz Ağlar (Wi-Fi/BT)', detail: 'Çevredeki ağlar taranabiliyor ve stabil bağlantı kuruluyor mu?' },
      { code: 'webcam', title: 'Kamera (Webcam)', detail: 'Görüntü netliği, odaklama ve LED bildirim ışığı çalışıyor mu?' },
    ],
  },
  {
    no: 4,
    title: 'Güç ve Termal Stres Testleri (Burn-in)',
    description: 'Cihaz en az 30 dakika boyunca tam yük (stres) altında test edilmiştir.',
    items: [
      { code: 'battery', title: 'Batarya Şarj/Deşarj Durumu', detail: 'Şarj ve deşarj döngüsü sorunsuz.' },
      { code: 'fan', title: 'Fan / Soğutma Performansı', detail: 'Fan sesi ve devri stabil, aşırı gürültü veya sürtünme yok.' },
    ],
  },
];

export const QUALITY_SECTIONS: ChecklistSection[] = [
  {
    no: 2,
    title: 'Giriş Kalite Kontrol ve Montaj Doğrulama (IQC & IPQC)',
    description:
      'Aşağıdaki adımlar montaj hattında eksiksiz tamamlanmış ve görsel olarak kontrol edilmiş olmalıdır.',
    items: [
      { code: 'body', title: 'Görsel Gövde Kontrolü', detail: 'Kasa üzerinde çizik, çatlak, açıklık veya deformasyon yok.' },
      { code: 'torque', title: 'Vida Tork Doğrulaması', detail: 'Alt kapak ve iç komponent vidaları doğru torkta sıkıldı.' },
      { code: 'cables', title: 'Kablo ve Konnektör Yönetimi', detail: 'Batarya, LCD, klavye ve touchpad flex kabloları tam oturdu.' },
      { code: 'thermal', title: 'Termal Macun Uygulaması', detail: 'CPU/GPU üzerine standart miktarda termal macun/ped uygulandı.' },
    ],
  },
  {
    no: 5,
    title: 'Yazılım ve Nihai Kontrol',
    description: 'Sevkiyat öncesi yazılım kontrolleri.',
    items: [
      { code: 'os', title: 'İşletim Sistemi İmajı', detail: 'OEM temiz kurulum yapıldı / OS imajı doğrulandı.' },
      { code: 'drivers', title: 'Sürücü (Driver) Uyumluluğu', detail: 'Aygıt Yöneticisinde eksik veya hatalı sürücü yok.' },
      { code: 'oobe', title: 'Fabrika Ayarlarına Dönüş', detail: 'Test yazılımları silindi, cihaz ilk açılış moduna (OOBE) getirildi.' },
    ],
  },
];

export function sectionsFor(kind: 'TEST' | 'QUALITY'): ChecklistSection[] {
  return kind === 'TEST' ? TEST_SECTIONS : QUALITY_SECTIONS;
}

export function itemCodes(kind: 'TEST' | 'QUALITY'): string[] {
  return sectionsFor(kind).flatMap((s) => s.items.map((i) => i.code));
}

// Pil sağlığı ve CPU sıcaklığı için kabul sınırları
export const LIMITS = { minBatteryHealth: 80, maxCpuTemp: 95 };
