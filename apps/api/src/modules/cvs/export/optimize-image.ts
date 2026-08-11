/**
 * Optional image downscale for data-URL / remote photos before PDF embed.
 * Soft-fails when sharp is unavailable.
 */
export async function optimizeImageForPdf(src: string): Promise<string> {
  if (!src) return src;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const sharpMod = require('sharp');
    const sharp = (sharpMod.default ?? sharpMod) as (
      input: Buffer
    ) => {
      rotate: () => {
        resize: (o: object) => {
          jpeg: (o: object) => { toBuffer: () => Promise<Buffer> };
        };
      };
    };
    let input: Buffer;
    if (src.startsWith('data:')) {
      const b64 = src.split(',')[1];
      if (!b64) return src;
      input = Buffer.from(b64, 'base64');
    } else if (src.startsWith('http://') || src.startsWith('https://')) {
      const res = await fetch(src, { signal: AbortSignal.timeout(8_000) });
      if (!res.ok) return src;
      input = Buffer.from(await res.arrayBuffer());
    } else {
      return src;
    }
    const out = await sharp(input)
      .rotate()
      .resize({ width: 480, height: 480, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${out.toString('base64')}`;
  } catch {
    return src;
  }
}
