# Product photography shot list

Shoot the actual sale sample for each SKU and colourway. Do not reuse a blank, stock photo, another colourway, or another partner’s sample. Shoot the hoodie and tee separately:

| SKU / folder | Item | Detail priority |
| --- | --- | --- |
| `drop_mt_2200` | MT-22 Heavyweight Contrast Hood | Contrast panels, French terry texture and actual collaboration mark |
| `drop_sb_2095` | SB Track Club Vintage Wash Tee | Pigment wash, seam/label detail and actual club artwork |

## Required stills

- `front.jpg`: straight-on at 0°, centred, entire garment visible including cuffs, hem and hood. Steam and dress the sample in its natural fit.
- `back.jpg`: straight-on at 180°, from the same camera height and distance. Keep the actual back print or postcode treatment fully visible.
- `detail-1.jpg`: tight shot of the primary feature above. For a collaboration, show the real authorised mark, stitching or print finish. Supply additional close-ups of co-branding, back print and labels for review, even though the gallery currently publishes one detail.

## 360° turntable

- Deliver exactly 36 consistently cropped frames: `spin/01.jpg` through `spin/36.jpg`. Start straight-on at 0°, then rotate the garment clockwise when viewed from above in exactly 10° increments. Frame 10 is 90°, frame 19 is the back (180°), frame 28 is 270°, and frame 36 is 350°. Do not add a duplicate 360° frame.
- Fix the camera, lens, focal length, focus, exposure and white balance on a tripod. Centre a matte mannequin or styling form over the rotation axis and lock the garment’s position. Capture each frame with the turntable stopped. Keep the horizon, crop and garment scale identical so the loop does not jump.
- Shoot originals at 3,000 px or more on the long edge. Export sRGB JPEGs at 1600 × 2000 for the stills and 800 × 1000 for spin frames. Aim for 250 KB per still and 90 KB per frame without losing print or fabric detail.
- Use a seamless warm-neutral/off-white background, large soft key and fill, and consistent colour temperature. Keep shadows soft and exposure stable through the full rotation. Leave around 10% breathing room around the longest silhouette and use a grey-card reference for each setup. No watermarks, props, baked-in text or colour filters.

## Delivery and publication

Keep a separate folder per SKU and colourway. Capture each collaboration’s final retail SKU, not a prototype or blank. Include its exact colourway, sample size, licence/photographer usage approval and collaborator approval with the delivery. Ensure all visible marks and people, if any, are cleared for web and commerce use.

Place only reviewed exports under `public/products/<sku>/`. In `src/data/product-photos.json`, register the SKU with `{ "front": true, "back": true, "detail": true, "spin": true }` but set only the flags whose files are present. Enable `spin` only when all 36 frames are present and in order. Use a new catalogue SKU for a new colourway. Without a registered set the site shows “Product photos coming soon” and does not offer 360°.
