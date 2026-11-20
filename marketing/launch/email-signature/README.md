# Kane Bligh email signature

## Install in Zoho Mail

1. Open **Settings > Signatures**, create a signature, and choose the `</>` source/HTML button in the editor. In the account setup wizard, use the same `</>` button in its signature editor.
2. Paste the contents of `signature.html` (not its filename or the preview image), then save. Assign it to the correct sender identity and new messages.
3. Add `signature-compact.html` as a second signature for replies and forwards.
4. The dark banner is optional: remove the final `<tr>` from `signature.html` for a quieter signature.
5. If remote images are blocked, use the editor's image button to upload `logo.png` and `banner.png` in place of the remote images. Keep display dimensions at **140 x 68** and **520 x 150** respectively. Some recipients still block images, so send yourself a test message with images disabled too.

The raw GitHub image URLs require this branch to remain available in the public repository. If the branch is deleted, first move the images to a durable public host and update both `src` values in Zoho. Public hosting also allows recipients' mail clients to request these assets. Social destinations use the requested @tmrwline identity; account ownership and availability have not been verified.

## Best practice

- Name, title, contact information and social links are live, selectable text. The outlined wordmark is the real `logo-web-light.svg`, rasterised on an off-white rectangle so it stays visible on dark surfaces.
- Arial/Helvetica, presentation tables and inline styles avoid web-font and stylesheet dependencies. Ink on off-white is used for all live text; volt appears only on the dark banner.
- Both signature PNG assets together are below 100 KB, with each below 60 KB. They are 2x retina PNGs, with explicit display dimensions, no image borders and descriptive alt text. Preview files are not embedded in email.
- No legal boilerplate wall, tracking pixel, scripts or remote fonts. The essential details remain available when images are blocked. The banner message is decorative, not essential contact information.
- Dark mode tested in Chrome with a #1e1e1e mail-like background, alongside a light preview. This tests the surrounding canvas and opaque logo backing, not proprietary colour transformations in Zoho, Outlook or Gmail. Actual client dark-mode behaviour remains unverified; send a test to your usual desktop and mobile clients before rollout.
- The 520px maximum-width table and fluid banner can shrink in narrow panes. The compact version keeps replies short. Older Outlook versions may handle maximum widths differently.

## Re-render

Run `python render.py` from this folder with `google-chrome` and Python Pillow installed. The script uses the original outlined SVGs in `../assets`, writes `banner.svg`, renders both PNG assets at 2x, and creates `preview-light.png` and `preview-dark.png` at 2x. Previews embed the exact local image bytes in a temporary frame, so they do not depend on the branch already being pushed. The installed HTML retains absolute public image URLs.
