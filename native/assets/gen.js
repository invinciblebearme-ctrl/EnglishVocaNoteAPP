const sharp = require('sharp');
const fs = require('fs');

async function build() {
  const makeRounded = async (size, rx) => {
    const mask = Buffer.from(`<svg><rect x="0" y="0" width="${size}" height="${size}" rx="${rx}" ry="${rx}"/></svg>`);
    return await sharp('hi.webp')
      .resize(size, size)
      .composite([{ input: mask, blend: 'dest-in' }])
      .toBuffer();
  };

  const baseImg = await makeRounded(650, 150);

  const svgText = `
    <svg width="1024" height="1024">
      <defs>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
          .title { font-family: 'Pretendard', -apple-system, 'Apple SD Gothic Neo', sans-serif; font-size: 78px; font-weight: 800; fill: #ffffff; text-anchor: middle; letter-spacing: -2px; }
        </style>
      </defs>
      <text x="512" y="940" class="title">초등영어활용노트</text>
    </svg>
  `;

  // App Icon setup
  await sharp({
    create: {
      width: 1024,
      height: 1024,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a
    }
  })
  .composite([
    { input: baseImg, gravity: 'center' },
    { input: Buffer.from(svgText), gravity: 'center' }
  ])
  .png()
  .toFile('icon.png');

  console.log('Created icon.png');

  const splashSvgText = `
    <svg width="1242" height="2436">
      <defs>
        <style>
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
          .title { font-family: 'Pretendard', -apple-system, 'Apple SD Gothic Neo', sans-serif; font-size: 110px; font-weight: 800; fill: #ffffff; text-anchor: middle; letter-spacing: -3px; }
        </style>
      </defs>
      <text x="621" y="1950" class="title">초등영어활용노트</text>
    </svg>
  `;

  const baseImgSplash = await makeRounded(950, 220);

  await sharp({
    create: {
      width: 1242,
      height: 2436,
      channels: 4,
      background: { r: 15, g: 23, b: 42, alpha: 1 } // #0f172a
    }
  })
  .composite([
    { input: baseImgSplash, gravity: 'center' }, 
    { input: Buffer.from(splashSvgText), gravity: 'center' }
  ])
  .png()
  .toFile('splash.png');

  console.log('Created splash.png');

  // Adaptive Icon
  await sharp('icon.png')
    .resize(1024, 1024, { fit: 'contain', background: { r: 15, g: 23, b: 42, alpha: 1 } })
    .png()
    .toFile('adaptive-icon.png');

  console.log('Created adaptive-icon.png');
}

build().catch(console.error);
