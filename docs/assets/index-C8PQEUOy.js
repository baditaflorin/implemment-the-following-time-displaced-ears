(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const r of document.querySelectorAll('link[rel="modulepreload"]'))e(r);new MutationObserver(r=>{for(const n of r)if(n.type==="childList")for(const i of n.addedNodes)i.tagName==="LINK"&&i.rel==="modulepreload"&&e(i)}).observe(document,{childList:!0,subtree:!0});function s(r){const n={};return r.integrity&&(n.integrity=r.integrity),r.referrerPolicy&&(n.referrerPolicy=r.referrerPolicy),r.crossOrigin==="use-credentials"?n.credentials="include":r.crossOrigin==="anonymous"?n.credentials="omit":n.credentials="same-origin",n}function e(r){if(r.ep)return;r.ep=!0;const n=s(r);fetch(r.href,n)}})();const I=""+new URL("pitch-shifter.worklet-BcMiuziD.js",import.meta.url).href,V=""+new URL("tap.worklet-CUyQJTFC.js",import.meta.url).href,U=""+new URL("spectral.worklet-CBiHA9Ok.js",import.meta.url).href,P={bypass:0,freeze:1,smear:2},D={delaySeconds:7,pitchRatio:1,highpassHz:20,lowpassHz:18e3,dryWet:1,outputGain:.9,spectralMode:"bypass"},q=30;class X{constructor(t={}){this.cb=t}ctx=null;stream=null;source=null;delay=null;highpass=null;lowpass=null;pitch=null;spectral=null;dryGain=null;wetGain=null;outGain=null;analyser=null;levelTimer=null;state="idle";getState(){return this.state}getAnalyser(){return this.analyser}getContext(){return this.ctx}getSourceNode(){return this.source}async start(t=D){if(!(this.state==="running"||this.state==="starting")){this.setState("starting");try{const s=new AudioContext({latencyHint:"interactive"});this.ctx=s,this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1,channelCount:1},video:!1}),await s.audioWorklet.addModule(I),await s.audioWorklet.addModule(V),await s.audioWorklet.addModule(U),this.source=s.createMediaStreamSource(this.stream),this.highpass=s.createBiquadFilter(),this.highpass.type="highpass",this.highpass.frequency.value=t.highpassHz,this.highpass.Q.value=.707,this.lowpass=s.createBiquadFilter(),this.lowpass.type="lowpass",this.lowpass.frequency.value=t.lowpassHz,this.lowpass.Q.value=.707,this.delay=s.createDelay(q),this.delay.delayTime.value=t.delaySeconds,this.pitch=new AudioWorkletNode(s,"pitch-shifter",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1],parameterData:{pitchRatio:t.pitchRatio}}),this.spectral=new AudioWorkletNode(s,"spectral",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]}),this.spectral.port.postMessage({type:"mode",mode:P[t.spectralMode]}),this.dryGain=s.createGain(),this.dryGain.gain.value=1-t.dryWet,this.wetGain=s.createGain(),this.wetGain.gain.value=t.dryWet,this.outGain=s.createGain(),this.outGain.gain.value=t.outputGain,this.analyser=s.createAnalyser(),this.analyser.fftSize=2048,this.analyser.smoothingTimeConstant=.75,this.source.connect(this.highpass),this.highpass.connect(this.lowpass),this.lowpass.connect(this.delay),this.delay.connect(this.pitch),this.pitch.connect(this.spectral),this.spectral.connect(this.wetGain),this.lowpass.connect(this.dryGain),this.dryGain.connect(this.outGain),this.wetGain.connect(this.outGain),this.outGain.connect(this.analyser),this.outGain.connect(s.destination),this.startLevelLoop(),this.setState("running")}catch(s){throw this.setState("error",s instanceof Error?s.message:String(s)),await this.stop(),s}}}async stop(){this.levelTimer!==null&&(cancelAnimationFrame(this.levelTimer),this.levelTimer=null),this.stream&&(this.stream.getTracks().forEach(t=>t.stop()),this.stream=null);try{this.source?.disconnect(),this.highpass?.disconnect(),this.lowpass?.disconnect(),this.delay?.disconnect(),this.pitch?.disconnect(),this.spectral?.disconnect(),this.dryGain?.disconnect(),this.wetGain?.disconnect(),this.outGain?.disconnect(),this.analyser?.disconnect()}catch{}this.source=null,this.highpass=null,this.lowpass=null,this.delay=null,this.pitch=null,this.spectral=null,this.dryGain=null,this.wetGain=null,this.outGain=null,this.analyser=null,this.ctx&&this.ctx.state!=="closed"&&await this.ctx.close(),this.ctx=null,this.setState("idle")}setDelaySeconds(t){if(!this.ctx||!this.delay)return;const s=Math.max(0,Math.min(q,t));this.delay.delayTime.setTargetAtTime(s,this.ctx.currentTime,.02)}setPitchRatio(t){if(!this.ctx||!this.pitch)return;const s=Math.max(.125,Math.min(4,t)),e=this.pitch.parameters.get("pitchRatio");e&&e.setTargetAtTime(s,this.ctx.currentTime,.02)}setHighpassHz(t){!this.ctx||!this.highpass||this.highpass.frequency.setTargetAtTime(t,this.ctx.currentTime,.02)}setLowpassHz(t){!this.ctx||!this.lowpass||this.lowpass.frequency.setTargetAtTime(t,this.ctx.currentTime,.02)}setDryWet(t){if(!this.ctx||!this.dryGain||!this.wetGain)return;const s=Math.max(0,Math.min(1,t));this.dryGain.gain.setTargetAtTime(1-s,this.ctx.currentTime,.02),this.wetGain.gain.setTargetAtTime(s,this.ctx.currentTime,.02)}setOutputGain(t){!this.ctx||!this.outGain||this.outGain.gain.setTargetAtTime(Math.max(0,Math.min(2,t)),this.ctx.currentTime,.02)}setSpectralMode(t){this.spectral&&this.spectral.port.postMessage({type:"mode",mode:P[t]})}freezeSpectrum(){this.spectral&&this.spectral.port.postMessage({type:"freeze"})}releaseSpectrum(){this.spectral&&this.spectral.port.postMessage({type:"release"})}captureRawInput(t){if(!this.ctx||!this.lowpass)return Promise.reject(new Error("engine not running"));const s=this.ctx,e=new AudioWorkletNode(s,"tap",{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[1]}),r=s.createGain();r.gain.value=0,this.lowpass.connect(e),e.connect(r),r.connect(s.destination);const n=[],i=Math.floor(t*s.sampleRate);let l=0;return new Promise((p,c)=>{const y=setTimeout(()=>{g(),c(new Error("capture timed out"))},(t+2)*1e3),g=()=>{clearTimeout(y);try{e.port.postMessage({type:"set",active:!1}),e.disconnect(),r.disconnect()}catch{}};e.port.onmessage=d=>{const u=d.data;if(!(u instanceof Float32Array))return;const f=i-l;if(f<=0)return;const m=u.length<=f?new Float32Array(u):u.slice(0,f);if(n.push(m),l+=m.length,l>=i){const w=new Float32Array(l);let v=0;for(const x of n)w.set(x,v),v+=x.length;g(),p(w)}},e.port.postMessage({type:"set",active:!0})})}getSampleRate(){return this.ctx?.sampleRate??48e3}setState(t,s){this.state=t,this.cb.onState?.(t,s)}startLevelLoop(){if(!this.analyser)return;const t=new Float32Array(this.analyser.fftSize),s=this.analyser,e=()=>{if(!this.analyser)return;s.getFloatTimeDomainData(t);let r=0;for(let i=0;i<t.length;i++){const l=t[i]??0;r+=l*l}const n=Math.sqrt(r/t.length);this.cb.onLevel?.(n),this.levelTimer=requestAnimationFrame(e)};this.levelTimer=requestAnimationFrame(e)}}class J{constructor(t){this.opts=t;const s=t.canvas.getContext("2d");if(!s)throw new Error("2D canvas context unavailable");this.ctx=s;const e=new ArrayBuffer(t.analyser.frequencyBinCount);this.freq=new Uint8Array(e),this.resize()}ctx;rafId=null;freq;writeX=0;start(){if(this.rafId!==null)return;const t=()=>{this.draw(),this.rafId=requestAnimationFrame(t)};this.rafId=requestAnimationFrame(t)}stop(){this.rafId!==null&&cancelAnimationFrame(this.rafId),this.rafId=null}resize(){const t=window.devicePixelRatio||1,s=this.opts.canvas.getBoundingClientRect();this.opts.canvas.width=Math.max(1,Math.floor(s.width*t)),this.opts.canvas.height=Math.max(1,Math.floor(s.height*t)),this.ctx.fillStyle="#000",this.ctx.fillRect(0,0,this.opts.canvas.width,this.opts.canvas.height),this.writeX=0}draw(){const{canvas:t}=this.opts,s=this.ctx;this.opts.analyser.getByteFrequencyData(this.freq);const e=t.width,r=t.height,n=this.freq.length,i=2;for(let l=0;l<i;l++){const p=(this.writeX+l)%e;for(let c=0;c<r;c++){const y=1-c/r,g=Math.min(n-1,Math.floor(Math.pow(y,2)*n)),d=this.freq[g]??0;s.fillStyle=Q(d),s.fillRect(p,c,1,1)}}this.writeX=(this.writeX+i)%e,s.fillStyle="rgba(255,255,255,0.35)",s.fillRect(this.writeX,0,1,r)}}function Q(o){const t=o/255,s=Math.floor(255*Math.min(1,Math.max(0,1.5*t-.3))),e=Math.floor(255*Math.min(1,Math.max(0,1.4*t))),r=Math.floor(255*Math.min(1,Math.max(0,2.2*t-.9)));return`rgb(${s},${e},${r})`}const B="tde:prefs:v1";function K(){try{const o=localStorage.getItem(B);if(!o)return{};const t=JSON.parse(o);return typeof t!="object"||t===null?{}:t}catch{return{}}}function Y(o){try{localStorage.setItem(B,JSON.stringify(o))}catch{}}const Z="modulepreload",tt=function(o,t){return new URL(o,t).href},O={},et=function(t,s,e){let r=Promise.resolve();if(s&&s.length>0){const i=document.getElementsByTagName("link"),l=document.querySelector("meta[property=csp-nonce]"),p=l?.nonce||l?.getAttribute("nonce");r=Promise.allSettled(s.map(c=>{if(c=tt(c,e),c in O)return;O[c]=!0;const y=c.endsWith(".css"),g=y?'[rel="stylesheet"]':"";if(!!e)for(let f=i.length-1;f>=0;f--){const m=i[f];if(m.href===c&&(!y||m.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${c}"]${g}`))return;const u=document.createElement("link");if(u.rel=y?"stylesheet":Z,y||(u.as="script"),u.crossOrigin="",u.href=c,p&&u.setAttribute("nonce",p),document.head.appendChild(u),y)return new Promise((f,m)=>{u.addEventListener("load",f),u.addEventListener("error",()=>m(new Error(`Unable to preload CSS for ${c}`)))})}))}function n(i){const l=new Event("vite:preloadError",{cancelable:!0});if(l.payload=i,window.dispatchEvent(l),!l.defaultPrevented)throw i}return r.then(i=>{for(const l of i||[])l.status==="rejected"&&n(l.reason);return t().catch(n)})};function st(o,t){const s=t*2,e=o.length*2,r=new ArrayBuffer(44+e),n=new DataView(r);A(n,0,"RIFF"),n.setUint32(4,36+e,!0),A(n,8,"WAVE"),A(n,12,"fmt "),n.setUint32(16,16,!0),n.setUint16(20,1,!0),n.setUint16(22,1,!0),n.setUint32(24,t,!0),n.setUint32(28,s,!0),n.setUint16(32,2,!0),n.setUint16(34,16,!0),A(n,36,"data"),n.setUint32(40,e,!0);let i=44;for(let l=0;l<o.length;l++){const p=Math.max(-1,Math.min(1,o[l]??0));n.setInt16(i,p<0?p*32768:p*32767,!0),i+=2}return new Blob([r],{type:"audio/wav"})}function at(o,t){const s=URL.createObjectURL(o),e=document.createElement("a");e.href=s,e.download=t,document.body.appendChild(e),e.click(),document.body.removeChild(e),setTimeout(()=>URL.revokeObjectURL(s),1e3)}function A(o,t,s){for(let e=0;e<s.length;e++)o.setUint8(t+e,s.charCodeAt(e))}const R=5;function nt(o,t){o.innerHTML=`
    <h2>Offline analysis (Pyodide + librosa)</h2>
    <p style="margin: 0; color: var(--fg-dim); font-size: 0.85rem;">
      Captures ${R} seconds of the post-filter input and runs it through librosa
      in your browser. The first analysis lazy-loads ~25 MB of Pyodide + numpy + scipy + librosa
      from a public CDN — subsequent runs are instant. Nothing leaves your device.
    </p>
    <div class="row">
      <button id="analyze">Capture &amp; analyze ${R}s</button>
      <button id="save-wav" disabled>Save last capture as WAV</button>
      <span id="analyze-status" class="status">ready (worker not loaded)</span>
    </div>
    <div id="analysis-output" class="analysis-output hidden"></div>
  `;const s=o.querySelector("#analyze"),e=o.querySelector("#save-wav"),r=o.querySelector("#analyze-status"),n=o.querySelector("#analysis-output");let i=null,l=!1,p=null;e.addEventListener("click",()=>{if(!p)return;const d=new Date().toISOString().replace(/[:.]/g,"-"),u=st(p.audio,p.sampleRate);at(u,`time-displaced-ears-${d}.wav`)});const c=(d,u=null)=>{r.textContent=d,r.classList.remove("ok","warn","err"),u&&r.classList.add(u)};s.addEventListener("click",()=>{y()});async function y(){if(!l){if(t.getState()!=="running"){c("start listening first","warn");return}l=!0,s.disabled=!0,n.classList.add("hidden");try{c(`capturing ${R}s …`,"warn");const d=await t.captureRawInput(R),u=t.getSampleRate();if(p={audio:new Float32Array(d),sampleRate:u},e.disabled=!1,!i){const m=await et(()=>import("./analysis-client-Dsb8jJRP.js"),[],import.meta.url);i=new m.AnalysisClient({onStatus:(w,v)=>{c(v?`${w}: ${v}`:w,"warn")}})}c("analyzing …","warn");const f=await i.analyze(d,u);g(f),c("done","ok")}catch(d){const u=d instanceof Error?d.message:String(d);c(`error: ${u}`,"err")}finally{l=!1,s.disabled=!1}}}function g(d){n.classList.remove("hidden");const u=d.estimatedTempoBpm?`${d.estimatedTempoBpm.toFixed(1)} BPM`:"—";n.textContent=`duration       ${d.durationSec.toFixed(2)} s
sample rate    ${d.sampleRate} Hz
RMS            ${d.rms.toFixed(4)}
peak           ${d.peak.toFixed(4)}
zero-crossing  ${d.zeroCrossingRate.toFixed(4)}
centroid       ${d.spectralCentroidHz.toFixed(1)} Hz
rolloff(85%)   ${d.spectralRolloffHz.toFixed(1)} Hz
tempo (guess)  ${u}
onsets in 5s   ${d.onsetCount}

MFCC mean (13 coeffs)
`+d.mfccMean.map((f,m)=>`  c${String(m).padStart(2,"0")}  ${f.toFixed(3)}`).join(`
`)}}const it=[{id:"delay-7s",name:"Seven-second delay",hint:"Hear the world 7s late",params:{delaySeconds:7,pitchRatio:1,highpassHz:20,lowpassHz:18e3,dryWet:1}},{id:"whale-song",name:"Whale song",hint:"Two octaves down",params:{delaySeconds:.01,pitchRatio:.25,highpassHz:20,lowpassHz:4e3,dryWet:1}},{id:"apartment-dream",name:"Apartment dream",hint:"Strip lows + light delay",params:{delaySeconds:.4,pitchRatio:1,highpassHz:800,lowpassHz:18e3,dryWet:1}},{id:"underwater",name:"Underwater",hint:"Cut highs, slow pitch",params:{delaySeconds:.2,pitchRatio:.5,highpassHz:20,lowpassHz:1200,dryWet:1}},{id:"monitor",name:"Monitor (passthrough)",hint:"Minimal processing",params:{delaySeconds:.01,pitchRatio:1,highpassHz:20,lowpassHz:18e3,dryWet:0}}],z={seconds:o=>o<1?`${(o*1e3).toFixed(0)}ms`:`${o.toFixed(2)}s`,ratio:o=>{const t=12*Math.log2(o);return`${t>=0?"+":""}${t.toFixed(1)} st`},hz:o=>o>=1e3?`${(o/1e3).toFixed(1)}kHz`:`${o.toFixed(0)}Hz`,pct:o=>`${Math.round(o*100)}%`};function rt(o){const t=new X({onState:(a,h)=>W(a,h),onLevel:a=>j(a)});let e={...D,...K()},r=null,n=null;o.innerHTML=`
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
  `;const i=a=>{const h=o.querySelector(a);if(!h)throw new Error(`missing ${a}`);return h},l=i("#start"),p=i("#stop"),c=i("#status"),y=i("#badge"),g=i("#meter > .fill"),d=i("#spectrogram"),u=i("#delay"),f=i("#pitch"),m=i("#hpf"),w=i("#lpf"),v=i("#mix"),x=i("#out"),T=i("#spectral-modes"),F=i("#freeze-now"),H=i("#release-spectrum");function C(a){e.spectralMode=a,t.setSpectralMode(a),T.querySelectorAll("button").forEach(h=>{h.classList.toggle("active",h.dataset.spectral===a)}),F.disabled=a!=="freeze",H.disabled=a!=="freeze",b()}T.querySelectorAll("button").forEach(a=>{a.addEventListener("click",()=>{const h=a.dataset.spectral;h&&C(h)})}),F.addEventListener("click",()=>t.freezeSpectrum()),H.addEventListener("click",()=>t.releaseSpectrum());const k=i("#presets");for(const a of it){const h=document.createElement("button");h.dataset.preset=a.id,h.innerHTML=`<span class="name">${a.name}</span><span class="hint">${a.hint}</span>`,h.addEventListener("click",()=>N(a)),k.appendChild(h)}function G(){u.value=String(e.delaySeconds),f.value=String(e.pitchRatio),m.value=String(e.highpassHz),w.value=String(e.lowpassHz),v.value=String(e.dryWet),x.value=String(e.outputGain),S()}function S(){M("#ctl-delay",z.seconds(e.delaySeconds)),M("#ctl-pitch",z.ratio(e.pitchRatio)),M("#ctl-hpf",z.hz(e.highpassHz)),M("#ctl-lpf",z.hz(e.lowpassHz)),M("#ctl-mix",z.pct(e.dryWet)),M("#ctl-out",z.pct(e.outputGain))}function M(a,h){const L=o.querySelector(`${a} .value`);L&&(L.textContent=h)}function N(a){e={...e,...a.params},n=a.id,G(),$(),b(),E()}function E(){k.querySelectorAll("button").forEach(a=>{const h=a.dataset.preset;a.classList.toggle("active",h===n)})}function $(){t.getState()==="running"&&(t.setDelaySeconds(e.delaySeconds),t.setPitchRatio(e.pitchRatio),t.setHighpassHz(e.highpassHz),t.setLowpassHz(e.lowpassHz),t.setDryWet(e.dryWet),t.setOutputGain(e.outputGain),t.setSpectralMode(e.spectralMode))}u.addEventListener("input",()=>{e.delaySeconds=parseFloat(u.value),t.setDelaySeconds(e.delaySeconds),S(),n=null,E(),b()}),f.addEventListener("input",()=>{e.pitchRatio=parseFloat(f.value),t.setPitchRatio(e.pitchRatio),S(),n=null,E(),b()}),m.addEventListener("input",()=>{e.highpassHz=parseFloat(m.value),t.setHighpassHz(e.highpassHz),S(),n=null,E(),b()}),w.addEventListener("input",()=>{e.lowpassHz=parseFloat(w.value),t.setLowpassHz(e.lowpassHz),S(),n=null,E(),b()}),v.addEventListener("input",()=>{e.dryWet=parseFloat(v.value),t.setDryWet(e.dryWet),S(),b()}),x.addEventListener("input",()=>{e.outputGain=parseFloat(x.value),t.setOutputGain(e.outputGain),S(),b()});function b(){Y(e)}function W(a,h){c.textContent=h?`${a} — ${h}`:a,c.classList.remove("ok","warn","err"),a==="running"&&c.classList.add("ok"),a==="starting"&&c.classList.add("warn"),a==="error"&&c.classList.add("err"),y.textContent=a==="running"?"mic: live":`mic: ${a}`,l.classList.toggle("hidden",a==="running"||a==="starting"),p.classList.toggle("hidden",a!=="running"&&a!=="starting"),l.disabled=a==="starting"}function j(a){const h=20*Math.log10(a+1e-9),L=Math.max(0,Math.min(1,(h+60)/60));g.style.width=`${(L*100).toFixed(1)}%`}l.addEventListener("click",async()=>{try{await t.start(e);const a=t.getAnalyser();a&&(r=new J({canvas:d,analyser:a}),r.start(),window.addEventListener("resize",()=>r?.resize())),$()}catch(a){c.textContent=`error: ${a instanceof Error?a.message:a}`,c.classList.add("err")}}),p.addEventListener("click",()=>{r?.stop(),r=null,t.stop(),g.style.width="0%"}),nt(i("#analysis-card"),t),G(),C(e.spectralMode),W("idle")}function ot(){"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("./sw.js").catch(o=>{console.warn("sw registration failed",o)})})}const _=document.getElementById("app");if(!_)throw new Error("Mount node #app missing from index.html");rt(_);ot();window.__tde__={pitchShifterWorkletUrl:I,spectralWorkletUrl:U};
