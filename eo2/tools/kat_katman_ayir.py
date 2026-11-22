# EO2 · Kat: şablon üstüne çizdirilen parçayı katmana ayırır (2026-11-22).
# Yöntem (prototype/chibi_rig/URETIM_HATTI.md, tools/overlay_extract.mjs ile aynı fikir): görsel model sabit şablonun (yeşil zemin
# üstünde baş ya da gövde) üstüne yalnız bir parça çizer. Model resmi biraz kaydırıp büyütür; burada sonuç şablona hizalanır
# (ölçek + kayma araması, farkı büyük pikseller sınırlanır ki çizilen parça hizayı çekmesin), sonra yalnız şablondan farklı ve zemin
# olmayan pikseller alınır. Katman böylece şablonun koordinatında doğar.
# Kullanım: python3 eo2/tools/kat_katman_ayir.py <sablon.png> <sonuc.png> <katman_cikti.png> [--tol 60]
#   Çıktı: şablon ölçüsünde RGBA katman + ekrana hiza (ölçek, kayma) ve eşleşme oranı. Eşleşme %80'in altındaysa model başı
#   yeniden çizmiştir: araç durur (sessizce kötü katman üretmez).
import sys, numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as nd

def yukle(p): return np.asarray(Image.open(p).convert('RGB')).astype(np.float32)
def yesil(a): return (a[..., 1] - np.maximum(a[..., 0], a[..., 2])) > 60
def ornekle(R, s, dx, dy, H, W, ys=None, xs=None):
    if ys is None: ys, xs = np.mgrid[0:H, 0:W].astype(np.float32)
    X, Y = xs * s + dx, ys * s + dy
    return np.stack([nd.map_coordinates(R[..., c], [Y, X], order=1, mode='constant', cval=[0, 255, 0][c]) for c in range(3)], -1)
def hizala(T, R):
    H, W = T.shape[:2]; sc = R.shape[1] / W; en = None
    for bl, adim, olc in [(6, 8, None), (2, 4, 1), (0, 2, 2)]:
        Tb = np.asarray(Image.fromarray(T.astype(np.uint8)).filter(ImageFilter.BoxBlur(bl))).astype(np.float32) if bl else T
        Rb = np.asarray(Image.fromarray(R.astype(np.uint8)).filter(ImageFilter.BoxBlur(bl))).astype(np.float32) if bl else R
        ys, xs = np.mgrid[0:H:adim, 0:W:adim].astype(np.float32); Ts = Tb[::adim, ::adim]
        if en is None: aday = [(s, dx, dy) for s in np.arange(sc * 0.9, sc * 1.1, sc * 0.01) for dx in range(-60, 61, 8) for dy in range(-60, 61, 8)]
        else: s0, x0, y0 = en[1:]; d = [4, 1.5, 0.5][olc]; aday = [(s0 + k * sc * [0.01, 0.003, 0.001][olc], x0 + a, y0 + b) for k in range(-3, 4) for a in np.arange(-d * 3, d * 3 + 1e-6, d) for b in np.arange(-d * 3, d * 3 + 1e-6, d)]
        en = None
        for s, dx, dy in aday:
            S = ornekle(Rb, s, dx, dy, None, None, ys, xs); f = np.abs(S - Ts).sum(-1); m = np.minimum(f, 90).mean()
            if en is None or m < en[0]: en = (m, s, dx, dy)
    S = ornekle(R, en[1], en[2], en[3], H, W); f = np.abs(S - T).sum(-1); bas = ~yesil(T)
    return en[1:], S, float((f[bas] < 40).mean())
def ayir(T, S, tol):
    """şablondan farklı ve zemin olmayan pikseller; kenar: yeşillik kadar saydam, yeşil taşma temizlenir"""
    g = S[..., 1] - np.maximum(S[..., 0], S[..., 2]); zemin = np.clip((g - 20) / 120, 0, 1)
    fark = np.abs(S - T).sum(-1) > tol
    fark = nd.binary_opening(fark, iterations=1); fark = nd.binary_closing(fark, iterations=2)
    # küçük adacıkları at (sıkıştırma gürültüsü)
    lab, n = nd.label(fark); boy = nd.sum(fark, lab, range(1, n + 1)); fark = np.isin(lab, 1 + np.nonzero(boy >= 40)[0])
    a = np.where(fark, 1 - zemin, 0) * 255
    o = S.copy(); o[..., 1] = np.minimum(o[..., 1], np.maximum(o[..., 0], o[..., 2]) + 10)   # yeşil taşma
    return np.dstack([o, a]).clip(0, 255).astype(np.uint8)
if __name__ == '__main__':
    tpl, res, cik = sys.argv[1:4]; tol = float(sys.argv[sys.argv.index('--tol') + 1]) if '--tol' in sys.argv else 60
    T, R = yukle(tpl), yukle(res); (s, dx, dy), S, q = hizala(T, R)
    print(f'hiza: ölçek {s:.4f} kayma ({dx:.1f}, {dy:.1f}) eşleşme %{q * 100:.1f}')
    if q < 0.8: sys.exit('eşleşme düşük: model başı yeniden çizmiş, katman alınmadı')
    Image.fromarray(ayir(T, S, tol), 'RGBA').save(cik)
