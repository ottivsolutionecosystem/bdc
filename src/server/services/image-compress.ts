import sharp from "sharp";

const MAX_EDGE = 1600;
const JPEG_QUALITY = 72;

/** Reduz a foto da avaliação para um JPEG leve, sem aumentar imagens pequenas. */
export async function compressAppraisalPhoto(input: Buffer): Promise<Buffer> {
  return sharp(input, { failOn: "none", limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
}
