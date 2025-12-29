# EAS Build GitHub Actions Kurulum Talimatları

## 🎯 Amaç
GitHub Actions üzerinde otomatik Android APK build'i yapmak için EAS Build kullanımı.

## 📋 Gereksinimler
1. Expo hesabı (ücretsiz)
2. GitHub repository'sine erişim

## 🔧 Kurulum Adımları

### Adım 1: Expo Token Oluştur

1. **Expo hesabına giriş yap:**
   - https://expo.dev adresine git
   - Giriş yap veya yeni hesap oluştur

2. **Access Token oluştur:**
   - Profil ayarlarına git: https://expo.dev/accounts/[kullanıcı-adın]/settings/access-tokens
   - "Create Token" butonuna tıkla
   - Token adı gir (örn: "GitHub Actions")
   - Token'ı kopyala ve **güvenli bir yere kaydet** (bir daha göremezsin!)

### Adım 2: GitHub Secret Ekle

1. **GitHub repository'sine git:**
   - https://github.com/ysntns/nexura

2. **Settings → Secrets and variables → Actions**
   - "New repository secret" butonuna tıkla
   - **Name:** `EXPO_TOKEN`
   - **Value:** (Adım 1'de kopyaladığın token)
   - "Add secret" butonuna tıkla

### Adım 3: Workflow'u Tetikle

İki yöntemle tetikleyebilirsin:

**Yöntem 1: Otomatik (Push ile)**
```bash
cd nexura
git add .
git commit -m "Enable EAS Build workflow"
git push
```

**Yöntem 2: Manuel**
- GitHub repository'de → Actions sekmesi
- "EAS Build Android" workflow'unu seç
- "Run workflow" butonuna tıkla

## 📱 Build Sonuçlarını Görüntüleme

1. **Expo Dashboard:**
   - https://expo.dev adresine git
   - "Builds" sekmesine tıkla
   - Build durumunu ve logları görüntüle

2. **GitHub Actions:**
   - Repository → Actions sekmesi
   - Workflow run'ı seç
   - Build durumunu takip et

3. **APK İndirme:**
   - Build tamamlandığında Expo Dashboard'dan indir
   - Veya email ile gelen linki kullan

## ⚙️ Build Profilleri (eas.json)

### Preview (Varsayılan)
```json
"preview": {
  "android": {
    "buildType": "apk"
  },
  "distribution": "internal"
}
```
- **Kullanım:** Test ve development
- **Çıktı:** APK dosyası
- **Dağıtım:** Internal (direct install)

### Production
```json
"production": {
  "android": {
    "buildType": "app-bundle"
  }
}
```
- **Kullanım:** Google Play Store yayını
- **Çıktı:** AAB (Android App Bundle)
- **Dağıtım:** Google Play Store

## 🔄 Workflow Özellikleri

- ✅ **Otomatik tetikleme:** frontend/* değişikliklerinde
- ✅ **Manuel tetikleme:** workflow_dispatch ile
- ✅ **Dependency caching:** Daha hızlı build'ler
- ✅ **Non-interactive:** Otomatik onay, kullanıcı müdahalesi yok
- ✅ **No-wait:** Workflow hemen tamamlanır, build arka planda devam eder

## 🆚 EAS Build vs Manuel Build

| Özellik | Manuel Build | EAS Build |
|---------|-------------|-----------|
| Kotlin version | ❌ Manuel düzenleme | ✅ Otomatik |
| Android SDK | ❌ Manuel config | ✅ Otomatik |
| Dependencies | ❌ Sık hata | ✅ Garantili |
| Build süresi | ~5-10 dakika | ~10-15 dakika |
| Hata oranı | 🔴 Yüksek | 🟢 Düşük |
| Bakım | 🔴 Sürekli | 🟢 Minimal |

## 🚨 Sorun Giderme

### "Invalid credentials" hatası
- EXPO_TOKEN'ın doğru kopyalandığından emin ol
- Token'ın expire olmadığını kontrol et
- Yeni token oluştur ve GitHub Secret'ı güncelle

### "Project not found" hatası
- `app.json` dosyasında `slug` ve `owner` alanlarını kontrol et
- Expo hesabında project'in var olduğundan emin ol

### Build başarısız oluyor
- Expo Dashboard'dan detaylı logları kontrol et
- `eas.json` konfigürasyonunu gözden geçir
- `package.json` dependencies güncel mi kontrol et

## 📚 Faydalı Linkler

- [EAS Build Dokümantasyonu](https://docs.expo.dev/build/introduction/)
- [GitHub Actions için Expo](https://github.com/expo/expo-github-action)
- [eas.json Referansı](https://docs.expo.dev/build-reference/eas-json/)
- [Expo Dashboard](https://expo.dev)

## ✅ Kontrol Listesi

- [ ] Expo hesabı oluşturuldu
- [ ] EXPO_TOKEN oluşturuldu
- [ ] GitHub Secret eklendi
- [ ] Workflow dosyası commit edildi
- [ ] İlk build tetiklendi
- [ ] Build başarılı tamamlandı
- [ ] APK indirildi ve test edildi

---

🤖 **Generated with Claude Code**
📅 **Tarih:** 2025-12-29
