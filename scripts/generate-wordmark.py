"""Generate the SC and S4MEER brand assets from the supplied font (requires fontTools)."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parents[1]
font = TTFont(ROOT / 'public/fonts/4x4-font.ttf')
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
def generate_wordmark(text):
    paths = []
    x = 0
    bounds = []
    for letter in text:
        glyph = glyphs[cmap[ord(letter)]]
        pen = BoundsPen(glyphs)
        glyph.draw(pen)
        left, bottom, right, top = pen.bounds
        # Keep the original glyph shapes with one pixel of space between letters.
        shift = x - left
        svg = SVGPathPen(glyphs)
        glyph.draw(TransformPen(svg, (1, 0, 0, -1, shift, top)))
        paths.append(svg.getCommands())
        bounds.append(top - bottom)
        x += right - left + (top - bottom) / 4
    height = max(bounds)
    width = x - height / 4
    path = ' '.join(paths)
    viewbox = f'0 0 {width:g} {height:g}'
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}" fill="currentColor"><path d="{path}"/></svg>\n'
    (ROOT / f'public/brand/{text.lower()}-wordmark.svg').write_text(svg)
    return width, height, path


width, height, path = generate_wordmark("SC")
generate_wordmark("S4MEER")

# The favicon: SC in the 4x4 font, light on a black rounded tile. The font's pixel is
# a quarter of the glyph height; each one is drawn as exactly 3 units of the 32-unit
# tile, so the mark (9 x 4 font pixels) is 27 x 12 and fills most of the tile's width
# (at 2 units it was 18 x 8, too small to read in a browser tab). The offsets are
# whole units, keeping every edge on a pixel at 32 and 64 px so the icon stays crisp;
# the mark sits half a unit left of centre for it, which is not visible.
pixel = height / 4
scale = 3 / pixel
offset_x = (32 - width * scale) // 2
offset_y = (32 - height * scale) // 2
favicon = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
<rect width="32" height="32" rx="7.5" fill="#0a0a0a"/>
<path fill="#fafafa" transform="translate({offset_x:g} {offset_y:g}) scale({scale:.8f})" d="{path}"/>
</svg>
'''
(ROOT / 'public/favicon.svg').write_text(favicon)
print('Generated SC and S4MEER wordmarks, plus the SC favicon.')
print('Re-render favicon-32.png and apple-touch-icon.png from it if the mark changed.')
