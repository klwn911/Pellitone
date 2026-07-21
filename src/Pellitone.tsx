/**
 * Pellitone.tsx — v6.5
 * -----------------------------------------------------------------------
 * Changes vs v6.4:
 *   • Control panel can be minimized/restored via a collapse button (─/□)
 *     in the panel header. When minimized only the title bar is visible.
 *   • "Demo" button in the panel header applies a curated preset instantly.
 *     Pressing it again ("Exit Demo") restores the previous user settings.
 *   • All v6.4 features retained.
 * -----------------------------------------------------------------------
 */

import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// Themes
// ─────────────────────────────────────────────────────────────────────────────

interface AuraTheme { name: string; colors: string[]; }

const AURA_THEMES: AuraTheme[] = [
  { name: 'Molten',    colors: ['18,113,255','221,74,255','100,220,255','200,50,50','180,180,50'] },
  { name: 'Aurora',    colors: ['0,245,212','0,187,249','155,93,229','241,91,181','80,250,123'] },
  { name: 'Deep Sea',  colors: ['0,180,216','0,119,182','144,224,239','2,62,138','72,202,228'] },
  { name: 'Sunset',    colors: ['255,158,0','255,84,0','255,0,110','255,189,0','255,0,80'] },
  { name: 'Mono',      colors: ['229,229,229','163,163,163','115,115,115','255,255,255','200,200,205'] },
  { name: 'Toxic',     colors: ['212,240,0','57,255,20','0,255,159','173,255,2','120,255,60'] },
  { name: 'Cyberpunk', colors: ['255,0,170','0,255,255','255,222,0','162,0,255','0,255,140'] },
  { name: 'Vaporwave', colors: ['255,113,206','1,205,254','5,255,161','249,178,255','185,103,255'] },
  { name: 'Ember',     colors: ['255,94,0','255,166,0','255,45,45','255,210,90','200,20,0'] },
  { name: 'Frost',     colors: ['173,232,244','103,197,255','224,247,250','46,134,193','190,240,255'] },
  { name: 'Candy',     colors: ['255,105,180','255,182,255','0,255,231','255,240,120','186,104,255'] },
];

type BlendMode =
  | 'normal' | 'screen' | 'lighten'
  | 'hard-light' | 'difference' | 'exclusion'
  | 'color' | 'luminosity';

const BLEND_OPTIONS: { key: BlendMode; label: string }[] = [
  { key: 'normal',     label: 'Normal'     },
  { key: 'screen',     label: 'Screen'     },
  { key: 'lighten',    label: 'Lighten'    },
  { key: 'hard-light', label: 'Hard Light' },
  { key: 'difference', label: 'Difference' },
  { key: 'exclusion',  label: 'Exclusion'  },
  { key: 'color',      label: 'Color'      },
  { key: 'luminosity', label: 'Luminosity' },
];

