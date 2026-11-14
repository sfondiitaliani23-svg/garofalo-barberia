// Vetro liquido (14/11/2026, richiesta di Eliseo). Spunto: «Agentic Liquid Glass» (Vision Pictures, a pagamento):
// rifatto da zero, gratis. Un solo canvas WebGL disegna lo sfondo (nero caldo con poche barre di luce larghe in diagonale)
// e, dove ci sono gli elementi segnati con data-vetro, il vetro: piega lo sfondo vicino al bordo (rifrazione),
// separa i colori sul bordo (dispersione), smeriglia l'interno, accende il bordo con la luce e fa una piccola ombra.
// La luce sul bordo del vetro segue il cursore. (Sera del 14/11: tolte foto, righe sottili e goccia, su richiesta di Eliseo.)
// Leggero: risoluzione ridotta, pausa quando la pagina non si vede, fermo con il movimento ridotto.

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = `precision mediump float;
uniform vec2 r;uniform float t;
uniform vec4 box[8];uniform float rad[8];uniform float smer[8];uniform int n;
uniform vec2 luce;
float sdBox(vec2 p,vec2 c,vec2 h,float rr){vec2 q=abs(p-c)-(h-rr);return length(max(q,0.))+min(max(q.x,q.y),0.)-rr;}
float h1(float x){return fract(sin(x*91.17)*43758.5453);}
vec3 sfondo(vec2 p){
 vec2 uv=p/r;
 // fondo nero caldo con un alone morbido al centro
 vec3 c=mix(vec3(.018,.016,.014),vec3(.05,.04,.03),uv.y);
 c+=vec3(.10,.07,.035)*exp(-dot(uv-vec2(.5,.45),uv-vec2(.5,.45))*5.);
 // poche barre di luce larghe e ordinate in diagonale (come neon), che scorrono piano
 float per=r.y*.34;
 float s=(p.x+p.y*.85)/per+t*.035;
 float i=floor(s);float d=abs(fract(s)-.5)*per;
 float tipo=h1(i);
 float w=mix(2.5,5.5,h1(i+3.1));
 float corpo=1.-smoothstep(w,w+1.5,d);
 float alone=exp(-d*d/(2.*30.*30.));
 vec3 oro=vec3(.86,.62,.30),caldo=vec3(1.,.88,.66);
 vec3 tinta=tipo<.5?oro:caldo;
 float forza=h1(i+7.7)<.45?0.:(.22+.3*h1(i+9.3));
 c+=tinta*(corpo*.85+alone*.22)*forza;
 return c;}
void main(){
 vec2 p=gl_FragCoord.xy;
 vec3 col=sfondo(p);
 for(int i=0;i<8;i++){if(i>=n)break;float d=sdBox(p+vec2(0.,14.),box[i].xy,box[i].zw,rad[i]);col*=1.-.55*(1.-smoothstep(0.,34.,d))*step(0.,d);}
 for(int i=0;i<8;i++){if(i>=n)break;
  float d=sdBox(p,box[i].xy,box[i].zw,rad[i]);
  if(d<0.){
   vec2 e=vec2(1.,0.);
   vec2 nr=normalize(vec2(sdBox(p+e.xy,box[i].xy,box[i].zw,rad[i])-d,sdBox(p+e.yx,box[i].xy,box[i].zw,rad[i])-d)+1e-5);
   float fr=smer[i];
   float zona=min(fr>.5?34.:16.,min(box[i].z,box[i].w)*.95);
   float k=1.-smoothstep(0.,zona,-d);k=k*k*(3.-2.*k);
   vec2 off=-nr*k*zona*1.35;
   float raggio=fr*7.;
   vec3 v=vec3(0.);
   for(int j=0;j<6;j++){float a=float(j)*1.0472;vec2 o=vec2(cos(a),sin(a))*raggio;
    v+=vec3(sfondo(p+off+o).r,sfondo(p+off*1.06+o).g,sfondo(p+off*1.13+o).b);}
   v/=6.;
   // interno: vetro un po' scuro e caldo, per leggere bene
   v=mix(v,v*.5+vec3(.025,.02,.015),fr*(1.-k));
   v+=vec3(1.)*.025;
   // bordo: filo chiaro sottile + luce che segue il cursore
   float filo=1.-smoothstep(.0,1.6,-d);
   float riflesso=pow(max(dot(nr,luce),0.),3.);
   float controluce=pow(max(dot(nr,-luce),0.),6.)*.35;
   v+=vec3(1.,.95,.86)*filo*(.18+.82*riflesso+controluce);
   v+=vec3(1.,.92,.78)*k*(riflesso*.10);
   col=v;
  }}
 float vi=smoothstep(1.25,.25,length(p/r-.5)*1.4);
 gl_FragColor=vec4(col*vi,1.);
}`;

