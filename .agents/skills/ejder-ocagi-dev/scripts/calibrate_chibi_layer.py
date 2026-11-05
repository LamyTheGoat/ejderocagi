import os
import numpy as np
from PIL import Image
from extract_34_boss_equipment import get_cell, sh1, sh2, LAYER_DIR

# 1. Refine hat_10 and hat_12: slightly wider (224px) & higher (py=8) so they cover the upper-left skull dome completely, and keep hair visible in chibi.js & minigame.js!
for hname, c_idx, target_w, px, py in [
    ('hat_10', 1, 224, 84, 8),
    ('hat_12', 3, 228, 82, 8),
]:
    crop = get_cell(sh1, 0, c_idx, preserve_emerald=False)
    nh = int(crop.height * (target_w / crop.width))
    res = np.array(crop.resize((target_w, nh), Image.Resampling.LANCZOS), dtype=np.float32)
    rh, rw = res.shape[:2]
    ry, rx = np.mgrid[0:rh, 0:rw]
    nx = (rx - rw * 0.60) / (rw * 0.40)
    left_ear_guard = np.clip((-nx - 0.48) / 0.25, 0.0, 1.0) * 0.34
    nose_dip = 0.11 * np.exp(-12.0 * (nx ** 2))
    brow_cutoff = rh * (0.53 + nose_dip + left_ear_guard)
    fade = np.clip((brow_cutoff - ry) / 4.0, 0.0, 1.0)
    dark_cavity = (ry > rh * 0.48) & (res[:,:,0] < 65) & (res[:,:,1] < 55) & (res[:,:,2] < 60) & (nx > -0.52)
    res[:, :, 3] *= fade
    res[dark_cavity, 3] = 0.0
    rim = (ry >= brow_cutoff - 3.0) & (ry <= brow_cutoff) & (res[:,:,3] > 45)
    res[rim, :3] *= 0.32
    res[rim, 3] = np.maximum(res[rim, 3], 235)
    canv = Image.new('RGBA', (400, 520), (0, 0, 0, 0))
    canv.paste(Image.fromarray(np.clip(res, 0, 255).astype(np.uint8), 'RGBA'), (px, py))
    canv.save(os.path.join(LAYER_DIR, hname + '.webp'), 'WEBP', quality=94)

# 2. Clear the dark interior V-neck hole at the top of armor_9, armor_10, armor_11 so the Chibi's skin neck shows through, and connect armor_11's elbows over a dark under-sleeve!
ar10_im = Image.open(os.path.join(LAYER_DIR, 'armor_10.webp')).convert('RGBA')
ar10_arr = np.array(ar10_im, dtype=np.float32)
# Create a dark obsidian under-sleeve from armor_10 (desaturated/darkened) to fill the 3px elbow gap on armor_11
under_sleeve = ar10_arr.copy()
under_sleeve[:,:,0] *= 0.35
under_sleeve[:,:,1] *= 0.42
under_sleeve[:,:,2] *= 0.55
under_im = Image.fromarray(np.clip(under_sleeve, 0, 255).astype(np.uint8), 'RGBA')

ar11_path = os.path.join(LAYER_DIR, 'armor_11.webp')
ar11_orig = Image.open(ar11_path).convert('RGBA')
ar11_merged = under_im.copy()
ar11_merged.alpha_composite(ar11_orig)
ar11_merged.save(ar11_path, 'WEBP', quality=94)

for aname in ['armor_9', 'armor_10', 'armor_11']:
    ap = os.path.join(LAYER_DIR, aname + '.webp')
    aim = Image.open(ap).convert('RGBA')
    aarr = np.array(aim, dtype=np.float32)
    yy, xx = np.mgrid[0:520, 0:400]
    # Collar interior window is x in [178..232], y in [210..248] where pixels are very dark (R<48, G<48, B<52)
    neck_hole = (xx >= 178) & (xx <= 232) & (yy >= 210) & (yy <= 248) & (aarr[:,:,0] < 48) & (aarr[:,:,1] < 48) & (aarr[:,:,2] < 52)
    aarr[neck_hole, 3] = 0.0
    Image.fromarray(np.clip(aarr, 0, 255).astype(np.uint8), 'RGBA').save(ap, 'WEBP', quality=94)

# 3. Align wpn_9, wpn_10, wpn_11 grip shaft directly into the 3/4 right gauntlet fist at (302, 374)!
wpn_configs = [
    ('wpn_9',  sh2, 1, 0, True,  (302, 374), (0.36, 0.72), 275),
    ('wpn_10', sh2, 1, 1, False, (302, 374), (0.24, 0.82), 258),
    ('wpn_11', sh2, 1, 2, False, (302, 374), (0.24, 0.82), 272),
]
for wname, sh_im, r_idx, c_idx, pres, grip_xy, grip_frac, target_h in wpn_configs:
    wcrop = get_cell(sh_im, r_idx, c_idx, preserve_emerald=pres)
    nh = target_h
    nw = max(1, int(wcrop.width * (nh / wcrop.height)))
    wres = wcrop.resize((nw, nh), Image.Resampling.LANCZOS)
    wcanv = Image.new('RGBA', (400, 520), (0, 0, 0, 0))
    px = int(grip_xy[0] - nw * grip_frac[0])
    py = int(grip_xy[1] - nh * grip_frac[1])
    wcanv.paste(wres, (px, py), wres)
    wcanv.save(os.path.join(LAYER_DIR, wname + '.webp'), 'WEBP', quality=94)

# Render verification sheet with hair_1 visible on all 3/4 Boss sets!
def load_l(name):
    return Image.open(os.path.join(LAYER_DIR, name + '.webp')).convert('RGBA')

sets = [
    ("Set 7 (Ref 3/4)", "back_6", "armor_7", "face_6", "hat_7", "wpn_6"),
    ("Set 8 (Ref 3/4)", "back_8", "armor_8", "face_8", "hat_8", "wpn_8"),
    ("Set 9 (Sahmeran 3/4)", "back_6", "armor_9", "face_8", "hat_9", "wpn_9"),
    ("Set 10 (Kalgarot 3/4)", "back_8", "armor_10", "face_9", "hat_10", "wpn_10"),
    ("Set 11 (Tanrica 3/4)", "back_9", "armor_9", "face_8", "hat_11", "wpn_9"),
    ("Set 12 (Mavi-Kor 3/4)", "back_10", "armor_11", "face_9", "hat_12", "wpn_11"),
]

W, H = 260, 338
sheet = Image.new('RGBA', (W * 3, H * 2), (28, 22, 20, 255))
for idx, (lbl, bk, ar, fc, ht, wp) in enumerate(sets):
    canv = Image.new('RGBA', (400, 520), (38, 30, 26, 255))
    hide_h = (ht == 'hat_8')
    layers = [bk, "neck_male", ar, "head_expr_1", fc]
    if not hide_h:
        layers.append("hair_1")
    layers.extend([ht, wp])
    for ln in layers:
        canv.alpha_composite(load_l(ln))
    thumb = canv.resize((W, H), Image.Resampling.LANCZOS)
    sheet.paste(thumb, ((idx % 3) * W, (idx // 3) * H))

sheet.save('/tmp/v18_boss_sets_34_perfected.png')
print("Saved /tmp/v18_boss_sets_34_perfected.png")