function cssBlendToThree(mode: BlendMode): THREE.Blending {
  switch (mode) {
    case 'screen':
    case 'lighten':
    case 'hard-light': return THREE.AdditiveBlending;
    default:           return THREE.NormalBlending;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ShapeType       = 'star' | 'circle' | 'square' | 'triangle' | 'text';
type ObjectMode      = 'flat' | 'sphere';
type BackgroundColor = 'black' | 'white';
type CanvasMask      = 'square' | 'circle';

interface SceneState {
  projMatrix: THREE.Matrix4;
  viewMatrix: THREE.Matrix4;
  width: number; height: number; time: number;
}

interface Settings {
  backgroundColor:      BackgroundColor;
  canvasMask:           CanvasMask;
  shape:                ShapeType;
  textChar:             string;
  objectMode:           ObjectMode;
  peakColor:            string;
  svgSize:              number;
  spacing:              number;
  opacity:              number;
  minScale:             number;
  maxScale:             number;
  rotationSpeed:        number;
  rotationDirection:    1 | -1;
  waveSpeed:            number;
  waveHeight:           number;
  gridSize:             number;
  drawDistance:         number;
  trailEnabled:         boolean;
  trailLength:          number;
  trailDecay:           number;
  trailPulseSpeed:      number;
  heatmapEnabled:       boolean;
  heatBlendMode:        BlendMode;
  heatPeakThreshold:    number;
  heatPeakColor:        string;
  heatPeakOpacity:      number;
  heatBlobSize:         number;
  heatEdgeFade:         number;
  heatPeakBlur:         number;
  heatValleyEnabled:    boolean;
  heatValleyThreshold:  number;
  heatValleyColor:      string;
  heatValleyOpacity:    number;
  heatValleyBlobSize:   number;
  heatValleyBlur:       number;
  auraEnabled:          boolean;
  auraThemeIndex:       number;
  auraBlur:             number;
  auraLiquidity:        number;
  auraBlobSize:         number;
  auraOpacity:          number;
  auraDotsVisible:      boolean;
  auraBlendMode:        BlendMode;
  auraEdgeFade:         number;
  auraPeakThreshold:    number;
  auraPeakBlur:         number;
  auraValleyEnabled:    boolean;
  auraValleyThreshold:  number;
  auraValleyColor:      string;
  auraValleyOpacity:    number;
  auraValleyBlobSize:   number;
  auraValleyBlur:       number;
}

const DEFAULT_SETTINGS: Settings = {
  backgroundColor:     'black',
  canvasMask:          'square',
  shape:               'circle',
  textChar:            '★',
  objectMode:          'flat',
  peakColor:           '#ffffff',
  svgSize:             0.70,
  spacing:             0.50,
  opacity:             1.0,
  minScale:            0.00,
  maxScale:            0.85,
  rotationSpeed:       0.35,
  rotationDirection:   1,
  waveSpeed:           1.00,
  waveHeight:          1.00,
  gridSize:            64,
  drawDistance:        150,
  trailEnabled:        false,
  trailLength:         8,
  trailDecay:          0.3,
  trailPulseSpeed:     0.8,
  heatmapEnabled:      false,
  heatBlendMode:       'screen',
  heatPeakThreshold:   0.00,
  heatPeakColor:       '#ff6a00',
  heatPeakOpacity:     1.0,
  heatBlobSize:        2.0,
  heatEdgeFade:        0.40,
  heatPeakBlur:        0,
  heatValleyEnabled:   false,
  heatValleyThreshold: 0.20,
  heatValleyColor:     '#0055ff',
  heatValleyOpacity:   0.75,
  heatValleyBlobSize:  2.5,
  heatValleyBlur:      0,
  auraEnabled:         false,
  auraThemeIndex:      0,
  auraBlur:            35,
  auraLiquidity:       50,
  auraBlobSize:        1.0,
  auraOpacity:         0.85,
  auraDotsVisible:     true,
  auraBlendMode:       'screen',
  auraEdgeFade:        0.0,
  auraPeakThreshold:   0.0,
  auraPeakBlur:        0,
  auraValleyEnabled:   false,
  auraValleyThreshold: 0.20,
  auraValleyColor:     '#0033cc',
  auraValleyOpacity:   0.6,
  auraValleyBlobSize:  1.5,
  auraValleyBlur:      0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Demo preset
// ─────────────────────────────────────────────────────────────────────────────

const DEMO_SETTINGS: Settings = {
  backgroundColor:     'black',
  canvasMask:          'square',
  shape:               'circle',
  textChar:            '★',
  objectMode:          'flat',
  peakColor:           '#ffffff',
  svgSize:             0.70,
  spacing:             0.50,
  opacity:             1.0,
  minScale:            0.02,
  maxScale:            0.90,
  rotationSpeed:       0.00,
  rotationDirection:   1,
  waveSpeed:           1.75,
  waveHeight:          1.00,
  gridSize:            80,
  drawDistance:        65,
  trailEnabled:        false,
  trailLength:         8,
  trailDecay:          0.30,
  trailPulseSpeed:     0.8,
  // Heatmap
  heatmapEnabled:      true,
  heatBlendMode:       'screen',
  heatPeakThreshold:   0.00,
  heatPeakColor:       '#ff00ec',
  heatPeakOpacity:     1.28,
  heatBlobSize:        3.00,
  heatEdgeFade:        0.40,
  heatPeakBlur:        0,
  heatValleyEnabled:   false,
  heatValleyThreshold: 0.20,
  heatValleyColor:     '#0055ff',
  heatValleyOpacity:   0.75,
  heatValleyBlobSize:  2.5,
  heatValleyBlur:      0,
  // Aura
  auraEnabled:         true,
  auraThemeIndex:      1,
  auraBlur:            35,
  auraLiquidity:       83,
  auraBlobSize:        1.70,
  auraOpacity:         1.5,
  auraDotsVisible:     true,
  auraBlendMode:       'hard-light',
  auraEdgeFade:        0.0,
  auraPeakThreshold:   0.00,
  auraPeakBlur:        0,
  auraValleyEnabled:   true,
  auraValleyThreshold: 0.20,
  auraValleyColor:     '#0062ca',
  auraValleyOpacity:   0.90,
  auraValleyBlobSize:  2.15,
  auraValleyBlur:      0,
};

const BG_CONFIGS: Record<BackgroundColor, {
  canvasBackground: string; fogColor: string; fogNear: number; fogFar: number;
}> = {
  black: { canvasBackground: '#000000', fogColor: '#000000', fogNear: 16, fogFar: 46 },
  white: { canvasBackground: '#ffffff', fogColor: '#ffffff', fogNear: 16, fogFar: 46 },
};

const HEIGHT_SCALE      = 1.1;
const HALFTONE_EXPONENT = 2.6;
const MAX_AMPLITUDE     = 4.0;
const MAX_GRID          = 96;

// ─────────────────────────────────────────────────────────────────────────────
// Seed LUT
// ─────────────────────────────────────────────────────────────────────────────

const SEED_LUT = new Float32Array(MAX_GRID * MAX_GRID);
for (let ix = 0; ix < MAX_GRID; ix++)
  for (let iz = 0; iz < MAX_GRID; iz++)
    SEED_LUT[ix * MAX_GRID + iz] = (ix * 7919 + iz * 6271) % (Math.PI * 2);

// ─────────────────────────────────────────────────────────────────────────────
// Wave
// ─────────────────────────────────────────────────────────────────────────────

function computeHeight(x: number, z: number, t: number, seed: number, ws: number, wh: number): number {
  const ts = t * ws;
  return (
    (Math.sin(x*0.3+ts*0.6) * Math.cos(z*0.3+ts*0.4) * 1.5 +
     Math.sin(x*0.15-ts*0.35+seed*0.1) +
     Math.cos(z*0.22+ts*0.5) +
     Math.sin((x+z)*0.1+ts*0.8) * 0.5) * wh
  );
}

function resolveOpacity(v: number): number {
  return Math.min(v, 1.5);
}

// ─────────────────────────────────────────────────────────────────────────────
// Geometry
// ─────────────────────────────────────────────────────────────────────────────

function createStarShape(or=0.5,ir=0.11): THREE.Shape {
  const s=new THREE.Shape();
  for(let i=0;i<=8;i++){const a=(i/8)*Math.PI*2-Math.PI/2,r=i%2===0?or:ir;i===0?s.moveTo(Math.cos(a)*r,Math.sin(a)*r):s.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
  s.closePath();return s;
}
function createCircleShape(r=0.42): THREE.Shape {
  const s=new THREE.Shape();
  for(let i=0;i<=32;i++){const a=(i/32)*Math.PI*2;i===0?s.moveTo(Math.cos(a)*r,Math.sin(a)*r):s.lineTo(Math.cos(a)*r,Math.sin(a)*r);}
  s.closePath();return s;
}
function createSquareShape(sz=0.38): THREE.Shape {
  const s=new THREE.Shape(),h=sz/2;
  s.moveTo(-h,-h);s.lineTo(h,-h);s.lineTo(h,h);s.lineTo(-h,h);s.closePath();return s;
}
function createTriangleShape(sz=0.48): THREE.Shape {
  const s=new THREE.Shape(),hh=sz*0.866;
  s.moveTo(0,(hh*2)/3);s.lineTo(sz/2,-hh/3);s.lineTo(-sz/2,-hh/3);s.closePath();return s;
}
function buildTextTexture(char: string): THREE.CanvasTexture {
  const sz=128,c=document.createElement('canvas');c.width=c.height=sz;
  const ctx=c.getContext('2d')!;ctx.fillStyle='#fff';ctx.font=`bold ${Math.round(sz*0.78)}px serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(char.charAt(0)||'★',sz/2,sz/2);
  return new THREE.CanvasTexture(c);
}
function buildGeometry(shape: ShapeType, mode: ObjectMode): THREE.BufferGeometry {
  if(mode==='sphere')return new THREE.SphereGeometry(0.28,12,12);
  if(shape==='text'){const g=new THREE.PlaneGeometry(0.72,0.72);g.rotateX(-Math.PI/2);return g;}
  let s: THREE.Shape;
  switch(shape){case 'circle':s=createCircleShape();break;case 'square':s=createSquareShape();break;case 'triangle':s=createTriangleShape();break;default:s=createStarShape();}
  const g=new THREE.ShapeGeometry(s,6);g.rotateX(-Math.PI/2);return g;
}
function buildMaterial(s: Settings, tex?: THREE.CanvasTexture): THREE.MeshStandardMaterial {
  const is3D=s.objectMode!=='flat';
  return new THREE.MeshStandardMaterial({
    color:s.peakColor,emissive:s.peakColor,emissiveIntensity:is3D?0.6:1.6,
    roughness:is3D?0.25:0.35,metalness:is3D?0.55:0.15,
    side:THREE.DoubleSide,transparent:true,opacity:s.opacity,depthWrite:false,
    ...(tex?{map:tex,alphaMap:tex,alphaTest:0.01}:{}),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Trail
// ─────────────────────────────────────────────────────────────────────────────

interface TrailSnapshot { px:number;py:number;pz:number;scale:number;ry:number; }

function TrailLayer({step,instances,geometry,settings,snapshotsRef,pulseRef}:{
  step:number;instances:{x:number;z:number;seed:number}[];
  geometry:THREE.BufferGeometry;settings:Settings;
  snapshotsRef:React.MutableRefObject<TrailSnapshot[][]>;pulseRef:React.MutableRefObject<number>;
}){
  const meshRef=useRef<THREE.InstancedMesh>(null);
  const dummy=useMemo(()=>new THREE.Object3D(),[]);
  const scratch=useMemo(()=>new THREE.Color(),[]);
  const material=useMemo(()=>new THREE.MeshStandardMaterial({
    color:settings.peakColor,emissive:settings.peakColor,emissiveIntensity:1.1,
    roughness:0.4,metalness:0.1,side:THREE.DoubleSide,transparent:true,opacity:0.8,depthWrite:false,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }),[settings.peakColor]);
  useFrame(()=>{
    const mesh=meshRef.current;if(!mesh)return;
    const n=settings.trailLength,sf=step/Math.max(n-1,1);
    const pulsed=settings.opacity*Math.pow(1-sf,1+settings.trailDecay*6)*(0.3+0.7*pulseRef.current);
    material.opacity=Math.max(0,Math.min(1,pulsed));
    material.color.set(settings.peakColor);material.emissive.set(settings.peakColor);
    for(let i=0;i<instances.length;i++){
      const snap=snapshotsRef.current[i]?.[step];
      if(!snap||snap.scale<0.001){dummy.scale.setScalar(0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);continue;}
      dummy.position.set(snap.px,snap.py,snap.pz);dummy.rotation.y=snap.ry;
      dummy.scale.setScalar(snap.scale*(1-sf*0.4));dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      if(mesh.instanceColor){scratch.set(settings.peakColor);mesh.setColorAt(i,scratch);}
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  });
  return <instancedMesh ref={meshRef} args={[geometry,material,instances.length]} frustumCulled={false}/>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Blob painter
// ─────────────────────────────────────────────────────────────────────────────

interface BlobPass {
  color:string; opacity:number; blobSize:number; threshold:number; mode:'peak'|'valley';
}

function paintBlobPass(
  ctx:CanvasRenderingContext2D,W:number,H:number,
  gs:number,sp:number,half:number,totalSize:number,t:number,
  waveSpeed:number,waveHeight:number,minScale:number,maxScale:number,
  pass:BlobPass,blobPx:number,isCir:boolean,
){
  const hexRaw=pass.color.replace('#','');
  const r=parseInt(hexRaw.slice(0,2),16)||0,g=parseInt(hexRaw.slice(2,4),16)||0,b=parseInt(hexRaw.slice(4,6),16)||0;
  const baseAl=Math.min(1.5,resolveOpacity(pass.opacity));
  ctx.globalCompositeOperation='source-over';
  for(let ix=0;ix<gs;ix++){
    for(let iz=0;iz<gs;iz++){
      const wx=ix*sp-half,wz=iz*sp-half;
      if(isCir&&wx*wx+wz*wz>half*half)continue;
      const seed=SEED_LUT[ix*MAX_GRID+iz];
      const h=computeHeight(wx,wz,t,seed,waveSpeed,waveHeight);
      const norm=Math.max(0,Math.min(1,(h+MAX_AMPLITUDE)/(2*MAX_AMPLITUDE)));
      const hs=minScale+(maxScale-minScale)*Math.pow(norm,HALFTONE_EXPONENT);
      let gs2:number;
      if(pass.mode==='peak'){const excess=hs-pass.threshold;if(excess<=0)continue;gs2=Math.pow(excess/Math.max(1-pass.threshold,0.001),1.4);}
      else{const deficit=pass.threshold-hs;if(deficit<=0)continue;gs2=Math.pow(deficit/Math.max(pass.threshold,0.001),1.4);}
      const cx=((wx+half)/totalSize)*W,cy=((wz+half)/totalSize)*H;
      const rad=blobPx*pass.blobSize*Math.max(0.15,Math.min(1.0,gs2));
      const al=Math.min(1,baseAl*Math.max(0,Math.min(1,gs2*2)));
      const grd=ctx.createRadialGradient(cx,cy,0,cx,cy,rad);
      grd.addColorStop(0,`rgba(${r},${g},${b},${al.toFixed(2)})`);
      grd.addColorStop(0.45,`rgba(${r},${g},${b},${(al*0.55).toFixed(2)})`);
      grd.addColorStop(1,`rgba(${r},${g},${b},0)`);
      ctx.fillStyle=grd;ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.fill();
    }
  }
}

function paintEdgeFade(ctx:CanvasRenderingContext2D,W:number,H:number,edgeFade:number){
  const bW=edgeFade*W*0.45,bH=edgeFade*H*0.45;
  if(bW<0.5)return;
  ctx.globalCompositeOperation='destination-out';
  const g1=ctx.createLinearGradient(0,0,0,bH);g1.addColorStop(0,'rgba(0,0,0,1)');g1.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g1;ctx.fillRect(0,0,W,bH);
  const g2=ctx.createLinearGradient(0,H,0,H-bH);g2.addColorStop(0,'rgba(0,0,0,1)');g2.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g2;ctx.fillRect(0,H-bH,W,bH);
  const g3=ctx.createLinearGradient(0,0,bW,0);g3.addColorStop(0,'rgba(0,0,0,1)');g3.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g3;ctx.fillRect(0,0,bW,H);
  const g4=ctx.createLinearGradient(W,0,W-bW,0);g4.addColorStop(0,'rgba(0,0,0,1)');g4.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g4;ctx.fillRect(W-bW,0,bW,H);
  ctx.globalCompositeOperation='source-over';
}

// ─────────────────────────────────────────────────────────────────────────────
// HeatmapLayer
// ─────────────────────────────────────────────────────────────────────────────

function HeatmapLayer({settings}:{settings:Settings}){
  const{canvas,texture}=useMemo(()=>{const c=document.createElement('canvas');c.width=c.height=256;return{canvas:c,texture:new THREE.CanvasTexture(c)};},[]);
  useEffect(()=>()=>texture.dispose(),[texture]);
  const totalSize=(settings.gridSize-1)*settings.spacing;
  const planeSize=totalSize*1.08;
  const threeBlend=useMemo(()=>cssBlendToThree(settings.heatBlendMode),[settings.heatBlendMode]);
  useFrame((state)=>{
    if(!settings.heatmapEnabled)return;
    const ctx=canvas.getContext('2d')!;
    const W=canvas.width,H=canvas.height;
    ctx.clearRect(0,0,W,H);
    const t=state.clock.getElapsedTime();
    const half=((settings.gridSize-1)*settings.spacing)/2;
    const blobPxBase=(settings.spacing*3.0/totalSize)*W;
    const isCir=false;
    if(settings.heatPeakBlur>0)ctx.filter=`blur(${settings.heatPeakBlur}px)`;
    paintBlobPass(ctx,W,H,settings.gridSize,settings.spacing,half,totalSize,t,
      settings.waveSpeed,settings.waveHeight,settings.minScale,settings.maxScale,
      {color:settings.heatPeakColor,opacity:settings.heatPeakOpacity,blobSize:settings.heatBlobSize,threshold:settings.heatPeakThreshold,mode:'peak'},
      blobPxBase,isCir);
    if(settings.heatPeakBlur>0)ctx.filter='none';
    if(settings.heatValleyEnabled){
      if(settings.heatValleyBlur>0)ctx.filter=`blur(${settings.heatValleyBlur}px)`;
      paintBlobPass(ctx,W,H,settings.gridSize,settings.spacing,half,totalSize,t,
        settings.waveSpeed,settings.waveHeight,settings.minScale,settings.maxScale,
        {color:settings.heatValleyColor,opacity:settings.heatValleyOpacity,blobSize:settings.heatValleyBlobSize,threshold:settings.heatValleyThreshold,mode:'valley'},
        blobPxBase,isCir);
      if(settings.heatValleyBlur>0)ctx.filter='none';
    }
    paintEdgeFade(ctx,W,H,settings.heatEdgeFade);
    texture.needsUpdate=true;
  });
  return(
    <mesh position={[0,-0.08,0]} rotation={[-Math.PI/2,0,0]} renderOrder={-1}>
      <planeGeometry args={[planeSize,planeSize]}/>
      <meshBasicMaterial map={texture} transparent depthWrite={false} blending={threeBlend} toneMapped={false}/>
    </mesh>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SparkleField
// ─────────────────────────────────────────────────────────────────────────────

interface InstanceDatum{x:number;z:number;seed:number;}

function SparkleField({settings}:{settings:Settings}){
  const meshRef=useRef<THREE.InstancedMesh>(null);
  const dummy=useMemo(()=>new THREE.Object3D(),[]);
  const scratchColor=useMemo(()=>new THREE.Color(),[]);
  const textTexture=useMemo(()=>{if(settings.shape==='text'&&settings.objectMode==='flat')return buildTextTexture(settings.textChar);return undefined;},[settings.shape,settings.objectMode,settings.textChar]);
  const geometry=useMemo(()=>buildGeometry(settings.shape,settings.objectMode),[settings.shape,settings.objectMode]);
  const material=useMemo(()=>buildMaterial(settings,textTexture),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings.peakColor,settings.objectMode,settings.opacity,textTexture]);
  const allInstances=useMemo<InstanceDatum[]>(()=>{
    const arr:InstanceDatum[]=[],half=((settings.gridSize-1)*settings.spacing)/2;
    for(let ix=0;ix<settings.gridSize;ix++)for(let iz=0;iz<settings.gridSize;iz++)arr.push({x:ix*settings.spacing-half,z:iz*settings.spacing-half,seed:Math.random()*Math.PI*2});
    return arr;
  },[settings.gridSize,settings.spacing]);
  const instances=useMemo<InstanceDatum[]>(()=>{
    if(settings.canvasMask==='square')return allInstances;
    const half=((settings.gridSize-1)*settings.spacing)/2;
    return allInstances.filter(({x,z})=>x*x+z*z<=half*half);
  },[allInstances,settings.canvasMask,settings.gridSize,settings.spacing]);
  const snapshotsRef=useRef<TrailSnapshot[][]>([]);
  const pulseRef=useRef(1.0);
  const lastSnapshotTime=useRef(0);
  useEffect(()=>{snapshotsRef.current=instances.map(()=>[]);},[instances,settings.trailLength]);
  useFrame((state)=>{
    const mesh=meshRef.current;if(!mesh)return;
    const t=state.clock.getElapsedTime();
    pulseRef.current=settings.trailEnabled&&settings.trailPulseSpeed>0?Math.sin(t*settings.trailPulseSpeed*Math.PI*2)*0.5+0.5:1.0;
    const doSnap=settings.trailEnabled&&t-lastSnapshotTime.current>0.04;if(doSnap)lastSnapshotTime.current=t;
    for(let i=0;i<instances.length;i++){
      const{x,z,seed}=instances[i];
      const h=computeHeight(x,z,t,seed,settings.waveSpeed,settings.waveHeight);
      const norm=Math.max(0,Math.min(1,(h+MAX_AMPLITUDE)/(2*MAX_AMPLITUDE)));
      const scale=(settings.minScale+(settings.maxScale-settings.minScale)*Math.pow(norm,HALFTONE_EXPONENT))*settings.svgSize;
      const py=h*HEIGHT_SCALE*0.4,ry=t*settings.rotationSpeed*settings.rotationDirection+seed;
      dummy.position.set(x,py,z);dummy.rotation.y=ry;dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
      if(mesh.instanceColor){scratchColor.set(settings.peakColor);mesh.setColorAt(i,scratchColor);}
      if(doSnap){const buf=snapshotsRef.current[i];buf.unshift({px:x,py,pz:z,scale,ry});if(buf.length>settings.trailLength)buf.length=settings.trailLength;}
    }
    mesh.instanceMatrix.needsUpdate=true;
    if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  });
  const trailSteps=useMemo(()=>settings.trailEnabled?Array.from({length:settings.trailLength},(_,i)=>i):[],[settings.trailEnabled,settings.trailLength]);
  const dotsVisible=!settings.auraEnabled||settings.auraDotsVisible;
  return(
    <>
      {settings.heatmapEnabled&&<HeatmapLayer settings={settings}/>}
      {trailSteps.slice().reverse().map((step)=>(
        <TrailLayer key={step} step={step} instances={instances} geometry={geometry} settings={settings} snapshotsRef={snapshotsRef} pulseRef={pulseRef}/>
      ))}
      <instancedMesh ref={meshRef} args={[geometry,material,instances.length]} frustumCulled={false} visible={dotsVisible}/>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SceneExporter
// ─────────────────────────────────────────────────────────────────────────────

function SceneExporter({stateRef}:{stateRef:React.MutableRefObject<SceneState|null>}){
  const projCopy=useRef(new THREE.Matrix4()),viewCopy=useRef(new THREE.Matrix4());
  useFrame(({camera,size,clock})=>{
    projCopy.current.copy(camera.projectionMatrix);viewCopy.current.copy(camera.matrixWorldInverse);
    stateRef.current={projMatrix:projCopy.current,viewMatrix:viewCopy.current,width:size.width,height:size.height,time:clock.getElapsedTime()};
  });
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// projectPoint
// ─────────────────────────────────────────────────────────────────────────────

const _proj:[number,number,boolean]=[0,0,false];
function projectPoint(wx:number,wy:number,wz:number,ve:number[],pe:number[],W:number,H:number):[number,number,boolean]{
  const vx=ve[0]*wx+ve[4]*wy+ve[8]*wz+ve[12],vy=ve[1]*wx+ve[5]*wy+ve[9]*wz+ve[13];
  const vz=ve[2]*wx+ve[6]*wy+ve[10]*wz+ve[14],vw=ve[3]*wx+ve[7]*wy+ve[11]*wz+ve[15];
  const cx=pe[0]*vx+pe[4]*vy+pe[8]*vz+pe[12]*vw,cy=pe[1]*vx+pe[5]*vy+pe[9]*vz+pe[13]*vw;
  const cw=pe[3]*vx+pe[7]*vy+pe[11]*vz+pe[15]*vw;
  if(cw<=0){_proj[2]=false;return _proj;}
  _proj[0]=((cx/cw)*0.5+0.5)*W;_proj[1]=(1-(cy/cw)*0.5-0.5)*H;_proj[2]=true;return _proj;
}

// ─────────────────────────────────────────────────────────────────────────────
// GooeyCanvas
// ─────────────────────────────────────────────────────────────────────────────

function GooeyCanvas({settings,sceneStateRef,gooMatrixRef}:{
  settings:Settings;sceneStateRef:React.MutableRefObject<SceneState|null>;
  gooMatrixRef:React.MutableRefObject<SVGFEColorMatrixElement|null>;
}){
  const containerRef=useRef<HTMLDivElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const sRef=useRef(settings);
  useEffect(()=>{sRef.current=settings;},[settings]);
  useEffect(()=>{
    const el=gooMatrixRef.current;if(!el)return;
    const bias=-8+(settings.auraLiquidity*(73/100)-50)*0.34;
    el.setAttribute('values',`1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 ${bias.toFixed(2)}`);
  },[settings.auraLiquidity,gooMatrixRef]);
  useEffect(()=>{
    const el=containerRef.current;if(!el)return;
    el.style.filter=settings.auraEnabled?`url(#aura-goo-filter) blur(${settings.auraBlur}px)`:'none';
    el.style.opacity=settings.auraEnabled?'1':'0';
    el.style.mixBlendMode=settings.auraBlendMode;
  },[settings.auraEnabled,settings.auraBlur,settings.auraBlendMode]);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    let rafId:number;
    let cachedTheme=-1,cachedOp=-1;
    const colCenter:string[]=[],colMid:string[]=[],colZero:string[]=[];
    function rebuildColorCache(theme:AuraTheme,opacity:number){
      const al=Math.min(1,resolveOpacity(opacity)*0.65),alM=al*0.5;
      colCenter.length=colMid.length=colZero.length=0;
      for(const c of theme.colors){colCenter.push(`rgba(${c},${al.toFixed(2)})`);colMid.push(`rgba(${c},${alM.toFixed(2)})`);colZero.push(`rgba(${c},0)`);}
    }
    function draw(){
      const s=sRef.current,scene=sceneStateRef.current;
      if(!s.auraEnabled||!scene){rafId=requestAnimationFrame(draw);return;}
      const{projMatrix,viewMatrix,width,height,time}=scene;
      const W=Math.round(width),H=Math.round(height);
      if(canvas.width!==W||canvas.height!==H){canvas.width=W;canvas.height=H;}
      const ctx=canvas.getContext('2d',{alpha:true})!;
      ctx.clearRect(0,0,W,H);
      const ve=viewMatrix.elements,pe=projMatrix.elements;
      const gs=s.gridSize,sp=s.spacing,half=((gs-1)*sp)/2;
      const theme=AURA_THEMES[s.auraThemeIndex%AURA_THEMES.length];
      const nc=theme.colors.length;
      if(s.auraThemeIndex!==cachedTheme||s.auraOpacity!==cachedOp){rebuildColorCache(theme,s.auraOpacity);cachedTheme=s.auraThemeIndex;cachedOp=s.auraOpacity;}
      const[ox0,,ok0]=projectPoint(0,0,0,ve,pe,W,H);
      const[tx0,ty0,ok1]=projectPoint(sp,0,0,ve,pe,W,H);
      const ox=ok0?ox0:0;
      const[,oy0b]=projectPoint(0,0,0,ve,pe,W,H);const oy=ok0?oy0b:0;
      const pxPerSp=(ok0&&ok1)?Math.sqrt((tx0-ox)**2+(ty0-oy)**2):H/gs;
      const baseBlobPx=pxPerSp*s.auraBlobSize*1.8*2.0;
      const isCir=s.canvasMask==='circle';
      ctx.globalCompositeOperation='lighter';
      type Bucket={sx:number;sy:number;r:number}[];
      const buckets:Bucket[]=Array.from({length:nc},()=>[]);
      for(let ix=0;ix<gs;ix+=2){
        for(let iz=0;iz<gs;iz+=2){
          const bOffX=0.5*sp,bOffZ=0.5*sp;
          const wx=ix*sp-half+bOffX,wz=iz*sp-half+bOffZ;
          if(isCir&&wx*wx+wz*wz>half*half)continue;
          const s00=SEED_LUT[ix*MAX_GRID+iz];
          const s10=SEED_LUT[Math.min(ix+1,gs-1)*MAX_GRID+iz];
          const s01=SEED_LUT[ix*MAX_GRID+Math.min(iz+1,gs-1)];
          const s11=SEED_LUT[Math.min(ix+1,gs-1)*MAX_GRID+Math.min(iz+1,gs-1)];
          const wx0=ix*sp-half,wz0=iz*sp-half,wx1=(ix+1)*sp-half,wz1=(iz+1)*sp-half;
          const h=(computeHeight(wx0,wz0,time,s00,s.waveSpeed,s.waveHeight)+computeHeight(wx1,wz0,time,s10,s.waveSpeed,s.waveHeight)+computeHeight(wx0,wz1,time,s01,s.waveSpeed,s.waveHeight)+computeHeight(wx1,wz1,time,s11,s.waveSpeed,s.waveHeight))*0.25;
          const norm=Math.max(0,Math.min(1,(h+MAX_AMPLITUDE)/(2*MAX_AMPLITUDE)));
          const scale=s.minScale+(s.maxScale-s.minScale)*Math.pow(norm,HALFTONE_EXPONENT);
          const excess=scale-s.auraPeakThreshold;if(excess<=0)continue;
          const wy=h*HEIGHT_SCALE*0.4;
          const[sx,sy,vis]=projectPoint(wx,wy,wz,ve,pe,W,H);if(!vis)continue;
          const r=baseBlobPx*scale;if(r<0.5)continue;
          if(sx+r<0||sx-r>W||sy+r<0||sy-r>H)continue;
          const bx=ix/2,bz=iz/2;
          const cIdx=Math.abs(((bx*73856093|0)^(bz*19349663|0))%nc);
          buckets[cIdx].push({sx,sy,r});
        }
      }
      if(s.auraPeakBlur>0)ctx.filter=`blur(${s.auraPeakBlur}px)`;
      for(let ci=0;ci<nc;ci++){
        const bucket=buckets[ci];if(!bucket.length)continue;
        for(const{sx,sy,r}of bucket){
          const grd=ctx.createRadialGradient(sx,sy,0,sx,sy,r);
          grd.addColorStop(0,colCenter[ci]);grd.addColorStop(0.45,colMid[ci]);grd.addColorStop(1,colZero[ci]);
          ctx.fillStyle=grd;ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();
        }
      }
      if(s.auraPeakBlur>0)ctx.filter='none';
      if(s.auraValleyEnabled){
        const vHex=s.auraValleyColor.replace('#','');
        const vr=parseInt(vHex.slice(0,2),16)||0,vg=parseInt(vHex.slice(2,4),16)||0,vb=parseInt(vHex.slice(4,6),16)||0;
        const vAl=Math.min(1,resolveOpacity(s.auraValleyOpacity)*0.65);
        const valleyBlobPx=pxPerSp*s.auraValleyBlobSize*1.8*2.0;
        if(s.auraValleyBlur>0)ctx.filter=`blur(${s.auraValleyBlur}px)`;
        for(let ix=0;ix<gs;ix+=2){
          for(let iz=0;iz<gs;iz+=2){
            const bOffX=0.5*sp,bOffZ=0.5*sp;
            const wx=ix*sp-half+bOffX,wz=iz*sp-half+bOffZ;
            if(isCir&&wx*wx+wz*wz>half*half)continue;
            const s00=SEED_LUT[ix*MAX_GRID+iz],s10=SEED_LUT[Math.min(ix+1,gs-1)*MAX_GRID+iz];
            const s01=SEED_LUT[ix*MAX_GRID+Math.min(iz+1,gs-1)],s11=SEED_LUT[Math.min(ix+1,gs-1)*MAX_GRID+Math.min(iz+1,gs-1)];
            const wx0=ix*sp-half,wz0=iz*sp-half,wx1=(ix+1)*sp-half,wz1=(iz+1)*sp-half;
            const h=(computeHeight(wx0,wz0,time,s00,s.waveSpeed,s.waveHeight)+computeHeight(wx1,wz0,time,s10,s.waveSpeed,s.waveHeight)+computeHeight(wx0,wz1,time,s01,s.waveSpeed,s.waveHeight)+computeHeight(wx1,wz1,time,s11,s.waveSpeed,s.waveHeight))*0.25;
            const norm=Math.max(0,Math.min(1,(h+MAX_AMPLITUDE)/(2*MAX_AMPLITUDE)));
            const scale=s.minScale+(s.maxScale-s.minScale)*Math.pow(norm,HALFTONE_EXPONENT);
            const deficit=s.auraValleyThreshold-scale;if(deficit<=0)continue;
            const gStr=Math.pow(deficit/Math.max(s.auraValleyThreshold,0.001),1.4);
            const wy=h*HEIGHT_SCALE*0.4;
            const[sx,sy,vis]=projectPoint(wx,wy,wz,ve,pe,W,H);if(!vis)continue;
            const r=valleyBlobPx*scale*1.2;if(r<0.5)continue;
            if(sx+r<0||sx-r>W||sy+r<0||sy-r>H)continue;
            const al=Math.min(1,vAl*Math.max(0,Math.min(1,gStr*2)));
            const grd=ctx.createRadialGradient(sx,sy,0,sx,sy,r);
            grd.addColorStop(0,`rgba(${vr},${vg},${vb},${al.toFixed(2)})`);
            grd.addColorStop(0.45,`rgba(${vr},${vg},${vb},${(al*0.55).toFixed(2)})`);
            grd.addColorStop(1,`rgba(${vr},${vg},${vb},0)`);
            ctx.fillStyle=grd;ctx.beginPath();ctx.arc(sx,sy,r,0,Math.PI*2);ctx.fill();
          }
        }
        if(s.auraValleyBlur>0)ctx.filter='none';
      }
      ctx.filter='none';
      if(s.auraEdgeFade>0.01){
        const bW=s.auraEdgeFade*W*0.45,bH=s.auraEdgeFade*H*0.45;
        ctx.globalCompositeOperation='destination-out';
        const g1=ctx.createLinearGradient(0,0,0,bH);g1.addColorStop(0,'rgba(0,0,0,1)');g1.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g1;ctx.fillRect(0,0,W,bH);
        const g2=ctx.createLinearGradient(0,H,0,H-bH);g2.addColorStop(0,'rgba(0,0,0,1)');g2.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g2;ctx.fillRect(0,H-bH,W,bH);
        const g3=ctx.createLinearGradient(0,0,bW,0);g3.addColorStop(0,'rgba(0,0,0,1)');g3.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g3;ctx.fillRect(0,0,bW,H);
        const g4=ctx.createLinearGradient(W,0,W-bW,0);g4.addColorStop(0,'rgba(0,0,0,1)');g4.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g4;ctx.fillRect(W-bW,0,bW,H);
      }
      ctx.globalCompositeOperation='source-over';
      rafId=requestAnimationFrame(draw);
    }
    rafId=requestAnimationFrame(draw);
    return()=>cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);
  return(
    <div ref={containerRef} style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:5,
      filter:settings.auraEnabled?`url(#aura-goo-filter) blur(${settings.auraBlur}px)`:'none',
      opacity:settings.auraEnabled?1:0,
      mixBlendMode:settings.auraBlendMode as React.CSSProperties['mixBlendMode'],
      transition:'opacity 0.3s ease'}}>
      <canvas ref={canvasRef} style={{position:'absolute',top:0,left:0,width:'100%',height:'100%'}}/>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FogUpdater
// ─────────────────────────────────────────────────────────────────────────────

function FogUpdater({fogColor,drawDistance}:{fogColor:string;drawDistance:number}){
  useFrame(({scene})=>{const fog=scene.fog as THREE.Fog|null;if(!fog)return;fog.color.set(fogColor);fog.near=drawDistance*0.35;fog.far=drawDistance;});
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UI helpers
// ─────────────────────────────────────────────────────────────────────────────

const ACCENT    = '#ff17d6';
const C_BASE    = 'rgba(100,255,180,0.9)';
const C_BASE_BG = 'rgba(100,255,180,0.06)';
const C_EFFECT  = 'rgba(180,130,255,0.9)';
const C_EFF_BG  = 'rgba(180,130,255,0.06)';

const panelStyle: React.CSSProperties = {
  position:'absolute',top:16,right:16,width:290,
  maxHeight:'calc(100vh - 32px)',
  background:'rgba(8,3,20,0.93)',backdropFilter:'blur(14px)',
  border:'1px solid rgba(255,255,255,0.07)',borderRadius:16,
  color:'#fff',fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,sans-serif",
  fontSize:12,userSelect:'none',boxSizing:'border-box',zIndex:100,
};

const scrollBodyStyle: React.CSSProperties = {
  overflowY:'auto',overflowX:'hidden',
  maxHeight:'calc(100vh - 32px - 52px)',
  padding:'0 16px 16px',
  scrollbarWidth:'none',
  WebkitOverflowScrolling:'touch',
};

const sliderStyle:React.CSSProperties={width:'100%',accentColor:ACCENT,cursor:'pointer',margin:'2px 0'};
const valueTagStyle:React.CSSProperties={display:'inline-block',background:'rgba(255,23,214,0.13)',border:'1px solid rgba(255,23,214,0.28)',borderRadius:4,padding:'1px 6px',fontSize:11,color:'#ff9ef4',minWidth:38,textAlign:'center'};
function hintRow():React.CSSProperties{return{display:'flex',justifyContent:'space-between',color:'rgba(255,255,255,0.22)',fontSize:10,marginTop:1};}

function SubLabel({children,color}:{children:React.ReactNode;color?:string}){
  return<div style={{fontSize:10,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:color||'rgba(255,255,255,0.45)',marginBottom:5}}>{children}</div>;
}
function GroupHeading({children}:{children:React.ReactNode}){
  return(
    <div style={{fontSize:9,fontWeight:800,letterSpacing:'0.18em',textTransform:'uppercase',color:'rgba(255,255,255,0.28)',margin:'12px 2px 6px',display:'flex',alignItems:'center',gap:8}}>
      <span style={{flex:1,height:1,background:'rgba(255,255,255,0.1)',display:'inline-block'}}/>
      {children}
      <span style={{flex:1,height:1,background:'rgba(255,255,255,0.1)',display:'inline-block'}}/>
    </div>
  );
}

function OpacitySlider({label,value,onChange}:{label:string;value:number;onChange:(v:number)=>void}){
  const pct=Math.round(value*100);
  return(
    <div style={{marginBottom:8}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontSize:10,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'rgba(255,255,255,0.55)'}}>{label}</span>
        <span style={valueTagStyle}>{pct}%</span>
      </div>
      <input type="range" min={0} max={1.5} step={0.01} value={value} onChange={(e)=>onChange(parseFloat(e.target.value))} style={sliderStyle}/>
      <div style={hintRow()}><span>Subtle</span><span>150% vivid</span></div>
    </div>
  );
}

function SliderRow({label,value,min,max,step,format,onChange,hints}:{
  label:string;value:number;min:number;max:number;step:number;
  format?:(v:number)=>string;onChange:(v:number)=>void;hints?:[string,string];
}){
  const display=format?format(value):value.toFixed(step<0.1?2:0);
  return(
    <div style={{marginBottom:8}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
        <span style={{fontSize:10,fontWeight:600,letterSpacing:'0.08em',textTransform:'uppercase',color:'rgba(255,255,255,0.55)'}}>{label}</span>
        <span style={valueTagStyle}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e)=>onChange(parseFloat(e.target.value))} style={sliderStyle}/>
      {hints&&<div style={hintRow()}><span>{hints[0]}</span><span>{hints[1]}</span></div>}
    </div>
  );
}

function Toggle({value,onChange,labelOn='On',labelOff='Off'}:{value:boolean;onChange:(v:boolean)=>void;labelOn?:string;labelOff?:string}){
  return(
    <button onClick={()=>onChange(!value)} style={{padding:'5px 12px',borderRadius:7,
      border:value?'1px solid rgba(255,23,214,0.6)':'1px solid rgba(255,255,255,0.09)',
      background:value?'rgba(255,23,214,0.18)':'rgba(255,255,255,0.04)',
      color:value?'#ff9ef4':'rgba(255,255,255,0.45)',
      cursor:'pointer',fontSize:11,fontWeight:600,transition:'all 0.15s',whiteSpace:'nowrap'}}>
      {value?`● ${labelOn}`:`○ ${labelOff}`}
    </button>
  );
}

function SegmentedRow({options,value,onChange}:{options:{key:string;label:string;icon?:string}[];value:string;onChange:(k:string)=>void}){
  return(
    <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
      {options.map(({key,label,icon})=>(
        <button key={key} onClick={()=>onChange(key)} style={{flex:1,minWidth:40,padding:'5px 4px',borderRadius:7,
          border:value===key?'1px solid rgba(255,23,214,0.6)':'1px solid rgba(255,255,255,0.09)',
          background:value===key?'rgba(255,23,214,0.18)':'rgba(255,255,255,0.04)',
          color:value===key?'#ff9ef4':'rgba(255,255,255,0.45)',
          cursor:'pointer',fontSize:11,fontWeight:500,transition:'all 0.15s',textAlign:'center' as const}}>
          {icon&&<div style={{fontSize:12,marginBottom:1}}>{icon}</div>}
          <div>{label}</div>
        </button>))}
    </div>
  );
}

function ColorRow({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
  return(
    <div style={{marginBottom:6}}>
      <SubLabel>{label}</SubLabel>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <input type="color" value={value} onChange={(e)=>onChange(e.target.value)}
          style={{width:34,height:30,border:'none',borderRadius:6,cursor:'pointer',background:'none',padding:1,flexShrink:0}}/>
        <input type="text" value={value}
          onChange={(e)=>{if(/^#[0-9a-fA-F]{0,6}$/.test(e.target.value))onChange(e.target.value);}}
          style={{flex:1,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.09)',borderRadius:6,padding:'4px 9px',color:'#fff',fontSize:12,fontFamily:'monospace'}}/>
      </div>
    </div>
  );
}

function BlendPicker({value,onChange}:{value:BlendMode;onChange:(v:BlendMode)=>void}){
  return(
    <div>
      <SubLabel>Blend Mode</SubLabel>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:4}}>
        {BLEND_OPTIONS.map(({key,label})=>(
          <button key={key} onClick={()=>onChange(key)} style={{
            padding:'4px 3px',borderRadius:6,fontSize:9.5,fontWeight:500,cursor:'pointer',transition:'all 0.15s',textAlign:'center' as const,
            border:value===key?'1px solid rgba(255,23,214,0.6)':'1px solid rgba(255,255,255,0.09)',
            background:value===key?'rgba(255,23,214,0.18)':'rgba(255,255,255,0.04)',
            color:value===key?'#ff9ef4':'rgba(255,255,255,0.45)',
          }}>{label}</button>))}
      </div>
    </div>
  );
}

function CollapsibleSection({title,color,headerBg,badge,children}:{
  title:string;color:string;headerBg:string;badge?:React.ReactNode;children:React.ReactNode;
}){
  const[open,setOpen]=useState(false);
  return(
    <div style={{marginBottom:5,borderRadius:10,border:'1px solid rgba(255,255,255,0.07)',overflow:'hidden'}}>
      <div onClick={()=>setOpen(o=>!o)} style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'9px 12px',cursor:'pointer',
        background:open?headerBg.replace('0.06','0.10'):headerBg,transition:'background 0.15s'}}>
        <span style={{fontSize:11,fontWeight:700,letterSpacing:'0.09em',textTransform:'uppercase',color}}>
          {open?'▾':'▸'}&nbsp;{title}
        </span>
        {badge&&<span onClick={(e)=>e.stopPropagation()}>{badge}</span>}
      </div>
      {open&&<div style={{padding:'10px 12px 12px',borderTop:'1px solid rgba(255,255,255,0.05)'}}>{children}</div>}
    </div>
  );
}

function PeakPanel({threshold,onThreshold,color,onColor,opacity,onOpacity,blobSize,onBlobSize,blur,onBlur}:{
  threshold:number;onThreshold:(v:number)=>void;
  color?:string;onColor?:(v:string)=>void;
  opacity:number;onOpacity:(v:number)=>void;
  blobSize:number;onBlobSize:(v:number)=>void;
  blur:number;onBlur:(v:number)=>void;
}){
  return(
    <div style={{marginTop:10,padding:'10px',borderRadius:8,border:`1px solid ${C_EFF_BG}`,background:C_EFF_BG}}>
      <div style={{marginBottom:10}}><SubLabel color={C_EFFECT}>Peak Glow</SubLabel></div>
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        <SliderRow label="Peak Threshold" value={threshold} min={0} max={1} step={0.01}
          format={(v)=>v.toFixed(2)} onChange={onThreshold} hints={['All cells','Only peaks']}/>
        {color!==undefined&&onColor&&<ColorRow label="Peak Color" value={color} onChange={onColor}/>}
        <OpacitySlider label="Glow Opacity" value={opacity} onChange={onOpacity}/>
        <SliderRow label="Blob Size" value={blobSize} min={0.1} max={4.0} step={0.05}
          format={(v)=>`${v.toFixed(2)}×`} onChange={onBlobSize} hints={['Pinpoint','Massive']}/>
        <SliderRow label="Blur" value={blur} min={0} max={40} step={0.5}
          format={(v)=>v===0?'Off':`${v.toFixed(1)}px`} onChange={onBlur} hints={['Sharp','Diffused']}/>
      </div>
    </div>
  );
}

function ValleyPanel({enabled,onEnable,threshold,onThreshold,color,onColor,opacity,onOpacity,blobSize,onBlobSize,blur,onBlur}:{
  enabled:boolean;onEnable:(v:boolean)=>void;
  threshold:number;onThreshold:(v:number)=>void;
  color:string;onColor:(v:string)=>void;
  opacity:number;onOpacity:(v:number)=>void;
  blobSize:number;onBlobSize:(v:number)=>void;
  blur:number;onBlur:(v:number)=>void;
}){
  return(
    <div style={{marginTop:10,padding:'10px',borderRadius:8,border:`1px solid ${C_EFF_BG}`,background:C_EFF_BG}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:enabled?10:0}}>
        <SubLabel color={C_EFFECT}>Valley Glow</SubLabel>
        <Toggle value={enabled} onChange={onEnable} labelOn="On" labelOff="Off"/>
      </div>
      {enabled&&(
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          <SliderRow label="Valley Threshold" value={threshold} min={0.01} max={0.9} step={0.01}
            format={(v)=>v.toFixed(2)} onChange={onThreshold} hints={['Near-zero','Mid-range']}/>
          <ColorRow label="Valley Color" value={color} onChange={onColor}/>
          <OpacitySlider label="Glow Opacity" value={opacity} onChange={onOpacity}/>
          <SliderRow label="Blob Size" value={blobSize} min={0.1} max={4.0} step={0.05}
            format={(v)=>`${v.toFixed(2)}×`} onChange={onBlobSize} hints={['Pinpoint','Massive']}/>
          <SliderRow label="Blur" value={blur} min={0} max={40} step={0.5}
            format={(v)=>v===0?'Off':`${v.toFixed(1)}px`} onChange={onBlur} hints={['Sharp','Diffused']}/>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Control Panel
// ─────────────────────────────────────────────────────────────────────────────

function ControlPanel({settings,onChange,onReset}:{
  settings:Settings;onChange:(p:Partial<Settings>)=>void;onReset:()=>void;
}){
  const[minimized,setMinimized]=useState(false);
  const[demoActive,setDemoActive]=useState(false);
  const prevSettingsRef=useRef<Settings|null>(null);

  const handleDemoToggle=useCallback(()=>{
    if(!demoActive){prevSettingsRef.current={...settings};onChange(DEMO_SETTINGS);setDemoActive(true);}
    else{if(prevSettingsRef.current)onChange(prevSettingsRef.current);setDemoActive(false);}
  },[demoActive,settings,onChange]);

  const bgOptions=[{key:'black',label:'Black',icon:'⬛'},{key:'white',label:'White',icon:'⬜'}] as {key:BackgroundColor;label:string;icon:string}[];
  const maskOptions=[{key:'square',label:'Square',icon:'⬜'},{key:'circle',label:'Circle',icon:'⬤'}];
  const shapeOptions=[
    {key:'star',label:'Star',icon:'✦'},{key:'circle',label:'Circle',icon:'●'},
    {key:'square',label:'Square',icon:'■'},{key:'triangle',label:'Triangle',icon:'▲'},
    {key:'text',label:'Text',icon:'A'},
  ];
  const modeOptions=[{key:'flat',label:'2D Flat',icon:'◈'},{key:'sphere',label:'3D Sphere',icon:'⬤'}];
  const colorSwatches=[
    {hex:'#ffffff',label:'White'},{hex:'#000000',label:'Black'},
    {hex:'#ff17d6',label:'Magenta'},{hex:'#00e5ff',label:'Cyan'},
    {hex:'#ff6a00',label:'Orange'},{hex:'#ffe600',label:'Yellow'},
    {hex:'#00ff9f',label:'Green'},{hex:'#ff2244',label:'Red'},
  ];

  return(
    <div style={panelStyle} onWheel={(e)=>e.stopPropagation()}>

      {/* ── Header ── */}
      <div style={{
        display:'flex',alignItems:'center',justifyContent:'space-between',
        padding:'12px 16px 10px',
        borderBottom:minimized?'none':'1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{fontSize:13,fontWeight:700,letterSpacing:'0.12em',textTransform:'uppercase',color:'#ff9ef4',flex:1}}>
          ✦ Pellitone
        </div>
        <button onClick={handleDemoToggle} style={{
          padding:'4px 10px',borderRadius:7,fontSize:10,fontWeight:700,
          letterSpacing:'0.06em',cursor:'pointer',transition:'all 0.15s',
          marginRight:6,whiteSpace:'nowrap',
          border:demoActive?'1px solid rgba(100,220,255,0.7)':'1px solid rgba(255,255,255,0.15)',
          background:demoActive?'rgba(0,180,255,0.22)':'rgba(255,255,255,0.06)',
          color:demoActive?'#64dcff':'rgba(255,255,255,0.55)',
        }}>
          {demoActive?'✦ Exit Demo':'▶ Demo'}
        </button>
        <button onClick={()=>setMinimized(m=>!m)} title={minimized?'Expand panel':'Collapse panel'} style={{
          width:26,height:26,borderRadius:6,border:'1px solid rgba(255,255,255,0.12)',
          background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.55)',
          cursor:'pointer',fontSize:13,display:'flex',alignItems:'center',justifyContent:'center',
          transition:'all 0.15s',flexShrink:0,
        }}>
          {minimized?'□':'─'}
        </button>
      </div>

      {/* ── Scrollable body ── */}
      {!minimized&&(
        <div style={scrollBodyStyle}>
          <div style={{paddingTop:10}}>

            <GroupHeading>Background</GroupHeading>
            <div style={{marginBottom:6}}>
              <SegmentedRow options={bgOptions} value={settings.backgroundColor} onChange={(k)=>onChange({backgroundColor:k as BackgroundColor})}/>
            </div>

            <GroupHeading>Base Layer</GroupHeading>

            <CollapsibleSection title="Halftone Pattern" color={C_BASE} headerBg={C_BASE_BG}>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div><SubLabel>Canvas Shape</SubLabel><SegmentedRow options={maskOptions} value={settings.canvasMask} onChange={(k)=>onChange({canvasMask:k as CanvasMask})}/></div>
                <div><SubLabel>Render Mode</SubLabel><SegmentedRow options={modeOptions} value={settings.objectMode} onChange={(k)=>onChange({objectMode:k as ObjectMode})}/></div>
                {settings.objectMode==='flat'&&(
                  <div><SubLabel>Shape</SubLabel><SegmentedRow options={shapeOptions} value={settings.shape} onChange={(k)=>onChange({shape:k as ShapeType})}/>
                    {settings.shape==='text'&&(<div style={{marginTop:8}}><SubLabel>Character</SubLabel>
                      <input type="text" maxLength={2} value={settings.textChar} onChange={(e)=>onChange({textChar:e.target.value.slice(-1)||'★'})}
                        style={{width:'100%',background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,23,214,0.35)',borderRadius:8,padding:'6px 12px',color:'#ff9ef4',fontSize:22,textAlign:'center',fontFamily:'serif',boxSizing:'border-box',outline:'none'}}/></div>)}
                  </div>)}
                <div><SubLabel>Shape Color</SubLabel>
                  <div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:6}}>
                    {colorSwatches.map(({hex,label})=>(<button key={hex} title={label} onClick={()=>onChange({peakColor:hex})} style={{width:24,height:24,borderRadius:5,background:hex,padding:0,flexShrink:0,cursor:'pointer',border:settings.peakColor===hex?'2px solid #ff9ef4':'1px solid rgba(255,255,255,0.18)'}}/>))}
                  </div>
                  <ColorRow label="Custom Color" value={settings.peakColor} onChange={(v)=>onChange({peakColor:v})}/>
                </div>
                <SliderRow label="Opacity" value={settings.opacity} min={0.05} max={1} step={0.01} format={(v)=>`${Math.round(v*100)}%`} onChange={(v)=>onChange({opacity:v})} hints={['Ghost','Solid']}/>
                <SliderRow label="Shape Size" value={settings.svgSize} min={0.1} max={3.0} step={0.05} format={(v)=>v.toFixed(2)} onChange={(v)=>onChange({svgSize:v})} hints={['Tiny','Large']}/>
                <div><SubLabel>Size Range</SubLabel>
                  <SliderRow label="Min Scale" value={settings.minScale} min={0} max={1} step={0.01} format={(v)=>v.toFixed(2)} onChange={(v)=>onChange({minScale:Math.min(v,settings.maxScale)})} hints={['Invisible','Larger']}/>
                  <SliderRow label="Max Scale" value={settings.maxScale} min={0} max={2} step={0.01} format={(v)=>v.toFixed(2)} onChange={(v)=>onChange({maxScale:Math.max(v,settings.minScale)})} hints={['Smaller','Huge']}/>
                </div>
                <SliderRow label="Spacing" value={settings.spacing} min={0.15} max={1.5} step={0.01} format={(v)=>v.toFixed(2)} onChange={(v)=>onChange({spacing:v})} hints={['Tight','Loose']}/>
                <SliderRow label="Rotation Speed" value={settings.rotationSpeed} min={0} max={3.0} step={0.05} format={(v)=>v.toFixed(2)} onChange={(v)=>onChange({rotationSpeed:v})} hints={['Stopped','Fast']}/>
                <div><SubLabel>Rotation Direction</SubLabel>
                  <div style={{display:'flex',gap:5}}>
                    {[{val:1,label:'↻ Clockwise'},{val:-1,label:'↺ Counter'}].map(({val,label})=>(
                      <button key={val} onClick={()=>onChange({rotationDirection:val as 1|-1})} style={{flex:1,padding:'5px 8px',borderRadius:7,fontSize:11,fontWeight:500,cursor:'pointer',transition:'all 0.15s',
                        border:settings.rotationDirection===val?'1px solid rgba(255,23,214,0.6)':'1px solid rgba(255,255,255,0.09)',
                        background:settings.rotationDirection===val?'rgba(255,23,214,0.18)':'rgba(255,255,255,0.04)',
                        color:settings.rotationDirection===val?'#ff9ef4':'rgba(255,255,255,0.45)'}}>{label}</button>))}
                  </div>
                </div>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Halftone Trails" color={C_BASE} headerBg={C_BASE_BG}
              badge={<Toggle value={settings.trailEnabled} onChange={(v)=>onChange({trailEnabled:v})} labelOn="On" labelOff="Off"/>}>
              <div style={{opacity:settings.trailEnabled?1:0.4,pointerEvents:settings.trailEnabled?'auto':'none',display:'flex',flexDirection:'column',gap:10}}>
                <SliderRow label="Trail Length" value={settings.trailLength} min={1} max={24} step={1} format={(v)=>String(Math.round(v))} onChange={(v)=>onChange({trailLength:Math.round(v)})} hints={['1 ghost','24 ghosts']}/>
                <SliderRow label="Trail Decay" value={settings.trailDecay} min={0} max={1} step={0.01} format={(v)=>v.toFixed(2)} onChange={(v)=>onChange({trailDecay:v})} hints={['Long smear','Sharp comet']}/>
                <SliderRow label="Pulse Speed" value={settings.trailPulseSpeed} min={0} max={4.0} step={0.1} format={(v)=>v===0?'Off':`${v.toFixed(1)} Hz`} onChange={(v)=>onChange({trailPulseSpeed:v})} hints={['Always on','Fast pulse']}/>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Wave Modifiers" color={C_BASE} headerBg={C_BASE_BG}>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <SliderRow label="Wave Speed" value={settings.waveSpeed} min={0} max={5.0} step={0.05} format={(v)=>v.toFixed(2)} onChange={(v)=>onChange({waveSpeed:v})} hints={['Frozen','Frantic']}/>
                <SliderRow label="Wave Height" value={settings.waveHeight} min={0} max={4.0} step={0.05} format={(v)=>v.toFixed(2)} onChange={(v)=>onChange({waveHeight:v})} hints={['Flat','Towering']}/>
                <SliderRow label="Grid Size" value={settings.gridSize} min={8} max={96} step={4} format={(v)=>`${Math.round(v)}×${Math.round(v)}`} onChange={(v)=>onChange({gridSize:Math.round(v)})} hints={['8×8 sparse','96×96 dense']}/>
                <SliderRow label="Draw Distance" value={settings.drawDistance} min={10} max={150} step={1} format={(v)=>String(Math.round(v))} onChange={(v)=>onChange({drawDistance:Math.round(v)})} hints={['Close','Far']}/>
              </div>
            </CollapsibleSection>

            <GroupHeading>Effect Layers</GroupHeading>

            <CollapsibleSection title="Aura" color={C_EFFECT} headerBg={C_EFF_BG}
              badge={<Toggle value={settings.auraEnabled} onChange={(v)=>onChange({auraEnabled:v})} labelOn="On" labelOff="Off"/>}>
              <div style={{opacity:settings.auraEnabled?1:0.4,pointerEvents:settings.auraEnabled?'auto':'none',display:'flex',flexDirection:'column',gap:10}}>
                <div><SubLabel>Theme</SubLabel>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
                    {AURA_THEMES.map((theme,i)=>(
                      <button key={i} title={theme.name} onClick={()=>onChange({auraThemeIndex:i})} style={{
                        height:32,borderRadius:7,cursor:'pointer',
                        border:settings.auraThemeIndex===i?'2px solid #64dcff':'1px solid rgba(255,255,255,0.12)',
                        background:`linear-gradient(135deg,rgb(${theme.colors[0]}),rgb(${theme.colors[2]}),rgb(${theme.colors[4]??theme.colors[0]}))`,
                        padding:0,fontSize:8,color:'rgba(255,255,255,0.8)',fontWeight:600,overflow:'hidden',transition:'border-color 0.15s',
                      }}>{theme.name}</button>))}
                  </div>
                </div>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                  <span style={{fontSize:11,color:'rgba(255,255,255,0.6)'}}>Show halftone dots</span>
                  <Toggle value={settings.auraDotsVisible} onChange={(v)=>onChange({auraDotsVisible:v})} labelOn="Visible" labelOff="Hidden"/>
                </div>
                <SliderRow label="Blur" value={settings.auraBlur} min={0} max={80} step={1} format={(v)=>`${Math.round(v)}px`} onChange={(v)=>onChange({auraBlur:v})} hints={['Sharp / gooey','Ultra soft']}/>
                <SliderRow label="Liquidity" value={settings.auraLiquidity} min={0} max={100} step={1} format={(v)=>String(Math.round(v))} onChange={(v)=>onChange({auraLiquidity:v})} hints={['Loose blobs','Hard merge']}/>
                <SliderRow label="Edge Fade" value={settings.auraEdgeFade} min={0} max={1} step={0.01} format={(v)=>v===0?'Off':`${Math.round(v*100)}%`} onChange={(v)=>onChange({auraEdgeFade:v})} hints={['None','Super soft']}/>
                <BlendPicker value={settings.auraBlendMode} onChange={(v)=>onChange({auraBlendMode:v as BlendMode})}/>
                <PeakPanel
                  threshold={settings.auraPeakThreshold} onThreshold={(v)=>onChange({auraPeakThreshold:v})}
                  opacity={settings.auraOpacity} onOpacity={(v)=>onChange({auraOpacity:v})}
                  blobSize={settings.auraBlobSize} onBlobSize={(v)=>onChange({auraBlobSize:v})}
                  blur={settings.auraPeakBlur} onBlur={(v)=>onChange({auraPeakBlur:v})}/>
                <ValleyPanel
                  enabled={settings.auraValleyEnabled} onEnable={(v)=>onChange({auraValleyEnabled:v})}
                  threshold={settings.auraValleyThreshold} onThreshold={(v)=>onChange({auraValleyThreshold:v})}
                  color={settings.auraValleyColor} onColor={(v)=>onChange({auraValleyColor:v})}
                  opacity={settings.auraValleyOpacity} onOpacity={(v)=>onChange({auraValleyOpacity:v})}
                  blobSize={settings.auraValleyBlobSize} onBlobSize={(v)=>onChange({auraValleyBlobSize:v})}
                  blur={settings.auraValleyBlur} onBlur={(v)=>onChange({auraValleyBlur:v})}/>
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Heatmap" color={C_EFFECT} headerBg={C_EFF_BG}
              badge={<Toggle value={settings.heatmapEnabled} onChange={(v)=>onChange({heatmapEnabled:v})} labelOn="On" labelOff="Off"/>}>
              <div style={{opacity:settings.heatmapEnabled?1:0.4,pointerEvents:settings.heatmapEnabled?'auto':'none',display:'flex',flexDirection:'column',gap:10}}>
                <SliderRow label="Edge Fade" value={settings.heatEdgeFade} min={0} max={1} step={0.01} format={(v)=>v===0?'Hard':v>=0.95?'Soft':`${Math.round(v*100)}%`} onChange={(v)=>onChange({heatEdgeFade:v})} hints={['Hard edge','Super soft']}/>
                <BlendPicker value={settings.heatBlendMode} onChange={(v)=>onChange({heatBlendMode:v as BlendMode})}/>
                <PeakPanel
                  threshold={settings.heatPeakThreshold} onThreshold={(v)=>onChange({heatPeakThreshold:v})}
                  color={settings.heatPeakColor} onColor={(v)=>onChange({heatPeakColor:v})}
                  opacity={settings.heatPeakOpacity} onOpacity={(v)=>onChange({heatPeakOpacity:v})}
                  blobSize={settings.heatBlobSize} onBlobSize={(v)=>onChange({heatBlobSize:v})}
                  blur={settings.heatPeakBlur} onBlur={(v)=>onChange({heatPeakBlur:v})}/>
                <ValleyPanel
                  enabled={settings.heatValleyEnabled} onEnable={(v)=>onChange({heatValleyEnabled:v})}
                  threshold={settings.heatValleyThreshold} onThreshold={(v)=>onChange({heatValleyThreshold:v})}
                  color={settings.heatValleyColor} onColor={(v)=>onChange({heatValleyColor:v})}
                  opacity={settings.heatValleyOpacity} onOpacity={(v)=>onChange({heatValleyOpacity:v})}
                  blobSize={settings.heatValleyBlobSize} onBlobSize={(v)=>onChange({heatValleyBlobSize:v})}
                  blur={settings.heatValleyBlur} onBlur={(v)=>onChange({heatValleyBlur:v})}/>
              </div>
            </CollapsibleSection>

            <button onClick={onReset}
              onMouseEnter={(e)=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,23,214,0.24)';}}
              onMouseLeave={(e)=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,23,214,0.1)';}}
              style={{width:'100%',marginTop:8,padding:'9px',borderRadius:9,border:'1px solid rgba(255,23,214,0.4)',background:'rgba(255,23,214,0.1)',color:'#ff9ef4',cursor:'pointer',fontSize:12,fontWeight:700,letterSpacing:'0.07em',transition:'all 0.15s'}}>
              ↺ Reset to Defaults
            </button>

          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Scene root
// ─────────────────────────────────────────────────────────────────────────────

export default function PellitoneScene() {
  const[settings,setSettings]=useState<Settings>({...DEFAULT_SETTINGS});
  const handleChange=useCallback((patch:Partial<Settings>)=>setSettings(p=>({...p,...patch})),[]);
  const handleReset=useCallback(()=>setSettings({...DEFAULT_SETTINGS}),[]);
  const bgCfg=BG_CONFIGS[settings.backgroundColor];
  const sceneStateRef=useRef<SceneState|null>(null);
  const gooMatrixRef=useRef<SVGFEColorMatrixElement|null>(null);

  return(
    <div style={{position:'fixed',inset:0,background:bgCfg.canvasBackground,overflow:'hidden'}}>
      <svg style={{position:'absolute',width:0,height:0,overflow:'hidden'}}>
        <defs>
          <filter id="aura-goo-filter" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="6" result="blur"/>
            <feColorMatrix ref={gooMatrixRef} in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -8" result="goo"/>
            <feBlend in="SourceGraphic" in2="goo"/>
          </filter>
        </defs>
      </svg>

      <Canvas style={{width:'100%',height:'100%',display:'block'}} dpr={[1,1.5]}
        gl={{antialias:true,powerPreference:'high-performance'}}
        camera={{position:[0,52,3],fov:45,near:0.1,far:settings.drawDistance+10}}>
        <fog attach="fog" args={[bgCfg.fogColor,settings.drawDistance*0.35,settings.drawDistance]}/>
        <FogUpdater fogColor={bgCfg.fogColor} drawDistance={settings.drawDistance}/>
        <ambientLight intensity={0.55}/>
        <pointLight position={[10,12,10]} intensity={220} color="#ff2fd6" distance={60}/>
        <pointLight position={[-12,8,-10]} intensity={140} color="#7a3bff" distance={60}/>
        <pointLight position={[0,6,-18]} intensity={90} color="#00e5ff" distance={50}/>
        <SceneExporter stateRef={sceneStateRef}/>
        <SparkleField settings={settings}/>
        <OrbitControls enableDamping dampingFactor={0.08} rotateSpeed={0.6} zoomSpeed={0.8} panSpeed={0.6}
          minDistance={6} maxDistance={90} minPolarAngle={0} maxPolarAngle={Math.PI/2-0.02} target={[0,0,0]}/>
      </Canvas>

      <GooeyCanvas settings={settings} sceneStateRef={sceneStateRef} gooMatrixRef={gooMatrixRef}/>
      <ControlPanel settings={settings} onChange={handleChange} onReset={handleReset}/>

      <div style={{position:'absolute',bottom:18,left:24,color:'rgba(255,255,255,0.28)',fontFamily:"'Inter',-apple-system,sans-serif",fontSize:11,letterSpacing:'0.08em',textTransform:'uppercase',pointerEvents:'none'}}>
        Drag to rotate · Scroll to zoom · Right-click to pan
      </div>
    </div>
  );
}
