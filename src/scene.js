import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { FINISHES, packForPerson } from "./data";
import { CozyRoom } from "./cozy-room";
import { CARD_SURFACE, CARD_RADIUS_PIXELS } from "./card-surface";
const clamp = THREE.MathUtils.clamp;
const PACK_SCALE = 0.9;
const ease = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const smooth = (a, b, t) => a + (b - a) * ease(t);
const vertexShader = `
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
  void main() { vUv=uv; vNormal=normalize(normalMatrix*normal); vec4 p=modelViewMatrix*vec4(position,1.); vPosition=p.xyz; gl_Position=projectionMatrix*p; }
`;
const fragmentShader = `
  uniform sampler2D map; uniform float finish; uniform float time;
  uniform vec2 cardSize; uniform float cornerRadius; uniform float frameWidth;
  varying vec2 vUv; varying vec3 vNormal; varying vec3 vPosition;
  float hash(vec2 p) { return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  void main(){
    vec4 base=texture2D(map,vUv); vec3 n=normalize(vNormal); vec3 view=normalize(-vPosition);
    float angle=dot(n,view); float turn=n.x*1.4+n.y*.85;
    float art=step(.029,vUv.x)*step(vUv.x,.971)*step(.285,vUv.y)*step(vUv.y,.895);
    // Follow the same rounded outline as the printed frame, in texture pixels.
    vec2 corner=abs((vUv-.5)*cardSize)-(cardSize*.5-vec2(cornerRadius));
    float edgeDistance=length(max(corner,0.))+min(max(corner.x,corner.y),0.)-cornerRadius;
    float edgeAA=max(fwidth(edgeDistance),.001);
    float border=smoothstep(-frameWidth-edgeAA,-frameWidth+edgeAA,edgeDistance);
    float mask=finish<1.5 ? (1.-art)*.8 : art*.9+border*.65;
    vec3 rainbow=.5+.5*cos(6.28318*(vec3(0.,.333,.667)+vUv.x*.7+vUv.y*.8+turn*.8));
    float band=pow(max(0.,sin((vUv.x-vUv.y*.5+turn)*7.)),10.);
    vec2 cell=floor(vUv*vec2(200.,280.)); float sparkle=pow(hash(cell),45.);
    float glint=pow(max(0.,sin(hash(cell+3.)*30.+turn*20.)),18.)*sparkle;
    float sheen=pow(max(0.,dot(reflect(-normalize(vec3(-.5,.8,1.5)),n),view)),35.);
    vec3 color=base.rgb;
    if(finish>.5) { color+=rainbow*mask*(.08+band*.20)+glint*mask*.55; color+=sheen*vec3(.9,.98,.8)*.15; }
    else { color+=sheen*.06; }
    if(finish>2.5) { color=mix(color,color*vec3(1.15,1.02,.73),.3); color+=vec3(1.,.65,.17)*(glint*.32+border*.12); }
    color*=.96+angle*.04; gl_FragColor=vec4(color,base.a);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;
function cardShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2,
    y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.absarc(x + w - r, y + r, r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r);
  s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);
  s.absarc(x + r, y + h - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);
  s.absarc(x + r, y + r, r, Math.PI, Math.PI * 1.5, false);
  s.closePath();
  return s;
}
function faceGeometry(w, h, r) {
  const g = new THREE.ShapeGeometry(cardShape(w, h, r), 12),
    p = g.attributes.position,
    uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++)
    uv.setXY(i, (p.getX(i) + w / 2) / w, (p.getY(i) + h / 2) / h);
  return g;
}
export class PackScene {
  constructor(host, textures, sound, callbacks) {
    this.host = host;
    this.textures = textures;
    this.sound = sound;
    this.cb = callbacks;
    this.reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.autoClear = false;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.domElement.className = "world-canvas";
    document.body.prepend(this.renderer.domElement);
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    host.setAttribute("role", "img");
    host.setAttribute(
      "aria-label",
      "Interactive 3D pack and cards inside a cozy neon room. Drag near the top to open the pack, or press Enter.",
    );
    this.renderer.domElement.setAttribute(
      "aria-label",
      "Interactive 3D pack and card. Drag near the top to tear, or press Enter to open.",
    );
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 70);
    this.camera.position.set(0, 0, 9);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.env = pmrem.fromScene(room, 0.04);
    this.scene.environment = this.env.texture;
    room.dispose();
    pmrem.dispose();
    this.scene.add(new THREE.HemisphereLight(0xffffe8, 0x364539, 2));
    const key = new THREE.DirectionalLight(0xffefd5, 3);
    key.position.set(-3, 5, 5);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xd0f5d4, 2);
    rim.position.set(4, 1, 3);
    this.scene.add(rim);
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.drag = null;
    this.rotation = { x: 0, y: 0 };
    this.flip = 0;
    this.tweens = [];
    this.particles = [];
    this.packCards = [];
    this.packChoices = [];
    this.selectedEdition = textures.edition.id;
    const { width, height, radius } = CARD_SURFACE;
    this.cardGeometry = faceGeometry(width, height, radius);
    this.cardBodyGeometry = new THREE.ExtrudeGeometry(
      cardShape(width, height, radius),
      { depth: 0.04, bevelEnabled: false, curveSegments: 12 },
    );
    this.cardBodyGeometry.translate(0, 0, -0.02);
    this.cardBack = this.textures.back();
    this.packTexture = this.cb.packTextures?.[this.selectedEdition] || this.textures.pack();
    host.tabIndex = 0;
    this.cozyRoom = new CozyRoom(this.env.texture, this.cardBack);
    this.createDust();
    this.createShadow();
    this.bind();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(host);
    this.resizeObserver.observe(document.documentElement);
    this.reset();
    this.animate();
  }
  createDust() {
    const p = new Float32Array(75 * 3);
    for (let i = 0; i < 75; i++) {
      p[i * 3] = (Math.random() - 0.5) * 15;
      p[i * 3 + 1] = (Math.random() - 0.5) * 7;
      p[i * 3 + 2] = -1 - Math.random() * 3;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(p, 3));
    this.dust = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        color: 0xdce5a0,
        size: 0.012,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
      }),
    );
    this.scene.add(this.dust);
  }
  createShadow() {
    const c = document.createElement("canvas");
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext("2d");
    const g = ctx.createRadialGradient(128, 64, 0, 128, 64, 64);
    g.addColorStop(0, "#000000a0");
    g.addColorStop(1, "#00000000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    this.shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(5, 0.5),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(c),
        transparent: true,
        depthWrite: false,
      }),
    );
    this.shadow.position.set(0, -2.26, -0.8);
    this.scene.add(this.shadow);
  }
  resize() {
    const { width, height } = this.host.getBoundingClientRect();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.cozyRoom.resize(window.innerWidth, window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.position.z = this.camera.aspect < 0.75 ? 10 : 9;
    this.camera.updateProjectionMatrix();
    if (this.mode === "sealed") this.layoutPacks();
  }
  wrapperPiece(y0, y1, isStrip = false, back = false, texture = this.packTexture) {
    const w = 2.8,
      h = 4.2,
      g = new THREE.PlaneGeometry(w, y1 - y0, 80, isStrip ? 7 : 44);
    g.translate(0, (y0 + y1) / 2, 0);
    const p = g.attributes.position,
      uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i);
      const edge = 1 - Math.pow(Math.abs(x) / (w / 2), 5);
      const bulge = 0.095 * edge * Math.sin(((y + 2.1) / h) * Math.PI);
      const wrinkle =
        Math.sin(x * 49 + y * 2) * 0.009 + Math.sin(y * 37 + x * 3) * 0.008;
      p.setZ(i, (back ? -1 : 1) * (0.04 + bulge + wrinkle));
      if (Math.abs(y - 1.72) < 0.001) p.setY(i, y + Math.sin(x * 75) * 0.014);
      uv.setXY(i, (x + w / 2) / w, (y + 2.1) / h);
    }
    g.computeVertexNormals();
    const mat = new THREE.MeshPhysicalMaterial({
      map: back ? null : texture,
      color: back ? 0x82927c : 0xffffff,
      roughness: back ? 0.3 : 0.43,
      metalness: back ? 0.82 : 0.34,
      clearcoat: 0.8,
      clearcoatRoughness: 0.25,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(g, mat);
    mesh.userData.base = new Float32Array(p.array);
    mesh.userData.strip = isStrip;
    mesh.userData.back = back;
    return mesh;
  }
  reset(locked = false) {
    this.host.classList.remove('pack-carousel');
    this.cardStageWidth = this.host.getBoundingClientRect().width;
    this.host.classList.toggle('pack-carousel', !locked);
    this.packChoices.forEach(group => this.disposeGroup(group));
    this.packCards.forEach((c) => this.disposeGroup(c));
    this.packCards = [];
    this.tweens = [];
    this.inspectCard = null;
    this.mode = locked ? "locked" : "sealed";
    this.drag = null;
    this.progress = 0;
    this.tearDirection = 0;
    this.rotation = { x: 0, y: 0 };
    this.flip = 0;
    this.packChoices = Object.entries(this.cb.packTextures || { [this.selectedEdition]: this.packTexture }).map(([id, texture]) => {
      const group = new THREE.Group();
      const front = this.wrapperPiece(-2.1, 1.72, false, false, texture);
      const back = this.wrapperPiece(-2.1, 1.72, false, true, texture);
      const strip = this.wrapperPiece(1.72, 2.1, true, false, texture);
      group.add(back, front, strip);
      group.userData = { edition: id, front, back, strip };
      group.visible = !locked;
      this.scene.add(group);
      return group;
    });
    this.carouselPosition = this.packChoices.findIndex(pack => pack.userData.edition === this.selectedEdition);
    this.selectPack(this.selectedEdition);
    this.choiceConfirmed = false;
    this.resize();
    this.shadow.visible = !locked;
    this.host.classList.remove("dragging");
    this.host.classList.toggle("pack-grab", !locked);
    this.cb.onProgress?.(0);
  }
  selectPack(id, notify = false) {
    const group = this.packChoices.find(pack => pack.userData.edition === id);
    if (!group) return;
    this.selectedEdition = id;
    this.choiceConfirmed = true;
    this.pack = group;
    ({ front: this.front, back: this.back, strip: this.strip } = group.userData);
    this.carouselTarget = this.packChoices.indexOf(group);
    if (notify) this.cb.onPackSelect?.(id);
  }
  layoutPacks() {
    if (!this.packChoices.length) return;
    const rect = this.host.getBoundingClientRect();
    const units = 2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.position.z / rect.height;
    this.carouselScale = Math.max(.2, Math.min(PACK_SCALE, Math.min(rect.width, this.cardStageWidth) * units / 7, (rect.height - 150) * units / 4.2));
    this.carouselSpacing = this.carouselScale * 3.65;
    this.carouselStepPixels = this.carouselSpacing / units;
    this.positionPacks();
  }
  positionPacks() {
    this.packChoices.forEach((group, i) => {
      group.scale.setScalar(this.carouselScale);
      group.position.x = (i - this.carouselPosition) * this.carouselSpacing;
    });
  }
  stepPack(direction) {
    if (this.mode !== 'sealed' || this.choiceConfirmed || this.drag) return;
    const index = clamp(this.carouselTarget + direction, 0, this.packChoices.length - 1);
    this.browsePack(index);
  }
  browsePack(index) {
    if (this.choiceConfirmed) return;
    this.carouselTarget = index;
    this.choiceConfirmed = false;
    this.cb.onPackBrowse?.();
  }
  choosePack(id) {
    if (this.mode !== 'sealed' || this.choiceConfirmed || this.drag) return;
    const index = this.packChoices.findIndex(group => group.userData.edition === id);
    if (index < 0) return;
    if (index !== this.carouselTarget || Math.abs(this.carouselPosition - index) > .015) {
      this.browsePack(index);
      return;
    }
    this.selectPack(id, true);
  }

  beginTear() {
    this.mode = 'tearing';
    this.packChoices.forEach(group => {
      if (group !== this.pack && group.visible) {
        const scale = group.scale.x;
        group.traverse(mesh => { if (mesh.isMesh) mesh.material.transparent = true; });
        this.tween(this.reduced ? .01 : .22, t => {
          group.scale.setScalar(scale * (1 - .06 * t));
          group.traverse(mesh => { if (mesh.isMesh) mesh.material.opacity = 1 - t; });
        }, () => { group.visible = false; });
      }
    });
    this.cb.onTearStart?.();
  }
  disposeGroup(group) {
    this.scene.remove(group);
    group.traverse((o) => {
      if (o.isMesh) {
        if (
          o.geometry !== this.cardGeometry &&
          o.geometry !== this.cardBodyGeometry
        )
          o.geometry.dispose();
        if (
          o.material.uniforms?.map?.value &&
          o.material.uniforms.map.value !== this.cardBack
        )
          o.material.uniforms.map.value.dispose();
        o.material.dispose();
      }
    });
  }
  createCard(card) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(
      this.cardBodyGeometry,
      new THREE.MeshStandardMaterial({
        color: card.finish === 3 ? 0xd9c78d : 0xa1ada0,
        metalness: 0.55,
        roughness: 0.4,
      }),
    );
    const front = new THREE.Mesh(
      this.cardGeometry,
      new THREE.ShaderMaterial({
        uniforms: {
          map: { value: this.textures.card(card) },
          finish: { value: card.finish },
          time: { value: 0 },
          cardSize: { value: new THREE.Vector2(CARD_SURFACE.textureWidth, CARD_SURFACE.textureHeight) },
          cornerRadius: { value: CARD_RADIUS_PIXELS },
          frameWidth: { value: CARD_SURFACE.framePixels },
        },
        vertexShader,
        fragmentShader,
      }),
    );
    front.position.z = 0.023;
    const back = new THREE.Mesh(
      this.cardGeometry,
      new THREE.MeshBasicMaterial({ map: this.textures.back(packForPerson(card.person).id) }),
    );
    back.rotation.y = Math.PI;
    back.position.z = -0.023;
    g.add(body, front, back);
    g.userData.card = card;
    this.scene.add(g);
    return g;
  }
  bind() {
    const el = this.host;
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || this.drag) return;
      this.sound.unlock();
      if (this.mode === "sealed" || this.mode === "tearing") {
        if (this.mode === 'sealed') {
          const hit = this.hit(e);
          let target = hit?.object;
          while (target && !target.userData.edition) target = target.parent;
          if (!target) {
            target = this.packChoices.filter(group => group.visible && this.isNearSeal(e, group)).sort((a, b) => {
              const x = group => (group.position.clone().project(this.camera).x * .5 + .5) * this.host.clientWidth + this.host.getBoundingClientRect().left;
              return Math.abs(x(a) - e.clientX) - Math.abs(x(b) - e.clientX);
            })[0];
          }
          if (!target) return;
          if (this.choiceConfirmed && !this.isNearSeal(e, target)) return;
          const centered = this.packChoices.indexOf(target) === this.carouselTarget && Math.abs(this.carouselPosition - this.carouselTarget) < .015;
          if (!this.choiceConfirmed || target !== this.pack || !centered || !this.isNearSeal(e, target)) {
            this.drag = { type: 'carousel', x: e.clientX, y: e.clientY, start: this.carouselPosition, target: target.userData.edition, moved: false, id: e.pointerId };
            el.setPointerCapture(e.pointerId);
            this.host.classList.add('dragging');
            return;
          }
        }
        if (this.cb.canTear?.() === false || !this.isNearSeal(e)) return;
        this.drag = {
          type: "tear",
          x: e.clientX,
          y: e.clientY,
          last: e.clientX,
          start: this.progress,
          dir: 0,
          id: e.pointerId,
        };
        this.sound.crinkle(0.25);
      } else if (
        this.mode === "back" ||
        this.mode === "front" ||
        this.mode === "inspect"
      ) {
        if (!this.hit(e)) return;
        this.drag = {
          type: "card",
          x: e.clientX,
          y: e.clientY,
          rx: this.rotation.x,
          ry: this.rotation.y,
          moved: false,
          id: e.pointerId,
        };
      } else return;
      el.setPointerCapture(e.pointerId);
      this.host.classList.add("dragging");
    });
    el.addEventListener("pointermove", (e) => {
      if (!this.drag) {
        if (this.mode === "sealed" || this.mode === "tearing") {
          el.style.cursor = this.choiceConfirmed && this.isNearSeal(e, this.pack) ? "ew-resize" : this.hit(e) ? "grab" : "default";
        } else el.style.cursor = this.hit(e) ? "grab" : "default";
        return;
      }
      if (e.pointerId !== this.drag.id) return;
      if (this.drag.type === 'carousel') {
        const dx = e.clientX - this.drag.x;
        if (Math.abs(dx) > 5) {
          if (!this.drag.moved) this.browsePack(this.carouselTarget);
          this.drag.moved = true;
        }
        this.carouselPosition = clamp(this.drag.start - dx / this.carouselStepPixels, -.15, this.packChoices.length - .85);
        this.positionPacks();
      } else if (this.drag.type === "tear") {
        const dx = e.clientX - this.drag.x;
        if (!this.drag.dir) {
          if (Math.abs(dx) < 6) return;
          if (this.mode === 'sealed') this.beginTear();
          this.drag.dir = Math.sign(dx);
          if (!this.tearDirection) this.tearDirection = this.drag.dir;
        }
        const distance = clamp(this.screenPackWidth() * 0.5, 100, 220);
        const delta = dx * this.drag.dir;
        this.progress = Math.max(
          this.progress,
          clamp(this.drag.start + delta / distance, 0, 1),
        );
        const speed = Math.min(Math.abs(e.clientX - this.drag.last) / 18, 1);
        this.drag.last = e.clientX;
        this.sound.crinkle(speed);
        this.deform();
        this.cb.onProgress?.(this.progress);
        if (this.progress >= 0.995) this.finishTear();
      } else {
        const dx = e.clientX - this.drag.x,
          dy = e.clientY - this.drag.y;
        if (Math.hypot(dx, dy) > 5) this.drag.moved = true;
        this.rotation.y = clamp(this.drag.ry + dx * 0.009, -1.15, 1.15);
        this.rotation.x = clamp(this.drag.rx + dy * 0.007, -0.8, 0.8);
      }
    });
    const release = (e) => {
      if (!this.drag || e.pointerId !== this.drag.id) return;
      const d = this.drag;
      this.drag = null;
      this.host.classList.remove("dragging");
      if (el.hasPointerCapture(d.id)) el.releasePointerCapture(d.id);
      if (d.type === 'carousel') {
        const delta = this.carouselPosition - d.start;
        const index = clamp(Math.abs(delta) > .18 ? Math.round(d.start) + Math.sign(delta) : Math.round(d.start), 0, this.packChoices.length - 1);
        if (d.moved) this.browsePack(index);
        else if (e.type === 'pointerup') this.choosePack(d.target);
      } else if (d.type === "card") {
        if (!d.moved && ["back", "front"].includes(this.mode))
          this.cb.onCardTap?.();
        this.rotation = { x: 0, y: 0 };
      }
    };
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("lostpointercapture", release);
    let wheelDistance = 0, wheelEnd;
    el.addEventListener('wheel', e => {
      if (this.mode !== 'sealed' || this.choiceConfirmed || this.drag) return;
      e.preventDefault();
      wheelDistance += Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(wheelDistance) > 45) {
        this.stepPack(Math.sign(wheelDistance));
        wheelDistance = 0;
      }
      clearTimeout(wheelEnd);
      wheelEnd = setTimeout(() => { wheelDistance = 0; }, 150);
    }, { passive: false });
    // Background gestures bubble here after the pack/card has claimed its own drag.
    let roomDrag = null;
    const releaseRoom = () => {
      if (!roomDrag) return;
      const { target, id } = roomDrag;
      roomDrag = null;
      this.cozyRoom.explore.set(0, 0);
      document.body.classList.remove("room-dragging");
      if (target.hasPointerCapture(id)) target.releasePointerCapture(id);
    };
    document.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || !e.isPrimary || this.drag || roomDrag) return;
      if (!e.target.closest(".room") || e.target.closest("button, a, input, select, textarea, aside, dialog, #summary, #inspection, .bonus-panel")) return;
      if (this.hit(e)) return;
      roomDrag = { id: e.pointerId, x: e.clientX, y: e.clientY, target: e.target };
      e.target.setPointerCapture(e.pointerId);
      document.body.classList.add("room-dragging");
      e.preventDefault();
    });
    document.addEventListener("pointermove", (e) => {
      if (!roomDrag || e.pointerId !== roomDrag.id) return;
      this.cozyRoom.explore.set(
        clamp((e.clientX - roomDrag.x) / (innerWidth * 0.35), -1, 1),
        clamp((e.clientY - roomDrag.y) / (innerHeight * 0.35), -1, 1),
      );
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"]) {
      document.addEventListener(event, (e) => {
        if (roomDrag && e.pointerId === roomDrag.id) releaseRoom();
      });
    }
    window.addEventListener("blur", releaseRoom);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        releaseRoom();
        this.drag = null;
        this.rotation = { x: 0, y: 0 };
        this.host.classList.remove("dragging");
      }
    });
  }
  isNearSeal(e, group = this.pack) {
    const rect = this.host.getBoundingClientRect();
    // Screen-space padding keeps the grab area forgiving at every pack size.
    const points = [
      [-1.4, 2.1], [1.4, 2.1], [-1.4, 0.65], [1.4, 0.65],
    ].map(([x, y]) => {
      const p = group.localToWorld(new THREE.Vector3(x, y, 0.15)).project(this.camera);
      return {
        x: rect.left + (p.x * 0.5 + 0.5) * rect.width,
        y: rect.top + (-p.y * 0.5 + 0.5) * rect.height,
      };
    });
    const touch = e.pointerType === "touch";
    const sidePadding = touch ? 80 : 64;
    const topPadding = touch ? 96 : 80;
    const bottomPadding = touch ? 36 : 28;
    return e.clientX >= Math.min(...points.map((p) => p.x)) - sidePadding
      && e.clientX <= Math.max(...points.map((p) => p.x)) + sidePadding
      && e.clientY >= Math.min(...points.map((p) => p.y)) - topPadding
      && e.clientY <= Math.max(...points.map((p) => p.y)) + bottomPadding;
  }
  hit(e) {
    const r = this.host.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((e.clientX - r.left) / r.width) * 2 - 1,
      (-(e.clientY - r.top) / r.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(pointer, this.camera);
    if (this.mode === 'sealed') return this.raycaster.intersectObjects(this.packChoices.filter(group => group.visible), true)[0] || null;
    const target = this.mode === 'tearing' ? this.pack : this.inspectCard || this.packCards[this.index];
    return target ? this.raycaster.intersectObject(target, true)[0] : null;
  }
  screenPackWidth() {
    const a = new THREE.Vector3(-1.4, 0, 0)
      .applyMatrix4(this.pack.matrixWorld)
      .project(this.camera);
    const b = new THREE.Vector3(1.4, 0, 0)
      .applyMatrix4(this.pack.matrixWorld)
      .project(this.camera);
    return (Math.abs(a.x - b.x) * this.host.clientWidth) / 2;
  }
  deform() {
    const dir = this.tearDirection || 1;
    for (const mesh of [this.strip, this.front, this.back]) {
      const pos = mesh.geometry.attributes.position,
        base = mesh.userData.base;
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3],
          y = base[i * 3 + 1],
          z = base[i * 3 + 2];
        const fromEdge = dir > 0 ? (x + 1.4) / 2.8 : (1.4 - x) / 2.8;
        const detached = clamp((this.progress - fromEdge) * 4, 0, 1);
        if (mesh === this.strip) {
          pos.setXYZ(
            i,
            x - dir * detached * 0.16,
            y + detached * (0.25 + (1 - fromEdge) * 0.45),
            z + Math.sin(detached * Math.PI * 0.75) * 0.6,
          );
        } else {
          const near = Math.exp(-Math.abs(y - 1.72) * 2.5);
          pos.setXYZ(
            i,
            x + Math.sin(y * 21 + x * 11) * near * this.progress * 0.012,
            y,
            z +
              Math.sin(x * 35 + this.progress * 15) *
                near *
                this.progress *
                0.023,
          );
        }
      }
      pos.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
    }
  }
  autoTear() {
    if (!["sealed", "tearing"].includes(this.mode)) return;
    if (this.mode === 'sealed' && (!this.choiceConfirmed || Math.abs(this.carouselPosition - this.carouselTarget) > .015)) {
      this.choosePack(this.packChoices[this.carouselTarget].userData.edition);
      return;
    }
    if (this.cb.canTear?.() === false) return;
    this.sound.unlock();
    this.beginTear();
    this.mode = "autoTear";
    const start = this.progress;
    this.tearDirection ||= 1;
    this.tween(
      this.reduced ? 0.28 : 0.95,
      (t) => {
        this.progress = start + (1 - start) * t;
        this.deform();
        this.sound.crinkle(0.65);
        this.cb.onProgress?.(this.progress);
      },
      () => this.finishTear(),
    );
  }
  finishTear() {
    if (this.mode === "opening") return;
    this.progress = 1;
    this.mode = "opening";
    this.drag = null;
    this.host.classList.remove("dragging", "pack-grab");
    this.sound.tear();
    if (navigator.vibrate) navigator.vibrate([14, 20, 25]);
    this.cb.onProgress?.(1);
    this.cb.onOpen?.();
  }
  open(cards) {
    this.index = 0;
    const packX = this.pack.position.x;
    const packScale = this.pack.scale.x;
    this.packCards = cards.map((card, i) => {
      const g = this.createCard(card);
      g.scale.setScalar(packScale);
      g.position.set(packX + i * 0.025, -0.08 - i * 0.024, -0.22 - i * 0.04);
      g.rotation.y = Math.PI;
      g.visible = false;
      return g;
    });
    const startRot = this.pack.rotation.z;
    this.tween(
      this.reduced ? 0.65 : 1.65,
      (t) => {
        const fly = clamp(t * 2.4, 0, 1);
        this.strip.position.set(
          smooth(0, 3.8, fly),
          smooth(0, 2.7, fly) - fly * fly * 2.5,
          smooth(0, 1, fly),
        );
        this.strip.rotation.z = smooth(0, -1.8, fly);
        this.strip.rotation.y = fly * 1.9;
        const peel = clamp((t - 0.12) / 0.5, 0, 1);
        this.front.rotation.x = smooth(0, -0.82, peel);
        this.back.rotation.x = smooth(0, 0.28, peel);
        const drop = clamp((t - 0.22) / 0.78, 0, 1);
        this.pack.position.y = -ease(drop) * 7;
        this.pack.rotation.z = startRot - drop * 0.2;
        this.packCards.forEach((g, i) => {
          g.visible = t > 0.2;
          const emerge = clamp((t - 0.25) / 0.6, 0, 1);
          g.scale.setScalar(smooth(packScale, 1, emerge));
          g.position.x = smooth(packX + i * .025, i * .025, emerge);
          g.position.y = smooth(
            -0.4 - i * 0.025,
            -i * 0.025,
            clamp((t - 0.25) / 0.6, 0, 1),
          );
          g.position.z = smooth(
            -0.22 - i * 0.04,
            i === 0 ? 0.85 : -1.25 - i * 0.05,
            clamp((t - 0.5) / 0.5, 0, 1),
          );
        });
      },
      () => {
        this.pack.visible = false;
        this.mode = "back";
        this.host.classList.remove("pack-carousel");
        this.resize();
        this.flip = Math.PI;
        this.cb.onReady?.(0);
      },
    );
  }
  reveal() {
    if (this.mode !== "back") return;
    this.mode = "flipping";
    this.rotation = { x: 0, y: 0 };
    const card = this.packCards[this.index];
    this.sound.reveal(card.userData.card.finish);
    this.tween(
      this.reduced ? 0.2 : 0.68,
      (t) => {
        this.flip = (1 - ease(t)) * Math.PI;
        card.rotation.y = this.flip;
        card.position.z = 0.85 + Math.sin(t * Math.PI) * 0.42;
      },
      () => {
        this.mode = "front";
        this.flip = 0;
        this.cb.onRevealed?.(this.index);
      },
    );
    if (card.userData.card.finish > 1)
      this.burst(FINISHES[card.userData.card.finish].color);
  }
  next() {
    if (this.mode !== "front") return;
    this.mode = "advancing";
    this.rotation = { x: 0, y: 0 };
    const old = this.packCards[this.index];
    const y = old.position.y;
    const next = this.packCards[this.index + 1];
    const nextStart = next?.position.clone();
    this.sound.slide();
    this.tween(
      this.reduced ? 0.18 : 0.72,
      (t) => {
        const outgoing = clamp(t / 0.65, 0, 1);
        old.position.x = -ease(outgoing) * 7;
        old.position.y = y - outgoing * 0.45;
        old.rotation.z = outgoing * 0.4;
        if (next) {
          // Bring the next back forward continuously as the revealed card leaves.
          const incoming = clamp((t - 0.18) / 0.82, 0, 1);
          next.position.set(
            smooth(nextStart.x, 0, incoming),
            smooth(nextStart.y, 0, incoming),
            smooth(nextStart.z, 0.85, incoming),
          );
        }
      },
      () => {
        old.visible = false;
        this.index++;
        if (this.index >= this.packCards.length) {
          this.mode = "summary";
          this.shadow.visible = false;
          this.cb.onComplete?.();
          return;
        }
        const next = this.packCards[this.index];
        next.position.set(0, 0, 0.85);
        this.flip = Math.PI;
        next.rotation.set(0, Math.PI, 0);
        this.mode = "back";
        this.cb.onReady?.(this.index);
      },
    );
  }
  inspect(card) {
    this.previousMode = this.mode;
    this.mode = "inspect";
    this.host.classList.remove("pack-carousel");
    this.resize();
    this.host.classList.remove("pack-grab");
    this.packChoices.forEach(group => { group.visible = false; });
    this.packCards.forEach((g) => (g.visible = false));
    this.inspectCard = this.createCard(card);
    this.inspectCard.position.z = 0.85;
    this.rotation = { x: 0, y: 0 };
    this.flip = 0;
    this.shadow.visible = true;
  }
  closeInspect() {
    if (!this.inspectCard) return;
    this.tweens = [];
    this.disposeGroup(this.inspectCard);
    this.inspectCard = null;
    this.mode = this.previousMode;
    this.host.classList.toggle("pack-carousel", ["sealed", "tearing"].includes(this.mode));
    this.resize();
    this.host.classList.toggle("pack-grab", ["sealed", "tearing"].includes(this.mode));
    this.packChoices.forEach(group => { group.visible = (this.mode === 'sealed' && (!this.choiceConfirmed || group === this.pack)) || (this.mode === 'tearing' && group === this.pack); });
    this.packCards.forEach(
      (g, i) =>
        (g.visible = i >= this.index && ["back", "front"].includes(this.mode)),
    );
    this.shadow.visible = !["summary", "locked"].includes(this.mode);
    this.flip = this.mode === "back" ? Math.PI : 0;
  }
  flipInspection() {
    if (this.mode !== "inspect") return;
    const a = this.flip,
      b = this.flip > 1 ? 0 : Math.PI;
    this.mode = "inspectFlip";
    this.sound.slide();
    this.tween(
      0.45,
      (t) => {
        this.flip = smooth(a, b, t);
        this.inspectCard.rotation.y = this.flip;
      },
      () => (this.mode = "inspect"),
    );
  }
  keyboardTilt(x, y) {
    this.rotation.x = clamp(this.rotation.x + x, -0.8, 0.8);
    this.rotation.y = clamp(this.rotation.y + y, -1.15, 1.15);
  }
  burst(color) {
    if (this.reduced) return;
    for (let i = 0; i < 45; i++) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(0.025, 0.025),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      mesh.position.set(
        (Math.random() - 0.5) * 2.5,
        (Math.random() - 0.5) * 3.2,
        0.2,
      );
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        life: 1,
        vx: (Math.random() - 0.5) * 1.6,
        vy: 0.3 + Math.random() * 1.7,
      });
    }
  }
  tween(duration, update, done) {
    this.tweens.push({ duration, update, done, elapsed: 0 });
  }
  animate() {
    this.raf = requestAnimationFrame(() => this.animate());
    const dt = Math.min(this.clock.getDelta(), 0.05),
      t = this.clock.elapsedTime;
    if (document.hidden) return;
    const running = this.tweens;
    this.tweens = [];
    for (const tween of running) {
      tween.elapsed += dt;
      const p = Math.min(tween.elapsed / tween.duration, 1);
      tween.update(p);
      if (p >= 1) tween.done?.();
      else this.tweens.push(tween);
    }
    if (this.mode === 'sealed' && this.drag?.type !== 'carousel') {
      this.carouselPosition = this.reduced ? this.carouselTarget : THREE.MathUtils.damp(this.carouselPosition, this.carouselTarget, 10, dt);
      this.positionPacks();
    }
    if (this.mode === 'sealed') {
      this.packChoices.forEach((group, i) => {
        group.visible = !this.choiceConfirmed || group === this.pack;
        const depth = this.choiceConfirmed && group === this.pack ? .55 : 0;
        group.position.z = this.reduced ? depth : THREE.MathUtils.damp(group.position.z, depth, 10, dt);
      });
    }
    if (["sealed", "tearing", "autoTear"].includes(this.mode)) {
      const float = this.reduced ? 0 : Math.sin(t * 0.85) * 0.045;
      this.packChoices.forEach(group => { group.position.y = float + (this.mode === 'sealed' && group !== this.pack ? -.06 : 0); });
    }
    const card = this.inspectCard || this.packCards[this.index];
    if (card && ["back", "front", "inspect"].includes(this.mode)) {
      const hover = this.drag || this.reduced ? 0 : 0.025;
      const rx = this.rotation.x + Math.sin(t * 0.8) * hover;
      const ry = this.flip + this.rotation.y + Math.cos(t * 0.65) * hover;
      card.rotation.x = THREE.MathUtils.damp(card.rotation.x, rx, 12, dt);
      card.rotation.y = THREE.MathUtils.damp(card.rotation.y, ry, 12, dt);
      card.rotation.z = THREE.MathUtils.damp(
        card.rotation.z,
        -this.rotation.y * 0.045,
        9,
        dt,
      );
      card.position.y = THREE.MathUtils.damp(
        card.position.y,
        this.reduced ? 0 : Math.sin(t) * 0.035,
        5,
        dt,
      );
    }
    if (!this.reduced) this.dust.rotation.z = Math.sin(t * 0.035) * 0.12;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt * 0.58;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.material.opacity = Math.max(0, p.life);
      p.mesh.rotation.z += dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }
    // One WebGL context: a full-window room, then the original interaction stage.
    this.cozyRoom.update(t, dt, this.reduced);
    const w = window.innerWidth,
      h = window.innerHeight;
    this.renderer.setScissorTest(false);
    this.renderer.setViewport(0, 0, w, h);
    this.renderer.clear(true, true, true);
    this.renderer.render(this.cozyRoom.scene, this.cozyRoom.camera);
    this.renderer.clearDepth();
    const rect = this.host.getBoundingClientRect();
    const clipW = Math.min(rect.right, w) - Math.max(rect.left, 0);
    const clipH = Math.min(rect.bottom, h) - Math.max(rect.top, 0);
    if (clipW > 0 && clipH > 0) {
      this.renderer.setViewport(
        rect.left,
        h - rect.bottom,
        rect.width,
        rect.height,
      );
      this.renderer.setScissor(
        Math.max(0, rect.left),
        Math.max(0, h - rect.bottom),
        clipW,
        clipH,
      );
      this.renderer.setScissorTest(true);
      this.renderer.render(this.scene, this.camera);
    }
    this.renderer.setScissorTest(false);
    if (
      this.cb.onFrame &&
      ["sealed", "tearing", "autoTear"].includes(this.mode)
    ) {
      const hintPack = this.mode === "sealed" ? this.packChoices[this.carouselTarget] : this.pack;
      const seal = new THREE.Vector3(0, 1.91, 0)
        .applyMatrix4(hintPack.matrixWorld)
        .project(this.camera);
      this.cb.onFrame({
        confirmed: this.choiceConfirmed,
        x: (seal.x * 0.5 + 0.5) * this.host.clientWidth,
        y: (-0.5 * seal.y + 0.5) * this.host.clientHeight,
      });
      if (this.mode === 'sealed') this.cb.onPackLayout?.(this.packChoices.map(group => {
        const p = group.localToWorld(new THREE.Vector3(0, -2.1, 0)).project(this.camera);
        const a = group.localToWorld(new THREE.Vector3(-1.4, 0, 0)).project(this.camera);
        const b = group.localToWorld(new THREE.Vector3(1.4, 0, 0)).project(this.camera);
        return { id: group.userData.edition, x: (p.x * .5 + .5) * this.host.clientWidth, y: (-p.y * .5 + .5) * this.host.clientHeight, width: Math.abs(a.x - b.x) * .5 * this.host.clientWidth };
      }));
    }
  }
}
