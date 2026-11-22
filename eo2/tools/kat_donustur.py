# EO2 · Kat sistemi Faz 1: eski görünüş katmanlarını (assets/gorunus/, 53 karelik sayfalar) Kat düzenine çevirir. 2026-11-22
# Kullanıcı (Mehmet, 2026-11-22): "Layerlar zırhlar setler kostümler iyice karıştı orada reliable bir sistem kurmamız lazım. Tek bir saç modeli eklerken bile çok zorlanıyoruz."
# TEK SEFERLİK ARAÇ. Eski çizici (prototype/chibi_rig) gerekmez; yalnız depodaki pişmiş dosyaları okur.
#   Ölçüm (2026-11-22): başa bağlı katmanlar (saç, yüz, kulak) yürüyüşün 16 karesinde aynıdır (fark yalnız webp gürültüsü); duruş karesi
#   yürüyüşten yalnız düşey kaymayla ayrılır. Bu yüzden her yön için iki hücre (durus, yuru) ve yüzde sevinç hücresi yeter: 53 kare → 6-8 hücre.
#   Saç rengi gri tonlu ana çizim + renk rampasıyla kurulur (beyaz saçın parlaklığı → renk; ortalama fark 2-6/255, gözle aynı).
#   "Özgün" renk rampaya uymuyor (özgün saçta mor uçlar, turuncu parıltı: renk konuma bağlı): her stilin özgün renkli sayfası ayrıca yazılır (sac_<stil>_ozgun.webp).
#   Göz rengi rampaya uymuyor (irisin içinde konuma bağlı geçiş var): yüz dosyasında her göz rengi ayrı satırdır.
#   Eski "a/b kafa şablonu" dosyaları (yuz_*_a / _b, kulak_a / _b) bayt bayt aynıydı: Kat'ta tek yüz ve tek kulak vardır.
# Çıktı: eo2/assets/kat/*.webp ve kat/rampa.png (araç yeniden koşarsa ÜZERİNE YAZAR: KAT_YAZ=1 gerekir). Katalog (eo2/assets/kat/katalog.js) elle yazılır;
#   araç yalnız eo2/tools/dogrulama/kat_katalog_ham.json (ölçüler, rampa satırları) ve kat_donusum_raporu.json (kare başına fark) bırakır.
# Kullanım (depo kökünden): KAT_YAZ=1 python3 eo2/tools/kat_donustur.py      gerekenler: pip install pillow numpy
import json, os, sys, numpy as np
from PIL import Image
A = 'eo2/assets/'; OUT = A + 'kat/'
if not os.environ.get('KAT_YAZ'): sys.exit('katalog.js elle düzenlenmiş olabilir; üzerine yazmak için KAT_YAZ=1 ver')
os.makedirs(OUT, exist_ok=True)
s = open(A + 'gorunus_atlas.js').read(); J = json.loads(s[s.index('=') + 1:].strip().rstrip(';'))
def yukle(g, k): return np.asarray(Image.open(f'{A}gorunus/{g}_{k}.webp').convert('RGBA')).astype(np.float32)
YONLER = ['down', 'up', 'right']
HUCRE = ['down_durus', 'down_yuru', 'up_durus', 'up_yuru', 'right_durus', 'right_yuru', 'down_sevinc', 'right_sevinc']
KAYNAK = {'down_durus': 'down_idle', 'down_yuru': 'down_walk_0', 'up_durus': 'up_idle', 'up_yuru': 'up_walk_0', 'right_durus': 'right_idle', 'right_yuru': 'right_walk_0', 'down_sevinc': 'down_happy', 'right_sevinc': 'right_happy'}
def hucre_al(m, im, key):
    f = m['frames'][key]; c = f % m['cols']; r = f // m['cols']; return im[r*m['ch']:(r+1)*m['ch'], c*m['cw']:(c+1)*m['cw']]
def prem(a): p = a.copy(); p[..., :3] *= a[..., 3:4] / 255; return p
def fark(a, b): A_, B_ = prem(a), prem(b); m = (A_[..., 3] > 8) | (B_[..., 3] > 8); return float(np.abs(A_ - B_)[m].mean()) if m.any() else 0.0
rapor = []
def denetle(g, k, m, im, hucreler):
    """her karenin, kendisine verilen hücreyle aynı olduğunu sına (eşik: ortalama 4/255; webp gürültüsü ~1-2)"""
    en = 0
    for key in m['frames']:
        d, tur = key.split('_')[0], key.split('_')[1]
        h = d + ('_yuru' if tur == 'walk' else '_sevinc' if tur == 'happy' and d + '_sevinc' in hucreler else '_durus')
        e = fark(hucre_al(m, im, KAYNAK[h]), hucre_al(m, im, key)); en = max(en, e)
    rapor.append((g, k, round(en, 2)))
    if en > 6: print('UYARI: büyük fark', g, k, en)

