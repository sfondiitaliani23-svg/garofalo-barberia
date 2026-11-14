// Vetro liquido (14/11/2026, richiesta di Eliseo). Spunto: «Agentic Liquid Glass» (Vision Pictures, a pagamento):
// rifatto da zero, gratis. Un solo canvas WebGL disegna lo sfondo (foto del salone + fasci di luce d'oro in diagonale)
// e, dove ci sono gli elementi segnati con data-vetro, il vetro: piega lo sfondo vicino al bordo (rifrazione),
// separa i colori sul bordo (dispersione), smeriglia l'interno, accende il bordo con la luce e fa una piccola ombra.
// Il cursore, fuori dalla scheda, è una goccia di vetro che fa da lente.
// Leggero: risoluzione ridotta, pausa quando la pagina non si vede, fermo con il movimento ridotto.

const VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FS = `precision mediump float;
uniform vec2 r;uniform float t;uniform sampler2D foto;uniform vec2 fotoR;
uniform vec4 box[8];uniform float rad[8];uniform float smer[8];uniform int n;
uniform vec4 lente;
float sdBox(vec2 p,vec2 c,vec2 h,float rr){vec2 q=abs(p-c)-(h-rr);return length(max(q,0.))+min(max(q.x,q.y),0.)-rr;}
vec3 sfondo(vec2 p){
 // foto in bianco e nero, scura, a tutta pagina (come «cover»)
 vec2 uv=p/r;float ar=(r.x/r.y)/(fotoR.x/fotoR.y);
 vec2 fu=ar>1.?vec2(uv.x,(uv.y-.5)/ar+.5):vec2((uv.x-.5)*ar+.5,uv.y);
 vec3 f=texture2D(foto,vec2(fu.x,1.-fu.y)).rgb;float g=dot(f,vec3(.3,.59,.11));
 vec3 c=vec3(g*.42);
 // fasci di luce in diagonale che scorrono
 float s=(p.x+p.y)/r.y;
 float a=fract(s*3.2-t*.06);float b=fract(s*7.1+.37-t*.11);
 float l1=exp(-pow((a-.5)*38.,2.));float l2=exp(-pow((b-.5)*70.,2.));
 float onda=.6+.4*sin(p.x/r.y*3.+t*.5);
 c+=vec3(.95,.66,.28)*l1*.55*onda+vec3(1.,.86,.6)*l2*.28+vec3(.8,.45,.15)*exp(-pow((fract(s*1.3+t*.03)-.5)*9.,2.))*.12;
 return c;}
void main(){
 vec2 p=gl_FragCoord.xy;
 vec3 col=sfondo(p);
 // ombra morbida sotto gli elementi di vetro
 for(int i=0;i<8;i++){if(i>=n)break;float d=sdBox(p+vec2(0.,10.),box[i].xy,box[i].zw,rad[i]);col*=1.-.45*(1.-smoothstep(0.,26.,d))*step(0.,d);}
 for(int i=0;i<8;i++){if(i>=n)break;
  float d=sdBox(p,box[i].xy,box[i].zw,rad[i]);
  if(d<0.){
   vec2 e=vec2(1.,0.);
   vec2 nr=normalize(vec2(sdBox(p+e.xy,box[i].xy,box[i].zw,rad[i])-d,sdBox(p+e.yx,box[i].xy,box[i].zw,rad[i])-d)+1e-5);
   float zona=min(28.,min(box[i].z,box[i].w)*.9);
   float k=1.-smoothstep(0.,zona,-d);k=k*k;
   vec2 off=-nr*k*zona*1.1;
   float fr=smer[i];
   vec3 v=vec3(0.);
   for(int j=0;j<4;j++){vec2 o=vec2(float(j==0)-float(j==1),float(j==2)-float(j==3))*fr*4.;
    v+=vec3(sfondo(p+off+o).r,sfondo(p+off*1.18+o).g,sfondo(p+off*1.38+o).b);}
   v/=4.;
   v=mix(v,v*.55+vec3(.02),fr);
   float bordo=1.-smoothstep(0.,2.2,-d);
   float luce=pow(max(dot(nr,normalize(vec2(-.6,.8))),0.),2.);
   v+=vec3(1.,.93,.8)*bordo*(.25+.75*luce)*.85;
   v+=vec3(1.,.9,.7)*k*.05;
   col=v;
  }}
 // goccia del cursore: tutta la forma fa da lente
 if(lente.w>.01){float d=length(p-lente.xy)-lente.z;
  if(d<0.){vec2 q=(p-lente.xy)/lente.z;float h=sqrt(max(0.,1.-dot(q,q)));
   vec2 off=-(p-lente.xy)*(1.-h)*.6*lente.w;
   vec3 v=vec3(sfondo(p+off).r,sfondo(p+off*1.15).g,sfondo(p+off*1.32).b);
   float bordo=1.-smoothstep(0.,2.,-d);float spec=pow(max(0.,dot(normalize(vec3(q,h)),normalize(vec3(-.5,.6,.65)))),40.);
   v+=vec3(1.,.93,.8)*(bordo*.6+spec*.9);
   col=mix(col,v,lente.w);}
  else col*=1.-.35*(1.-smoothstep(0.,22.,d))*lente.w;}
 float vi=smoothstep(1.3,.3,length(p/r-.5)*1.4);
 gl_FragColor=vec4(col*vi,1.);
}`;

/** Avvia il vetro. null = WebGL non disponibile: la pagina resta com'era. */
export function avviaVetro(canvas: HTMLCanvasElement, area: HTMLElement, fotoUrl: string): (() => void) | null {
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
  const uR = u('r'), uT = u('t'), uFR = u('fotoR'), uBox = u('box'), uRad = u('rad'), uSm = u('smer'), uN = u('n'), uL = u('lente');

  // foto del salone come trama (finché non arriva, un pixel scuro)
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([20, 20, 20, 255]));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.uniform2f(uFR, 1, 1);
  const img = new Image();
  img.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.uniform2f(uFR, img.naturalWidth, img.naturalHeight);
  };
  img.src = fotoUrl;

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
    // goccia del cursore
    mOn += (mT - mOn) * Math.min(1, dt * 5);
    const f = Math.min(1, dt * 10); lx += (mx - lx) * f; ly += (my - ly) * f;
    gl.uniform4f(uL, (lx - b.left) * SCALA, (b.bottom - ly) * SCALA, 46 * SCALA, mOn);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const giro = (ms: number) => { disegna(ms); id = requestAnimationFrame(giro); };
  const riparti = () => { cancelAnimationFrame(id); if (fermo || document.hidden) { disegna(performance.now()); return; } id = requestAnimationFrame(giro); };

  const muovi = (e: PointerEvent) => {
    const dentro = (e.target as Element | null)?.closest?.('[data-vetro], a, button, input, label');
    if (mT === 0) { lx = e.clientX; ly = e.clientY; }
    mx = e.clientX; my = e.clientY; mT = dentro ? 0 : 1;
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
