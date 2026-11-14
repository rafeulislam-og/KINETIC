/* KINETIC Motion Playground — production-minded progressive enhancement.
   Uses GSAP + ScrollTrigger/Flip when they are available. All interactions have
   native browser fallbacks, so the downloaded page also runs without internet. */
(() => {
  'use strict';
  const $ = (s, ctx = document) => ctx.querySelector(s);
  const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(pointer: fine)');
  const hasGSAP = () => typeof window.gsap !== 'undefined';
  let playEnabled = !reduceMQ.matches;
  let labStatus = null;
  const pauseTargets = new Set();
  const motionAllowed = () => playEnabled && !reduceMQ.matches;
  const easingCSS = {'power3.out':'cubic-bezier(.22, 1, .36, 1)','expo.out':'cubic-bezier(.16, 1, .3, 1)','back.out(1.4)':'cubic-bezier(.16, 1.45, .38, 1)','elastic.out(1, 0.4)':'cubic-bezier(.21,1.58,.4,1)','circ.inOut':'cubic-bezier(.65,0,.35,1)','none':'linear'};
  function animateNative(el, frames, timing) {
    if (!el || !el.animate || !motionAllowed()) return null;
    try { return el.animate(frames, {fill:'both', ...timing}); }
    catch (e) { console.warn('KINETIC: animation fallback skipped:', e.message); return null; }
  }
  function scheduleScroll(fn) {
    let waiting = false;
    const handler = () => {
      if (waiting) return;
      waiting = true;
      requestAnimationFrame(() => { waiting = false; fn(); });
    };
    window.addEventListener('scroll', handler, {passive:true});
    window.addEventListener('resize', handler, {passive:true});
    handler(); return handler;
  }
  function initNavigation() {
    const toggle = $('.menu-toggle'); const menu = $('.mobile-menu');
    function setMenu(open) {
      if (!menu || !toggle) return;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', String(!open));
      menu.inert = !open;
      document.body.classList.toggle('menu-open', open);
      if (!open) toggle.focus({preventScroll:true});
    }
    if (toggle && menu) {
      toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
      $$('.mobile-menu a').forEach(link => link.addEventListener('click', () => setMenu(false)));
      document.addEventListener('keydown', e => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') setMenu(false); });
      window.matchMedia('(min-width: 851px)').addEventListener('change', e => { if(e.matches && toggle.getAttribute('aria-expanded') === 'true') setMenu(false); });
    }
    const progress = $('#scroll-progress-fill');
    scheduleScroll(() => {
      const total = document.documentElement.scrollHeight - window.innerHeight;
      if (progress) progress.style.width = (total > 0 ? clamp(window.scrollY / total)*100 : 0).toFixed(2) + '%';
    });
    const toggleMotion = $('#motion-toggle');
    function updateMotionUI() {
      if (!toggleMotion) return;
      toggleMotion.setAttribute('aria-pressed', String(playEnabled));
      toggleMotion.setAttribute('aria-label', playEnabled ? 'Disable animated motion' : 'Enable animated motion');
      const label = $('#motion-mode-label'); if (label) label.textContent = 'PLAY MODE: ' + (motionAllowed() ? 'ON' : 'OFF');
      document.body.classList.toggle('no-motion', !motionAllowed());
      window.dispatchEvent(new CustomEvent('kinetic:motionchange', {detail:{enabled:motionAllowed()}}));
    }
    if (toggleMotion) toggleMotion.addEventListener('click', () => { playEnabled = !playEnabled; updateMotionUI(); });
    reduceMQ.addEventListener('change', updateMotionUI);
    updateMotionUI();
  }
  function initCursor() {
    const dot = $('.cursor-dot'); const ring = $('.cursor-ring');
    if (!dot || !ring || !finePointer.matches || reduceMQ.matches) return;
    let dx = -100, dy = -100, rx = -100, ry = -100, visible = false, frame = 0;
    function move(e) {
      dx = e.clientX; dy = e.clientY;
      if (!visible) {rx=dx;ry=dy;visible=true;dot.style.opacity=ring.style.opacity='1';}
      if (!frame) frame = requestAnimationFrame(tick);
    }
    function tick() {
      frame = 0;
      rx += (dx-rx)*.25; ry += (dy-ry)*.25;
      dot.style.left=dx+'px';dot.style.top=dy+'px';
      ring.style.left=rx+'px';ring.style.top=ry+'px';
      if (Math.abs(rx-dx)>.25 || Math.abs(ry-dy)>.25) frame = requestAnimationFrame(tick);
    }
    document.addEventListener('pointermove',move,{passive:true});
    document.addEventListener('pointerleave',() => {visible=false;dot.style.opacity=ring.style.opacity='0';});
    $$('a,button,input,select,.magnetic-target').forEach(el => {
      el.addEventListener('pointerenter',() => ring.classList.add('is-hovering'));
      el.addEventListener('pointerleave',() => ring.classList.remove('is-hovering'));
    });
  }
  function initHero() {
    const elements = $$('.hero-kicker,.title-line,.hero-description,.round-link,.hero-index');
    if (motionAllowed()) {
      if (hasGSAP()) {
        window.gsap.from(elements,{autoAlpha:0,y:26,duration:1.1,stagger:.10,ease:'power3.out',clearProps:'all'});
      } else {
        elements.forEach((el,i) => animateNative(el,[{opacity:0,transform:'translateY(25px)'},{opacity:1,transform:'translateY(0px)'}],{duration:950,delay:70+i*105,easing:'cubic-bezier(.22,1,.36,1)'}));
      }
    }
    const orbit = $('.hero-orbit.orbit-one');
    const hero = $('.hero');
    if (orbit && hero && finePointer.matches) {
      hero.addEventListener('pointermove', e => {
        if (!motionAllowed()) return;
        const r=hero.getBoundingClientRect();
        const x = ((e.clientX-r.left)/r.width-.5)*28, y=((e.clientY-r.top)/r.height-.5)*22;
        orbit.style.transform=`translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      },{passive:true});
      hero.addEventListener('pointerleave',()=>orbit.style.transform='translate(0,0)');
    }
  }
  function initTypeShift() {
    const trigger = $('.type-trigger'); const letters = $$('.type-playground span');
    if (!trigger || !letters.length) return;
    let active = false;
    function run() {
      if (active) return;
      active = true; trigger.disabled=true;
      if (!motionAllowed()) { letters.forEach(l => l.style.color=''); active=false;trigger.disabled=false; return; }
      const motions=[];
      if (hasGSAP()) {
        const tl = window.gsap.timeline({onComplete:()=>{active=false;trigger.disabled=false}});
        tl.to(letters,{y:(i)=>i%2?-35:35,rotation:(i)=>i%2?12:-12,scale:(i)=>i%3===0?1.2:1,stagger:.07,duration:.42,ease:'power3.out'})
          .to(letters,{y:0,rotation:0,scale:1,stagger:.06,duration:.7,ease:'elastic.out(1,0.45)'});
      } else {
        letters.forEach((el,i) => {
          const v=i%2 ? -32:32;
          const a=animateNative(el,[{transform:'translateY(0) rotate(0deg) scale(1)',color:'#f3f1eb'},{transform:`translateY(${v}px) rotate(${i%2?12:-12}deg) scale(1.14)`,color:'#ff1b42',offset:.44},{transform:'translateY(0) rotate(0deg) scale(1)',color:'#f3f1eb'}],{duration:1050,delay:60*i,easing:'cubic-bezier(.22,1,.36,1)'});
          if(a) motions.push(a.finished.catch(()=>{}));
        });
        Promise.all(motions).then(()=>{active=false;trigger.disabled=false});
        if (!motions.length){active=false;trigger.disabled=false;}
      }
    }
    trigger.addEventListener('click',run);
    $('.type-visual')?.addEventListener('dblclick',run);
  }
  function initMagnetic() {
    const root = $('#magnetic-playground');
    if (root) {
      const big=$('.magnetic-target-large',root), small=$('.magnetic-target-small',root), orbit=$('.magnetic-orbit',root);
      [big,small,orbit].forEach(el=>{if(el)el.style.transition='transform .23s cubic-bezier(.2,.8,.2,1)'});
      root.addEventListener('pointermove', e => {
        if (!motionAllowed() || !finePointer.matches) return;
        const r=root.getBoundingClientRect();const x=((e.clientX-r.left)/r.width-.5),y=((e.clientY-r.top)/r.height-.5);
        if(big)big.style.transform=`translate(calc(-50% + ${x*62}px), calc(-50% + ${y*62}px))`;
        if(small)small.style.transform=`translate(calc(-50% + ${-x*52}px), calc(-50% + ${-y*42}px))`;
        if(orbit)orbit.style.transform=`translate(calc(-50% + ${x*15}px), calc(-50% + ${y*15}px)) rotate(${x*13}deg)`;
      },{passive:true});
      root.addEventListener('pointerleave',()=>{
        if(big)big.style.transform='translate(-50%,-50%)';if(small)small.style.transform='translate(-50%,-50%)';if(orbit)orbit.style.transform='translate(-50%,-50%) rotate(0)';
      });
      root.addEventListener('click',()=> {
        if(!motionAllowed()) return;
        animateNative(big,[{scale:1},{scale:1.16},{scale:1}],{duration:550,easing:'ease-out'});
      });
    }
    $$('.magnetic').forEach(el=> {
      el.addEventListener('pointermove',e=>{
        if(!finePointer.matches || !motionAllowed()) return;
        const r=el.getBoundingClientRect(),x=(e.clientX-r.left-r.width/2)*.12,y=(e.clientY-r.top-r.height/2)*.12;
        if (hasGSAP()) window.gsap.to(el,{x,y,duration:.45,overwrite:true,ease:'power3.out'});
        else {el.style.transition='transform .3s';el.style.transform=`translate(${x}px,${y}px)`;}
      },{passive:true});
      el.addEventListener('pointerleave',()=>{
        if(hasGSAP()) window.gsap.to(el,{x:0,y:0,duration:.6,overwrite:true,ease:'elastic.out(1,0.5)'});
        else el.style.transform='';
      });
    });
  }
  function initStory() {
    const track = $('.story-track');const stage = $('.story-stage');
    if (!track || !stage) return;
    const scenes = $$('.story-scene'); const sceneCurrent=$('#story-current'), fill=$('#story-progress-fill');
    let current = -1;
    function renderStory() {
      const rect=track.getBoundingClientRect();
      const span=Math.max(1,rect.height-window.innerHeight + 90);
      const progress=clamp((90-rect.top)/span),index=Math.min(2,Math.floor(progress*3));
      if(index!==current) {
        current=index; scenes.forEach((scene,i)=>{const on=i===current;scene.classList.toggle('is-active',on);scene.setAttribute('aria-hidden',String(!on));});
        stage.classList.toggle('is-scene-1',index===1);stage.classList.toggle('is-scene-2',index===2);
        if(sceneCurrent)sceneCurrent.textContent='0'+(index+1);
      }
      if(fill)fill.style.width=(progress*100).toFixed(1)+'%';
      const demo=$('.scroll-progress-demo span');if(demo)demo.style.height=(20+progress*80)+'%';
    }
    scheduleScroll(renderStory);
    $('.scroll-trigger')?.addEventListener('click',()=>$('#scroll-story')?.scrollIntoView({behavior:motionAllowed()?'smooth':'instant'}));
  }
  function initGridAndFilters() {
    const grid=$('#experiment-grid'),filterBtns=$$('.filter-button');
    if(!grid) return;
    function recordRects() {return new Map($$('.experiment-card:not([hidden])',grid).map(el=>[el,el.getBoundingClientRect()]));}
    function performFlip(before) {
      if(!motionAllowed()) return;
      $$('.experiment-card:not([hidden])',grid).forEach(el=>{
        const old=before.get(el),now=el.getBoundingClientRect();
        if(!old) {animateNative(el,[{opacity:0,transform:'scale(.95)'},{opacity:1,transform:'scale(1)'}],{duration:450,easing:'ease-out'});return;}
        const dx=old.left-now.left,dy=old.top-now.top;
        if(Math.abs(dx)+Math.abs(dy)>3)animateNative(el,[{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:550,easing:'cubic-bezier(.22,1,.36,1)'});
      });
    }
    filterBtns.forEach(btn=>btn.addEventListener('click',()=>{
      const category=btn.dataset.filter;const before=recordRects();
      filterBtns.forEach(b=>{b.classList.toggle('is-active',b===btn);b.setAttribute('aria-pressed',String(b===btn));});
      $$('.experiment-card',grid).forEach(card=>card.hidden=category!=='all' && card.dataset.category!==category);
      performFlip(before);
      const activeNum=$('#experiment-count');if(activeNum)activeNum.textContent=String($$('.experiment-card:not([hidden])',grid).length).padStart(2,'0');
    }));
    const tiles=$$('.grid-tile');const shuffle=$('.grid-trigger');
    function shuffleGrid() {
      const parent=$('#elastic-grid');if(!parent) return;
      const before=new Map(tiles.map(el=>[el,el.getBoundingClientRect()]));
      for(let i=tiles.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[tiles[i],tiles[j]]=[tiles[j],tiles[i]];}
      tiles.forEach(el=>parent.append(el));
      tiles.forEach(el=>{const was=before.get(el),is=el.getBoundingClientRect();
        const dx=was.left-is.left,dy=was.top-is.top;
        if(Math.abs(dx)+Math.abs(dy)>0 && motionAllowed())animateNative(el,[{transform:`translate(${dx}px,${dy}px) scale(.87)`},{transform:'translate(0,0) scale(1)'}],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'});
      });
    }
    if(shuffle)shuffle.addEventListener('click',shuffleGrid);
  }
  function initOrbitalAndEasing() {
    const svg=$('.orbital-svg');const area=$('#orbital-playground');
    if(svg && area){
      const nodes=$$('.orbit-node',svg);
      let orbitalAnimations=[];
      function setupOrbit(){orbitalAnimations.forEach(a=>a.cancel());orbitalAnimations=[];
        if(!motionAllowed())return;
        nodes.forEach((node,i)=>{
          node.style.transformOrigin='200px 140px';
          const a=animateNative(node,[{transform:'rotate(0deg)'},{transform:`rotate(${i===1?-360:360}deg)`}],{duration:6500+i*2000,iterations:Infinity,easing:'linear'});
          if(a)orbitalAnimations.push(a);
        });
      }
      setupOrbit();window.addEventListener('kinetic:motionchange',setupOrbit);
      area.addEventListener('pointermove',e=>{
        if(!motionAllowed() || !finePointer.matches)return;
        const r=area.getBoundingClientRect();const x=((e.clientX-r.left)/r.width-.5)*8;
        svg.style.transform=`translate(-50%,-50%) rotate(${x}deg)`;
      },{passive:true});
      area.addEventListener('pointerleave',()=>svg.style.transform='translate(-50%,-50%)');
    }
    const button=$('.easing-trigger'),ball=$('.easing-ball'),track=$('.easing-track');
    if(button && ball && track) {
      button.addEventListener('click',()=>{
        const dx=Math.max(10,track.clientWidth-ball.clientWidth);
        if(ball.getAnimations)ball.getAnimations().forEach(a=>a.cancel());
        if(!motionAllowed()){ball.style.transform=`translate(${dx}px,-50%)`;return;}
        const ease=$('#ease-control')?.value||'power3.out';
        if(hasGSAP()) {
          window.gsap.killTweensOf(ball);
          window.gsap.fromTo(ball,{x:0},{x:dx,duration:1.15,ease,overwrite:true,onComplete:()=>window.gsap.to(ball,{x:0,duration:.6,ease:'power3.out'})});
        } else {
          const a=animateNative(ball,[{transform:'translate(0,-50%)'},{transform:`translate(${dx}px,-50%)`}],{duration:1250,easing:easingCSS[ease]||'ease-out'});
          a?.finished.then(()=>animateNative(ball,[{transform:`translate(${dx}px,-50%)`},{transform:'translate(0,-50%)'}],{duration:600,easing:'ease-out'})).catch(()=>{});
        }
      });
    }
  }
  function initMotionLab() {
    const duration=$('#duration-control'), stagger=$('#stagger-control'), ease=$('#ease-control');
    const durationOut=$('#duration-output'),staggerOut=$('#stagger-output'),config=$('#motion-config'),status=$('#lab-status-text');
    const run=$('#run-motion'),pause=$('#pause-motion'),replay=$('#replay-motion'),reset=$('#reset-motion'),copy=$('#copy-config'),feedback=$('#copy-feedback');
    const objects=$$('.lab-object');
    if(!duration || !stagger || !ease || !objects.length)return;
    const state={animations:[],gsapTimeline:null,token:0,paused:false,active:false};
    function values(){return {duration:Number(duration.value),stagger:Number(stagger.value),ease:ease.value};}
    function setStatus(text){if(status)status.textContent=text;}
    function setCode(){const v=values();durationOut.textContent=v.duration.toFixed(1)+'s';staggerOut.textContent=v.stagger.toFixed(2)+'s';
      config.textContent=`gsap.fromTo(objects, { x: -120, opacity: 0.18, scale: 0.65 }, {\n  x: 0, opacity: 1, scale: 1,\n  duration: ${v.duration.toFixed(1)}, stagger: ${v.stagger.toFixed(2)},\n  ease: "${v.ease}"\n});`;
    }
    [duration,stagger,ease].forEach(control=>control.addEventListener('input',()=>{setCode();if(!state.active)setStatus('CONFIG UPDATED');}));
    function cancel(){state.token++;if(state.gsapTimeline){state.gsapTimeline.kill();state.gsapTimeline=null;}
      state.animations.forEach(a=>{try{a.cancel()}catch(_){}});state.animations=[];
      objects.forEach(o=>{o.style.opacity='';o.style.transform='';});state.paused=false;state.active=false;pause.textContent='PAUSE';}
    function runSequence(){cancel();const token=++state.token;const v=values();
      if(!motionAllowed()){objects.forEach(o=>{o.style.opacity='1';o.style.transform='translateX(0) scale(1)';});setStatus('STATIC MODE — MOTION OFF');return;}
      setStatus('SEQUENCE RUNNING');state.active=true;
      if(hasGSAP()) {
        state.gsapTimeline=window.gsap.timeline({onComplete:()=>{if(token!==state.token)return;state.active=false;setStatus('SEQUENCE COMPLETE');}});
        state.gsapTimeline.fromTo(objects,{x:-120,scale:.65,opacity:.18},{x:0,scale:1,opacity:1,duration:v.duration,stagger:v.stagger,ease:v.ease,clearProps:'transform,opacity'});
      } else {
        objects.forEach((o,i)=>{
          const a=animateNative(o,[{transform:'translateX(-120px) scale(.65)',opacity:.18},{transform:'translateX(0) scale(1)',opacity:1}],{duration:v.duration*1000,delay:i*v.stagger*1000,easing:easingCSS[v.ease]||'ease-out',fill:'forwards'});
          if(a)state.animations.push(a);
        });
        const results=state.animations.map(a=>a.finished.catch(()=>{}));
        Promise.all(results).then(()=>{if(token!==state.token)return;state.active=false;setStatus('SEQUENCE COMPLETE');});
      }
    }
    run?.addEventListener('click',runSequence);
    replay?.addEventListener('click',runSequence);
    reset?.addEventListener('click',()=>{cancel();setStatus('READY TO PLAY');});
    pause?.addEventListener('click',()=>{
      if(!state.active){setStatus('RUN A SEQUENCE FIRST');return;}
      state.paused=!state.paused;
      if(state.gsapTimeline){state.paused?state.gsapTimeline.pause():state.gsapTimeline.resume();}
      state.animations.forEach(a=>{if(state.paused)a.pause();else a.play()});
      pause.textContent=state.paused?'RESUME':'PAUSE';setStatus(state.paused?'SEQUENCE PAUSED':'SEQUENCE RUNNING');
    });
    copy?.addEventListener('click',async()=>{
      let success=false;
      try { if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(config.textContent);success=true;} } catch(_){ }
      if(!success){try{const box=document.createElement('textarea');box.value=config.textContent;box.style.position='fixed';box.style.opacity='0';document.body.append(box);box.select();success=document.execCommand('copy');box.remove();}catch(_){}}
      if(feedback)feedback.textContent=success?'COPIED TO CLIPBOARD':'SELECT THE CONFIG TEXT ABOVE TO COPY';
    });
    window.addEventListener('kinetic:motionchange',()=>{if(!motionAllowed()){cancel();setStatus('STATIC MODE — MOTION OFF');}else setStatus('READY TO PLAY');});
    setCode();setStatus(motionAllowed()?'READY TO PLAY':'STATIC MODE — MOTION OFF');
    labStatus=status;
  }
  function initReveal(){
    if(!('IntersectionObserver' in window)||!motionAllowed())return;
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(!entry.isIntersecting)return;
      const el=entry.target;
      animateNative(el,[{opacity:0,transform:'translateY(20px)'},{opacity:1,transform:'translateY(0)'}],{duration:750,easing:'cubic-bezier(.22,1,.36,1)'});
      observer.unobserve(el);
    }),{threshold:.12});
    $$('.principle-item,.section-heading,.manifesto-copy,.card-info').forEach(el=>observer.observe(el));
  }
  document.addEventListener('DOMContentLoaded',()=>{
    try{if(hasGSAP()){
      if(window.ScrollTrigger)window.gsap.registerPlugin(window.ScrollTrigger);
      if(window.Flip)window.gsap.registerPlugin(window.Flip);
    }}catch(e){console.warn('GSAP plugin setup:',e)}
    const tasks=[initNavigation,initCursor,initHero,initTypeShift,initMagnetic,initStory,initGridAndFilters,initOrbitalAndEasing,initMotionLab,initReveal];
    tasks.forEach(task=>{try{task()}catch(e){console.error('KINETIC '+task.name+':',e)}});
    document.documentElement.classList.add('kinetic-ready');
  });
})();
