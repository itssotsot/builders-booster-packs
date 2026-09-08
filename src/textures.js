import * as THREE from "three";
import { BUILDERS, FINISHES, SERIES } from "./data";
import { portraitLocation } from "./artwork";
import { CARD_SURFACE, CARD_RADIUS_PIXELS } from "./card-surface";
export class Textures {
  constructor(atlases, packArt, brandMark) {
    this.atlases = atlases;
    this.packArt = packArt;
    this.brandMark = brandMark;
    this.cache = new Map();
    this.urls = new Map();
  }
  canvas(w, h) {
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    return [canvas, canvas.getContext("2d")];
  }
  texture(canvas) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }
  art(ctx, id, x, y, w, h) {
    const cell = portraitLocation(id);
    const atlas = this.atlases[cell.sheetIndex];
    const sw = atlas.width / cell.columns,
      sh = atlas.height / cell.rows;
    const size = Math.min(sw, sh);
    const ratio = w / h;
    const cropW = ratio > 1 ? size : size * ratio,
      cropH = ratio > 1 ? size / ratio : size;
    ctx.drawImage(
      atlas,
      cell.column * sw + (sw - cropW) / 2,
      cell.row * sh + (sh - cropH) / 2,
      cropW,
      cropH,
      x,
      y,
      w,
      h,
    );
  }
  star(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.translate(x, y);
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.23, -size * 0.24);
    ctx.lineTo(size * 0.7, 0);
    ctx.lineTo(size * 0.2, size * 0.2);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.2, size * 0.2);
    ctx.lineTo(-size * 0.7, 0);
    ctx.lineTo(-size * 0.23, -size * 0.24);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  cardCanvas(card) {
    const key = `${card.person}-${card.finish}`;
    if (this.cache.has(key)) return this.cache.get(key);
    const c = BUILDERS[card.person],
      f = FINISHES[card.finish];
    const { textureWidth: width, textureHeight: height, framePixels: inset } = CARD_SURFACE;
    const [canvas, ctx] = this.canvas(width, height);
    ctx.fillStyle = card.finish === 3 ? "#b49751" : "#9b9e8e";
    ctx.fillRect(0, 0, 750, 1050);
    ctx.fillStyle = card.finish === 3 ? "#3c3420" : "#172221";
    ctx.beginPath();
    ctx.roundRect(inset, inset, width - inset * 2, height - inset * 2, CARD_RADIUS_PIXELS - inset);
    ctx.fill();
    this.art(ctx, card.person, 22, 110, 706, 638);
    let g = ctx.createLinearGradient(0, 560, 0, 806);
    g.addColorStop(0, "#17222100");
    g.addColorStop(1, "#172221");
    ctx.fillStyle = g;
    ctx.fillRect(22, 560, 706, 260);
    ctx.fillStyle = c.color;
    ctx.font = '600 18px "DM Sans", sans-serif';
    ctx.fillText(`BUILDER  /  ${c.specialty.toUpperCase()}`, 39, 45);
    ctx.fillStyle = "#f5f3e9";
    let nameSize = 38;
    ctx.font = `700 ${nameSize}px "Manrope", sans-serif`;
    while (ctx.measureText(c.name).width > 526 && nameSize > 25) {
      ctx.font = `700 ${--nameSize}px "Manrope", sans-serif`;
    }
    ctx.fillText(c.name, 38, 90);
    ctx.textAlign = "right";
    ctx.font = '500 15px "DM Sans", sans-serif';
    ctx.fillText("ENERGY", 710, 44);
    ctx.font = '700 32px "Manrope", sans-serif';
    ctx.fillText(c.hp, 713, 82);
    ctx.textAlign = "left";
    ctx.fillStyle = c.color;
    ctx.font = '500 15px "DM Sans", sans-serif';
    ctx.fillText(`@${c.handle}  /  OPENAI BUILDERS`, 39, 788);
    this.star(ctx, 53, 838, 15, c.color);
    ctx.fillStyle = "#f5f3e9";
    ctx.font = '600 27px "Manrope", sans-serif';
    ctx.fillText(c.attack, 83, 849);
    ctx.textAlign = "right";
    ctx.fillText(c.power, 710, 849);
    ctx.textAlign = "left";
    ctx.fillStyle = "#64736a";
    ctx.fillRect(39, 873, 672, 1);
    ctx.fillStyle = "#b9c2b4";
    ctx.font = '400 18px "DM Sans", sans-serif';
    const words = c.text.split(" ");
    let line = "",
      y = 918;
    for (const word of words) {
      if (ctx.measureText(line + word).width > 650) {
        ctx.fillText(line, 40, y);
        line = "";
        y += 24;
      }
      line += `${word} `;
    }
    ctx.fillText(line, 40, y);
    ctx.fillStyle = f.color;
    ctx.font = '600 15px "DM Sans", sans-serif';
    ctx.fillText(`${f.symbol}  ${f.label}`, 39, 1003);
    ctx.textAlign = "right";
    ctx.fillStyle = "#a3afa0";
    ctx.fillText(
      `${String(card.person + 1).padStart(3, "0")} / ${String(BUILDERS.length).padStart(3, "0")}    ✧ OPENAI`,
      711,
      1003,
    );
    this.cache.set(key, canvas);
    return canvas;
  }
  card(card) {
    return this.texture(this.cardCanvas(card));
  }
  cardURL(card) {
    const key = `${card.person}-${card.finish}`;
    if (!this.urls.has(key))
      this.urls.set(key, this.cardCanvas(card).toDataURL("image/webp", 0.86));
    return this.urls.get(key);
  }
  back() {
    const [canvas, ctx] = this.canvas(750, 1050);
    const background = ctx.createRadialGradient(375, 490, 0, 375, 520, 690);
    background.addColorStop(0, "#1b1812");
    background.addColorStop(0.6, "#0d0d10");
    background.addColorStop(1, "#070709");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, 750, 1050);
    const gold = ctx.createLinearGradient(0, 0, 750, 1050);
    gold.addColorStop(0, "#9b7434");
    gold.addColorStop(0.28, "#f5dfa3");
    gold.addColorStop(0.52, "#bc9146");
    gold.addColorStop(0.76, "#f3d78e");
    gold.addColorStop(1, "#997135");
    ctx.strokeStyle = gold;
    ctx.lineWidth = 2;
    for (const inset of [20, 33]) {
      ctx.beginPath();
      ctx.roundRect(inset, inset, 750 - inset * 2, 1050 - inset * 2, Math.max(2, CARD_RADIUS_PIXELS - inset));
      ctx.stroke();
    }
    ctx.save();
    ctx.translate(375, 520);
    ctx.strokeStyle = "#514125";
    for (let i = 0; i < 12; i++) {
      ctx.rotate(Math.PI / 6);
      ctx.beginPath();
      ctx.ellipse(0, 0, 240, 90, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const r of [142, 224, 272]) {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    ctx.drawImage(this.brandMark, 237, 329, 276, 322);
    ctx.fillStyle = gold;
    ctx.textAlign = "center";
    ctx.font = '800 92px "Manrope", sans-serif';
    ctx.fillText("OpenAI", 375, 754);
    ctx.font = '600 27px "Manrope", sans-serif';
    ctx.fillText("BOOSTER PACKS", 375, 812);
    ctx.font = '500 20px "DM Sans", sans-serif';
    ctx.fillText("COLLECTOR SIMULATOR", 375, 852);
    ctx.font = '500 14px "DM Sans", sans-serif';
    ctx.fillText(`OPENAI · SERIES ${SERIES}`, 375, 947);
    return this.texture(canvas);
  }
  pack() {
    const [canvas, ctx] = this.canvas(900, 1400);
    ctx.fillStyle = "#152a25";
    ctx.fillRect(0, 0, 900, 1400);
    ctx.drawImage(this.packArt, 0, 150, 900, 1350);
    const g = ctx.createLinearGradient(0, 0, 0, 1400);
    g.addColorStop(0, "#10251f");
    g.addColorStop(0.18, "#10251fee");
    g.addColorStop(0.3, "#12292000");
    g.addColorStop(0.68, "#10231b00");
    g.addColorStop(0.85, "#10231fee");
    g.addColorStop(1, "#10231f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 900, 1400);
    ctx.strokeStyle = "#d5c084";
    ctx.lineWidth = 2;
    ctx.strokeRect(27, 112, 846, 1177);
    ctx.strokeRect(39, 125, 822, 1152);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4f0da";
    ctx.font = '500 42px "Manrope", sans-serif';
    ctx.fillText("OpenAI", 450, 238);
    ctx.font = '800 103px "Manrope", sans-serif';
    ctx.fillText("BUILDERS", 450, 344);
    ctx.fillStyle = "#b5dcca";
    ctx.font = '500 19px "DM Sans", sans-serif';
    ctx.fillText(`S E R I E S   ${SERIES.split("").join(" ")}`, 450, 1210);
    ctx.font = '600 20px "DM Sans", sans-serif';
    ctx.fillText("5 CARDS  ·  1 GUARANTEED HOLO", 450, 1260);
    for (const yy of [0, 1303]) {
      ctx.fillStyle = "#718374";
      ctx.fillRect(0, yy, 900, 97);
      for (let x = 0; x < 900; x += 7) {
        ctx.fillStyle = x % 14 === 0 ? "#adad85" : "#4b6253";
        ctx.fillRect(x, yy, 2, 97);
      }
    }
    ctx.fillStyle = "#e3e4c0";
    ctx.font = '500 15px "DM Sans", sans-serif';
    ctx.fillText("←  T E A R   H E R E  →", 450, 58);
    return this.texture(canvas);
  }
}
