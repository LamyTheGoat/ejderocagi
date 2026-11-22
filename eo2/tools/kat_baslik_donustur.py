# EO2 · Kat Faz 3: kat_baslik_pisir.mjs'in ham çekimlerini Kat düzenine çevirir (2026-11-22).
# Kullanıcı (Mehmet, 2026-11-22): "Layerlar zırhlar setler kostümler iyice karıştı orada reliable bir sistem kurmamız lazım."
# Girdi: eo2/tools/dogrulama/kat_baslik_ham (ya da KAT_HAM): her çekim 6 hücrelik bir PNG şeridi (hücre 320 x 440, ayak noktası 160, 440).
# Çıktı (KAT_YAZ=1 gerekir, üzerine yazar):
#   eo2/assets/kat/baslik_<id>.webp          başlığın kendisi. Satırlar: katalogdaki parca sırası (baslikArka, baslik, yama; olmayan satır yazılmaz)
#   eo2/assets/kat/baslik_<id>_sac.webp      başlık takılıyken saçın görünen kısmı, gri (rampa ile boyanır). Satır = stil x (sacArka, sacOn, sacUst)
#   eo2/assets/kat/baslik_<id>_sac_ozgun.webp aynı düzen, "Özgün" saç rengiyle
#   TON: bir başlığın renk çeşidi (ör. Tunç Tolga = Demir miğferin tunç tonu): yalnız başlık sayfası ayrı yazılır, saç kesimi kaynağınki kullanılır.
#   eo2/tools/dogrulama/kat_baslik_ham.json: şablon ölçüleri ve satır düzeni (katalog.js elle yazılır, bu dosya ona kaynaktır)
# Kullanım (depo kökünden): KAT_YAZ=1 python3 eo2/tools/kat_baslik_donustur.py      gerekenler: pip install pillow numpy
import json, os, sys, numpy as np
from PIL import Image
HAM = os.environ.get('KAT_HAM', 'eo2/tools/dogrulama/kat_baslik_ham'); OUT = 'eo2/assets/kat/'
if not os.environ.get('KAT_YAZ'): sys.exit('üzerine yazar: KAT_YAZ=1 ver')
J = json.load(open(HAM + '/ham.json')); CW, CH, AX, AY = 320, 440, 160, 440; N = len(J['hucre'])
assert J['capa'] == {'ax': AX, 'ay': AY}, J['capa']
SAPKA = list(J['sapka']); STIL = ['orig', 'kisa', 'topuz', 'atkuyrugu', 'yan', 'uzun', 'ikiz', 'kut', 'orgu']; SACP = ['sacArka', 'sacOn', 'sacUst']; BP = [('arka', 'baslikArka'), ('on', 'baslik'), ('yama', 'yama')]
def yukle(ad):
    p = f'{HAM}/{ad}.png'
    return np.asarray(Image.open(p).convert('RGBA')).astype(np.float32) if os.path.exists(p) else None
def kutu(dosyalar):
    """bütün dosyaların bütün hücrelerinde dolu piksellerin ortak kutusu (hücre koordinatı), 2 px pay"""
    x0, y0, x1, y1 = CW, CH, 0, 0
    for im in dosyalar:
        a = im[..., 3].reshape(CH, N, CW).max(1) > 2; ys, xs = np.nonzero(a)
        if len(xs): x0, y0, x1, y1 = min(x0, xs.min()), min(y0, ys.min()), max(x1, xs.max() + 1), max(y1, ys.max() + 1)
    x0, y0, x1, y1 = max(0, x0 - 2), max(0, y0 - 2), min(CW, x1 + 2), min(CH, y1 + 2)
    return {'cw': int(x1 - x0), 'ch': int(y1 - y0), 'ax': int(AX - x0), 'ay': int(AY - y0), 'x0': int(x0), 'y0': int(y0)}
def satir(im, T):
    """6 hücrelik şeridi şablon kutusuna kırp: (ch, cw*N)"""
    if im is None: return np.zeros((T['ch'], T['cw'] * N, 4), np.float32)
    return np.concatenate([im[T['y0']:T['y0'] + T['ch'], i * CW + T['x0']:i * CW + T['x0'] + T['cw']] for i in range(N)], 1)
