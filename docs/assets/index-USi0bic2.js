(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))e(r);new MutationObserver(r=>{for(const a of r)if(a.type==="childList")for(const i of a.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&e(i)}).observe(document,{childList:!0,subtree:!0});function s(r){const a={};return r.integrity&&(a.integrity=r.integrity),r.referrerPolicy&&(a.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?a.credentials="include":r.crossOrigin==="anonymous"?a.credentials="omit":a.credentials="same-origin",a}function e(r){if(r.ep)return;r.ep=!0;const a=s(r);fetch(r.href,a)}})();const N=""+new URL("pitch-shifter.worklet-BcMiuziD.js",import.meta.url).href,st=""+new URL("tap.worklet-CUyQJTFC.js",import.meta.url).href,j=""+new URL("spectral.worklet-CBiHA9Ok.js",import.meta.url).href,U={bypass:0,freeze:1,smear:2},V={delaySeconds:7,pitchRatio:1,highpassHz:20,lowpassHz:18e3,dryWet:1,outputGain:.9,spectralMode:"bypass"},B=30;class nt{constructor(t={}){this.cb=t}ctx=null;stream=null;source=null;delay=null;highpass=null;lowpass=null;pitch=null;spectral=null;dryGain=null;wetGain=null;outGain=null;analyser=null;levelTimer=null;state="idle";getState(){return this.state}getAnalyser(){return this.analyser}getContext(){return this.ctx}getSourceNode(){return this.source}async start(t=V){if(!(this.state==="running"||this.state==="starting")){this.setState("starting");try{const s=new AudioContext({latencyHint:"interactive"});this.ctx=s,this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1,channelCount:1},video:!1}),await s.audioWorklet.addModule(N),await s.audioWorklet.addModule(st),await s.audioWorklet.addModule(j),this.source=s.createMediaStreamSource(this.stream),this.highpass=s.createBiquadFilter(),this.highpass.type="highpass",this.highpass.frequency.value=t.highpassHz,this.highpass.Q.value=.707,this.lowpass=s.createBiquadFilter(),this.lowpass.type="lowpass",this.lowpass.frequency.value=t.lowpassHz,this.lowpass.Q.value=.707,this.delay=s.createDelay(B),this.delay.delayTime.value=t.delaySeconds,this.pitch=new AudioWorkletNode(s,"pitch-shifter",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],parameterData:{pitchRatio:t.pitchRatio}}),this.spectral=new AudioWorkletNode(s,"spectral",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]}),this.spectral.port.postMessage({type:"mode",mode:U[t.spectralMode]}),this.dryGain=s.createGain(),this.dryGain.gain.value=1-t.dryWet,this.wetGain=s.createGain(),this.wetGain.gain.value=t.dryWet,this.outGain=s.createGain(),this.outGain.gain.value=t.outputGain,this.analyser=s.createAnalyser(),this.analyser.fftSize=2048,this.analyser.smoothingTimeConstant=.75,this.source.connect(this.highpass),this.highpass.connect(this.lowpass),this.lowpass.connect(this.delay),this.delay.connect(this.pitch),this.pitch.connect(this.spectral),this.spectral.connect(this.wetGain),this.lowpass.connect(this.dryGain),this.dryGain.connect(this.outGain),this.wetGain.connect(this.outGain),this.outGain.connect(this.analyser),this.outGain.connect(s.destination),this.startLevelLoop(),this.setState("running")}catch(s){throw this.setState("error",s instanceof Error?s.message:String(s)),await this.stop(),s}}}async stop(){this.levelTimer!==null&&(cancelAnimationFrame(this.levelTimer),this.levelTimer=null),this.stream&&(this.stream.getTracks().forEach(t=>t.stop()),this.stream=null);try{this.source?.disconnect(),this.highpass?.disconnect(),this.lowpass?.disconnect(),this.delay?.disconnect(),this.pitch?.disconnect(),this.spectral?.disconnect(),this.dryGain?.disconnect(),this.wetGain?.disconnect(),this.outGain?.disconnect(),this.analyser?.disconnect()}catch{}this.source=null,this.highpass=null,this.lowpass=null,this.delay=null,this.pitch=null,this.spectral=null,this.dryGain=null,this.wetGain=null,this.outGain=null,this.analyser=null,this.ctx&&this.ctx.state!=="closed"&&await this.ctx.close(),this.ctx=null,this.setState("idle")}setDelaySeconds(t){if(!this.ctx||!this.delay)return;const s=Math.max(0,Math.min(B,t));this.delay.delayTime.setTargetAtTime(s,this.ctx.currentTime,.02)}setPitchRatio(t){if(!this.ctx||!this.pitch)return;const s=Math.max(.125,Math.min(4,t)),e=this.pitch.parameters.get("pitchRatio");e&&e.setTargetAtTime(s,this.ctx.currentTime,.02)}setHighpassHz(t){!this.ctx||!this.highpass||this.highpass.frequency.setTargetAtTime(t,this.ctx.currentTime,.02)}setLowpassHz(t){!this.ctx||!this.lowpass||this.lowpass.frequency.setTargetAtTime(t,this.ctx.currentTime,.02)}setDryWet(t){if(!this.ctx||!this.dryGain||!this.wetGain)return;const s=Math.max(0,Math.min(1,t));this.dryGain.gain.setTargetAtTime(1-s,this.ctx.currentTime,.02),this.wetGain.gain.setTargetAtTime(s,this.ctx.currentTime,.02)}setOutputGain(t){!this.ctx||!this.outGain||this.outGain.gain.setTargetAtTime(Math.max(0,Math.min(2,t)),this.ctx.currentTime,.02)}setSpectralMode(t){this.spectral&&this.spectral.port.postMessage({type:"mode",mode:U[t]})}freezeSpectrum(){this.spectral&&this.spectral.port.postMessage({type:"freeze"})}releaseSpectrum(){this.spectral&&this.spectral.port.postMessage({type:"release"})}captureRawInput(t){return!this.ctx||!this.lowpass?Promise.reject(new Error("engine not running")):this.tapAudio(this.lowpass,t)}captureOutput(t){return!this.ctx||!this.outGain?Promise.reject(new Error("engine not running")):this.tapAudio(this.outGain,t)}tapAudio(t,s){if(!this.ctx)return Promise.reject(new Error("engine not running"));const e=this.ctx,r=new AudioWorkletNode(e,"tap",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]}),a=e.createGain();a.gain.value=0,t.connect(r),r.connect(a),a.connect(e.destination);const i=[],l=Math.floor(s*e.sampleRate);let p=0;return new Promise((c,g)=>{const y=setTimeout(()=>{u(),g(new Error("capture timed out"))},(s+2)*1e3),u=()=>{clearTimeout(y);try{r.port.postMessage({type:"set",active:!1}),r.disconnect(),a.disconnect()}catch{}};r.port.onmessage=h=>{const f=h.data;if(!(f instanceof Float32Array))return;const m=l-p;if(m<=0)return;const w=f.length<=m?new Float32Array(f):f.slice(0,m);if(i.push(w),p+=w.length,p>=l){const v=new Float32Array(p);let x=0;for(const L of i)v.set(L,x),x+=L.length;u(),c(v)}},r.port.postMessage({type:"set",active:!0})})}getSampleRate(){return this.ctx?.sampleRate??48e3}setState(t,s){this.state=t,this.cb.onState?.(t,s)}startLevelLoop(){if(!this.analyser)return;const t=new Float32Array(this.analyser.fftSize),s=this.analyser,e=()=>{if(!this.analyser)return;s.getFloatTimeDomainData(t);let r=0;for(let i=0;i<t.length;i++){const l=t[i]??0;r+=l*l}const a=Math.sqrt(r/t.length);this.cb.onLevel?.(a),this.levelTimer=requestAnimationFrame(e)};this.levelTimer=requestAnimationFrame(e)}}class at{constructor(t){this.opts=t;const s=t.canvas.getContext("2d");if(!s)throw new Error("2D canvas context unavailable");this.ctx=s;const e=new ArrayBuffer(t.analyser.frequencyBinCount);this.freq=new Uint8Array(e),this.resize()}ctx;rafId=null;freq;writeX=0;start(){if(this.rafId!==null)return;const t=()=>{this.draw(),this.rafId=requestAnimationFrame(t)};this.rafId=requestAnimationFrame(t)}stop(){this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=null}resize(){const t=window.devicePixelRatio||1,s=this.opts.canvas.getBoundingClientRect();this.opts.canvas.width=Math.max(1,Math.floor(s.width*t)),this.opts.canvas.height=Math.max(1,Math.floor(s.height*t)),this.ctx.fillStyle="#000",this.ctx.fillRect(0,0,this.opts.canvas.width,this.opts.canvas.height),this.writeX=0}draw(){const{canvas:t}=this.opts,s=this.ctx;this.opts.analyser.getByteFrequencyData(this.freq);const e=t.width,r=t.height,a=this.freq.length,i=2;for(let l=0;l<i;l++){const p=(this.writeX+l)%e;for(let c=0;c<r;c++){const g=1-c/r,y=Math.min(a-1,Math.floor(Math.pow(g,2)*a)),u=this.freq[y]??0;s.fillStyle=it(u),s.fillRect(p,c,1,1)}}this.writeX=(this.writeX+i)%e,s.fillStyle="rgba(255,255,255,0.35)",s.fillRect(this.writeX,0,1,r)}}function it(o){const t=o/255,s=Math.floor(255*Math.min(1,Math.max(0,1.5*t-.3))),e=Math.floor(255*Math.min(1,Math.max(0,1.4*t))),r=Math.floor(255*Math.min(1,Math.max(0,2.2*t-.9)));return`rgb(${s},${e},${r})`}const X="tde:prefs:v1";function rt(){try{const o=localStorage.getItem(X);if(!o)return{};const t=JSON.parse(o);return typeof t!="object"||t===null?{}:t}catch{return{}}}function ot(o){try{localStorage.setItem(X,JSON.stringify(o))}catch{}}function J(o,t){const s=t*2,e=o.length*2,r=new ArrayBuffer(44+e),a=new DataView(r);T(a,0,"RIFF"),a.setUint32(4,36+e,!0),T(a,8,"WAVE"),T(a,12,"fmt "),a.setUint32(16,16,!0),a.setUint16(20,1,!0),a.setUint16(22,1,!0),a.setUint32(24,t,!0),a.setUint32(28,s,!0),a.setUint16(32,2,!0),a.setUint16(34,16,!0),T(a,36,"data"),a.setUint32(40,e,!0);let i=44;for(let l=0;l<o.length;l++){const p=Math.max(-1,Math.min(1,o[l]??0));a.setInt16(i,p<0?p*32768:p*32767,!0),i+=2}return new Blob([r],{type:"audio/wav"})}function Q(o,t){const s=URL.createObjectURL(o),e=document.createElement("a");e.href=s,e.download=t,document.body.appendChild(e),e.click(),document.body.removeChild(e),setTimeout(()=>URL.revokeObjectURL(s),1e3)}function T(o,t,s){for(let e=0;e<s.length;e++)o.setUint8(t+e,s.charCodeAt(e))}const lt="modulepreload",ct=function(o,t){return new URL(o,t).href},_={},ut=function(t,s,e){let r=Promise.resolve();if(s&&s.length>0){const i=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),p=l?.nonce||l?.getAttribute("nonce");r=Promise.allSettled(s.map(c=>{if(c=ct(c,e),c in _)return;_[c]=!0;const g=c.endsWith(".css"),y=g?'[rel="stylesheet"]':"";if(!!e)for(let f=i.length-1;f>=0;f--){const m=i[f];if(m.href===c&&(!g||m.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${c}"]${y}`))return;const h=document.createElement("link");if(h.rel=g?"stylesheet":lt,g||(h.as="script"),h.crossOrigin="",h.href=c,p&&h.setAttribute("nonce",p),document.head.appendChild(h),g)return new Promise((f,m)=>{h.addEventListener("load",f),h.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${c}`)))})}))}function a(i){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=i,window.dispatchEvent(l),!l.defaultPrevented)throw i}return r.then(i=>{for(const l of i||[])l.status==="rejected"&&a(l.reason);return t().catch(a)})},H=5;function dt(o,t){o.innerHTML=`
    <h2>Offline analysis (Pyodide + librosa)</h2>
    <p style="margin: 0; color: var(--fg-dim); font-size: 0.85rem;">
      Captures ${H} seconds of the post-filter input and runs it through librosa
      in your browser. The first analysis lazy-loads ~25 MB of Pyodide + numpy + scipy + librosa
      from a public CDN — subsequent runs are instant. Nothing leaves your device.
    </p>
    <div class="row">
      <button id="analyze">Capture &amp; analyze ${H}s</button>
      <button id="save-wav" disabled>Save last capture as WAV</button>
      <span id="analyze-status" class="status">ready (worker not loaded)</span>
    </div>
    <div id="analysis-output" class="analysis-output hidden"></div>
  `;const s=o.querySelector("#analyze"),e=o.querySelector("#save-wav"),r=o.querySelector("#analyze-status"),a=o.querySelector("#analysis-output");let i=null,l=!1,p=null;e.addEventListener("click",()=>{if(!p)return;const u=new Date().toISOString().replace(/[:.]/g,"-"),h=J(p.audio,p.sampleRate);Q(h,`time-displaced-ears-${u}.wav`)});const c=(u,h=null)=>{r.textContent=u,r.classList.remove("ok","warn","err"),h&&r.classList.add(h)};s.addEventListener("click",()=>{g()});async function g(){if(!l){if(t.getState()!=="running"){c("start listening first","warn");return}l=!0,s.disabled=!0,a.classList.add("hidden");try{c(`capturing ${H}s …`,"warn");const u=await t.captureRawInput(H),h=t.getSampleRate();if(p={audio:new Float32Array(u),sampleRate:h},e.disabled=!1,!i){const m=await ut(()=>import("./analysis-client-Dsb8jJRP.js"),[],import.meta.url);i=new m.AnalysisClient({onStatus:(w,v)=>{c(v?`${w}: ${v}`:w,"warn")}})}c("analyzing …","warn");const f=await i.analyze(u,h);y(f),c("done","ok")}catch(u){const h=u instanceof Error?u.message:String(u);c(`error: ${h}`,"err")}finally{l=!1,s.disabled=!1}}}function y(u){a.classList.remove("hidden");const h=u.estimatedTempoBpm?`${u.estimatedTempoBpm.toFixed(1)} BPM`:"—";a.textContent=`duration       ${u.durationSec.toFixed(2)} s
sample rate    ${u.sampleRate} Hz
RMS            ${u.rms.toFixed(4)}
peak           ${u.peak.toFixed(4)}
zero-crossing  ${u.zeroCrossingRate.toFixed(4)}
centroid       ${u.spectralCentroidHz.toFixed(1)} Hz
rolloff(85%)   ${u.spectralRolloffHz.toFixed(1)} Hz
tempo (guess)  ${h}
onsets in 5s   ${u.onsetCount}

MFCC mean (13 coeffs)
`+u.mfccMean.map((f,m)=>`  c${String(m).padStart(2,"0")}  ${f.toFixed(3)}`).join(`
`)}}const ht=[{id:"delay-7s",name:"Seven-second delay",hint:"Hear the world 7s late",params:{delaySeconds:7,pitchRatio:1,highpassHz:20,lowpassHz:18e3,dryWet:1}},{id:"whale-song",name:"Whale song",hint:"Two octaves down",params:{delaySeconds:.01,pitchRatio:.25,highpassHz:20,lowpassHz:4e3,dryWet:1}},{id:"apartment-dream",name:"Apartment dream",hint:"Strip lows + light delay",params:{delaySeconds:.4,pitchRatio:1,highpassHz:800,lowpassHz:18e3,dryWet:1}},{id:"underwater",name:"Underwater",hint:"Cut highs, slow pitch",params:{delaySeconds:.2,pitchRatio:.5,highpassHz:20,lowpassHz:1200,dryWet:1}},{id:"monitor",name:"Monitor (passthrough)",hint:"Minimal processing",params:{delaySeconds:.01,pitchRatio:1,highpassHz:20,lowpassHz:18e3,dryWet:0}}],E={seconds:o=>o<1?`${(o*1e3).toFixed(0)}ms`:`${o.toFixed(2)}s`,ratio:o=>{const t=12*Math.log2(o);return`${t>=0?"+":""}${t.toFixed(1)} st`},hz:o=>o>=1e3?`${(o/1e3).toFixed(1)}kHz`:`${o.toFixed(0)}Hz`,pct:o=>`${Math.round(o*100)}%`};function pt(o){const t=new nt({onState:(n,d)=>I(n,d),onLevel:n=>Z(n)});let e={...V,...rt()},r=null,a=null;o.innerHTML=`
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
          <div class="row">
            <button id="record-output" disabled>Record output 5s</button>
            <span id="record-status" class="status">capture what you're hearing</span>
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

        <section class="card">
          <h2>Spectral processor (STFT + WebAudio worklet)</h2>
          <p style="margin: 0; color: var(--fg-dim); font-size: 0.85rem;">
            Runs after the pitch shifter. <b>Freeze</b> captures the current
            frequency content and sustains it indefinitely. <b>Smear</b> low-pass
            filters magnitudes across frames — drone-like textures.
          </p>
          <div class="row" id="spectral-modes">
            <button data-spectral="bypass" class="active">Bypass</button>
            <button data-spectral="freeze">Freeze mode</button>
            <button data-spectral="smear">Smear mode</button>
          </div>
          <div class="row">
            <button id="freeze-now" disabled>Freeze the current spectrum</button>
            <button id="release-spectrum" disabled>Release</button>
          </div>
        </section>

        <section class="card" id="analysis-card">
          <h2>Offline analysis (Pyodide + librosa)</h2>
        </section>
      </main>

      <footer>
        <span>v0.3.0 · processed locally, no audio leaves your device · installable as a PWA</span>
        <span>
          <a href="https://github.com/baditaflorin/implemment-the-following-time-displaced-ears" target="_blank" rel="noreferrer">source</a>
          · <a href="https://github.com/baditaflorin/implemment-the-following-time-displaced-ears/blob/main/docs/privacy.md" target="_blank" rel="noreferrer">privacy</a>
        </span>
      </footer>
    </div>
  `;const i=n=>{const d=o.querySelector(n);if(!d)throw new Error(`missing ${n}`);return d},l=i("#start"),p=i("#stop"),c=i("#status"),g=i("#badge"),y=i("#meter > .fill"),u=i("#spectrogram"),h=i("#delay"),f=i("#pitch"),m=i("#hpf"),w=i("#lpf"),v=i("#mix"),x=i("#out"),L=i("#spectral-modes"),k=i("#freeze-now"),G=i("#release-spectrum");function P(n){e.spectralMode=n,t.setSpectralMode(n),L.querySelectorAll("button").forEach(d=>{d.classList.toggle("active",d.dataset.spectral===n)}),k.disabled=n!=="freeze",G.disabled=n!=="freeze",b()}L.querySelectorAll("button").forEach(n=>{n.addEventListener("click",()=>{const d=n.dataset.spectral;d&&P(d)})}),k.addEventListener("click",()=>t.freezeSpectrum()),G.addEventListener("click",()=>t.releaseSpectrum());const O=i("#presets");for(const n of ht){const d=document.createElement("button");d.dataset.preset=n.id,d.innerHTML=`<span class="name">${n.name}</span><span class="hint">${n.hint}</span>`,d.addEventListener("click",()=>Y(n)),O.appendChild(d)}function W(){h.value=String(e.delaySeconds),f.value=String(e.pitchRatio),m.value=String(e.highpassHz),w.value=String(e.lowpassHz),v.value=String(e.dryWet),x.value=String(e.outputGain),S()}function S(){M("#ctl-delay",E.seconds(e.delaySeconds)),M("#ctl-pitch",E.ratio(e.pitchRatio)),M("#ctl-hpf",E.hz(e.highpassHz)),M("#ctl-lpf",E.hz(e.lowpassHz)),M("#ctl-mix",E.pct(e.dryWet)),M("#ctl-out",E.pct(e.outputGain))}function M(n,d){const z=o.querySelector(`${n} .value`);z&&(z.textContent=d)}function Y(n){e={...e,...n.params},a=n.id,W(),q(),b(),R()}function R(){O.querySelectorAll("button").forEach(n=>{const d=n.dataset.preset;n.classList.toggle("active",d===a)})}function q(){t.getState()==="running"&&(t.setDelaySeconds(e.delaySeconds),t.setPitchRatio(e.pitchRatio),t.setHighpassHz(e.highpassHz),t.setLowpassHz(e.lowpassHz),t.setDryWet(e.dryWet),t.setOutputGain(e.outputGain),t.setSpectralMode(e.spectralMode))}h.addEventListener("input",()=>{e.delaySeconds=parseFloat(h.value),t.setDelaySeconds(e.delaySeconds),S(),a=null,R(),b()}),f.addEventListener("input",()=>{e.pitchRatio=parseFloat(f.value),t.setPitchRatio(e.pitchRatio),S(),a=null,R(),b()}),m.addEventListener("input",()=>{e.highpassHz=parseFloat(m.value),t.setHighpassHz(e.highpassHz),S(),a=null,R(),b()}),w.addEventListener("input",()=>{e.lowpassHz=parseFloat(w.value),t.setLowpassHz(e.lowpassHz),S(),a=null,R(),b()}),v.addEventListener("input",()=>{e.dryWet=parseFloat(v.value),t.setDryWet(e.dryWet),S(),b()}),x.addEventListener("input",()=>{e.outputGain=parseFloat(x.value),t.setOutputGain(e.outputGain),S(),b()});function b(){ot(e)}function I(n,d){c.textContent=d?`${n} — ${d}`:n,c.classList.remove("ok","warn","err"),n==="running"&&c.classList.add("ok"),n==="starting"&&c.classList.add("warn"),n==="error"&&c.classList.add("err"),g.textContent=n==="running"?"mic: live":`mic: ${n}`,l.classList.toggle("hidden",n==="running"||n==="starting"),p.classList.toggle("hidden",n!=="running"&&n!=="starting"),l.disabled=n==="starting",$(n)}function Z(n){const d=20*Math.log10(n+1e-9),z=Math.max(0,Math.min(1,(d+60)/60));y.style.width=`${(z*100).toFixed(1)}%`}l.addEventListener("click",async()=>{try{await t.start(e);const n=t.getAnalyser();n&&(r=new at({canvas:u,analyser:n}),r.start(),window.addEventListener("resize",()=>r?.resize())),q()}catch(n){c.textContent=`error: ${n instanceof Error?n.message:n}`,c.classList.add("err")}}),p.addEventListener("click",()=>{r?.stop(),r=null,t.stop(),y.style.width="0%",$("idle")});const F=i("#record-output"),A=i("#record-status"),D=5;let C=!1;F.addEventListener("click",()=>{tt()});async function tt(){if(!C){if(t.getState()!=="running"){A.textContent="start listening first";return}C=!0,F.disabled=!0;try{A.textContent=`recording ${D}s of output…`;const n=await t.captureOutput(D),d=t.getSampleRate(),z=J(n,d),et=new Date().toISOString().replace(/[:.]/g,"-");Q(z,`time-displaced-ears-output-${et}.wav`),A.textContent=`saved ${n.length} samples at ${d} Hz`}catch(n){A.textContent=`error: ${n instanceof Error?n.message:n}`}finally{C=!1,$(t.getState())}}}function $(n){C||(F.disabled=n!=="running",n!=="running"&&(A.textContent="capture what you're hearing"))}dt(i("#analysis-card"),t),W(),P(e.spectralMode),I("idle")}function ft(){"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("./sw.js").catch(o=>{console.warn("sw registration failed",o)})})}const K=document.getElementById("app");if(!K)throw new Error("Mount node #app missing from index.html");pt(K);ft();window.__tde__={pitchShifterWorkletUrl:N,spectralWorkletUrl:j};
