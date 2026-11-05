import os, re, glob
from PIL import Image
import numpy as np

root = "EjderOcagi"

# 1. Check all files in EjderOcagi
all_files = []
for r, dirs, files in os.walk(root):
    for f in files:
        all_files.append(os.path.relpath(os.path.join(r, f), root))

print(f"Total files in EjderOcagi: {len(all_files)}")

# 2. Scan all .js, .html, .css files for img/... references and verify every single one exists!
img_pattern = re.compile(r'["\'`](img/[a-zA-Z0-9_/\-\.]+\.(?:webp|png|jpg|jpeg|svg))["\'`]')
missing_refs = []
checked_refs = set()

for rel in all_files:
    if rel.endswith((".js", ".html", ".css")):
        full = os.path.join(root, rel)
        txt = open(full, "r", encoding="utf-8").read()
        for m in img_pattern.finditer(txt):
            ref = m.group(1)
            checked_refs.add(ref)
            if not os.path.exists(os.path.join(root, ref)):
                missing_refs.append((rel, ref))

print(f"Total static img/... paths referenced in code: {len(checked_refs)}")
if missing_refs:
    print("MISSING IMAGE REFERENCES:", missing_refs)
else:
    print("ZERO missing static image references! 100% of referenced images exist on disk.")

# 3. Inspect all images across subdirectories for dimensions, transparency, and border artifacts
img_files = [f for f in all_files if f.endswith((".webp", ".png", ".jpg"))]
print(f"Total image files in EjderOcagi: {len(img_files)}")

by_dir = {}
border_warnings = []
for im_rel in sorted(img_files):
    d = os.path.dirname(im_rel)
    by_dir[d] = by_dir.get(d, 0) + 1
    full = os.path.join(root, im_rel)
    im = Image.open(full).convert("RGBA")
    arr = np.array(im)
    h, w, _ = arr.shape
    # If this is a cutout sprite (chibi/layers, sahmeran sprites, komutan sprites, extreme sprites, ui icons)
    # check if edges have unexpected opaque pixels or white halo
    is_bg = ("_bg" in im_rel) or ("bg_" in im_rel) or ("panel" in im_rel) or (d == "img") or ("terrain_" in im_rel)
    if not is_bg:
        top_edge = np.mean(arr[0, :, 3] > 128)
        bot_edge = np.mean(arr[-1, :, 3] > 128)
        left_edge = np.mean(arr[:, 0, 3] > 128)
        right_edge = np.mean(arr[:, -1, 3] > 128)
        if max(top_edge, bot_edge, left_edge, right_edge) > 0.35:
            border_warnings.append((im_rel, f"{w}x{h}", round(max(top_edge, bot_edge, left_edge, right_edge), 2)))

print("Images by directory:", by_dir)
print("Cutout sprites with >35% edge occupancy:", len(border_warnings))
for bw in border_warnings[:25]:
    print("  Edge check:", bw)
