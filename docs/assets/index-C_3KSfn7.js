(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))e(n);new MutationObserver(n=>{for(const o of n)if(o.type==="childList")for(const i of o.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&e(i)}).observe(document,{childList:!0,subtree:!0});function s(n){const o={};return n.integrity&&(o.integrity=n.integrity),n.referrerPolicy&&(o.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?o.credentials="include":n.crossOrigin==="anonymous"?o.credentials="omit":o.credentials="same-origin",o}function e(n){if(n.ep)return;n.ep=!0;const o=s(n);fetch(n.href,o)}})();const C=""+new URL("pitch-shifter.worklet-BcMiuziD.js",import.meta.url).href,O=""+new URL("tap.worklet-CUyQJTFC.js",import.meta.url).href,P={delaySeconds:7,pitchRatio:1,highpassHz:20,lowpassHz:18e3,dryWet:1,outputGain:.9},F=30;class D{constructor(t={}){this.cb=t}ctx=null;stream=null;source=null;delay=null;highpass=null;lowpass=null;pitch=null;dryGain=null;wetGain=null;outGain=null;analyser=null;levelTimer=null;state="idle";getState(){return this.state}getAnalyser(){return this.analyser}getContext(){return this.ctx}getSourceNode(){return this.source}async start(t=P){if(!(this.state==="running"||this.state==="starting")){this.setState("starting");try{const s=new AudioContext({latencyHint:"interactive"});this.ctx=s,this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1,channelCount:1},video:!1}),await s.audioWorklet.addModule(C),await s.audioWorklet.addModule(O),this.source=s.createMediaStreamSource(this.stream),this.highpass=s.createBiquadFilter(),this.highpass.type="highpass",this.highpass.frequency.value=t.highpassHz,this.highpass.Q.value=.707,this.lowpass=s.createBiquadFilter(),this.lowpass.type="lowpass",this.lowpass.frequency.value=t.lowpassHz,this.lowpass.Q.value=.707,this.delay=s.createDelay(F),this.delay.delayTime.value=t.delaySeconds,this.pitch=new AudioWorkletNode(s,"pitch-shifter",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],parameterData:{pitchRatio:t.pitchRatio}}),this.dryGain=s.createGain(),this.dryGain.gain.value=1-t.dryWet,this.wetGain=s.createGain(),this.wetGain.gain.value=t.dryWet,this.outGain=s.createGain(),this.outGain.gain.value=t.outputGain,this.analyser=s.createAnalyser(),this.analyser.fftSize=2048,this.analyser.smoothingTimeConstant=.75,this.source.connect(this.highpass),this.highpass.connect(this.lowpass),this.lowpass.connect(this.delay),this.delay.connect(this.pitch),this.pitch.connect(this.wetGain),this.lowpass.connect(this.dryGain),this.dryGain.connect(this.outGain),this.wetGain.connect(this.outGain),this.outGain.connect(this.analyser),this.outGain.connect(s.destination),this.startLevelLoop(),this.setState("running")}catch(s){throw this.setState("error",s instanceof Error?s.message:String(s)),await this.stop(),s}}}async stop(){this.levelTimer!==null&&(cancelAnimationFrame(this.levelTimer),this.levelTimer=null),this.stream&&(this.stream.getTracks().forEach(t=>t.stop()),this.stream=null);try{this.source?.disconnect(),this.highpass?.disconnect(),this.lowpass?.disconnect(),this.delay?.disconnect(),this.pitch?.disconnect(),this.dryGain?.disconnect(),this.wetGain?.disconnect(),this.outGain?.disconnect(),this.analyser?.disconnect()}catch{}this.source=null,this.highpass=null,this.lowpass=null,this.delay=null,this.pitch=null,this.dryGain=null,this.wetGain=null,this.outGain=null,this.analyser=null,this.ctx&&this.ctx.state!=="closed"&&await this.ctx.close(),this.ctx=null,this.setState("idle")}setDelaySeconds(t){if(!this.ctx||!this.delay)return;const s=Math.max(0,Math.min(F,t));this.delay.delayTime.setTargetAtTime(s,this.ctx.currentTime,.02)}setPitchRatio(t){if(!this.ctx||!this.pitch)return;const s=Math.max(.125,Math.min(4,t)),e=this.pitch.parameters.get("pitchRatio");e&&e.setTargetAtTime(s,this.ctx.currentTime,.02)}setHighpassHz(t){!this.ctx||!this.highpass||this.highpass.frequency.setTargetAtTime(t,this.ctx.currentTime,.02)}setLowpassHz(t){!this.ctx||!this.lowpass||this.lowpass.frequency.setTargetAtTime(t,this.ctx.currentTime,.02)}setDryWet(t){if(!this.ctx||!this.dryGain||!this.wetGain)return;const s=Math.max(0,Math.min(1,t));this.dryGain.gain.setTargetAtTime(1-s,this.ctx.currentTime,.02),this.wetGain.gain.setTargetAtTime(s,this.ctx.currentTime,.02)}setOutputGain(t){!this.ctx||!this.outGain||this.outGain.gain.setTargetAtTime(Math.max(0,Math.min(2,t)),this.ctx.currentTime,.02)}captureRawInput(t){if(!this.ctx||!this.lowpass)return Promise.reject(new Error("engine not running"));const s=this.ctx,e=new AudioWorkletNode(s,"tap",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]}),n=s.createGain();n.gain.value=0,this.lowpass.connect(e),e.connect(n),n.connect(s.destination);const o=[],i=Math.floor(t*s.sampleRate);let l=0;return new Promise((y,h)=>{const c=setTimeout(()=>{u(),h(new Error("capture timed out"))},(t+2)*1e3),u=()=>{clearTimeout(c);try{e.port.postMessage({type:"set",active:!1}),e.disconnect(),n.disconnect()}catch{}};e.port.onmessage=g=>{const d=g.data;if(!(d instanceof Float32Array))return;const m=i-l;if(m<=0)return;const f=d.length<=m?new Float32Array(d):d.slice(0,m);if(o.push(f),l+=f.length,l>=i){const x=new Float32Array(l);let S=0;for(const b of o)x.set(b,S),S+=b.length;u(),y(x)}},e.port.postMessage({type:"set",active:!0})})}getSampleRate(){return this.ctx?.sampleRate??48e3}setState(t,s){this.state=t,this.cb.onState?.(t,s)}startLevelLoop(){if(!this.analyser)return;const t=new Float32Array(this.analyser.fftSize),s=this.analyser,e=()=>{if(!this.analyser)return;s.getFloatTimeDomainData(t);let n=0;for(let i=0;i<t.length;i++){const l=t[i]??0;n+=l*l}const o=Math.sqrt(n/t.length);this.cb.onLevel?.(o),this.levelTimer=requestAnimationFrame(e)};this.levelTimer=requestAnimationFrame(e)}}class B{constructor(t){this.opts=t;const s=t.canvas.getContext("2d");if(!s)throw new Error("2D canvas context unavailable");this.ctx=s;const e=new ArrayBuffer(t.analyser.frequencyBinCount);this.freq=new Uint8Array(e),this.resize()}ctx;rafId=null;freq;writeX=0;start(){if(this.rafId!==null)return;const t=()=>{this.draw(),this.rafId=requestAnimationFrame(t)};this.rafId=requestAnimationFrame(t)}stop(){this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=null}resize(){const t=window.devicePixelRatio||1,s=this.opts.canvas.getBoundingClientRect();this.opts.canvas.width=Math.max(1,Math.floor(s.width*t)),this.opts.canvas.height=Math.max(1,Math.floor(s.height*t)),this.ctx.fillStyle="#000",this.ctx.fillRect(0,0,this.opts.canvas.width,this.opts.canvas.height),this.writeX=0}draw(){const{canvas:t}=this.opts,s=this.ctx;this.opts.analyser.getByteFrequencyData(this.freq);const e=t.width,n=t.height,o=this.freq.length,i=2;for(let l=0;l<i;l++){const y=(this.writeX+l)%e;for(let h=0;h<n;h++){const c=1-h/n,u=Math.min(o-1,Math.floor(Math.pow(c,2)*o)),g=this.freq[u]??0;s.fillStyle=_(g),s.fillRect(y,h,1,1)}}this.writeX=(this.writeX+i)%e,s.fillStyle="rgba(255,255,255,0.35)",s.fillRect(this.writeX,0,1,n)}}function _(r){const t=r/255,s=Math.floor(255*Math.min(1,Math.max(0,1.5*t-.3))),e=Math.floor(255*Math.min(1,Math.max(0,1.4*t))),n=Math.floor(255*Math.min(1,Math.max(0,2.2*t-.9)));return`rgb(${s},${e},${n})`}const k="tde:prefs:v1";function N(){try{const r=localStorage.getItem(k);if(!r)return{};const t=JSON.parse(r);return typeof t!="object"||t===null?{}:t}catch{return{}}}function U(r){try{localStorage.setItem(k,JSON.stringify(r))}catch{}}const j="modulepreload",X=function(r,t){return new URL(r,t).href},$={},J=function(t,s,e){let n=Promise.resolve();if(s&&s.length>0){const i=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),y=l?.nonce||l?.getAttribute("nonce");n=Promise.allSettled(s.map(h=>{if(h=X(h,e),h in $)return;$[h]=!0;const c=h.endsWith(".css"),u=c?'[rel="stylesheet"]':"";if(!!e)for(let m=i.length-1;m>=0;m--){const f=i[m];if(f.href===h&&(!c||f.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${h}"]${u}`))return;const d=document.createElement("link");if(d.rel=c?"stylesheet":j,c||(d.as="script"),d.crossOrigin="",d.href=h,y&&d.setAttribute("nonce",y),document.head.appendChild(d),c)return new Promise((m,f)=>{d.addEventListener("load",m),d.addEventListener("error",()=>f(new Error(`Unable to preload CSS for ${h}`)))})}))}function o(i){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=i,window.dispatchEvent(l),!l.defaultPrevented)throw i}return n.then(i=>{for(const l of i||[])l.status==="rejected"&&o(l.reason);return t().catch(o)})},T=5;function Q(r,t){r.innerHTML=`
    <h2>Offline analysis (Pyodide + librosa)</h2>
    <p style="margin: 0; color: var(--fg-dim); font-size: 0.85rem;">
      Captures ${T} seconds of the post-filter input and runs it through librosa
      in your browser. The first analysis lazy-loads ~25 MB of Pyodide + numpy + scipy + librosa
      from a public CDN — subsequent runs are instant. Nothing leaves your device.
    </p>
    <div class="row">
      <button id="analyze">Capture &amp; analyze ${T}s</button>
      <span id="analyze-status" class="status">ready (worker not loaded)</span>
    </div>
    <div id="analysis-output" class="analysis-output hidden"></div>
  `;const s=r.querySelector("#analyze"),e=r.querySelector("#analyze-status"),n=r.querySelector("#analysis-output");let o=null,i=!1;const l=(c,u=null)=>{e.textContent=c,e.classList.remove("ok","warn","err"),u&&e.classList.add(u)};s.addEventListener("click",()=>{y()});async function y(){if(!i){if(t.getState()!=="running"){l("start listening first","warn");return}i=!0,s.disabled=!0,n.classList.add("hidden");try{l(`capturing ${T}s …`,"warn");const c=await t.captureRawInput(T),u=t.getSampleRate();if(!o){const d=await J(()=>import("./analysis-client-Dsb8jJRP.js"),[],import.meta.url);o=new d.AnalysisClient({onStatus:(m,f)=>{l(f?`${m}: ${f}`:m,"warn")}})}l("analyzing …","warn");const g=await o.analyze(c,u);h(g),l("done","ok")}catch(c){const u=c instanceof Error?c.message:String(c);l(`error: ${u}`,"err")}finally{i=!1,s.disabled=!1}}}function h(c){n.classList.remove("hidden");const u=c.estimatedTempoBpm?`${c.estimatedTempoBpm.toFixed(1)} BPM`:"—";n.textContent=`duration       ${c.durationSec.toFixed(2)} s
sample rate    ${c.sampleRate} Hz
RMS            ${c.rms.toFixed(4)}
peak           ${c.peak.toFixed(4)}
zero-crossing  ${c.zeroCrossingRate.toFixed(4)}
centroid       ${c.spectralCentroidHz.toFixed(1)} Hz
rolloff(85%)   ${c.spectralRolloffHz.toFixed(1)} Hz
tempo (guess)  ${u}
onsets in 5s   ${c.onsetCount}

MFCC mean (13 coeffs)
`+c.mfccMean.map((g,d)=>`  c${String(d).padStart(2,"0")}  ${g.toFixed(3)}`).join(`
`)}}const V=[{id:"delay-7s",name:"Seven-second delay",hint:"Hear the world 7s late",params:{delaySeconds:7,pitchRatio:1,highpassHz:20,lowpassHz:18e3,dryWet:1}},{id:"whale-song",name:"Whale song",hint:"Two octaves down",params:{delaySeconds:.01,pitchRatio:.25,highpassHz:20,lowpassHz:4e3,dryWet:1}},{id:"apartment-dream",name:"Apartment dream",hint:"Strip lows + light delay",params:{delaySeconds:.4,pitchRatio:1,highpassHz:800,lowpassHz:18e3,dryWet:1}},{id:"underwater",name:"Underwater",hint:"Cut highs, slow pitch",params:{delaySeconds:.2,pitchRatio:.5,highpassHz:20,lowpassHz:1200,dryWet:1}},{id:"monitor",name:"Monitor (passthrough)",hint:"Minimal processing",params:{delaySeconds:.01,pitchRatio:1,highpassHz:20,lowpassHz:18e3,dryWet:0}}],M={seconds:r=>r<1?`${(r*1e3).toFixed(0)}ms`:`${r.toFixed(2)}s`,ratio:r=>{const t=12*Math.log2(r);return`${t>=0?"+":""}${t.toFixed(1)} st`},hz:r=>r>=1e3?`${(r/1e3).toFixed(1)}kHz`:`${r.toFixed(0)}Hz`,pct:r=>`${Math.round(r*100)}%`};function K(r){const t=new D({onState:(a,p)=>G(a,p),onLevel:a=>I(a)});let e={...P,...N()},n=null,o=null;r.innerHTML=`
    <div class="app">
      <header class="brand">
        <h1>time-displaced ears</h1>
        <span class="tag">hear the world delayed, pitched, filtered — locally</span>
        <span class="badge" id="badge">mic: off</span>
      </header>
      <main>
        <section class="card">
          <h2>Spectrogram</h2>
          <canvas id="spectrogram"></canvas>
          <div id="meter"><div class="fill"></div></div>
          <div class="row">
            <button id="start" class="primary">Start listening</button>
            <button id="stop" class="danger hidden">Stop</button>
            <span id="status" class="status">click start &amp; grant mic access</span>
          </div>
        </section>

        <section class="card">
          <h2>Presets</h2>
          <div class="toggle-grid" id="presets"></div>
        </section>

        <section class="card">
          <h2>Controls</h2>
          <div class="control" id="ctl-delay">
            <label for="delay">Delay</label>
            <input type="range" id="delay" min="0" max="30" step="0.05" />
            <span class="value">—</span>
          </div>
          <div class="control" id="ctl-pitch">
            <label for="pitch">Pitch</label>
            <input type="range" id="pitch" min="0.125" max="4" step="0.001" />
            <span class="value">—</span>
          </div>
          <div class="control" id="ctl-hpf">
            <label for="hpf">High-pass</label>
            <input type="range" id="hpf" min="20" max="8000" step="1" />
            <span class="value">—</span>
          </div>
          <div class="control" id="ctl-lpf">
            <label for="lpf">Low-pass</label>
            <input type="range" id="lpf" min="200" max="20000" step="10" />
            <span class="value">—</span>
          </div>
          <div class="control" id="ctl-mix">
            <label for="mix">Dry → Wet</label>
            <input type="range" id="mix" min="0" max="1" step="0.01" />
            <span class="value">—</span>
          </div>
          <div class="control" id="ctl-out">
            <label for="out">Output</label>
            <input type="range" id="out" min="0" max="1.5" step="0.01" />
            <span class="value">—</span>
          </div>
        </section>

        <section class="card" id="analysis-card">
          <h2>Offline analysis (Pyodide + librosa)</h2>
        </section>
      </main>

      <footer>
        <span>v0.2.0 · processed locally, no audio leaves your device · installable as a PWA</span>
        <span>
          <a href="https://github.com/baditaflorin/implemment-the-following-time-displaced-ears" target="_blank" rel="noreferrer">source</a>
          · <a href="https://github.com/baditaflorin/implemment-the-following-time-displaced-ears/blob/main/docs/privacy.md" target="_blank" rel="noreferrer">privacy</a>
        </span>
      </footer>
    </div>
  `;const i=a=>{const p=r.querySelector(a);if(!p)throw new Error(`missing ${a}`);return p},l=i("#start"),y=i("#stop"),h=i("#status"),c=i("#badge"),u=i("#meter > .fill"),g=i("#spectrogram"),d=i("#delay"),m=i("#pitch"),f=i("#hpf"),x=i("#lpf"),S=i("#mix"),b=i("#out"),H=i("#presets");for(const a of V){const p=document.createElement("button");p.dataset.preset=a.id,p.innerHTML=`<span class="name">${a.name}</span><span class="hint">${a.hint}</span>`,p.addEventListener("click",()=>q(a)),H.appendChild(p)}function R(){d.value=String(e.delaySeconds),m.value=String(e.pitchRatio),f.value=String(e.highpassHz),x.value=String(e.lowpassHz),S.value=String(e.dryWet),b.value=String(e.outputGain),w()}function w(){z("#ctl-delay",M.seconds(e.delaySeconds)),z("#ctl-pitch",M.ratio(e.pitchRatio)),z("#ctl-hpf",M.hz(e.highpassHz)),z("#ctl-lpf",M.hz(e.lowpassHz)),z("#ctl-mix",M.pct(e.dryWet)),z("#ctl-out",M.pct(e.outputGain))}function z(a,p){const L=r.querySelector(`${a} .value`);L&&(L.textContent=p)}function q(a){e={...e,...a.params},o=a.id,R(),A(),v(),E()}function E(){H.querySelectorAll("button").forEach(a=>{const p=a.dataset.preset;a.classList.toggle("active",p===o)})}function A(){t.getState()==="running"&&(t.setDelaySeconds(e.delaySeconds),t.setPitchRatio(e.pitchRatio),t.setHighpassHz(e.highpassHz),t.setLowpassHz(e.lowpassHz),t.setDryWet(e.dryWet),t.setOutputGain(e.outputGain))}d.addEventListener("input",()=>{e.delaySeconds=parseFloat(d.value),t.setDelaySeconds(e.delaySeconds),w(),o=null,E(),v()}),m.addEventListener("input",()=>{e.pitchRatio=parseFloat(m.value),t.setPitchRatio(e.pitchRatio),w(),o=null,E(),v()}),f.addEventListener("input",()=>{e.highpassHz=parseFloat(f.value),t.setHighpassHz(e.highpassHz),w(),o=null,E(),v()}),x.addEventListener("input",()=>{e.lowpassHz=parseFloat(x.value),t.setLowpassHz(e.lowpassHz),w(),o=null,E(),v()}),S.addEventListener("input",()=>{e.dryWet=parseFloat(S.value),t.setDryWet(e.dryWet),w(),v()}),b.addEventListener("input",()=>{e.outputGain=parseFloat(b.value),t.setOutputGain(e.outputGain),w(),v()});function v(){U(e)}function G(a,p){h.textContent=p?`${a} — ${p}`:a,h.classList.remove("ok","warn","err"),a==="running"&&h.classList.add("ok"),a==="starting"&&h.classList.add("warn"),a==="error"&&h.classList.add("err"),c.textContent=a==="running"?"mic: live":`mic: ${a}`,l.classList.toggle("hidden",a==="running"||a==="starting"),y.classList.toggle("hidden",a!=="running"&&a!=="starting"),l.disabled=a==="starting"}function I(a){const p=20*Math.log10(a+1e-9),L=Math.max(0,Math.min(1,(p+60)/60));u.style.width=`${(L*100).toFixed(1)}%`}l.addEventListener("click",async()=>{try{await t.start(e);const a=t.getAnalyser();a&&(n=new B({canvas:g,analyser:a}),n.start(),window.addEventListener("resize",()=>n?.resize())),A()}catch(a){h.textContent=`error: ${a instanceof Error?a.message:a}`,h.classList.add("err")}}),y.addEventListener("click",()=>{n?.stop(),n=null,t.stop(),u.style.width="0%"}),Q(i("#analysis-card"),t),R(),G("idle")}function Y(){"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("./sw.js").catch(r=>{console.warn("sw registration failed",r)})})}const W=document.getElementById("app");if(!W)throw new Error("Mount node #app missing from index.html");K(W);Y();window.__tde__={pitchShifterWorkletUrl:C};
