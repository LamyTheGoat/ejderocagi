# EO2 · Kat: yüz aksesuarı (gözlük, maske, sargı) üretim görselini Kat sayfasına çevirir (2026-11-22).
# Kullanıcı (Mehmet, 2026-11-22): aksesuar yüzü olan bir kafaya çizdirilmez, "gözleri değiştirmeye çalışsak yapamayacağız".
# Bu yüzden görsel model yüzsüz gri baş silüetinin (sablon_silu.png: önden, arkadan, yandan; göz hizası çizgi) üstüne yalnız
# aksesuarı çizer. Cam yerleri düz magenta (#FF00FF) boyanır; burada yarı saydam cama çevrilir (göz, ten, saç rengi alttan görünür).
# Adımlar: her yön ayrı hizalanır (kat_katman_ayir.hizala) → şablondan farklı pikseller alınır → silüetin yeniden çizilmiş
# kenar kırıntıları atılır (ince ve aksesuara değmeyen çizgiler) → magenta cama çevrilir → baş şablonu ölçeğinden (3.2) Kat
# hücresine (0.8) küçültülür → sablon.yuzAks kutusuna konur (3 hücre: önden, arkadan, yandan duruş; yürüyüş "iz" ile).
# Kullanım (depo kökünden): KAT_YAZ=1 python3 eo2/tools/kat_yuzaks_donustur.py <sablon_silu.png> <sonuc.png> <id> [--onizleme dosya.png]
#   Çıktı: eo2/assets/kat/yuzaks_<id>.webp (tek satır).   gerekenler: pip install pillow numpy scipy
import os, sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kat_katman_ayir import yukle, hizala, ayir

# baş şablonunun yön kutuları (sablon_silu.png üretimi): şablonda yuva i, x = i*512, y = 256'dan başlar; sayfa = sayfa0 + (t - hedef0) / K
K = 3.2; YON = [('down', 520, 234), ('up', 519, 222), ('right', 501, 232)]
# Kat hücresi (kat_baslik_pisir.mjs ile aynı çekim): hücre = (sayfa - (400, 90)) * 0.8, ayak noktası (160, 440)
SC, BX, BY, AX, AY = 0.8, 400, 90, 160, 440
# sablon.yuzAks: başın her yönde kapladığı yer + pay (hücrede baş x 91..212, y 117..233)
KUTU = {'x0': 72, 'y0': 92, 'cw': 168, 'ch': 168}
CAM = np.array([196, 226, 240], np.float32); CAM_A = 0.34

def temizle(rgba):
    """silüet kenarının modelce yeniden çizilmiş ince kırıntılarını at: yalnız kalın bir gövdeye (aksesuar) değen pikseller kalır"""
    a = rgba[..., 3] > 20
    govde = nd.binary_opening(a, structure=np.ones((3, 3)), iterations=3)
    lab, n = nd.label(govde); boy = nd.sum(govde, lab, range(1, n + 1)); govde = np.isin(lab, 1 + np.nonzero(boy >= 400)[0])
    kalsin = a & nd.binary_dilation(govde, iterations=5)
    o = rgba.copy(); o[..., 3] = np.where(kalsin, o[..., 3], 0); return o

def cam(rgba):
    """düz magenta → yarı saydam cam + sol üstte parıltı; kenarın yumuşak geçişi magentadan arındırılır"""
    o = rgba.astype(np.float32); R, G, B = o[..., 0], o[..., 1], o[..., 2]
    m = np.clip(((R + B) / 2 - G - 90) / 110, 0, 1) * (np.abs(R - B) < 90) * (o[..., 3] > 0)
    if not m.any(): return rgba
    M = np.array([255, 0, 255], np.float32); k = m[..., None]
    halka = np.where(k < 0.95, (o[..., :3] - k * M) / np.maximum(1 - k, 0.05), CAM)   # kenarda magentanın altındaki çerçeve rengi
    renk = halka * (1 - k) + CAM * k; alfa = o[..., 3] / 255 * (1 - m) + CAM_A * m
    # parıltı: her camın sol üst çeyreğinde çapraz bir şerit
    lab, n = nd.label(m > 0.5)
    for j, sl in enumerate(nd.find_objects(lab), 1):
        ys, xs = np.nonzero(lab[sl] == j)
        if len(xs) < 80: continue
        cy, cx = ys.mean() + sl[0].start, xs.mean() + sl[1].start; ry, rx = max(np.ptp(ys), 1) / 2, max(np.ptp(xs), 1) / 2
        Y, X = np.mgrid[sl[0], sl[1]]; u, v = (X - cx) / rx, (Y - cy) / ry
        p = ((u + v > -0.95) & (u + v < -0.55) & (u * u + v * v < 0.62) & (lab[sl] == j)).astype(np.float32)
        p = nd.gaussian_filter(p, 1.2) * 0.8; sub = (slice(sl[0].start, sl[0].stop), slice(sl[1].start, sl[1].stop))
        renk[sub] = renk[sub] * (1 - p[..., None]) + 255 * p[..., None]; alfa[sub] = np.maximum(alfa[sub], p)
    return np.dstack([renk, alfa * 255]).clip(0, 255).astype(np.uint8)

