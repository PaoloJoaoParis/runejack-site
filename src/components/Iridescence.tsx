"use client";

import { useEffect, useRef } from "react";

// Fond irisé animé en WebGL, inspiré du fond « Iridescence » de React Bits.
// Rendu à demi-résolution pour rester léger ; une seule image fixe si l'utilisateur limite les animations.

const VERTEX = `
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float;
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uResolution;
uniform vec2 uMouse;
varying vec2 vUv;
void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / mr;
  uv += (uMouse - vec2(0.5)) * 0.12;
  float d = -uTime * 0.5;
  float a = 0.0;
  for (float i = 0.0; i < 8.0; ++i) {
    a += cos(i - d - a * uv.x);
    d += sin(uv.y * i + a);
  }
  d += uTime * 0.5;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.6 + 0.4, cos(a + d) * 0.5 + 0.5);
  col = cos(col * cos(vec3(d, a, 2.5)) * 0.5 + 0.5) * uColor;
  gl_FragColor = vec4(col, 1.0);
}`;

// Teinte prune et or, multipliée par le motif irisé
const COLOR: [number, number, number] = [0.62, 0.42, 0.7];
const SPEED = 0.18;
const RESOLUTION_SCALE = 0.5;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

export default function Iridescence() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false });
    if (!canvas || !gl) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT));
    gl.linkProgram(program);
    gl.useProgram(program);

    // Un triangle qui couvre tout l'écran
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(program, "uTime");
    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uMouse = gl.getUniformLocation(program, "uMouse");
    gl.uniform3f(gl.getUniformLocation(program, "uColor"), ...COLOR);

    const mouse = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };

    function resize() {
      canvas!.width = Math.floor(window.innerWidth * RESOLUTION_SCALE);
      canvas!.height = Math.floor(window.innerHeight * RESOLUTION_SCALE);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.uniform3f(uResolution, canvas!.width, canvas!.height, canvas!.width / canvas!.height);
    }

    function onMove(event: PointerEvent) {
      mouse.targetX = event.clientX / window.innerWidth;
      mouse.targetY = 1 - event.clientY / window.innerHeight;
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();

    function draw(now: number) {
      mouse.x += (mouse.targetX - mouse.x) * 0.04;
      mouse.y += (mouse.targetY - mouse.y) * 0.04;
      gl!.uniform1f(uTime, ((now - start) / 1000) * SPEED + 4);
      gl!.uniform2f(uMouse, mouse.x, mouse.y);
      gl!.drawArrays(gl!.TRIANGLES, 0, 3);
      if (!reduceMotion) frame = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove);
    frame = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <canvas ref={canvasRef} className="h-full w-full opacity-60" />
      {/* Voile sombre : le motif reste un reflet, le texte reste lisible */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(12,6,16,0.35),rgba(12,6,16,0.88)_65%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,transparent,rgba(12,6,16,0.9))]" />
    </div>
  );
}
