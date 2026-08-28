import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, RoundedBox, Text, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { useTheme } from '../../context/ThemeContext';

/**
 * Procedural corrugated cardboard box built entirely with Three.js geometry.
 * Features: Realistic kraft-paper color, corrugated edge detail,
 * branded logo, floating animation, mouse interaction, and face-click specs.
 */

/* ── Inner 3D Box Mesh ── */
function CorrugatedBox({ onFaceClick }) {
  const meshRef = useRef();
  const groupRef = useRef();
  const { viewport } = useThree();
  const [hovered, setHovered] = useState(false);

  // Cardboard-like material with procedural texture
  const cardboardMaterial = useMemo(() => {
    // Create a canvas-based texture for cardboard grain
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base kraft paper color
    ctx.fillStyle = '#c4956a';
    ctx.fillRect(0, 0, 512, 512);

    // Add fiber grain
    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const len = Math.random() * 8 + 2;
      ctx.strokeStyle = `rgba(${139 + Math.random() * 40}, ${98 + Math.random() * 30}, ${57 + Math.random() * 30}, ${Math.random() * 0.15})`;
      ctx.lineWidth = Math.random() * 0.8;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + len, y + (Math.random() - 0.5) * 3);
      ctx.stroke();
    }

    // Add subtle noise
    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillStyle = `rgba(${Math.random() > 0.5 ? 180 : 120}, ${Math.random() > 0.5 ? 130 : 80}, ${Math.random() > 0.5 ? 80 : 50}, ${Math.random() * 0.05})`;
      ctx.fillRect(x, y, 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);

    return new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.85,
      metalness: 0.02,
      color: '#c4956a',
    });
  }, []);

  // Corrugated edge material (darker)
  const edgeMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#a67c52',
      roughness: 0.9,
      metalness: 0.0,
    });
  }, []);

  // Floating + rotation animation
  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.getElapsedTime();
      groupRef.current.rotation.y = t * 0.15;
      groupRef.current.position.y = Math.sin(t * 0.8) * 0.08;

      // Scale on hover
      const targetScale = hovered ? 1.05 : 1;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      );
    }
  });

  // Box dimensions: width, height, depth
  const w = 2.2;
  const h = 1.6;
  const d = 1.8;

  // Face click handler — determines which face was clicked
  const handleClick = (e) => {
    e.stopPropagation();
    if (!e.face) return;

    const normal = e.face.normal;
    let face = 'front';
    if (Math.abs(normal.x) > 0.5) face = normal.x > 0 ? 'right' : 'left';
    else if (Math.abs(normal.y) > 0.5) face = normal.y > 0 ? 'top' : 'bottom';
    else face = normal.z > 0 ? 'front' : 'back';

    onFaceClick?.(face);
  };

  return (
    <group ref={groupRef}>
      {/* Main box body */}
      <RoundedBox
        ref={meshRef}
        args={[w, h, d]}
        radius={0.04}
        smoothness={4}
        material={cardboardMaterial}
        castShadow
        receiveShadow
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />

      {/* Corrugated edge strips (visible on top edges) */}
      {[
        [0, h / 2 + 0.02, d / 2, w, 0.04, 0.04], // front-top edge
        [0, h / 2 + 0.02, -d / 2, w, 0.04, 0.04], // back-top edge
        [w / 2, h / 2 + 0.02, 0, 0.04, 0.04, d],  // right-top edge
        [-w / 2, h / 2 + 0.02, 0, 0.04, 0.04, d],  // left-top edge
      ].map((params, i) => (
        <mesh
          key={`edge-${i}`}
          position={[params[0], params[1], params[2]]}
          material={edgeMaterial}
        >
          <boxGeometry args={[params[3], params[4], params[5]]} />
        </mesh>
      ))}

      {/* Corrugated wave pattern on front face */}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh
          key={`wave-${i}`}
          position={[
            -w / 2 + 0.3 + i * (w / 9),
            0,
            d / 2 + 0.005,
          ]}
          material={edgeMaterial}
        >
          <boxGeometry args={[0.015, h * 0.7, 0.01]} />
        </mesh>
      ))}

      {/* Brand text on front */}
      <Text
        position={[0, 0.15, d / 2 + 0.02]}
        fontSize={0.16}
        color="#7a5a3a"
        anchorX="center"
        anchorY="middle"
        font={undefined}
        maxWidth={w * 0.8}
        fontWeight={700}
      >
        SRIVARI PACKERS
      </Text>

      {/* Small tagline */}
      <Text
        position={[0, -0.1, d / 2 + 0.02]}
        fontSize={0.07}
        color="#8b6c4f"
        anchorX="center"
        anchorY="middle"
        font={undefined}
        maxWidth={w * 0.8}
      >
        PREMIUM PACKAGING
      </Text>

      {/* Tape strip on top */}
      <mesh position={[0, h / 2 + 0.04, 0]}>
        <boxGeometry args={[0.25, 0.02, d * 0.6]} />
        <meshStandardMaterial color="#b89a6a" roughness={0.6} metalness={0.1} transparent opacity={0.8} />
      </mesh>
    </group>
  );
}