# ---- şablon: her slotun ortak hücresi (karakter ayak noktasına göre çapa). Eski kurucu katmanı sol - round(ax) noktasına koyuyordu; aynısı.
def sablon(grup, anahtarlar):
    sol = max(round(J[grup][k]['ax']) for k in anahtarlar); ust = max(round(J[grup][k]['ay']) for k in anahtarlar)
    sag = max(J[grup][k]['cw'] - round(J[grup][k]['ax']) for k in anahtarlar); alt = max(J[grup][k]['ch'] - round(J[grup][k]['ay']) for k in anahtarlar)
    return {'cw': sol + sag, 'ch': ust + alt, 'ax': sol, 'ay': ust}
def yerlestir(T, m, cell):
    o = np.zeros((T['ch'], T['cw'], 4), np.float32); x = T['ax'] - round(m['ax']); y = T['ay'] - round(m['ay']); o[y:y + m['ch'], x:x + m['cw']] = cell; return o
def yaz(ad, arr, kayipsiz=False):
    Image.fromarray(np.clip(arr + 0.5, 0, 255).astype(np.uint8), 'RGBA').save(OUT + ad, 'WEBP', lossless=kayipsiz, quality=92, method=6)

sacK = [k for k in J['sac']]; stiller = list(J['ad']['sac'].keys()); renkler = list(J['ad']['sacRenk'].keys())
yuzK = list(J['yuz']); gozler = list(J['ad']['goz'].keys()); gozRenk = list(J['ad']['gozRenk'].keys())
SAB = {'sac': sablon('sac', sacK), 'yuz': sablon('yuz', yuzK), 'kulak': sablon('kulak', list(J['kulak']))}
SAB['sac']['hucre'] = HUCRE[:6]; SAB['kulak']['hucre'] = HUCRE[:6]; SAB['yuz']['hucre'] = HUCRE

# ---- saç: gri ana çizim (beyaz saçın parlaklığı) + rampa
lum = lambda a: a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114
rampaTop = {r: [np.zeros((256, 3)), np.zeros(256)] for r in renkler if r != 'orig'}
sac = {}
for st in stiller:
    parcalar = [p for p in ('a', 'o') if f'{st}_white_{p}' in J['sac']]
    sayfa = np.zeros((SAB['sac']['ch'] * len(parcalar), SAB['sac']['cw'] * 6, 4), np.float32); ozgun = np.zeros_like(sayfa)
    for pi, p in enumerate(parcalar):
        mo = J['sac'][f'{st}_orig_{p}']; io = yukle('sac', f'{st}_orig_{p}')
        for hi, h in enumerate(HUCRE[:6]): ozgun[pi*SAB['sac']['ch']:(pi+1)*SAB['sac']['ch'], hi*SAB['sac']['cw']:(hi+1)*SAB['sac']['cw']] = yerlestir(SAB['sac'], mo, hucre_al(mo, io, KAYNAK[h]))
        m = J['sac'][f'{st}_white_{p}']; im = yukle('sac', f'{st}_white_{p}'); denetle('sac', f'{st}_white_{p}', m, im, HUCRE[:6])
        for hi, h in enumerate(HUCRE[:6]):
            c = yerlestir(SAB['sac'], m, hucre_al(m, im, KAYNAK[h])); g = lum(c)
            sayfa[pi*SAB['sac']['ch']:(pi+1)*SAB['sac']['ch'], hi*SAB['sac']['cw']:(hi+1)*SAB['sac']['cw']] = np.dstack([g, g, g, c[..., 3]])
        # rampa için örnekler: bütün sayfa (53 kare), opak pikseller
        W = im; a = W[..., 3] > 200; Li = np.clip(np.round(lum(W)), 0, 255).astype(int)[a]
        for r in renkler:
            if r == 'orig': continue
            T = yukle('sac', f'{st}_{r}_{p}'); denetle('sac', f'{st}_{r}_{p}', J['sac'][f'{st}_{r}_{p}'], T, HUCRE[:6]); T = T[..., :3][a]
            hedef = rampaTop[r]
            for ch in range(3): hedef[0][:, ch] += np.bincount(Li, weights=T[:, ch], minlength=256)
            hedef[1] += np.bincount(Li, minlength=256)
    for p in parcalar: denetle('sac', f'{st}_orig_{p}', J['sac'][f'{st}_orig_{p}'], yukle('sac', f'{st}_orig_{p}'), HUCRE[:6])
    yaz(f'sac_{st}.webp', sayfa); yaz(f'sac_{st}_ozgun.webp', ozgun)
    sac[st] = {'ad': J['ad']['sac'][st], 'dosya': f'kat/sac_{st}.webp', 'ozgun': f'kat/sac_{st}_ozgun.webp', 'parca': ['sacArka' if p == 'a' else 'sacOn' for p in parcalar]}
