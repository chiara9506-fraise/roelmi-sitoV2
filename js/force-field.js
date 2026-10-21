/* ==========================================================================
   Force Field — reticolo di esagoni luminoso (sfondo decorativo)
   Adattato da "Force Field" di Canvas UI (David Haz, canvasui.dev),
   libreria pubblica da copiare. Rispetto all'originale React:
   - JavaScript semplice, niente React
   - solo lo sfondo: niente cattura del contenuto (funzione sperimentale dei
     browser), quindi niente deformazione del testo; restano reticolo,
     alone del cursore, celle che si accendono, scintille, onde al clic, bloom
   - Stop animation / reduced-motion: un fotogramma fermo, niente onde
   - cursore "morbido": l'alone lo segue con un leggero ritardo e sfuma
     quando il mouse esce, invece di sparire di colpo
   Uso: <canvas class="force-field" data-force-field aria-hidden="true"> dentro
   un contenitore posizionato; il contenitore riceve mouse e clic.
   Senza WebGL2 il canvas resta vuoto (si vede il fondo della sezione).
   ========================================================================== */

(function () {
  'use strict';

  var MAX_HITS = 10;
  var MIPS = 4;

  var DEFAULTS = {
    color: [0.15, 0.68, 1],
    opacity: 0.9,
    cellScale: 16,
    lineWidth: 0.03,
    gridOpacity: 0.15,
    gridReveal: 'click',       // always | hover | click | both
    gridRevealStrength: 1.5,
    gridRevealRadius: 250,
    gridFade: 0.35,
    flashSpeed: 0.6,
    flashIntensity: 0.1,
    flowScale: 3,
    flowSpeed: 0.5,
    flowIntensity: 0,
    edgeGlow: 0.2,
    edgeFalloff: 0.18,
    rippleSpeed: 0.5,
    rippleWidth: 0.045,
    rippleBlend: 1,
    rippleDuration: 1.6,
    rippleIntensity: 0.1,
    rippleMaxRadius: 0.85,
    impactRadius: 0.16,
    refraction: 30,
    hoverGlow: 0.25,
    hoverRadius: 350,
    hoverCharge: 1.6,
    bloom: 1,
    bloomThreshold: 0.3,
    grain: 0.2,
    smoothing: 0.08            // 1 = cursore immediato; più basso = più morbido
  };

  var REVEAL_INDEX = { always: 0, hover: 1, click: 2, both: 3 };

  var VERT = '#version 300 es\n' +
    'precision highp float;\n' +
    'layout(location = 0) in vec2 aPos;\n' +
    'out vec2 vUv;\n' +
    'void main () { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }';

  // Shader del campo (dall'originale, senza le parti sul contenuto catturato)
  var FIELD_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
layout(location = 0) out vec4 outColor;
layout(location = 1) out vec4 outEmission;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform float uOpacity;
uniform float uCellScale;
uniform float uLineWidth;
uniform float uGridOpacity;
uniform float uGridRevealMode;
uniform float uGridRevealStrength;
uniform float uGridRevealRadius;
uniform float uGridFade;
uniform float uFlashSpeed;
uniform float uFlashIntensity;
uniform float uFlowScale;
uniform float uFlowSpeed;
uniform float uFlowIntensity;
uniform float uEdgeGlow;
uniform float uEdgeFalloff;
uniform vec2 uHitPos[10];
uniform float uHitTime[10];
uniform float uRippleSpeed;
uniform float uRippleWidth;
uniform float uRippleDuration;
uniform float uRippleIntensity;
uniform float uRippleMaxRadius;
uniform float uImpactRadius;
uniform float uRippleBlend;
uniform float uRefraction;
uniform vec2 uMouse;
uniform float uHoverGlow;
uniform float uHoverRadius;
uniform float uHoverCharge;
uniform float uHoverAmt;

vec3 mod289v3(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289v4(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289v4(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289v3(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

float hash21(vec2 p){
  p = fract(p * vec2(234.34, 435.345));
  p += dot(p, p + 34.23);
  return fract(p.x * p.y);
}

vec4 hexCell(vec2 p){
  const vec2 s = vec2(1.0, 1.7320508);
  vec4 hC = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
  vec4 h = vec4(p - hC.xy * s, p - (hC.zw + 0.5) * s);
  bool first = dot(h.xy, h.xy) < dot(h.zw, h.zw);
  vec2 local = first ? h.xy : h.zw;
  vec2 id = first ? hC.xy : hC.zw + 0.5;
  vec2 cell = abs(local);
  float d = max(dot(cell, s * 0.5), cell.x);
  return vec4(d, 0.5, id);
}

float cellFlash(vec2 id){
  float rnd = hash21(id);
  float phase = rnd * 6.2831;
  float speed = 0.5 + rnd * 1.5;
  return smoothstep(0.6, 1.0, sin(uTime * uFlashSpeed * speed + phase)) * uFlashIntensity;
}

void main(){
  vec2 frag = vUv * uResolution;
  float minAxis = min(uResolution.x, uResolution.y);
  vec2 st = frag / minAxis;

  float ringContrib = 0.0;
  float impactBoost = 0.0;
  vec2 pushVec = vec2(0.0);
  float sigma = uRippleWidth * mix(0.6, 2.6, uRippleBlend);
  for (int i = 0; i < 10; i++) {
    float ht = uHitTime[i];
    float elapsed = uTime - ht;
    float isActive = step(0.0, ht) * step(0.0, elapsed) * step(elapsed, uRippleDuration);
    if (isActive < 0.5) continue;
    vec2 toHit = (frag - uHitPos[i]) / minAxis;
    float dist = length(toHit);
    float ringR = min(elapsed * uRippleSpeed, uRippleMaxRadius);
    float noiseD = snoise(vec3(st * 5.0, elapsed * 2.0 + float(i))) * 0.03 * (1.0 - uRippleBlend * 0.7);
    float band = dist + noiseD - ringR;
    float g = exp(-band * band / (2.0 * sigma * sigma));
    float fade = 1.0 - smoothstep(uRippleDuration * 0.4, uRippleDuration, elapsed);
    fade *= fade;
    float radialFade = 1.0 - smoothstep(uRippleMaxRadius * 0.75, uRippleMaxRadius, ringR);
    float contrib = g * fade * radialFade;
    ringContrib += contrib;
    float zone = smoothstep(uImpactRadius, 0.0, dist);
    float zoneFade = 1.0 - smoothstep(0.0, uRippleDuration * 0.35, elapsed);
    impactBoost += zone * zoneFade;
    vec2 dir = dist > 0.0001 ? toHit / dist : vec2(0.0);
    float core = smoothstep(0.0, sigma * 2.5, dist) * smoothstep(0.0, sigma * 1.5, ringR);
    pushVec += dir * g * fade * radialFade * core;
  }
  ringContrib = min(ringContrib, 1.5);
  impactBoost = min(impactBoost, 1.0);

  vec2 fieldSt = st - pushVec * (uRefraction * 1.4 / minAxis);
  vec4 info = hexCell(fieldSt * uCellScale);
  float line = smoothstep(info.y - uLineWidth, info.y, info.x);
  vec2 cellId = info.zw;
  float flash = cellFlash(cellId);

  float flowNoise = 0.0;
  if (uFlowIntensity > 0.001) {
    float t = uTime * uFlowSpeed;
    float fn1 = snoise(vec3(st * uFlowScale, t * 0.5));
    float fn2 = snoise(vec3(st * uFlowScale * 2.1 + 7.3, -t * 0.35));
    flowNoise = (fn1 * 0.6 + fn2 * 0.4) * 0.5 + 0.5;
  }

  vec2 bp = min(frag, uResolution - frag) / minAxis;
  float rr = max(uEdgeFalloff, 0.02);
  float hmix = clamp(0.5 + 0.5 * (bp.y - bp.x) / rr, 0.0, 1.0);
  float edgeDist = mix(bp.y, bp.x, hmix) - rr * hmix * (1.0 - hmix);
  float fresnel = pow(1.0 - smoothstep(0.0, uEdgeFalloff, edgeDist), 1.6) * uEdgeGlow;

  vec2 mouseSt = uMouse / minAxis;
  float mouseD = distance(frag, uMouse);
  float hover = exp(-mouseD * mouseD / (uHoverRadius * uHoverRadius * 0.5)) * uHoverGlow;
  vec2 hoverCell = hexCell(mouseSt * uCellScale).zw;
  float sameCell = 1.0 - step(0.5, distance(hoverCell, cellId));
  float charge = sameCell * uHoverCharge * uHoverAmt;
  hover *= uHoverAmt;

  float revealHover = (uGridRevealMode == 1.0 || uGridRevealMode == 3.0) ? 1.0 : 0.0;
  float revealClick = (uGridRevealMode == 2.0 || uGridRevealMode == 3.0) ? 1.0 : 0.0;
  float allowHover = max(revealHover, uGridRevealMode == 0.0 ? 1.0 : 0.0);
  charge *= allowHover;
  float hoverMask = (1.0 - smoothstep(uGridRevealRadius * (1.0 - uGridFade), uGridRevealRadius, mouseD)) * uHoverAmt;
  float gridBoost = (revealHover * hoverMask + revealClick * impactBoost) * uGridRevealStrength;

  float gridEnergy = line * (uGridOpacity + gridBoost + charge + flash + ringContrib * uRippleIntensity * 5.0);
  float energy = gridEnergy * (0.35 + fresnel * 0.4)
    + fresnel * 0.5
    + flash * 0.5
    + flowNoise * uFlowIntensity * (0.12 + fresnel * 0.25 + line * 0.15)
    + hover * (0.25 + line * 0.75 * allowHover)
    + ringContrib * uRippleIntensity;

  vec3 rawAdd = uColor * energy * uOpacity;
  vec3 col = rawAdd / (1.0 + 0.45 * max(max(rawAdd.r, rawAdd.g), rawAdd.b));
  float alpha = clamp(energy * uOpacity, 0.0, 1.0);
  col = clamp(col, vec3(0.0), vec3(max(alpha, 0.001)));
  outColor = vec4(col, alpha);
  outEmission = vec4(rawAdd, 1.0);
}`;

  var BRIGHT_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform float uThreshold;
void main(){
  vec4 c = texture(uScene, vUv);
  float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
  float gate = smoothstep(uThreshold, uThreshold + 0.25, lum);
  outColor = vec4(c.rgb * gate, 1.0);
}`;

  var KAWASE_DOWN_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform vec2 uTexel;
void main(){
  vec2 o = uTexel;
  vec4 sum = texture(uScene, vUv) * 4.0;
  sum += texture(uScene, vUv - o);
  sum += texture(uScene, vUv + o);
  sum += texture(uScene, vUv + vec2(o.x, -o.y));
  sum += texture(uScene, vUv - vec2(o.x, -o.y));
  outColor = sum * 0.125;
}`;

  var KAWASE_UP_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform sampler2D uBase;
uniform vec2 uTexel;
void main(){
  vec2 o = uTexel;
  vec4 sum = texture(uScene, vUv + vec2(-o.x * 2.0, 0.0));
  sum += texture(uScene, vUv + vec2(-o.x, o.y)) * 2.0;
  sum += texture(uScene, vUv + vec2(0.0, o.y * 2.0));
  sum += texture(uScene, vUv + vec2(o.x, o.y)) * 2.0;
  sum += texture(uScene, vUv + vec2(o.x * 2.0, 0.0));
  sum += texture(uScene, vUv + vec2(o.x, -o.y)) * 2.0;
  sum += texture(uScene, vUv + vec2(0.0, -o.y * 2.0));
  sum += texture(uScene, vUv + vec2(-o.x, -o.y)) * 2.0;
  outColor = mix(texture(uBase, vUv), sum / 12.0, 0.62);
}`;

  // Composizione finale su fondo scuro: campo + bloom + grana
  var COMPOSITE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uBloomStrength;
uniform float uGrain;
uniform float uTime;
float grainNoise(vec2 p, float t){
  vec3 v = fract(vec3(p.xyx) * vec3(443.897, 441.423, 437.195) + t);
  v += dot(v, v.yzx + 19.19);
  return fract((v.x + v.y) * v.z) - 0.5;
}
void main(){
  vec4 scene = texture(uScene, vUv);
  vec3 bloom = texture(uBloom, vUv).rgb * uBloomStrength;
  vec3 col = scene.rgb + bloom;
  float bloomLum = dot(bloom, vec3(0.2126, 0.7152, 0.0722));
  float alpha = clamp(scene.a + bloomLum, 0.0, 1.0);
  float g = grainNoise(gl_FragCoord.xy, fract(uTime) + 0.1);
  col += g * uGrain * (0.15 + alpha * 0.25);
  col = clamp(col, vec3(0.0), vec3(max(alpha, 0.001)));
  outColor = vec4(col, alpha);
}`;

  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  function create(output, host, options) {
    var config = Object.assign({}, DEFAULTS, options || {});
    var gl = output.getContext('webgl2', {
      alpha: true, depth: false, stencil: false, antialias: false, premultipliedAlpha: true
    });
    if (!gl || gl.isContextLost()) return null;

    var hdr = Boolean(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));

    function compile(type, text) {
      var shader = gl.createShader(type);
      gl.shaderSource(shader, text);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('ForceField shader error:', gl.getShaderInfoLog(shader));
      }
      return shader;
    }

    function link(frag) {
      var program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, frag));
      gl.linkProgram(program);
      var uniforms = {};
      var count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < count; i++) {
        var info = gl.getActiveUniform(program, i);
        uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(program, info.name);
      }
      return { program: program, uniforms: uniforms };
    }

    var fieldPass = link(FIELD_FRAG);
    var brightPass = link(BRIGHT_FRAG);
    var downPass = link(KAWASE_DOWN_FRAG);
    var upPass = link(KAWASE_UP_FRAG);
    var compositePass = link(COMPOSITE_FRAG);

    var quad = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    function makeTexture() {
      var t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      return t;
    }

    function allocPixels(w, h, float) {
      if (float && hdr) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    function makeTarget(w, h, emission, float) {
      var texture = makeTexture();
      allocPixels(w, h, float);
      var emissionTexture = null;
      if (emission) {
        emissionTexture = makeTexture();
        allocPixels(w, h, true);
      }
      var framebuffer = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
      if (emissionTexture) {
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, emissionTexture, 0);
        gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return { texture: texture, emissionTexture: emissionTexture, framebuffer: framebuffer, width: w, height: h, float: !!float };
    }

    function resizeTarget(t, w, h) {
      if (t.width === w && t.height === h) return;
      t.width = w; t.height = h;
      gl.bindTexture(gl.TEXTURE_2D, t.texture);
      allocPixels(w, h, t.float);
      if (t.emissionTexture) {
        gl.bindTexture(gl.TEXTURE_2D, t.emissionTexture);
        allocPixels(w, h, true);
      }
    }

    var sceneTarget = makeTarget(2, 2, true, false);
    var brightTarget = makeTarget(2, 2, false, true);
    var downTargets = [];
    var upTargets = [];
    for (var m = 0; m < MIPS; m++) {
      downTargets.push(makeTarget(2, 2, false, true));
      upTargets.push(makeTarget(2, 2, false, true));
    }

    var hitPos = new Float32Array(MAX_HITS * 2);
    var hitTime = new Float32Array(MAX_HITS).fill(-999);
    var hitIndex = 0;
    // Cursore morbido: posizione e presenza raggiungono il bersaglio piano piano
    var mouseX = -9999;
    var mouseY = -9999;
    var targetX = -9999;
    var targetY = -9999;
    var hoverAmt = 0;
    var hoverTarget = 0;

    function easeInput(paused) {
      var k = paused ? 1 : clamp(config.smoothing, 0.02, 1);
      if (mouseX < -9000) { mouseX = targetX; mouseY = targetY; }
      mouseX += (targetX - mouseX) * k;
      mouseY += (targetY - mouseY) * k;
      hoverAmt += (hoverTarget - hoverAmt) * k;
      return Math.abs(targetX - mouseX) > 0.5 || Math.abs(targetY - mouseY) > 0.5 ||
        Math.abs(hoverTarget - hoverAmt) > 0.01;
    }
    var dpr = 1;

    function syncSize() {
      var cw = Math.max(output.clientWidth, 1);
      var ch = Math.max(output.clientHeight, 1);
      // Densità limitata (1.5) e area massima: resta leggero anche su schermi grandi
      dpr = Math.min(window.devicePixelRatio || 1, 1.5, Math.sqrt(4000000 / (cw * ch)));
      var w = Math.max(1, Math.round(cw * dpr));
      var h = Math.max(1, Math.round(ch * dpr));
      if (output.width !== w || output.height !== h) { output.width = w; output.height = h; }
      resizeTarget(sceneTarget, w, h);
      var bw = Math.max(1, w >> 1);
      var bh = Math.max(1, h >> 1);
      resizeTarget(brightTarget, bw, bh);
      for (var i = 0; i < MIPS; i++) {
        bw = Math.max(1, bw >> 1);
        bh = Math.max(1, bh >> 1);
        resizeTarget(downTargets[i], bw, bh);
      }
      for (var j = MIPS - 1; j >= 0; j--) {
        var up = j === 0 ? brightTarget : downTargets[j - 1];
        resizeTarget(upTargets[j], up.width, up.height);
      }
    }
    syncSize();

    function drawQuad() { gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }

    function bindTex(unit, texture) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    }

    var time = 3.7;

    function render() {
      var width = output.width;
      var height = output.height;
      var c = config;

      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneTarget.framebuffer);
      gl.viewport(0, 0, width, height);
      gl.useProgram(fieldPass.program);
      var u = fieldPass.uniforms;
      gl.uniform2f(u.uResolution, width, height);
      gl.uniform1f(u.uTime, time);
      gl.uniform3f(u.uColor, c.color[0], c.color[1], c.color[2]);
      gl.uniform1f(u.uOpacity, clamp(c.opacity, 0, 1));
      gl.uniform1f(u.uCellScale, clamp(c.cellScale, 4, 80));
      gl.uniform1f(u.uLineWidth, clamp(c.lineWidth, 0.005, 0.2));
      gl.uniform1f(u.uGridOpacity, clamp(c.gridOpacity, 0, 1));
      gl.uniform1f(u.uGridRevealMode, REVEAL_INDEX[c.gridReveal] != null ? REVEAL_INDEX[c.gridReveal] : 2);
      gl.uniform1f(u.uGridRevealStrength, clamp(c.gridRevealStrength, 0, 3));
      gl.uniform1f(u.uGridRevealRadius, clamp(c.gridRevealRadius, 60, 800) * dpr);
      gl.uniform1f(u.uGridFade, clamp(c.gridFade, 0.02, 1));
      gl.uniform1f(u.uFlashSpeed, clamp(c.flashSpeed, 0, 4));
      gl.uniform1f(u.uFlashIntensity, clamp(c.flashIntensity, 0, 1));
      gl.uniform1f(u.uFlowScale, clamp(c.flowScale, 0.5, 12));
      gl.uniform1f(u.uFlowSpeed, clamp(c.flowSpeed, 0, 4));
      gl.uniform1f(u.uFlowIntensity, clamp(c.flowIntensity, 0, 4));
      gl.uniform1f(u.uEdgeGlow, clamp(c.edgeGlow, 0, 4));
      gl.uniform1f(u.uEdgeFalloff, clamp(c.edgeFalloff, 0.02, 0.6));
      gl.uniform2fv(u.uHitPos, hitPos);
      gl.uniform1fv(u.uHitTime, hitTime);
      gl.uniform1f(u.uRippleSpeed, clamp(c.rippleSpeed, 0.1, 4));
      gl.uniform1f(u.uRippleWidth, clamp(c.rippleWidth, 0.01, 0.4));
      gl.uniform1f(u.uRippleBlend, clamp(c.rippleBlend, 0, 1));
      gl.uniform1f(u.uRippleDuration, clamp(c.rippleDuration, 0.3, 5));
      gl.uniform1f(u.uRippleIntensity, clamp(c.rippleIntensity, 0, 8));
      gl.uniform1f(u.uRippleMaxRadius, clamp(c.rippleMaxRadius, 0.1, 2));
      gl.uniform1f(u.uImpactRadius, clamp(c.impactRadius, 0, 0.5));
      gl.uniform1f(u.uRefraction, clamp(c.refraction, 0, 60));
      gl.uniform2f(u.uMouse, mouseX * dpr, height - mouseY * dpr);
      gl.uniform1f(u.uHoverGlow, clamp(c.hoverGlow, 0, 3));
      gl.uniform1f(u.uHoverRadius, clamp(c.hoverRadius, 40, 600) * dpr);
      gl.uniform1f(u.uHoverCharge, clamp(c.hoverCharge, 0, 2));
      gl.uniform1f(u.uHoverAmt, hoverAmt);
      drawQuad();

      var bloomOn = c.bloom > 0.001;
      var src = brightTarget;
      if (bloomOn) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, brightTarget.framebuffer);
        gl.viewport(0, 0, brightTarget.width, brightTarget.height);
        gl.useProgram(brightPass.program);
        bindTex(0, sceneTarget.emissionTexture);
        gl.uniform1i(brightPass.uniforms.uScene, 0);
        gl.uniform1f(brightPass.uniforms.uThreshold, clamp(c.bloomThreshold, 0, 1));
        drawQuad();

        for (var i = 0; i < MIPS; i++) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, downTargets[i].framebuffer);
          gl.viewport(0, 0, downTargets[i].width, downTargets[i].height);
          gl.useProgram(downPass.program);
          bindTex(0, src.texture);
          gl.uniform1i(downPass.uniforms.uScene, 0);
          gl.uniform2f(downPass.uniforms.uTexel, 0.5 / src.width, 0.5 / src.height);
          drawQuad();
          src = downTargets[i];
        }
        for (var k = MIPS - 1; k >= 0; k--) {
          var base = k === 0 ? brightTarget : downTargets[k - 1];
          gl.bindFramebuffer(gl.FRAMEBUFFER, upTargets[k].framebuffer);
          gl.viewport(0, 0, upTargets[k].width, upTargets[k].height);
          gl.useProgram(upPass.program);
          bindTex(0, src.texture);
          gl.uniform1i(upPass.uniforms.uScene, 0);
          bindTex(1, base.texture);
          gl.uniform1i(upPass.uniforms.uBase, 1);
          gl.uniform2f(upPass.uniforms.uTexel, 1 / src.width, 1 / src.height);
          drawQuad();
          src = upTargets[k];
        }
      }

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, width, height);
      gl.useProgram(compositePass.program);
      bindTex(0, sceneTarget.texture);
      gl.uniform1i(compositePass.uniforms.uScene, 0);
      bindTex(1, bloomOn ? upTargets[0].texture : sceneTarget.texture);
      gl.uniform1i(compositePass.uniforms.uBloom, 1);
      gl.uniform1f(compositePass.uniforms.uBloomStrength, bloomOn ? clamp(c.bloom, 0, 3) : 0);
      gl.uniform1f(compositePass.uniforms.uGrain, clamp(c.grain, 0, 1));
      gl.uniform1f(compositePass.uniforms.uTime, time);
      drawQuad();
    }

    // Movimento fermo: reduced-motion o Stop animation (RoelmiMotion)
    var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    function still() {
      return motionQuery.matches || (window.RoelmiMotion ? window.RoelmiMotion.isPaused() : false);
    }

    var raf = 0;
    var lastTime = performance.now();
    var lastDraw = 0;
    var lastInput = 0;
    var running = false;
    var visible = true;

    function frame(now) {
      if (!visible) { running = false; return; }
      var paused = still();
      var delta = Math.min((now - lastTime) / 1000, 1 / 30);
      lastTime = now;
      if (!paused) time += delta;
      var ripplesLive = false;
      for (var i = 0; i < MAX_HITS; i++) {
        if (hitTime[i] > -900 && time - hitTime[i] < config.rippleDuration + 0.3) { ripplesLive = true; break; }
      }
      var easing = easeInput(paused);
      var active = ripplesLive || easing || now - lastInput < 500 || paused;
      // Senza interazione: 30 fotogrammi al secondo bastano per le scintille
      if (active || now - lastDraw >= 31) {
        render();
        lastDraw = now;
      }
      if (paused) { running = false; return; }   // un fotogramma fermo e basta
      raf = requestAnimationFrame(frame);
    }

    function start() {
      if (running || !visible) return;
      running = true;
      lastTime = performance.now();
      raf = requestAnimationFrame(frame);
    }

    function spawnHit(x, y) {
      var idx = hitIndex % MAX_HITS;
      hitIndex++;
      hitPos[idx * 2] = x * dpr;
      hitPos[idx * 2 + 1] = output.height - y * dpr;
      hitTime[idx] = time;
      lastInput = performance.now();
      start();
    }

    // Mouse e clic arrivano dal contenitore (i pannelli di vetro stanno sopra)
    host.addEventListener('pointerdown', function (e) {
      if (still()) return;   // da fermo niente onde (resterebbero bloccate)
      var r = output.getBoundingClientRect();
      spawnHit(e.clientX - r.left, e.clientY - r.top);
    });
    host.addEventListener('pointermove', function (e) {
      var r = output.getBoundingClientRect();
      targetX = e.clientX - r.left;
      targetY = e.clientY - r.top;
      hoverTarget = 1;
      lastInput = performance.now();
      start();
    }, { passive: true });
    // Uscendo, l'alone sfuma sul posto
    host.addEventListener('pointerleave', function () {
      hoverTarget = 0;
      lastInput = performance.now();
      start();
    });

    motionQuery.addEventListener('change', start);
    if (window.RoelmiMotion) window.RoelmiMotion.onChange(start);

    var resizeFrame = 0;
    new ResizeObserver(function () {
      if (resizeFrame) return;
      resizeFrame = requestAnimationFrame(function () {
        resizeFrame = 0;
        syncSize();
        lastInput = performance.now();
        start();
      });
    }).observe(output);

    // Fuori dallo schermo non disegna
    new IntersectionObserver(function (entries) {
      visible = entries[entries.length - 1].isIntersecting;
      if (visible) start();
    }).observe(output);

    start();
    return { impact: spawnHit, resize: syncSize };
  }

  window.RoelmiForceField = { create: create };

  // Avvio automatico: <canvas data-force-field> dentro il suo contenitore
  document.querySelectorAll('canvas[data-force-field]').forEach(function (canvas) {
    var host = canvas.closest('[data-force-field-host]') || canvas.parentElement;
    var options = {};
    try { options = JSON.parse(canvas.getAttribute('data-force-field') || '{}'); } catch (e) { /* opzioni di default */ }
    create(canvas, host, options);
  });
})();
