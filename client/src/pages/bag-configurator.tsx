import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Menu, X, Boxes } from "lucide-react";

const SCALE = 10;

type PlasticType = "ldpe" | "hdpe";
type HandleType = "banana" | "vest" | "loop" | "none";

interface PrintColorState {
  enabled: boolean;
  color: string;
}

const DEFAULT_COLORS: PrintColorState[] = [
  { enabled: true, color: "#e11d48" },
  { enabled: true, color: "#0284c7" },
  { enabled: false, color: "#16a34a" },
  { enabled: false, color: "#ca8a04" },
];

function getPlasticMaterial(type: PlasticType, colorHex: string) {
  const opts: THREE.MeshPhysicalMaterialParameters = {
    color: new THREE.Color(colorHex),
    side: THREE.DoubleSide,
    transparent: true,
  };
  if (type === "ldpe") {
    opts.roughness = 0.1;
    opts.metalness = 0.1;
    opts.transmission = 0.6;
    opts.opacity = 0.9;
    opts.clearcoat = 1.0;
  } else {
    opts.roughness = 0.6;
    opts.metalness = 0.0;
    opts.transmission = 0.0;
    opts.opacity = 1.0;
  }
  return new THREE.MeshPhysicalMaterial(opts);
}

export default function BagConfigurator() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const printCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bagGroupRef = useRef<THREE.Group | null>(null);
  const printTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const rafRef = useRef<number | null>(null);

  const [panelOpen, setPanelOpen] = useState(true);

  const [type, setType] = useState<PlasticType>("ldpe");
  const [handle, setHandle] = useState<HandleType>("banana");
  const [width, setWidth] = useState(30);
  const [height, setHeight] = useState(45);
  const [depth, setDepth] = useState(10);
  const [bagColor, setBagColor] = useState("#ffffff");

  const [printText, setPrintText] = useState("Super Market");
  const [colors, setColors] = useState<PrintColorState[]>(DEFAULT_COLORS);
  const [printVersion, setPrintVersion] = useState(0);

  // Initialize scene once
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#f1f5f9");
    sceneRef.current = scene;

    const w = container.clientWidth;
    const h = container.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(6, 3, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 2, 0);
    controls.minDistance = 2;
    controls.maxDistance = 15;
    controlsRef.current = controls;

    // Lighting
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);
    const pointLight = new THREE.PointLight(0xe0f2fe, 0.5);
    pointLight.position.set(-5, 5, 5);
    scene.add(pointLight);

    // Floor + grid
    const floorGeo = new THREE.PlaneGeometry(50, 50);
    const floorMat = new THREE.MeshStandardMaterial({
      color: "#e2e8f0",
      roughness: 0.5,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
    const grid = new THREE.GridHelper(50, 50, 0xcbd5e1, 0xf1f5f9);
    grid.position.y = 0.01;
    scene.add(grid);

    const bagGroup = new THREE.Group();
    scene.add(bagGroup);
    bagGroupRef.current = bagGroup;

    const onResize = () => {
      if (!container || !cameraRef.current || !rendererRef.current) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      cameraRef.current.aspect = cw / ch;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(cw, ch);
    };
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      ro.disconnect();
      controls.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).geometry) {
          (obj as THREE.Mesh).geometry.dispose();
        }
        const mat = (obj as THREE.Mesh).material as
          | THREE.Material
          | THREE.Material[]
          | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
      printTextureRef.current?.dispose();
      printTextureRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      controlsRef.current = null;
      bagGroupRef.current = null;
    };
  }, []);

  // Update print canvas/texture when printVersion changes
  useEffect(() => {
    const canvas = printCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const active = colors.filter((c) => c.enabled).map((c) => c.color);

    if (printText && active.length > 0) {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;

      if (active.length > 1) {
        ctx.font = "bold 130px Tajawal, sans-serif";
        ctx.fillStyle = active[1];
        ctx.fillText(printText, cx + 8, cy + 8);
      }
      if (active.length > 2) {
        ctx.font = "bold 120px Tajawal, sans-serif";
        ctx.strokeStyle = active[2];
        ctx.lineWidth = 15;
        ctx.strokeText(printText, cx, cy);
      }
      ctx.font = "bold 120px Tajawal, sans-serif";
      ctx.fillStyle = active[0];
      ctx.fillText(printText, cx, cy);

      if (active.length > 3) {
        ctx.fillStyle = active[3];
        ctx.beginPath();
        ctx.arc(cx, cy - 150, 40, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (!printTextureRef.current) {
      const tex = new THREE.CanvasTexture(canvas);
      const renderer = rendererRef.current;
      if (renderer) {
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }
      printTextureRef.current = tex;
    } else {
      printTextureRef.current.needsUpdate = true;
    }
  }, [printVersion, printText, colors]);

  // Rebuild bag geometry whenever bag/handle/dims/color change (or print texture)
  useEffect(() => {
    const bagGroup = bagGroupRef.current;
    const controls = controlsRef.current;
    if (!bagGroup || !controls) return;

    while (bagGroup.children.length > 0) {
      const child = bagGroup.children[0] as THREE.Mesh;
      bagGroup.remove(child);
      child.geometry?.dispose?.();
      const mat = child.material as THREE.Material | THREE.Material[];
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else mat?.dispose?.();
    }

    const w = width / SCALE;
    const h = height / SCALE;
    let d = depth / SCALE;
    if (d === 0) d = 0.05;

    const material = getPlasticMaterial(type, bagColor);

    const geo = new THREE.BoxGeometry(w, h, d, 32, 32, 8);
    geo.translate(0, h / 2, 0);

    const pos = geo.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);
      const yNorm = y / h;

      if (Math.abs(x) > w / 2 - 0.02 && Math.abs(z) < d / 4) {
        x -= Math.sign(x) * (d * 0.2);
      }

      if (handle === "vest") {
        if (yNorm > 0.7 && Math.abs(x) < w * 0.25) {
          const dip = (yNorm - 0.7) * 2;
          y -= dip;
        }
      } else {
        if (yNorm > 0.8) {
          const pinch = (yNorm - 0.8) * 5;
          z *= 1 - pinch * 0.8;
        }
      }
      pos.setXYZ(i, x, y, z);
    }
    geo.computeVertexNormals();

    const bagMesh = new THREE.Mesh(geo, material);
    bagMesh.castShadow = true;
    bagMesh.receiveShadow = true;
    bagGroup.add(bagMesh);

    if (handle === "banana") {
      const holeGeo = new THREE.TorusGeometry(w * 0.1, 0.03, 16, 32);
      holeGeo.scale(1, 0.4, 1);
      const holeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
      const holeFront = new THREE.Mesh(holeGeo, holeMat);
      holeFront.position.set(0, h * 0.85, (d / 2) * 0.2);
      const holeBack = holeFront.clone();
      holeBack.position.set(0, h * 0.85, (-d / 2) * 0.2);
      bagGroup.add(holeFront, holeBack);
    } else if (handle === "loop") {
      const handleWidth = w * 0.25;
      const handleGeo = new THREE.TorusGeometry(
        handleWidth,
        0.06,
        16,
        32,
        Math.PI,
      );
      const h1 = new THREE.Mesh(handleGeo, material);
      h1.position.set(0, h * 0.98, (d / 2) * 0.2);
      const h2 = new THREE.Mesh(handleGeo, material);
      h2.position.set(0, h * 0.98, (-d / 2) * 0.2);
      bagGroup.add(h1, h2);
    }

    if (printTextureRef.current) {
      const printMat = new THREE.MeshBasicMaterial({
        map: printTextureRef.current,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      });
      const printGeo = geo.clone();
      const printMesh = new THREE.Mesh(printGeo, printMat);
      printMesh.scale.set(1.002, 1.002, 1.002);
      bagGroup.add(printMesh);
    }

    controls.target.set(0, h / 2, 0);
  }, [type, handle, width, height, depth, bagColor, printVersion]);

  const setColorAt = (idx: number, patch: Partial<PrintColorState>) => {
    setColors((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    );
  };

  const colorLabels = useMemo(() => ["لون 1", "لون 2", "لون 3", "لون 4"], []);

  return (
    <div
      dir="rtl"
      className="relative w-full"
      style={{ height: "calc(100vh - 4rem)", minHeight: "600px" }}
    >
      <div ref={containerRef} className="absolute inset-0 z-0" />

      {!panelOpen && (
        <button
          onClick={() => setPanelOpen(true)}
          className="absolute top-4 right-4 z-20 bg-white p-3 rounded-xl shadow-lg text-blue-600 hover:bg-blue-50 transition-colors"
          aria-label="فتح اللوحة"
        >
          <Menu className="h-6 w-6" />
        </button>
      )}

      <div
        className={`absolute top-0 right-0 h-full w-full sm:w-[30rem] bg-white/95 backdrop-blur shadow-2xl p-6 overflow-y-auto z-10 flex flex-col gap-5 transform transition-transform duration-300 border-l border-slate-200 ${
          panelOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ fontFamily: "Tajawal, sans-serif" }}
      >
        <div className="border-b border-slate-200 pb-4 flex justify-between items-center sticky top-0 bg-white/95 z-10">
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Boxes className="h-6 w-6 text-blue-500" />
            إعدادات التصنيع والطباعة
          </h1>
          <button
            onClick={() => setPanelOpen(false)}
            className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-600 transition-colors"
            aria-label="إغلاق اللوحة"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* خصائص الكيس الأساسية */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
          <h2 className="text-md font-bold text-slate-800 mb-4">
            خصائص الكيس الأساسية
          </h2>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                نوع البلاستيك
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as PlasticType)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 p-2.5 outline-none"
              >
                <option value="ldpe">LDPE (شفاف ولامع)</option>
                <option value="hdpe">HDPE (معتم وقوي)</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                شكل المقبض
              </label>
              <select
                value={handle}
                onChange={(e) => setHandle(e.target.value as HandleType)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 p-2.5 outline-none"
              >
                <option value="banana">بنانة / كدني (Die-Cut)</option>
                <option value="vest">علاقي (T-Shirt)</option>
                <option value="loop">مقبض ملحوم (Loop)</option>
                <option value="none">بدون مقبض</option>
              </select>
            </div>
          </div>

          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs font-semibold text-slate-600 flex justify-between mb-1">
                <span>
                  العرض: <span>{width}</span> سم
                </span>
              </label>
              <input
                type="range"
                min={15}
                max={80}
                value={width}
                onChange={(e) => setWidth(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 flex justify-between mb-1">
                <span>
                  الطول: <span>{height}</span> سم
                </span>
              </label>
              <input
                type="range"
                min={20}
                max={100}
                value={height}
                onChange={(e) => setHeight(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 flex justify-between mb-1">
                <span>
                  العمق (الطية): <span>{depth}</span> سم
                </span>
              </label>
              <input
                type="range"
                min={0}
                max={30}
                value={depth}
                onChange={(e) => setDepth(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-600">
              لون البلاستيك:
            </label>
            <input
              type="color"
              value={bagColor}
              onChange={(e) => setBagColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0"
            />
          </div>
        </div>

        {/* تصميم الطباعة فلكسو */}
        <div className="bg-blue-50/50 rounded-xl p-4 shadow-sm border border-blue-100">
          <h2 className="text-md font-bold text-blue-900 mb-4">
            تصميم طباعة فلكسو (4 ألوان كحد أقصى)
          </h2>

          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-600 block mb-1">
              النص المطبوع
            </label>
            <input
              type="text"
              value={printText}
              onChange={(e) => setPrintText(e.target.value)}
              placeholder="اكتب التصميم هنا..."
              className="w-full bg-white border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="mb-4">
            <label className="text-xs font-semibold text-slate-600 block mb-2">
              فرز الألوان (تنشيط السلندرات)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {colors.map((c, idx) => (
                <label key={idx} className="relative cursor-pointer block">
                  <input
                    type="checkbox"
                    checked={c.enabled}
                    onChange={(e) =>
                      setColorAt(idx, { enabled: e.target.checked })
                    }
                    className="peer sr-only"
                  />
                  <div
                    className={`border-2 rounded-lg p-1 text-center transition-all bg-white ${
                      c.enabled
                        ? "border-sky-500 ring-2 ring-sky-500/20 opacity-100"
                        : "border-transparent opacity-50"
                    }`}
                  >
                    <input
                      type="color"
                      value={c.color}
                      onChange={(e) =>
                        setColorAt(idx, { color: e.target.value })
                      }
                      className="w-full h-6 rounded cursor-pointer border-0 p-0 block mb-1"
                    />
                    <span className="text-[10px] font-bold text-slate-500">
                      {colorLabels[idx]}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={() => setPrintVersion((v) => v + 1)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
          >
            تحديث أسطوانات الطباعة (Render)
          </button>
        </div>
      </div>

      <canvas
        ref={printCanvasRef}
        width={1024}
        height={1024}
        style={{ display: "none" }}
      />
    </div>
  );
}
