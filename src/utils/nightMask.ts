import maplibregl from 'maplibre-gl'

function getSunPosition(date: Date): { lng: number; lat: number } {
  const JD = date.getTime() / 86400000 + 2440587.5
  const n = JD - 2451545.0
  const L = (280.46 + 0.9856474 * n) % 360
  const g = ((357.528 + 0.9856003 * n) % 360) * Math.PI / 180
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * Math.PI / 180
  const epsilon = 23.439 * Math.PI / 180
  const lat = Math.asin(Math.sin(epsilon) * Math.sin(lambda)) * 180 / Math.PI
  const ra = Math.atan2(Math.cos(epsilon) * Math.sin(lambda), Math.cos(lambda)) * 180 / Math.PI
  const GMST = (280.46061837 + 360.98564736629 * n) % 360
  const lng = ((ra - GMST) % 360 + 540) % 360 - 180
  return { lng, lat }
}

const VERT = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

const FRAG = `
precision highp float;
uniform vec2 u_sun;
uniform mat4 u_matrix_inv;
uniform vec2 u_viewport;

void main() {
  vec2 ndc = (gl_FragCoord.xy / u_viewport) * 2.0 - 1.0;

  vec4 near = u_matrix_inv * vec4(ndc, -1.0, 1.0);
  vec4 far  = u_matrix_inv * vec4(ndc,  1.0, 1.0);
  near /= near.w;
  far  /= far.w;
  vec3 dir = normalize(far.xyz - near.xyz);

  float a = dot(dir, dir);
  float b = 2.0 * dot(near.xyz, dir);
  float c = dot(near.xyz, near.xyz) - 1.0;
  float disc = b * b - 4.0 * a * c;
  if (disc < 0.0) { gl_FragColor = vec4(0.0); return; }

  float t = (-b - sqrt(disc)) / (2.0 * a);
  if (t < 0.0) t = (-b + sqrt(disc)) / (2.0 * a);
  if (t < 0.0) { gl_FragColor = vec4(0.0); return; }
  vec3 hit = normalize(near.xyz + t * dir);

  float lat = asin(clamp(hit.y, -1.0, 1.0));
  float lng = atan(hit.x, hit.z);

  float sinA = sin(lat)*sin(u_sun.y) + cos(lat)*cos(u_sun.y)*cos(lng - u_sun.x);
  float angle = acos(clamp(sinA, -1.0, 1.0));

  float half_pi = 3.14159265 / 2.0;
  float band = radians(12.0);
  float nightFactor = smoothstep(half_pi - band, half_pi + band, angle);

  // 确保非零alpha，防止图层被跳过
  gl_FragColor = vec4(0.0, 0.0, 0.0, max(nightFactor * 0.8, 0.001));
}
`

export function createNightLayer(map: maplibregl.Map): maplibregl.CustomLayerInterface {
  let prog: WebGLProgram | null = null
  let buf: WebGLBuffer | null = null
  let gl: WebGL2RenderingContext | WebGLRenderingContext | null = null

  return {
    id: 'night-overlay',
    type: 'custom',
    renderingMode: '2d',

    onAdd(_map, _gl) {
      gl = _gl
      const vs = _gl.createShader(_gl.VERTEX_SHADER)!
      _gl.shaderSource(vs, VERT)
      _gl.compileShader(vs)
      const fs = _gl.createShader(_gl.FRAGMENT_SHADER)!
      _gl.shaderSource(fs, FRAG)
      _gl.compileShader(fs)
      prog = _gl.createProgram()!
      _gl.attachShader(prog, vs)
      _gl.attachShader(prog, fs)
      _gl.linkProgram(prog)

      buf = _gl.createBuffer()
      _gl.bindBuffer(_gl.ARRAY_BUFFER, buf)
      _gl.bufferData(_gl.ARRAY_BUFFER, new Float32Array([
        -1, -1,  1, -1,  -1,  1,
         1, -1,  1,  1,  -1,  1
      ]), _gl.STATIC_DRAW)
    },

    render(_gl2, args) {
      if (!prog || !buf || !gl) return
      const sun = getSunPosition(new Date())
      const matrix = args.defaultProjectionData.mainMatrix
      if (!matrix) return
      const inv = invertMat4([...matrix] as number[])
      if (!inv) return

      gl.useProgram(prog)
      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.disable(gl.DEPTH_TEST)

      const posLoc = gl.getAttribLocation(prog, 'a_pos')
      gl.bindBuffer(gl.ARRAY_BUFFER, buf)
      gl.enableVertexAttribArray(posLoc)
      gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0)

      const canvas = map.getCanvas()
      gl.uniform2f(gl.getUniformLocation(prog, 'u_viewport'), canvas.width, canvas.height)
      gl.uniform2f(gl.getUniformLocation(prog, 'u_sun'), sun.lng * Math.PI / 180, sun.lat * Math.PI / 180)
      gl.uniformMatrix4fv(gl.getUniformLocation(prog, 'u_matrix_inv'), false, inv)

      gl.drawArrays(gl.TRIANGLES, 0, 6)
      gl.disableVertexAttribArray(posLoc)
      gl.disable(gl.BLEND)
      gl.enable(gl.DEPTH_TEST)
    }
  }
}

function invertMat4(m: number[]): number[] | null {
  const out = new Array(16)
  const [a00,a01,a02,a03,a10,a11,a12,a13,a20,a21,a22,a23,a30,a31,a32,a33] = m
  const b00=a00*a11-a01*a10, b01=a00*a12-a02*a10, b02=a00*a13-a03*a10
  const b03=a01*a12-a02*a11, b04=a01*a13-a03*a11, b05=a02*a13-a03*a12
  const b06=a20*a31-a21*a30, b07=a20*a32-a22*a30, b08=a20*a33-a23*a30
  const b09=a21*a32-a22*a31, b10=a21*a33-a23*a31, b11=a22*a33-a23*a32
  let det=b00*b11-b01*b10+b02*b09+b03*b08-b04*b07+b05*b06
  if (!det) return null
  det = 1.0 / det
  out[0]=(a11*b11-a12*b10+a13*b09)*det; out[1]=(a02*b10-a01*b11-a03*b09)*det
  out[2]=(a31*b05-a32*b04+a33*b03)*det; out[3]=(a22*b04-a21*b05-a23*b03)*det
  out[4]=(a12*b08-a10*b11-a13*b07)*det; out[5]=(a00*b11-a02*b08+a03*b07)*det
  out[6]=(a32*b02-a30*b05-a33*b01)*det; out[7]=(a20*b05-a22*b02+a23*b01)*det
  out[8]=(a10*b10-a11*b08+a13*b06)*det; out[9]=(a01*b08-a00*b10-a03*b06)*det
  out[10]=(a30*b04-a31*b02+a33*b00)*det; out[11]=(a21*b02-a20*b04-a23*b00)*det
  out[12]=(a11*b07-a10*b09-a12*b06)*det; out[13]=(a00*b09-a01*b07+a02*b06)*det
  out[14]=(a31*b01-a30*b03-a32*b00)*det; out[15]=(a20*b03-a21*b01+a22*b00)*det
  return out
}