def hucreye(katman, i, sx, sy):
    """şablon yuvası i → Kat kutusu (KUTU) ölçüsünde RGBA, önceden çarpılmış alfa ile küçültülür"""
    yuva = katman[:, i * 512:(i + 1) * 512].astype(np.float32); a = yuva[..., 3:] / 255
    on = np.dstack([yuva[..., :3] * a, a * 255]).astype(np.float32)
    f = SC / K   # 0.25
    # hücrede yuvanın (0, 0) noktası: sayfa (sx, sy - 256/K)
    cx0, cy0 = (sx - BX) * SC - KUTU['x0'], (sy - 256 / K - BY) * SC - KUTU['y0']
    kanal = []
    for c in range(4):
        im = Image.fromarray(on[..., c], 'F')
        # çıktı (x, y) → kaynak ((x - cx0) / f, (y - cy0) / f); önce 2x küçült (yumuşak), sonra kesirli kaydırmalı afin
        k2 = im.resize((256, 512), Image.BOX)
        g = k2.transform((KUTU['cw'], KUTU['ch']), Image.AFFINE, (2, 0, -cx0 * 2, 0, 2, -cy0 * 2), Image.BILINEAR)
        kanal.append(np.asarray(g, np.float32))
    r, g, b, al = kanal; aa = np.maximum(al / 255, 1e-6)
    return np.dstack([r / aa, g / aa, b / aa, al]).clip(0, 255).astype(np.uint8)

if __name__ == '__main__':
    tpl, res, kim = sys.argv[1:4]; oniz = sys.argv[sys.argv.index('--onizleme') + 1] if '--onizleme' in sys.argv else None
    if not os.environ.get('KAT_YAZ') and not oniz: sys.exit('üzerine yazar: KAT_YAZ=1 ver (ya da yalnız --onizleme)')
    T, R = yukle(tpl), yukle(res); assert T.shape == R.shape == (1024, 1536, 3), (T.shape, R.shape)
    parca = []
    for i, (yon, sx, sy) in enumerate(YON):
        (s, dx, dy), S, q = hizala(T[:, i * 512:(i + 1) * 512], R[:, i * 512:(i + 1) * 512])
        print(f'{yon}: ölçek {s:.4f} kayma ({dx:.1f}, {dy:.1f}) eşleşme %{q * 100:.0f}')
        if q < 0.5: sys.exit(f'{yon}: eşleşme düşük, model başı yeniden çizmiş; katman alınmadı')
        parca.append(cam(temizle(ayir(T[:, i * 512:(i + 1) * 512], S, 60))))
    katman = np.concatenate(parca, 1)
    if oniz: Image.fromarray(katman, 'RGBA').save(oniz)
    sayfa = np.concatenate([hucreye(katman, i, sx, sy) for i, (_, sx, sy) in enumerate(YON)], 1)
    if os.environ.get('KAT_YAZ'):
        Image.fromarray(sayfa, 'RGBA').save(f'eo2/assets/kat/yuzaks_{kim}.webp', 'WEBP', quality=92, method=4, alpha_quality=100)
        print('yazıldı', f'eo2/assets/kat/yuzaks_{kim}.webp', sayfa.shape, 'sablon.yuzAks', {'cw': KUTU['cw'], 'ch': KUTU['ch'], 'ax': AX - KUTU['x0'], 'ay': AY - KUTU['y0']})
