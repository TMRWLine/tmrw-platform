import React, { useEffect, useRef } from 'react';

interface ObsidianWipeProps {
  progress: number;
}

/**
 * WebGL grain field that lifts the canvas from architectural white into obsidian
 * as the syndicate section claims the viewport.
 */
export const ObsidianWipe: React.FC<ObsidianWipeProps> = ({ progress }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true });
    if (!gl) return;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    gl.shaderSource(
      vs,
      'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }',
    );
    gl.shaderSource(
      fs,
      [
        'precision mediump float;',
        'uniform float uP;',
        'uniform vec2 uR;',
        'void main(){',
        '  vec2 uv = gl_FragCoord.xy / uR;',
        '  float n = fract(sin(dot(uv * 740.0, vec2(12.9898, 78.233))) * 43758.5453);',
        '  float veil = smoothstep(0.08, 0.92, uP);',
        '  float grain = mix(0.96, 1.04, n);',
        '  vec3 white = vec3(1.0);',
        '  vec3 obsidian = vec3(0.039);',
        '  vec3 colour = mix(white, obsidian, veil) * grain;',
        '  gl_FragColor = vec4(colour, veil * 0.88);',
        '}',
      ].join('\n'),
    );
    gl.compileShader(vs);
    gl.compileShader(fs);
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uP = gl.getUniformLocation(program, 'uP');
    const uR = gl.getUniformLocation(program, 'uR');

    const draw = (value: number) => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform1f(uP, value);
      gl.uniform2f(uR, width, height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    draw(progress);
    (canvas as HTMLCanvasElement & { __draw?: (value: number) => void }).__draw = draw;

    return () => {
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current as (HTMLCanvasElement & { __draw?: (value: number) => void }) | null;
    canvas?.__draw?.(progress);
  }, [progress]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] h-full w-full"
      style={{ opacity: progress > 0.02 ? 1 : 0 }}
    />
  );
};

export default ObsidianWipe;