def rampa(top):
    S, C = top; idx = np.where(C > 0)[0]; l = S / np.maximum(C, 1)[:, None]
    return np.stack([np.interp(np.arange(256), idx, l[idx, c]) for c in range(3)], 1)
satirlar = [(r, rampa(rampaTop[r])) for r in renkler if r != 'orig']
R = np.zeros((len(satirlar), 256, 4), np.uint8); R[..., 3] = 255
for i, (_, l) in enumerate(satirlar): R[i, :, :3] = np.clip(np.round(l), 0, 255)
Image.fromarray(R, 'RGBA').save(OUT + 'rampa.png')
rampaSatir = {ad: i for i, (ad, _) in enumerate(satirlar)}

# ---- yüz: göz biçimi × kafa şablonu başına bir dosya; satırlar göz renkleri (rampaya uymuyor), sütunlar 8 hücre
yuz = {}
for gz in gozler:
    for kf in ('a',):
        sayfa = np.zeros((SAB['yuz']['ch'] * len(gozRenk), SAB['yuz']['cw'] * len(HUCRE), 4), np.float32)
        for ri, gr in enumerate(gozRenk):
            k = f'{gz}_{gr}_{kf}'; m = J['yuz'][k]; im = yukle('yuz', k); denetle('yuz', k, m, im, HUCRE)
            for hi, h in enumerate(HUCRE): sayfa[ri*SAB['yuz']['ch']:(ri+1)*SAB['yuz']['ch'], hi*SAB['yuz']['cw']:(hi+1)*SAB['yuz']['cw']] = yerlestir(SAB['yuz'], m, hucre_al(m, im, KAYNAK[h]))
        yaz(f'yuz_{gz}.webp', sayfa)
    yuz[gz] = {'ad': J['ad']['goz'][gz], 'dosya': f'kat/yuz_{gz}.webp'}
for kf in ('a',):
    m = J['kulak'][kf]; im = yukle('kulak', kf); denetle('kulak', kf, m, im, HUCRE[:6]); sayfa = np.zeros((SAB['kulak']['ch'], SAB['kulak']['cw'] * 6, 4), np.float32)
    for hi, h in enumerate(HUCRE[:6]): sayfa[:, hi*SAB['kulak']['cw']:(hi+1)*SAB['kulak']['cw']] = yerlestir(SAB['kulak'], m, hucre_al(m, im, KAYNAK[h]))
    yaz('kulak.webp', sayfa)

# ---- iz: yürüyüş hücresi olmayan yeni bir parça, duruş hücresinin bu kadar kaydırılmışıyla yürür (ölçüm: kulak, yüz ve saç aynı kaymayı verir)
IZ = {'down': [0, 0.62], 'up': [0, 2.62], 'right': [0, -10.12]}
veri = {'surum': 1, 'sablon': SAB, 'iz': IZ, 'rampa': {'dosya': 'kat/rampa.png', 'satir': rampaSatir},
        'sac': sac, 'sacRenk': {r: {'ad': J['ad']['sacRenk'][r], 'rampa': None if r == 'orig' else r} for r in renkler},
        'goz': yuz, 'gozRenk': {r: {'ad': J['ad']['gozRenk'][r], 'satir': i} for i, r in enumerate(gozRenk)}, 'kulak': {'dosya': 'kat/kulak.webp'}}
DG = 'eo2/tools/dogrulama/'; os.makedirs(DG, exist_ok=True)
json.dump(veri, open(DG + 'kat_katalog_ham.json', 'w'), ensure_ascii=False, indent=1)   # katalog.js elle yazılır; bu ham çıktı karşılaştırma içindir
json.dump(rapor, open(DG + 'kat_donusum_raporu.json', 'w'))
print('en büyük farklar:', sorted(rapor, key=lambda x: -x[2])[:6])