/** Avvia il vetro. null = WebGL non disponibile: la pagina resta com'era. */
export function avviaVetro(canvas: HTMLCanvasElement, area: HTMLElement): (() => void) | null {
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
  const uR = u('r'), uT = u('t'), uBox = u('box'), uRad = u('rad'), uSm = u('smer'), uN = u('n'), uLuce = u('luce');


  const fermo = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SCALA = Math.min(1, (window.devicePixelRatio || 1) * 0.75);
  const t0 = performance.now();
  let id = 0, prima = 0;
  let mx = 0, my = 0, lx = 0, ly = 0, mT = 0, mOn = 0;
  const boxes = new Float32Array(32), rads = new Float32Array(8), smers = new Float32Array(8);

  const disegna = (ms: number) => {
    const b = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(b.width * SCALA)), h = Math.max(1, Math.round(b.height * SCALA));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
    gl.uniform2f(uR, w, h);
    const sec = (ms - t0) / 1000, dt = Math.min(0.1, Math.max(0, sec - prima)); prima = sec;
    gl.uniform1f(uT, sec);
    // elementi di vetro: posizione e forma lette dalla pagina a ogni giro
    let k = 0;
    area.querySelectorAll<HTMLElement>('[data-vetro]').forEach((el) => {
      if (k >= 8) return;
      const e = el.getBoundingClientRect();
      if (!e.width || !e.height || e.bottom < b.top || e.top > b.bottom) return;
      const cx = (e.left + e.width / 2 - b.left) * SCALA, cy = (b.bottom - (e.top + e.height / 2)) * SCALA;
      boxes.set([cx, cy, (e.width / 2) * SCALA, (e.height / 2) * SCALA], k * 4);
      const raggio = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
      rads[k] = Math.min(raggio, e.height / 2, e.width / 2) * SCALA;
      smers[k] = el.dataset.vetro === 'smerigliato' ? 0.85 : 0.18;
      k++;
    });
    gl.uniform4fv(uBox, boxes); gl.uniform1fv(uRad, rads); gl.uniform1fv(uSm, smers); gl.uniform1i(uN, k);
    // la luce sul bordo segue il cursore (senza cursore: dall'alto a sinistra)
    mOn += (mT - mOn) * Math.min(1, dt * 4);
    const f = Math.min(1, dt * 6); lx += (mx - lx) * f; ly += (my - ly) * f;
    const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
    let dx = (lx - cx) * mOn + -0.6 * (1 - mOn) * 400, dy = -(ly - cy) * mOn + 0.8 * (1 - mOn) * 400;
    const lun = Math.hypot(dx, dy) || 1; dx /= lun; dy /= lun;
    gl.uniform2f(uLuce, dx, dy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const giro = (ms: number) => { disegna(ms); id = requestAnimationFrame(giro); };
  const riparti = () => { cancelAnimationFrame(id); if (fermo || document.hidden) { disegna(performance.now()); return; } id = requestAnimationFrame(giro); };

  const muovi = (e: PointerEvent) => {
    if (mT === 0) { lx = e.clientX; ly = e.clientY; }
    mx = e.clientX; my = e.clientY; mT = 1;
    if (fermo) requestAnimationFrame(disegna);
  };
  const esce = () => { mT = 0; };
  area.addEventListener('pointermove', muovi, { passive: true });
  area.addEventListener('pointerleave', esce);
  addEventListener('resize', riparti);
  addEventListener('scroll', riparti, { passive: true });
  document.addEventListener('visibilitychange', riparti);
  riparti();
  return () => {
    cancelAnimationFrame(id);
    area.removeEventListener('pointermove', muovi); area.removeEventListener('pointerleave', esce);
    removeEventListener('resize', riparti); removeEventListener('scroll', riparti); document.removeEventListener('visibilitychange', riparti);
  };
}