/* ── Scene Setup ── */
function Scene({ onFaceClick }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={isDark ? 0.4 : 0.6} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={isDark ? 0.8 : 1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight
        position={[-3, 3, -3]}
        intensity={isDark ? 0.3 : 0.4}
        color={isDark ? '#6C4DF6' : '#ffffff'}
      />
      <pointLight
        position={[3, -2, 4]}
        intensity={0.2}
        color={isDark ? '#4F8CFF' : '#ffffff'}
      />

      {/* Environment for reflections */}
      <Environment preset={isDark ? 'night' : 'apartment'} />

      {/* The box */}
      <CorrugatedBox onFaceClick={onFaceClick} />

      {/* Shadow plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
        <planeGeometry args={[10, 10]} />
        <shadowMaterial opacity={isDark ? 0.3 : 0.15} />
      </mesh>

      {/* Orbit controls */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate={false}
        maxPolarAngle={Math.PI / 1.8}
        minPolarAngle={Math.PI / 4}
        dampingFactor={0.05}
        enableDamping
      />
    </>
  );
}

/* ── Spec Tooltip ── */
function SpecTooltip({ face, onClose }) {
  const specs = {
    front: { title: 'Front Panel', bf: '22 BF', gsm: '180 GSM', ply: '5-Ply' },
    back: { title: 'Back Panel', bf: '22 BF', gsm: '180 GSM', ply: '5-Ply' },
    left: { title: 'Left Panel', bf: '20 BF', gsm: '150 GSM', ply: '3-Ply' },
    right: { title: 'Right Panel', bf: '20 BF', gsm: '150 GSM', ply: '3-Ply' },
    top: { title: 'Top Flap', bf: '18 BF', gsm: '150 GSM', ply: '3-Ply' },
    bottom: { title: 'Bottom Panel', bf: '24 BF', gsm: '200 GSM', ply: '7-Ply' },
  };

  const spec = specs[face] || specs.front;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--lp-bg-glass-strong)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--lp-border)',
        borderRadius: 'var(--lp-radius-md)',
        padding: '16px 24px',
        zIndex: 10,
        minWidth: 200,
        textAlign: 'center',
        animation: 'lp-fade-in 0.3s ease',
      }}
      onClick={(e) => { e.stopPropagation(); onClose(); }}
    >
      <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: 8, color: 'var(--lp-text)' }}>
        📐 {spec.title}
      </div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: '0.8rem', color: 'var(--lp-text-secondary)' }}>
        <span>{spec.bf}</span>
        <span>•</span>
        <span>{spec.gsm}</span>
        <span>•</span>
        <span>{spec.ply}</span>
      </div>
      <style>{`
        @keyframes lp-fade-in {
          from { opacity: 0; transform: translateX(-50%) translateY(10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ── Main Exported Component ── */
export default function HeroBox3D() {
  const [clickedFace, setClickedFace] = useState(null);

  return (
    <div className="lp-hero-3d-container">
      <Canvas
        shadows
        camera={{ position: [3.5, 2.5, 3.5], fov: 35 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <Scene onFaceClick={(face) => setClickedFace(face)} />
      </Canvas>

      {/* Face spec tooltip */}
      {clickedFace && (
        <SpecTooltip face={clickedFace} onClose={() => setClickedFace(null)} />
      )}

      {/* Instruction hint */}
      <div
        style={{
          position: 'absolute',
          bottom: clickedFace ? 90 : 8,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.7rem',
          color: 'var(--lp-text-muted)',
          whiteSpace: 'nowrap',
          opacity: 0.7,
          transition: 'all 0.3s',
        }}
      >
        🖱️ Drag to rotate • Click face for specs
      </div>
    </div>
  );
}
