# 3D bedroom room (desktop world)

Owner: Jojo (personal portfolio). Last updated 2026-10-20.

The desktop "world" (html.dk only) opens on the hero desk and, once the hero
scrolls a little way out, fades in a gamer bedroom around it. Phones and
tablets never load any of this; they keep the live flat layout.

## Where things live

| What | Path |
|---|---|
| All room code | `src/scripts/effects/36-hero-3d.js` (search `prop(`, `FIGS`, `ledLamp`, `gamingLaptop`, `lieFlat`) |
| Room models (optimized, shipped) | `img/hero3d/room/*.glb` |
| Desk scene (Blender) | `img/hero3d/scene.glb` |
| Sneaker pair | `img/hero3d/sneaker-aj1.glb` |
| Source GLBs (full size, local only, not in git) | `docs/source-art/room/`, `docs/source-art/sneaker-jordan/`, `docs/source-art/Toys/` |
| Credits shown on the site | `src/sections/footer.html` (the `d-only` line) |

`docs/source-art/Toys/` also holds game-ripped models (Fortnite, Marvel
Rivals). They are not used and must stay off the site; only Iron Man Mark 6
from that folder is used (CC BY 4.0).

## What is in the room

- Gaming laptop: the Blender laptop recoloured gunmetal, RGB wave on the keys
  (canvas texture used as emissive), a rainbow light bar on the base front and
  a red stripe on the lid (`gamingLaptop()`).
- AULA F75 keyboard laid flat at the desk front, clear of the cart robot's lane
  (robot drives z 0.39 to 0.55).
- Slim LED arm lamp built in code (`ledLamp()`); the Blender lamp is hidden
  because its base hung off the desk edge. The warm point light and the dust
  motes sit under its head.
- Bed ("Dark Modern Bed") with iPad, Apple Pencil, SNES pad and Canon AT-1 on
  the covers. `bedY()` raycasts the covers and takes the highest point under
  each prop's footprint so nothing sinks into the blanket.
- Glass cabinet with six figures on lit stands: Iron Man, chibi Spider-Man
  (animated), Captain America, Hulk, Venom, Deadpool.
- Sneaker wall: six glass cases, one Air Jordan 1 model in six colourways (hue
  shift in the shader).
- Nike shoe-box stack (four boxes, open top box with a pair) and the lid on the
  floor, right of the desk; monstera on the floor next to it; neon sign under
  the cabinet; office chair.

## Model credits (all CC BY 4.0, Sketchfab)

| File | Model | Author | Sketchfab id |
|---|---|---|---|
| bed.glb | Dark Modern Bed | renviros | d3aeb724e09c44af96ef09cd20885220 |
| camera.glb | Canon AT-1 | AleixoAlonso | 9de66868d0f240e985da00c9480bfc82 |
| cap.glb | Captain America chibi | klrxyz | 5b3f11c14686432e8152219b16bbf2f0 |
| chair.glb | Office Chair Modern | thethieme | 675f34f7304e4d92812a41e9750539aa |
| chibi.glb | Chibi Spider-Man Animated | Ysn.Aitaddi | f36475ae771d40268c63cfd1cad21706 |
| deadpool.glb | Deadpool-like chibi character | tinkerlane_studio | 2a0ae8167eff4a9eb464f0ed3ee78eeb |
| hulk.glb | Hulk Mini | henriquebbarcellos | 29034ba3663c452bb2504290086abef7 |
| ipad.glb | iPad Pro Model | georgeh1ll | 57e42db584994f5d9c6d5ddc24f0c3e2 |
| ironman.glb | Iron Man Mark 6 | Mittergen | (see docs/source-art/Toys) |
| keyboard.glb | aula f75 Mechanical keyboard | keshavV20 | 5a8f600bae924cbbb2fe9af2b0b3c5ac |
| monstera.glb | Monstera deliciosa | ChubbyPanda | 1ab9bf841df04c07b1819be596327629 |
| neon.glb | Cyberpunk LED neon sign | ydvisual | fab087c62fc3459a8b7664757d980c28 |
| pencil.glb | Apple Pencil | EwanLejkowski | 6ecac08f60b34b2d9cb83ab897ca2cc1 |
| shoebox.glb | Nike Shoe Box | samplemem | 6eb4190c3ca847c8853226c90d1ea37a |
| snes.glb | Super Nintendo controller | so_O | 223e79dd5cbd4dc4b038c49abceef2c1 |
| venom.glb | Kawaii Venom-Inspired Chibi | mizoohdn | d59347d91b0b411f88dbb0ddba240041 |
| sneaker-aj1.glb | Nike Air Jordan | Ar41k | (see docs/source-art/sneaker-jordan) |

Downloaded but not used: mug, jade plant, desk organizer, low-poly pencils,
bedroom furniture set, old desk lamp (banker's lamp, off-theme). Every model
used must be credited in the footer line.

## Adding a model

1. Download the GLB from Sketchfab (1k textures). Signed download links expire
   in about 2 minutes, so fetch and save them straight away.
2. Keep the original in `docs/source-art/room/` and add a row above.
3. Optimize into the site folder:
   `npx -y @gltf-transform/cli@4.5.1 optimize in.glb img/hero3d/room/name.glb --compress meshopt --texture-compress webp --texture-size 512 --simplify true --simplify-ratio 0.5 --simplify-error 0.003`
4. Place it with `prop('name', size, x, y, z, ry, done)` in `36-hero-3d.js`.
   `size` is a number (largest side) or `{ h, s, d, rx, anim, flat }`:
   `h` height, `d` caps depth, `anim: true` plays the first clip and fits the
   box over the whole clip, `flat: true` (or `-1` to flip) lays a tilted scan
   flat. Models are cloned per placement unless they are skinned.
5. Add the author to the footer credit line.

## Gotchas found while building it

- Transparent sorting: glass cases must draw after what is inside them
  (`renderOrder`), or the sort puts some contents in front of their glass.
- Lights must never live inside a group that toggles `visible`; changing the
  light count recompiles every shader and froze the first reveal for 3.3 s.
  Lights are in the world and only change intensity.
- New props compile in the background (`compileThen`, compileAsync on the
  composer's render target) and textures upload early (`initTexture`).
- The room fade is time-based (0.6 s once heroOut passes 0.15, out again under
  0.06), not scroll-scrubbed, so it never rests half see-through.
- Scans often face +x or come tilted: check in a model viewer and use `ry`,
  `rx` or `flat`.

## Checks before pushing

Desktop scroll frame times (target: median 16.7 ms, no frame over about 70 ms)
and the phone build unchanged (no `world-on`, footer credits hidden). Last run
2026-10-20: median 16.7 ms, worst 67 ms.
