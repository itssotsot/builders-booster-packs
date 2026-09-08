import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import openAIBlossom from "./assets/openai-blossom.svg?raw";

// A complete, independently lit environment. The opening stage is composited
// over it by PackScene so its interaction coordinates remain unchanged.
export class CozyRoom {
  constructor(environment, cardBack) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#1a1322");
    this.scene.fog = new THREE.FogExp2("#23182d", 0.019);
    this.scene.environment = environment;
    this.scene.environmentIntensity = 0.12;
    this.camera = new THREE.PerspectiveCamera(48, 1, 0.1, 60);
    this.camera.position.set(0, 3.1, 11.4);
    this.lookAt = new THREE.Vector3(0, 1.55, -4.5);
    this.camera.lookAt(this.lookAt);
    this.explore = new THREE.Vector2();
    this.steam = [];
    this.materials = new Map();
    this.boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    this.sphereGeometry = new THREE.SphereGeometry(1, 14, 10);
    this.glowTexture = this.makeGlow();
    this.wood = this.makeWood();
    this.scene.add(new THREE.HemisphereLight(0xc8b2f0, 0x312132, 0.52));
    const fill = new THREE.DirectionalLight(0xffc4a0, 0.85);
    fill.position.set(-3, 7, 5);
    this.scene.add(fill);
    this.light(0xffb782, 95, [-5.5, 3.6, -2], 14, true);
    this.light(0xcb72ff, 100, [4.4, 3.4, -5.4], 14);
    this.light(0x4ad9eb, 75, [-5.5, 3, -5.6], 12);
    this.light(0xffb063, 45, [5.8, 2, -1.8], 10);
    this.architecture();
    this.window();
    this.lounge();
    this.shelves();
    const deskStart = this.scene.children.length;
    this.desk(cardBack);
    this.scene.children
      .slice(deskStart)
      .forEach((object) => (object.position.y += 0.72));
    this.neonSign();
    this.pendants();

  }
  material(color, roughness = 0.8, metalness = 0) {
    const key = `${color}-${roughness}-${metalness}`;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({ color, roughness, metalness }),
      );
    return this.materials.get(key);
  }
  box(size, position, color, radius = 0, parent = this.scene) {
    const geometry = radius
      ? new RoundedBoxGeometry(...size, 3, radius)
      : this.boxGeometry;
    const material = color?.isMaterial ? color : this.material(color);
    const mesh = new THREE.Mesh(geometry, material);
    if (!radius) mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  sphere(size, position, color, parent = this.scene) {
    const mesh = new THREE.Mesh(
      this.sphereGeometry,
      color?.isMaterial ? color : this.material(color),
    );
    mesh.scale.set(...size);
    mesh.position.set(...position);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  cylinder(top, bottom, height, position, color, parent = this.scene) {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(top, bottom, height, 32),
      color?.isMaterial ? color : this.material(color),
    );
    mesh.position.set(...position);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  light(color, power, position, distance, shadow = false) {
    const light = new THREE.PointLight(color, power, distance, 2);
    light.position.set(...position);
    light.castShadow = shadow;
    if (shadow) {
      light.shadow.mapSize.set(512, 512);
      light.shadow.bias = -0.004;
      light.shadow.normalBias = 0.04;
      light.shadow.camera.near = 0.25;
      light.shadow.camera.far = 18;
    }
    this.scene.add(light);
    return light;
  }
  makeGlow() {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const c = canvas.getContext("2d");
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "#ffffff");
    g.addColorStop(0.12, "#ffffffb0");
    g.addColorStop(0.38, "#ffffff28");
    g.addColorStop(1, "#ffffff00");
    c.fillStyle = g;
    c.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }
  glow(position, size, color, opacity = 0.3) {
    const material = new THREE.SpriteMaterial({
      map: this.glowTexture,
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity,
      toneMapped: false,
    });
    const sprite = new THREE.Sprite(material);
    sprite.position.set(...position);
    sprite.scale.set(...size, 1);
    this.scene.add(sprite);
    return sprite;
  }
  tube(points, color, radius = 0.026, glow = true) {
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
    );
    const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false });
    const mesh = new THREE.Mesh(
      new THREE.TubeGeometry(
        curve,
        Math.max(12, points.length * 5),
        radius,
        6,
        false,
      ),
      mat,
    );
    this.scene.add(mesh);
    if (glow) {
      const halo = new THREE.Mesh(
        new THREE.TubeGeometry(
          curve,
          Math.max(12, points.length * 5),
          radius * 4,
          6,
          false,
        ),
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.11,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      this.scene.add(halo);
    }
    return mesh;
  }
  makeWood() {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const c = canvas.getContext("2d");
    c.fillStyle = "#73503e";
    c.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 450; i++) {
      const y = (i / 450) * 256;
      c.strokeStyle = i % 4 ? "#29161919" : "#d7a2781b";
      c.lineWidth = 0.5 + (i % 3) * 0.4;
      c.beginPath();
      c.moveTo(0, y);
      for (let x = 0; x <= 1024; x += 16)
        c.lineTo(
          x,
          y + Math.sin(x * 0.012 + i * 0.08) * (2 + Math.sin(i * 0.1) * 1.5),
        );
      c.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    texture.anisotropy = 4;
    return new THREE.MeshStandardMaterial({
      map: texture,
      color: "#b3988d",
      roughness: 0.64,
    });
  }
  architecture() {
    this.box([23, 0.22, 22], [0, -2.14, -1], "#332331");
    for (let i = 0; i < 21; i++)
      this.box(
        [1.06, 0.045, 22],
        [-11 + i * 1.1, -2, -1],
        i % 3 === 0 ? "#664638" : i % 3 === 1 ? "#52392f" : "#5b4035",
      );
    this.box([23, 10, 0.25], [0, 2.8, -7.25], "#594152");
    this.box([0.25, 10, 21], [-11.5, 2.8, 2.5], "#4b3748");
    this.box([0.25, 10, 21], [11.5, 2.8, 2.5], "#382e46");
    this.box([23, 0.25, 21], [0, 7.8, 2.5], "#352939");
    this.box([23, 0.15, 0.12], [0, -1.72, -7.06], "#a27660");
    for (let i = 0; i < 10; i++)
      this.box([0.055, 5.5, 0.055], [-10.7 + i * 0.27, 0.8, -7.04], "#ab7362");
    this.tube(
      [
        [-11.1, 6.25, -6.99],
        [-5.5, 6.25, -6.99],
        [0, 6.25, -6.99],
        [5.5, 6.25, -6.99],
        [11.1, 6.25, -6.99],
      ],
      "#d891f4",
      0.035,
    );
    this.glow([0, 6.0, -6.87], [21, 3], 0xad55dd, 0.14);
    this.tube(
      [
        [-11.2, -1.62, -6.93],
        [-5, -1.62, -6.93],
        [0, -1.62, -6.93],
        [5, -1.62, -6.93],
        [11.2, -1.62, -6.93],
      ],
      "#fcab77",
      0.016,
    );
    // A woven rug, with a visible border, under the lounge furniture.
    this.box([12, 0.025, 5.7], [0.1, -1.96, -2.6], "#a4777e", 0.015);
    this.box([11.6, 0.028, 5.3], [0.1, -1.94, -2.6], "#665370", 0.015);
    for (let i = 0; i < 30; i++)
      this.box(
        [11.45, 0.012, 0.018],
        [0.1, -1.915, -5.1 + i * 0.17],
        i % 2 ? "#8c6c80" : "#725d77",
      );
  }
  window() {
    const x = -5.3,
      y = 3.15,
      z = -6.98,
      w = 4.4,
      h = 4.1;
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader:
          "varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}",
        fragmentShader: `varying vec2 vUv; uniform float time;
        float hash(float p){return fract(sin(p*127.1)*43758.5453);}
        void main(){vec2 uv=vUv; vec3 c=mix(vec3(.025,.035,.10),vec3(.10,.065,.19),uv.y);
        for(int i=0;i<12;i++){float k=float(i);float x=k/12.;float roof=.18+hash(k+4.)*.3;
          if(uv.x>x&&uv.x<x+.078&&uv.y<roof){c=vec3(.026,.033,.069);vec2 q=fract(uv*vec2(68.,45.));float a=step(.25,q.x)*step(q.x,.6)*step(.25,q.y)*step(q.y,.6);float on=step(.48,hash(floor(uv.x*68.)+floor(uv.y*45.)*13.));c+=vec3(.16,.20,.30)*a*on;}}
        float moon=1.-smoothstep(.064,.069,length((uv-vec2(.72,.78))*vec2(1.,.95)));c+=moon*vec3(.54,.53,.67);
        float lane=floor(uv.x*82.);float speed=.025+hash(lane)*.04;float drop=fract(uv.y+time*speed+hash(lane)*6.);float line=pow(max(0.,1.-abs(fract(uv.x*82.)-.5)*2.),25.);c+=line*pow(drop,35.)*vec3(.12,.2,.23);
        float reflection=exp(-pow((uv.x-.13)*9.,2.))*.14;c+=reflection*vec3(.25,.6,.75);
        gl_FragColor=vec4(c,1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        }
        `,
      }),
    );
    glass.position.set(x, y, z);
    this.scene.add(glass);
    this.rain = glass.material;
    this.box(
      [w + 0.32, 0.17, 0.22],
      [x, y + h / 2, z + 0.05],
      "#887178",
      0.025,
    );
    this.box([w + 0.65, 0.18, 0.65], [x, y - h / 2, z + 0.25], this.wood, 0.03);
    for (const dx of [-w / 2, 0, w / 2])
      this.box([0.11, h, 0.19], [x + dx, y, z + 0.1], "#605365", 0.01);
    this.box([w, 0.1, 0.19], [x, y + 0.05, z + 0.1], "#605365", 0.01);
    this.tube(
      [
        [x - w / 2 - 0.15, y - h / 2, z + 0.04],
        [x - w / 2 - 0.15, y + h / 2 + 0.15, z + 0.04],
        [x + w / 2 + 0.15, y + h / 2 + 0.15, z + 0.04],
        [x + w / 2 + 0.15, y - h / 2, z + 0.04],
      ],
      "#91dce8",
      0.022,
    );
    this.glow([x, y, z + 0.25], [6, 5.5], 0x559ad0, 0.12);
    // Gathered linen curtains, made as rounded vertical folds.
    for (const side of [-1, 1])
      for (let i = 0; i < 5; i++) {
        const curtain = this.box(
          [0.19, 4.8, 0.29],
          [x + side * (w / 2 + 0.3 + i * 0.16), y - 0.1, z + 0.3],
          "#816174",
          0.085,
        );
        curtain.rotation.z = side * (0.025 + i * 0.006);
      }
    this.plant([-7.6, -0.43, -5.9], 0.95);
  }
  lounge() {
    const group = new THREE.Group();
    group.position.set(5.05, -1.25, -4.3);
    this.scene.add(group);
    for (const x of [-2.15, 2.15])
      for (const z of [-0.7, 0.7])
        this.cylinder(0.07, 0.055, 0.65, [x, -0.42, z], "#c39770", group);
    this.box([5.35, 0.58, 2.12], [0, 0.12, 0], "#635473", 0.23, group);
    this.box([5.15, 1.5, 0.52], [0, 1.02, -0.83], "#796481", 0.21, group);
    for (const x of [-2.48, 2.48])
      this.box([0.45, 1.02, 2.07], [x, 0.62, 0], "#80678a", 0.19, group);
    for (const x of [-1.16, 1.16])
      this.box([2.2, 0.33, 1.58], [x, 0.51, 0.1], "#92758d", 0.14, group);
    for (const [x, color, angle] of [
      [-1.65, "#b98078", -0.2],
      [1.6, "#d4a18a", 0.22],
    ]) {
      const p = this.box(
        [0.95, 0.88, 0.26],
        [x, 1.08, -0.38],
        color,
        0.17,
        group,
      );
      p.rotation.z = angle;
      p.rotation.x = -0.2;
    }
    const blanket = this.box(
      [1.12, 0.09, 1.45],
      [0.5, 0.76, 0.25],
      "#bd968b",
      0.07,
      group,
    );
    blanket.rotation.y = 0.06;
    for (let i = 0; i < 10; i++)
      this.box(
        [0.026, 0.025, 1.32],
        [0.04 + i * 0.1, 0.816, 0.26],
        "#e1b59f",
        0,
        group,
      );
    this.box([1.12, 0.65, 0.1], [0.53, 0.39, 1.04], "#bd968b", 0.04, group);
    // Warm standing lamp and a small round side table.
    this.cylinder(0.43, 0.52, 0.12, [8.35, -1.82, -3], "#44343a");
    this.cylinder(
      0.035,
      0.035,
      3.4,
      [8.35, -0.1, -3],
      this.material("#bb956e", 0.3, 0.65),
    );
    this.cylinder(
      0.55,
      0.87,
      1.02,
      [8.35, 1.83, -3],
      new THREE.MeshStandardMaterial({
        color: "#e4b890",
        emissive: "#ffb275",
        emissiveIntensity: 0.65,
        roughness: 0.82,
        side: THREE.DoubleSide,
      }),
    );
    this.glow([8.35, 1.5, -3], [3.1, 3.1], 0xffb26f, 0.2);
    this.cylinder(0.85, 0.85, 0.11, [2.1, -0.83, -3.3], this.wood);
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      this.cylinder(
        0.035,
        0.035,
        1.08,
        [2.1 + Math.cos(a) * 0.52, -1.41, -3.3 + Math.sin(a) * 0.52],
        "#b0876c",
      );
    }
    this.cylinder(0.11, 0.11, 0.24, [2.35, -0.66, -3.2], "#d6a185");
  }
  plant(position, scale = 1) {
    const group = new THREE.Group();
    group.position.set(...position);
    group.scale.setScalar(scale);
    this.scene.add(group);
    this.cylinder(0.25, 0.18, 0.42, [0, 0, 0], "#b38679", group);
    this.cylinder(0.23, 0.23, 0.025, [0, 0.218, 0], "#342833", group);
    for (let i = 0; i < 9; i++) {
      const a = i * 2.4,
        height = 0.5 + (i % 4) * 0.17,
        reach = 0.3 + (i % 3) * 0.1;
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.013, 0.016, height, 5),
        this.material("#66735c"),
      );
      stem.position.set(
        Math.cos(a) * reach * 0.5,
        0.2 + height * 0.43,
        Math.sin(a) * reach * 0.5,
      );
      stem.rotation.z = -Math.cos(a) * 0.5;
      stem.rotation.x = Math.sin(a) * 0.5;
      group.add(stem);
      const leaf = this.sphere(
        [0.11, 0.33, 0.032],
        [Math.cos(a) * reach, 0.3 + height * 0.8, Math.sin(a) * reach],
        i % 2 ? "#668679" : "#9aab87",
        group,
      );
      leaf.rotation.set(0.6 * Math.sin(a), -a, Math.cos(a) * 0.85);
    }
    return group;
  }
  shelves() {
    this.box([5, 0.1, 0.63], [5.2, 3.5, -6.64], this.wood, 0.025);
    this.box([4.0, 0.1, 0.63], [5.9, 2.15, -6.64], this.wood, 0.025);
    this.tube(
      [
        [2.8, 3.42, -6.43],
        [5.2, 3.42, -6.43],
        [7.5, 3.42, -6.43],
      ],
      "#e6a2ff",
      0.022,
    );
    this.glow([5.3, 3.18, -6.72], [6, 1.3], 0xc075ff, 0.14);
    for (let i = 0; i < 7; i++) {
      const book = this.box(
        [0.13 + (i % 2) * 0.07, 0.55 + (i % 3) * 0.13, 0.35],
        [3.15 + i * 0.2, 3.83 + (i % 3) * 0.065, -6.6],
        ["#b18684", "#9b8aab", "#c8b394", "#687b88"][i % 4],
        0.01,
      );
      book.rotation.z = i === 6 ? -0.18 : 0;
      this.box([0.09, 0.025, 0.012], [3.15 + i * 0.2, 3.65, -6.415], "#e2b99a");
    }
    this.plant([7.0, 3.75, -6.6], 0.7);
    const logoPaths = new SVGLoader().parse(openAIBlossom).paths;
    const logoGeometry = new THREE.ExtrudeGeometry(
      logoPaths.flatMap((path) => SVGLoader.createShapes(path)),
      { depth: 46, bevelEnabled: false, curveSegments: 16 },
    );
    logoGeometry.computeBoundingBox();
    const logoSize = logoGeometry.boundingBox.getSize(new THREE.Vector3());
    const logoScale = 0.86 / Math.max(logoSize.x, logoSize.y);
    logoGeometry.center();
    logoGeometry.rotateX(Math.PI);
    logoGeometry.scale(logoScale, logoScale, logoScale);
    const logo = new THREE.Mesh(
      logoGeometry,
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: "#ffffff",
        emissiveIntensity: 0.2,
        roughness: 0.35,
        metalness: 0.15,
      }),
    );
    logo.name = "OpenAI shelf logo";
    logo.position.set(5.55, 3.645 + logoSize.y * logoScale / 2, -6.6);
    logo.castShadow = true;
    logo.receiveShadow = true;
    this.scene.add(logo);
    this.box([0.44, 0.09, 0.24], [5.55, 3.6, -6.58], "#796378", 0.025);
    this.glow([5.55, 4.03, -6.4], [1.1, 1.1], 0xffbd77, 0.19);
    for (let i = 0; i < 3; i++)
      this.box(
        [0.86, 0.13, 0.4],
        [5.02, 2.25 + i * 0.14, -6.57],
        ["#857086", "#b08770", "#8ba295"][i],
        0.014,
      );
    this.sphere([0.21, 0.31, 0.18], [6.6, 2.49, -6.59], "#dbb4a3");
    // Record cabinet beneath the window.
    this.box([4.6, 1.26, 1.25], [-5.8, -1.12, -5.85], this.wood, 0.08);
    this.box([4.25, 0.85, 0.04], [-5.8, -1.12, -5.19], "#3a2933");
    for (let i = 0; i < 16; i++) {
      const vinyl = this.box(
        [0.105, 0.72, 0.48],
        [-7.72 + i * 0.12, -1.14, -5.42],
        ["#b09289", "#6f7181", "#a17570", "#d0b6a3"][i % 4],
        0.008,
      );
      vinyl.rotation.z = 0.015 * (i % 3);
    }
    this.box([1.4, 0.1, 0.9], [-5.42, -0.43, -5.8], "#3d303b", 0.05);
    this.cylinder(0.35, 0.35, 0.03, [-5.42, -0.36, -5.8], "#191b26");
    this.cylinder(0.08, 0.08, 0.035, [-5.42, -0.34, -5.8], "#be997f");
    this.box([0.64, 0.82, 0.52], [-4.18, -1.1, -5.39], "#302b34", 0.025);
    for (const y of [-1.28, -0.91]) {
      const driver = this.cylinder(
        0.18,
        0.18,
        0.035,
        [-4.18, y, -5.09],
        "#191724",
      );
      driver.rotation.x = Math.PI / 2;
    }
  }
  desk(cardBack) {
    this.box([17, 0.24, 4.2], [0, -1.2, 3.25], this.wood, 0.1);
    this.box([16.7, 0.24, 0.1], [0, -1.38, 5.32], "#6c4441", 0.025);
    this.box([6.1, 0.038, 2.8], [0, -1.05, 3.1], "#b092a5", 0.12);
    this.box([5.96, 0.042, 2.66], [0, -1.024, 3.1], "#433746", 0.1);
    // Thin edge light and soft reflected pools on the desktop.
    this.tube(
      [
        [-8.2, -1.3, 5.38],
        [-3, -1.3, 5.38],
        [3, -1.3, 5.38],
        [8.2, -1.3, 5.38],
      ],
      "#f4b17f",
      0.016,
    );
    this.cylinder(0.48, 0.48, 0.04, [-4.38, -1.04, 3.25], "#9a7969");
    const mugMat = this.material("#c8a99e", 0.35);
    this.cylinder(0.29, 0.26, 0.51, [-4.38, -0.765, 3.25], mugMat);
    this.cylinder(0.265, 0.265, 0.015, [-4.38, -0.5, 3.25], "#dfbeb0");
    this.cylinder(0.235, 0.235, 0.018, [-4.38, -0.493, 3.25], "#4b2d25");
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.19, 0.06, 10, 24),
      mugMat,
    );
    handle.position.set(-4.05, -0.77, 3.25);
    this.scene.add(handle);
    for (let i = 0; i < 3; i++) {
      const s = this.glow(
        [-4.38, -0.32 + i * 0.26, 3.25],
        [0.18 + i * 0.06, 0.49],
        0xe8c3b8,
        0.045,
      );
      this.steam.push(s);
    }
    this.plant([-6.6, -0.82, 2.3], 0.8);
    const backMat = new THREE.MeshStandardMaterial({
      map: cardBack,
      roughness: 0.46,
      metalness: 0.1,
    });
    for (let i = 0; i < 4; i++) {
      const card = this.box(
        [0.72, 0.013, 1.04],
        [4.25 + i * 0.18, -1.04 + i * 0.018, 3.27],
        "#d0bbae",
        0.006,
      );
      card.rotation.y = -0.3 + i * 0.12;
      const face = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.02), backMat);
      face.rotation.x = -Math.PI / 2;
      face.position.y = 0.008;
      card.add(face); // Rounded geometry uses world-sized vertices.
    }
    this.box([1.4, 0.11, 1.8], [6.3, -1.0, 2.65], "#815969", 0.04).rotation.y =
      -0.17;
    this.box(
      [1.33, 0.07, 1.73],
      [6.3, -0.92, 2.65],
      "#d6bd9e",
      0.025,
    ).rotation.y = -0.17;
    const pen = this.cylinder(
      0.025,
      0.025,
      1.25,
      [6.2, -0.85, 2.6],
      this.material("#d3a175", 0.3, 0.7),
    );
    pen.rotation.z = Math.PI / 2;
    pen.rotation.y = 0.3;
  }
  neonSign() {
    // Actual bent neon tubes, mounted on a smoked-glass panel.
    this.box(
      [4.4, 1.75, 0.09],
      [0.25, 4.02, -7.02],
      new THREE.MeshStandardMaterial({
        color: "#372435",
        roughness: 0.38,
        metalness: 0.25,
      }),
      0.16,
    );
    const letters = [
      [
        [0, 0],
        [0, 1],
        [0.47, 1],
        [0.65, 0.83],
        [0.59, 0.58],
        [0, 0.53],
        [0.65, 0],
      ],
      [
        [0.96, 1],
        [0.96, 0],
      ],
      [
        [1.35, 0],
        [1.35, 1],
        [2.0, 1],
      ],
      [
        [1.35, 0.54],
        [1.85, 0.54],
      ],
      [
        [2.3, 1],
        [3.06, 1],
      ],
      [
        [2.68, 1],
        [2.68, 0],
      ],
    ];
    for (const path of letters)
      this.tube(
        path.map(([x, y]) => [x - 1.3, y + 3.77, -6.89]),
        "#fbd0b4",
        0.03,
      );
    this.glow([0.22, 4.2, -6.8], [5.3, 2.7], 0xff8877, 0.22);
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 96;
    const ctx = canvas.getContext("2d");
    ctx.textAlign = "center";
    ctx.fillStyle = "#e4b3ee";
    ctx.font = '400 36px "DM Sans", sans-serif';
    ctx.fillText("A F T E R   H O U R S", 384, 61);
    const text = new THREE.Mesh(
      new THREE.PlaneGeometry(2.7, 0.3375),
      new THREE.MeshBasicMaterial({
        map: new THREE.CanvasTexture(canvas),
        transparent: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    text.position.set(0.25, 3.5, -6.85);
    this.scene.add(text);
    const cable = [];
    for (let i = 0; i <= 40; i++) {
      const x = -10 + i * 0.5;
      cable.push([x, 5.4 - Math.sin((i / 40) * Math.PI) * 0.6, -6.76]);
    }
    this.tube(cable, "#4f3744", 0.017, false);
    for (let i = 0; i < 19; i++) {
      const x = -9 + i;
      const y = 5.4 - Math.sin(((x + 10) / 20) * Math.PI) * 0.6;
      const mat = new THREE.MeshBasicMaterial({
        color: i % 3 ? "#ffdda7" : "#ffd8e8",
        toneMapped: false,
      });
      this.sphere([0.055, 0.075, 0.055], [x, y - 0.08, -6.76], mat);
      this.glow([x, y - 0.08, -6.72], [0.57, 0.57], 0xffc48e, 0.23);
    }
  }
  pendants() {
    for (const [x, y, z, size] of [
      [-6.3, 4.0, -1.9, 0.73],
      [7.7, 4.8, -3.7, 0.51],
    ]) {
      this.cylinder(0.014, 0.014, 7.8 - y, [x, (7.8 + y) / 2, z], "#443040");
      this.cylinder(
        size * 0.54,
        size,
        0.7,
        [x, y, z],
        new THREE.MeshStandardMaterial({
          color: "#ba8364",
          emissive: "#ffac78",
          emissiveIntensity: 0.36,
          roughness: 0.72,
          side: THREE.DoubleSide,
        }),
      );
      this.cylinder(
        size * 0.86,
        size * 0.86,
        0.025,
        [x, y - 0.35, z],
        new THREE.MeshBasicMaterial({ color: "#ffce9b", toneMapped: false }),
      );
      this.glow([x, y - 0.42, z], [size * 4, size * 3], 0xffae72, 0.28);
      for (let j = 0; j < 24; j++) {
        const a = (j / 24) * Math.PI * 2;
        const rib = this.box(
          [0.018, 0.62, 0.025],
          [
            x + Math.cos(a) * size * 0.78,
            y - 0.04,
            z + Math.sin(a) * size * 0.78,
          ],
          "#e8ad82",
        );
        rib.rotation.z = Math.cos(a) * 0.45;
        rib.rotation.x = -Math.sin(a) * 0.45;
      }
    }
  }
  resize(width, height) {
    this.camera.aspect = width / height;
    this.mobile = width < 760;
    this.camera.fov = this.mobile ? 59 : 48;
    this.camera.updateProjectionMatrix();
    this.baseZ = this.mobile ? 14.8 : 11.4;
  }
  update(time, dt, reduced) {
    const parallax = reduced ? 0 : 1;
    this.camera.position.x = THREE.MathUtils.damp(
      this.camera.position.x,
      -this.explore.x * 3.6,
      reduced ? 18 : 7,
      dt,
    );
    this.camera.position.y = THREE.MathUtils.damp(
      this.camera.position.y,
      3.1 + this.explore.y * 1.6,
      reduced ? 18 : 7,
      dt,
    );
    this.camera.position.z = this.baseZ || 11.4;
    this.camera.lookAt(this.lookAt);
    this.rain.uniforms.time.value = reduced ? 0 : time;
    this.steam.forEach((s, i) => {
      s.position.x = -4.38 + Math.sin(time * 0.7 + i * 1.5) * 0.035 * parallax;
      s.material.opacity = reduced
        ? 0.035
        : 0.033 + Math.sin(time * 0.8 + i) * 0.014;
    });
  }
}
