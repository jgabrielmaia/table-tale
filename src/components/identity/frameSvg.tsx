import { renderToStaticMarkup } from 'react-dom/server';
import { FrameArt } from './frameArt';
import type { FrameTheme } from './frameThemes';

/** Standalone SVG of the same frame, with concrete colours, for drawing it onto a canvas (loaded on demand). */
export function frameSvgMarkup(theme: FrameTheme, sizePx = 660): string {
  return renderToStaticMarkup(<FrameArt theme={theme} />)
    .replaceAll('var(--a)', theme.a)
    .replaceAll('var(--b)', theme.b)
    .replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${sizePx}" height="${sizePx}" `);
}
