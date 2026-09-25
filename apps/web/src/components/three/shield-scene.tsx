"use client";

import { useRef, useMemo, useState, useEffect, Component, ReactNode } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}

class CanvasErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    return this.state.hasError ? null : this.props.children;
  }
}

function ShieldMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const reducedMotion = useReducedMotion();

  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.8);
    shape.bezierCurveTo(0.6, 1.8, 1.2, 1.5, 1.4, 1.2);
    shape.lineTo(1.4, 0.2);
    shape.bezierCurveTo(1.4, -0.8, 0, -1.8, 0, -1.8);
    shape.bezierCurveTo(0, -1.8, -1.4, -0.8, -1.4, 0.2);
    shape.lineTo(-1.4, 1.2);
    shape.bezierCurveTo(-1.2, 1.5, -0.6, 1.8, 0, 1.8);

    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.3,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 3,
    });
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current || reducedMotion) return;
    meshRef.current.rotation.y += delta * 0.3;
    meshRef.current.position.y = Math.sin(Date.now() * 0.0005) * 0.1;
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial color="#4F46E5" metalness={0.3} roughness={0.6} />
    </mesh>
  );
}

interface ShieldSceneProps {
  size?: "large" | "small";
}

export function ShieldScene({ size = "large" }: ShieldSceneProps) {
  return (
    <div
      aria-hidden="true"
      style={{ width: "100%", height: size === "large" ? "100%" : 200 }}
    >
      <CanvasErrorBoundary>
        <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
          <ambientLight intensity={0.4} />
          <directionalLight position={[5, 5, 5]} intensity={0.8} />
          <ShieldMesh />
        </Canvas>
      </CanvasErrorBoundary>
    </div>
  );
}
