---
name: ejder-ocagi-dev
description: Develop, audit, and generate assets or mechanics for the Ejder Ocagi 2D tactical artillery RPG and dragon breeding game. Use whenever working on EjderOcagi, adding new bosses, dungeons, 3/4 Chibi equipment layers, custom UI assets, or tuning Bombom/Worms artillery combat game feel.
---
# ejder-ocagi-dev

Workflow and automated verification tools for developing **Ejder Ocagi**, including 3/4 Chibi paper-doll equipment calibration, sprite transparency cleanup, and Bombom/Worms artillery raid combat design.

## When to Use

- Adding or editing Chibi equipment layers (`img/chibi/layers/` and `img/chibi/icons/`)
- Creating new raid bosses, sub-bosses, mobs, or multi-stage dungeons in `js/minigame.js`
- Designing or replacing UI medallions, dials, seals, and banners in `img/ui/`
- Auditing the codebase for broken image paths, JS syntax errors, or sprite border artifacts

## Steps

### 1. Calibrate 3/4 Chibi Equipment Layers

All Chibi paper-doll layers must use a `400x520` RGBA canvas in **3/4 right-facing perspective** (`~30-35 deg` yaw to the right) so they match `head_expr_3.webp` and `neck_male.webp`:

- **Helmets (`hat_*`):** Anchor `cx=202, cy=135`. Carve out the interior face cavity around `(206, 210)` (`rx=55, ry=46`) so eyes and mouth remain visible.
- **Face Masks (`face_*`):** Anchor `cx=208, cy=204`.
- **Armors (`armor_*`):** Anchor `cx=200, cy=368`. Carve out the chin/neck overlap around `(204, 218)` and ensure left/right arm cuffs connect cleanly to `hand_grip.webp`.
- **Wings/Capes (`back_*`):** Anchor `cx=194, cy=295` (rendered behind body).
- **Weapons (`wpn_*`):** Align the weapon shaft grip point to `(302, 374)` at a `36 deg` diagonal angle so the right hand (`hand_grip.webp`) clasps the shaft naturally.

Run `python3 scripts/calibrate_chibi_layer.py` to test-composite any new layer onto the base Chibi rig and inspect the output image before saving.

### 2. Clean Cutout Sprites and UI Icons

Never use raw rectangular crops or naive RGB flood-fill on dark fantasy artwork:

- Remove border-connected background pixels using luminance + saturation thresholds (`lum < 38` and `sat < 35`) combined with connected-component labeling (`scipy.ndimage.label`).
- Feather the outer `4px` boundary of every cutout sprite so rectangular edges never appear on canvas.
- Center flying mobs (`wyvern_fly_*`, `viper_fly_*`) on a padded `360x360` transparent canvas so wingtips never clip.

### 3. Follow Tactical Artillery Game Design Rules

When editing `js/minigame.js` (`WORLD_W = 3400, WORLD_H = 1550`):

- **Zero Arena Prop Clutter:** Keep `stalactites`, `urns`, `totems`, `geysers`, `shrines`, `mirrors`, `terrainProps`, and `runeGenerators` empty (`[]`).
- **Colossal Boss Scale:** Render `Kalgarot` at `440x415`, `Sahmeran` at `376x384`, `Sub-Bosses` at `236x236`, `Mobs` at `132x124`, and `Player` at `88x112`.
- **Turn-Tracking Close-Up Camera:** Default zoom `1.28x`. Glide the camera sequentially to each acting unit (`Player -> Mob 1 -> Mob 2 -> Boss -> Player`), lead flying projectiles (`lookAhead`), and hold on impact (`impactHoldTimer = 24`) before switching turns.
- **Tactical Boss Danger Zones:** Bosses must telegraph a ground `dangerZone` at the start of the player's turn so walking (`ArrowLeft/Right`) or flying (`[F]`) outside the radius allows dodging for `0` damage.
- **Skill Economy:** Keep Volley modifiers (`[1] plus1`, `[2] plus2`, `[3] trident`) mutually exclusive while allowing combination with Payload modifiers (`[4] heavy`, `[5] crater`). Enforce turn cooldowns on `[F]`, `[Q]`, and `[E]`.

### 4. Run Full Project Verification

After any code or asset change, run the automated audit script from the project root:

```bash
python3 scripts/audit_project.py
```

Verify that all JS files parse cleanly, `0` static image references are missing, and all cutout sprites pass edge-occupancy checks.

## Gotchas

- `SFX.play()` in `js/fx.js` expects normalized keys (`crit`, `hit`, `roar`, `guard`, `win`, `cannon_launch`, `crater_boom`, `crown_crit`, `turn_switch`, `boss_telegraph`).
- Do not draw a duplicate `drawWorldHpBar` above the Colossal Boss on the canvas; the Boss uses the top-center `#shmBossBanner` with `#shmBossHpGhost`.
