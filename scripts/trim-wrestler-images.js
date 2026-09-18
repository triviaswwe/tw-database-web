// scripts/trim-wrestler-images.js
// Recorta el margen transparente sobrante de cada PNG de wrestler
// (archivos "{id}.png" sueltos en /public), dejando el personaje
// ocupando todo el lienzo, sin aire a los costados.
//
// Uso:
//   npm install sharp --save-dev
//   node scripts/trim-wrestler-images.js

const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const SOURCE_DIR = "D:\\Users\\lucas\\Desktop\\tw_database\\Web\\public";
const OUTPUT_DIR = path.join(SOURCE_DIR, "trimmed");

// Solo archivos tipo "25.png", "134.png", etc. (el id del wrestler).
// Esto evita tocar favicon.ico, logos, o cualquier otro PNG que no sea un render.
const WRESTLER_FILE_PATTERN = /^\d+\.png$/i;

async function run() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const files = fs
    .readdirSync(SOURCE_DIR)
    .filter((f) => WRESTLER_FILE_PATTERN.test(f));

  console.log(`Encontrados ${files.length} archivos de wrestlers para procesar.\n`);

  for (const file of files) {
    const inputPath = path.join(SOURCE_DIR, file);
    const outputPath = path.join(OUTPUT_DIR, file);

    try {
      await sharp(inputPath)
        .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 10 })
        .toFile(outputPath);
      console.log(`✓ ${file}`);
    } catch (err) {
      console.error(`✗ ${file}:`, err.message);
    }
  }

  console.log(`\nListo. Revisá ${OUTPUT_DIR} antes de reemplazar los originales.`);
}

run();