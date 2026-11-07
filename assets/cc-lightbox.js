(()=>{"use strict";
const selector='#bwg_container1_0 a.bwg_lightbox[href]';
let links=[],index=0,overlay=null,display=null,label=null,previousFocus=null,oldOverflow="";
function all(){links=[...document.querySelectorAll(selector)].filter(a=>a.querySelector('img'));}
function build(){
if(overlay)return;
overlay=document.createElement("div");overlay.className="cc-gallery-lightbox";overlay.hidden=true;overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");overlay.setAttribute("aria-label","Project photo gallery");
overlay.innerHTML='<button type="button" class="cc-gallery-close" aria-label="Close gallery">&times;</button><button type="button" class="cc-gallery-prev" aria-label="Previous image">&#10094;</button><figure><img alt=""><figcaption aria-live="polite"></figcaption></figure><button type="button" class="cc-gallery-next" aria-label="Next image">&#10095;</button>';
document.body.appendChild(overlay);display=overlay.querySelector("img");label=overlay.querySelector("figcaption");
overlay.querySelector(".cc-gallery-close").onclick=close;
overlay.querySelector(".cc-gallery-prev").onclick=()=>step(-1);
overlay.querySelector(".cc-gallery-next").onclick=()=>step(1);
overlay.addEventListener("click",e=>{if(e.target===overlay)close();});
}
function render(){const a=links[index];if(!a)return;display.src=a.href;display.alt=a.querySelector("img")?.alt||"Project photo";label.textContent=(index+1)+" / "+links.length;}
function open(a){all();if(!links.length)return;index=Math.max(0,links.indexOf(a));previousFocus=document.activeElement;build();render();oldOverflow=document.body.style.overflow;document.body.style.overflow="hidden";overlay.hidden=false;overlay.querySelector(".cc-gallery-close").focus();}
function step(delta){if(!links.length)return;index=(index+delta+links.length)%links.length;render();}
function close(){if(!overlay||overlay.hidden)return;overlay.hidden=true;display.removeAttribute("src");document.body.style.overflow=oldOverflow;previousFocus?.focus?.();}
document.addEventListener("click",e=>{const a=e.target.closest?.(selector);if(!a)return;e.preventDefault();e.stopImmediatePropagation();open(a);},true);
document.addEventListener("keydown",e=>{if(!overlay||overlay.hidden)return;
if(e.key==="Escape"){e.preventDefault();close();}
else if(e.key==="ArrowLeft"){e.preventDefault();step(-1);}
else if(e.key==="ArrowRight"){e.preventDefault();step(1);}
else if(e.key==="Tab"){const controls=[overlay.querySelector(".cc-gallery-close"),overlay.querySelector(".cc-gallery-prev"),overlay.querySelector(".cc-gallery-next")],i=controls.indexOf(document.activeElement);if(e.shiftKey&&i<=0){e.preventDefault();controls[2].focus();}else if(!e.shiftKey&&i===2){e.preventDefault();controls[0].focus();}}
});
})();