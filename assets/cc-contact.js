(() => {
"use strict";
function status(form,text,isError=false){const target=form.querySelector(".cc-form-status");target.textContent=text;target.classList.toggle("cc-error",isError);}
function setup(){
const forms=Array.from(document.querySelectorAll("form.cc-contact"));
if(!forms.length)return;
let turnstileReady=false;let loadFailure="";
const active=new Map();
function setErrorAll(message){loadFailure=message;for(const form of forms)status(form,message,true);}
async function init(){
try{
const response=await fetch("/api/contact",{cache:"no-store"});
if(!response.ok)throw new Error("Contact service is temporarily unavailable.");
const config=await response.json();
if(!config.turnstileSiteKey)throw new Error("Contact security is not configured.");
const script=document.createElement("script");
script.src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";script.async=true;
script.onerror=()=>setErrorAll("Security verification could not load. Please refresh the page.");
script.onload=()=>{try{for(const form of forms){const id=window.turnstile.render(form.querySelector(".cc-turnstile"),{sitekey:config.turnstileSiteKey,theme:"auto"});active.set(form,id)}turnstileReady=true;loadFailure="";}catch(err){setErrorAll("Security verification could not start. Please refresh the page.");console.error(err)}};
document.head.appendChild(script);
}catch(err){setErrorAll(err.message||"Contact service is temporarily unavailable.");console.error(err);}
}
for(const form of forms){
form.addEventListener("submit",async event=>{
event.preventDefault();event.stopImmediatePropagation();
const kind=form.dataset.kind;
const fields=Object.fromEntries(new FormData(form).entries());
const name=String(fields.name||"").trim(),email=String(fields.email||"").trim(),phone=String(fields.phone||"").trim(),message=String(fields.message||"").trim();
if(!name||kind==="callback"&&!phone||kind==="quote"&&(!email||!message)){status(form,"Please complete the required fields.",true);return;}
if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status(form,"Please enter a valid email address.",true);return;}
if(!turnstileReady||!window.turnstile||!active.has(form)){status(form,loadFailure||"Security verification is loading. Please try again.",true);return;}
const widget=active.get(form),token=window.turnstile.getResponse(widget);
if(!token){status(form,"Please complete the security check.",true);return;}
const button=form.querySelector(".cc-submit");button.disabled=true;status(form,"Sending your message…");
try{
const res=await fetch("/api/contact",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,phone,message,kind,company_site:fields.company_site||"",turnstileToken:token})});
const body=await res.json().catch(()=>({}));
if(!res.ok||!body.ok)throw new Error(body.error||"Unable to send your message. Please try again.");
form.querySelector(".cc-form-fields").hidden=true;
const success=form.querySelector(".cc-success");success.hidden=false;success.focus({preventScroll:true});
}catch(err){status(form,err.message||"Unable to send your message.",true);window.turnstile.reset(widget);}
finally{button.disabled=false;}
},true);
}
init();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
})();