def yaz(ad, arr): Image.fromarray(np.clip(arr + 0.5, 0, 255).astype(np.uint8), 'RGBA').save(OUT + ad, 'WEBP', quality=90, method=4, alpha_quality=100)
lum = lambda a: a[..., 0] * 0.299 + a[..., 1] * 0.587 + a[..., 2] * 0.114

baslikIm = {h: {k: yukle(f'b_{h}_{k}') for k, _ in BP} for h in SAPKA}
sacIm = {h: {(s, r, p): yukle(f's_{h}_{s}_{r}_{p}') for s in STIL for r in ('white', 'orig') for p in SACP} for h in SAPKA}
TB = kutu([im for h in SAPKA for im in baslikIm[h].values() if im is not None])
TS = kutu([im for h in SAPKA for im in sacIm[h].values() if im is not None])
print('şablon baslik', TB, 'sacAlti', TS)
# ---- renk çeşitleri: kaynağın parlaklığı üç duraklı bir renk rampasından geçer (koyu, orta, açık)
TON = {'bork': ('fes', [(34, 22, 16), (122, 84, 56), (214, 180, 140)]), 'tolga': ('kask1', [(40, 22, 12), (176, 106, 48), (255, 214, 150)]), 'kara_migfer': ('kask1', [(10, 10, 16), (58, 60, 74), (168, 172, 190)])}
def tonla(arr, duraklar):
    l = lum(arr) / 255; d = np.array(duraklar, np.float32); o = arr.copy()
    for c in range(3): o[..., c] = np.interp(l, [0, 0.5, 1], d[:, c])
    return o
veri = {'sablon': {'baslik': {k: TB[k] for k in ('cw', 'ch', 'ax', 'ay')}, 'sacAlti': {k: TS[k] for k in ('cw', 'ch', 'ax', 'ay')}}, 'stiller': STIL, 'parca': SACP, 'baslik': {}}
for h in SAPKA:
    parca = [(k, ad) for k, ad in BP if baslikIm[h][k] is not None]
    sayfa = np.concatenate([satir(baslikIm[h][k], TB) for k, _ in parca], 0); yaz(f'baslik_{h}.webp', sayfa)
    gri = np.concatenate([satir(sacIm[h][(s, 'white', p)], TS) for s in STIL for p in SACP], 0); g = lum(gri); yaz(f'baslik_{h}_sac.webp', np.dstack([g, g, g, gri[..., 3]]))
    yaz(f'baslik_{h}_sac_ozgun.webp', np.concatenate([satir(sacIm[h][(s, 'orig', p)], TS) for s in STIL for p in SACP], 0))
    bos = [f'{s}.{p}' for s in STIL for p in SACP if sacIm[h][(s, 'white', p)] is None]
    veri['baslik'][h] = {'ad': J['sapka'][h], 'tur': J['tur'].get(h, 'closed'), 'parca': [ad for _, ad in parca], 'bos': bos}
for t, (kaynak, duraklar) in TON.items():
    parca = [(k, ad) for k, ad in BP if baslikIm[kaynak][k] is not None]
    yaz(f'baslik_{t}.webp', np.concatenate([tonla(satir(baslikIm[kaynak][k], TB), duraklar) for k, _ in parca], 0))
    veri['baslik'][t] = {'kaynak': kaynak, 'parca': [ad for _, ad in parca]}
# aynı saç altı sayfası (açık başlıklar saçı kesmez: bandana ve taç aynı) bir kez durur; ikincisi birincinin dosyasını kullanır (veri.baslik.<id>.sacAltiOrtak)
import hashlib; gorulen = {}
for h in SAPKA:
    oz = hashlib.md5(open(OUT + f'baslik_{h}_sac.webp', 'rb').read() + open(OUT + f'baslik_{h}_sac_ozgun.webp', 'rb').read()).hexdigest()
    if oz in gorulen: os.remove(OUT + f'baslik_{h}_sac.webp'); os.remove(OUT + f'baslik_{h}_sac_ozgun.webp'); veri['baslik'][h]['sacAltiOrtak'] = gorulen[oz]
    else: gorulen[oz] = h
json.dump(veri, open('eo2/tools/dogrulama/kat_baslik_ham.json', 'w'), ensure_ascii=False, indent=1)
print('tamam', sum(os.path.getsize(OUT + f) for f in os.listdir(OUT) if f.startswith('baslik_')) // 1024, 'KB')
