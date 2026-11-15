// Sfondo dell'accesso (14/11/2026 sera, richiesta di Eliseo): fumo liquido d'oro su nero, che scorre piano.
// Spunto: sfondo animato «liquido» su Pinterest (filamenti luminosi che si arrotolano), rifatto da zero:
// shader nostro (rumore piegato più volte su se stesso → filamenti), colori di Garofalo (oro su nero).
// Il cursore mescola il liquido: i filamenti girano in un vortice attorno al mouse e si accendono;
// dietro resta una scia di vortici che si richiudono piano.
// Il vetro della scheda e dei pulsanti è in CSS (components/auth/login.css), come su Maximize Academy.
// Leggero: risoluzione ridotta, pausa quando la pagina non si vede, fermo con il movimento ridotto.

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = `precision mediump float;
uniform vec2 r;uniform float t;uniform float ts;uniform vec2 m;uniform float mi;uniform vec3 g[10];
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
 return mix(mix(h(i),h(i+vec2(1.,0.)),f.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float a=.5,s=0.;mat2 R=mat2(.8,-.6,.6,.8);for(int i=0;i<4;i++){s+=a*nz(p);p=R*p*2.03;a*=.5;}return s;}
// vortice: ruota i punti attorno a c, tanto più quanto sono vicini
vec2 gira(vec2 p,vec2 c,float forza,float raggio){vec2 d=p-c;float a=forza*exp(-dot(d,d)/(raggio*raggio));
 float cs=cos(a),sn=sin(a);return c+vec2(cs*d.x-sn*d.y,sn*d.x+cs*d.y);}
void main(){
 vec2 uv=(gl_FragCoord.xy-.5*r)/r.y;
 vec2 p=uv;
 // il cursore mescola: vortice vivo + scia
 p=gira(p,m,2.*mi,.24);
 for(int k=0;k<10;k++){float age=ts-g[k].z;if(age<0.||age>4.)continue;
  p=gira(p,g[k].xy,1.6*exp(-age*1.1)*smoothstep(0.,.2,age),.16);}
 p*=.85;
 float tt=t*.045;
 vec2 q=vec2(fbm(p+vec2(0.,tt)),fbm(p+vec2(5.2,1.3)-tt));
 vec2 w=vec2(fbm(p+3.*q+vec2(1.7,9.2)+tt*1.3),fbm(p+3.*q+vec2(8.3,2.8)-tt));
 float v=fbm(p+3.4*w);
 // filamenti: linee lucide a intervalli regolari del valore, così ce ne sono sempre (non solo a volte)
 float b=abs(fract(v*5.5+tt*.4)-.5);
 float fil=exp(-b*b*260.);
 float lucido=exp(-b*b*1400.);
 float peso=.45+.55*smoothstep(.25,.7,v);
 vec3 oro=vec3(.85,.6,.28),chiaro=vec3(1.,.88,.6);
 vec3 c=vec3(.014,.011,.008)+oro*.06*length(w);
 c+=oro*fil*.55*peso+chiaro*lucido*.55*peso;
 // vicino al cursore il liquido si accende
 float dm=length(uv-m);c*=1.+1.1*exp(-dm*dm*12.)*mi;
 float vi=smoothstep(1.3,.35,length(gl_FragCoord.xy/r-.5)*1.3);
 gl_FragColor=vec4(c*vi,1.);
}`;

/** Avvia lo sfondo. null = WebGL non disponibile: la pagina resta com'era. */
// opzioni (15/11/2026, sfondo delle aree riservate): scala = risoluzione (meno = più leggero), fps = fotogrammi al secondo massimi.
export function avviaVetro(canvas: HTMLCanvasElement, area: HTMLElement, opzioni: { scala?: number; fps?: number } = {}): (() => void) | null {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
  if (!gl) return null;
  const sh = (tipo: number, src: string) => { const s = gl.createShader(tipo)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const pr = gl.createProgram()!;
  gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (nome: string) => gl.getUniformLocation(pr, nome);
  const uR = u('r'), uT = u('t'), uTs = u('ts'), uM = u('m'), uMi = u('mi'), uG = u('g');

  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SCALA = opzioni.scala ?? Math.min(1, (window.devicePixelRatio || 1) * 0.6);
  const passo = opzioni.fps ? 1000 / opzioni.fps : 0;
  let ultimo = -1e9;
  const t0 = performance.now();
  let id = 0, prima = 0;
  let mx = 0, my = 0, sx = 0, sy = 0, mT = 0, mOn = 0;
  const scia = new Float32Array(30).fill(-99);
  let nS = 0, ult = { x: 99, y: 99, t: -9 };

  // da coordinate dello schermo a quelle dello shader
  const inUv = (cx: number, cy: number, b: DOMRect) => [(cx - b.left - b.width / 2) / b.height, (b.top + b.height / 2 - cy) / b.height];

  const disegna = (ms: number) => {
    const b = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(b.width * SCALA)), hh = Math.max(1, Math.round(b.height * SCALA));
    if (canvas.width !== w || canvas.height !== hh) { canvas.width = w; canvas.height = hh; gl.viewport(0, 0, w, hh); }
    gl.uniform2f(uR, w, hh);
    const sec = (ms - t0) / 1000, dt = Math.min(0.1, Math.max(0, sec - prima)); prima = sec;
    gl.uniform1f(uT, sec + 30);
    gl.uniform1f(uTs, sec);
    mOn += (mT - mOn) * Math.min(1, dt * 3);
    const [ux, uy] = inUv(mx, my, b);
    const f = Math.min(1, dt * 7); sx += (ux - sx) * f; sy += (uy - sy) * f;
    if (mT && (Math.hypot(sx - ult.x, sy - ult.y) > 0.07 || sec - ult.t > 0.4)) {
      scia.set([sx, sy, sec], nS * 3); nS = (nS + 1) % 10; ult = { x: sx, y: sy, t: sec };
    }
    gl.uniform2f(uM, sx, sy);
    gl.uniform1f(uMi, mOn);
    gl.uniform3fv(uG, scia);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const giro = (ms: number) => { if (ms - ultimo >= passo - 2) { ultimo = ms; disegna(ms); } id = requestAnimationFrame(giro); };
  const riparti = () => { cancelAnimationFrame(id); if (fermo || document.hidden) { disegna(performance.now()); return; } id = requestAnimationFrame(giro); };

  const muovi = (e: PointerEvent) => {
    if (mT === 0) { const b = canvas.getBoundingClientRect(); [sx, sy] = inUv(e.clientX, e.clientY, b); }
    mx = e.clientX; my = e.clientY; mT = 1;
    if (fermo) requestAnimationFrame(disegna);
  };
  const esce = () => { mT = 0; };
  area.addEventListener('pointermove', muovi, { passive: true });
  area.addEventListener('pointerleave', esce);
  addEventListener('resize', riparti);
  document.addEventListener('visibilitychange', riparti);
  riparti();
  return () => {
    cancelAnimationFrame(id);
    area.removeEventListener('pointermove', muovi); area.removeEventListener('pointerleave', esce);
    removeEventListener('resize', riparti); document.removeEventListener('visibilitychange', riparti);
  };
}
