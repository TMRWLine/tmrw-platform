"""Render retina email assets and local light/dark previews with Chrome and Pillow."""
import base64
import subprocess
import tempfile
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
ASSETS = HERE.parent / "assets"
REMOTE = "https://raw.githubusercontent.com/TMRWLine/tmrw-platform/marketing/email-signature-2026-11-20/marketing/launch/email-signature/"


def render(markup, target, width, height):
    with tempfile.TemporaryDirectory() as temp:
        page = Path(temp) / "render.html"
        page.write_text(markup)
        subprocess.run([
            "google-chrome", "--headless", "--no-sandbox", "--disable-gpu",
            "--hide-scrollbars", "--force-device-scale-factor=2",
            f"--window-size={width},{height}", "--virtual-time-budget=1500",
            f"--screenshot={target}", page.as_uri(),
        ], check=True, capture_output=True)
    with Image.open(target) as img:
        img.convert("RGB").save(target, optimize=True)


def page(body):
    return '<!doctype html><html lang="en-NZ"><meta charset="utf-8"><body style="margin:0">' + body + '</body></html>'


logo = (ASSETS / "logo-web-light.svg").read_text().replace('width="1320" height="640"', 'width="140" height="68"')
render(page(logo), HERE / "logo.png", 140, 68)
# Chrome has a minimum viewport width. Crop to the intended SVG canvas.
with Image.open(HERE / "logo.png") as img:
    img.crop((0, 0, 280, 136)).save(HERE / "logo.png", optimize=True)

lockup = base64.b64encode((ASSETS / "logo-web-dark.svg").read_bytes()).decode()
banner = f'''<svg xmlns="http://www.w3.org/2000/svg" width="520" height="150" viewBox="0 0 520 150">
<rect width="520" height="150" fill="#080808"/>
<path d="M405 -30h36L350 180h-36zM460 -30h14L383 180h-14z" fill="#F7F7F6" opacity=".055"/>
<text x="22" y="25" font-family="monospace" font-size="9" letter-spacing="2" fill="#B8FF00">POSTCODE PEOPLE</text>
<text x="21" y="60" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="29" letter-spacing="-.7" fill="#F7F7F6">EVERY POSTCODE</text>
<text x="21" y="91" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="29" letter-spacing="-.7" fill="#F7F7F6">HAS A TOMORROW<tspan fill="#B8FF00">.</tspan></text>
<path d="M22 105H498" stroke="#F7F7F6" stroke-opacity=".25"/>
<image x="16" y="108" width="83" height="40" href="data:image/svg+xml;base64,{lockup}"/>
<text x="498" y="131" text-anchor="end" font-family="monospace" font-size="8" letter-spacing="1" fill="#F7F7F6">TMRWLINE.COM</text>
</svg>'''
(HERE / "banner.svg").write_text(banner + "\n")
render(page(banner), HERE / "banner.png", 520, 150)

for mode, background, foreground in [("light", "#F7F7F6", "#080808"), ("dark", "#1e1e1e", "#F7F7F6")]:
    signature = (HERE / "signature.html").read_text()
    for name in ["logo.png", "banner.png"]:
        data = base64.b64encode((HERE / name).read_bytes()).decode()
        signature = signature.replace(REMOTE + name, "data:image/png;base64," + data)
    frame = f'''<div style="box-sizing:border-box;width:640px;height:510px;padding:40px 60px;background:{background};color:{foreground};font:14px Arial,Helvetica,sans-serif">
<div style="font:10px monospace;letter-spacing:2px;opacity:.65;margin-bottom:25px">NEW MESSAGE / {mode.upper()} PREVIEW</div>
<p style="margin:0 0 26px">Thanks for connecting. Let's build what's next.</p>{signature}</div>'''
    render(page(frame), HERE / f"preview-{mode}.png", 640, 510)
print("Rendered logo.png (280x136), banner.png (1040x300), and light/dark previews (1280x1020).")
