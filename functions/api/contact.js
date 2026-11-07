const reply=(data,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const emailOK=s=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)&&s.length<=254;
const phoneOK=s=>{const digits=s.replace(/\D/g,"");return digits.length>=7&&digits.length<=15;};
export const onRequestGet=({env})=>reply({turnstileSiteKey:env.TURNSTILE_SITE_KEY||null});
export async function onRequestPost({request,env}){
try{
if(!env.RESEND_API_KEY||!env.CONTACT_TO_EMAIL||!env.TURNSTILE_SITE_KEY||!env.TURNSTILE_SECRET_KEY)return reply({error:"Contact service is not configured."},503);
if(Number(request.headers.get("content-length")||0)>16000)return reply({error:"Request too large."},413);
if(!request.headers.get("content-type")?.startsWith("application/json"))return reply({error:"Invalid request."},415);
const origin=request.headers.get("origin");if(origin&&new URL(origin).host!==new URL(request.url).host)return reply({error:"Invalid origin."},403);
const d=await request.json();
if(!d||typeof d!=="object"||Array.isArray(d))return reply({error:"Invalid request."},400);
if(d.company_site)return reply({ok:true});
const clean=(s,max)=>typeof s==="string"?s.trim().slice(0,max+1):"";
const name=clean(d.name,120),email=clean(d.email,254),phone=clean(d.phone,32),message=clean(d.message,5000),token=clean(d.turnstileToken,2048),kind=d.kind==="callback"?"callback":d.kind==="quote"?"quote":null;
if(!kind||name.length<1||name.length>120||email.length>254||phone.length>32||(email&&!emailOK(email))||(phone&&!phoneOK(phone))||(kind==="quote"&&(!email||message.length<1||message.length>5000))||(kind==="callback"&&!phone))return reply({error:"Please check your contact details and try again."},400);
if(!token||token.length>2048)return reply({error:"Please complete the security check."},400);
const verifiedResponse=await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:token,remoteip:request.headers.get("CF-Connecting-IP")||undefined})});
if(!verifiedResponse.ok)return reply({error:"Security verification is temporarily unavailable."},502);
const verified=await verifiedResponse.json();
if(!verified.success||(verified.hostname&&verified.hostname!==new URL(request.url).hostname))return reply({error:"Security verification failed. Please try again."},403);
const from=env.CONTACT_FROM_EMAIL||"emails@rtuino.com";if(!emailOK(from))return reply({error:"Email sender is not configured."},503);
const row=(key,value)=>'<tr><td style="padding:12px 0;border-bottom:1px solid #e9edf3;color:#748198;width:110px;vertical-align:top;font-size:13px">'+key+'</td><td style="padding:12px 0;border-bottom:1px solid #e9edf3;color:#24354d;font-size:14px;font-weight:600;word-break:break-word">'+escape(value||"Not provided")+'</td></tr>';
const buttons=(email?'<a href="'+escape("mailto:"+email+"?subject=Re%3A%20Website%20Enquiries")+'" style="display:inline-block;background:#346aeb;color:white;text-decoration:none;font-weight:bold;padding:14px 21px;border-radius:8px;margin:0 10px 10px 0">Reply to customer</a>':"")+(phone?'<a href="'+escape("tel:"+phone.replace(/[^+\d]/g,""))+'" style="display:inline-block;background:#188656;color:white;text-decoration:none;font-weight:bold;padding:14px 21px;border-radius:8px">Call customer</a>':"");
const callback=kind==="callback";
const html='<!DOCTYPE html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#f3f6fa;padding:30px 12px;font-family:Arial,sans-serif;color:#253954"><div style="max-width:620px;margin:auto"><p style="font-weight:bold;font-size:14px;margin:0 0 18px">Contour Carpentry <span style="float:right;color:#8d9aad;font-size:11px">WEBSITE ENQUIRIES</span></p><div style="background:#fff;border:1px solid #e2e8f2;border-radius:12px;overflow:hidden"><div style="height:5px;background:#346aeb"></div><div style="padding:30px 26px"><p style="color:#346aeb;font-size:11px;font-weight:bold;letter-spacing:1px">NEW '+(callback?"CALLBACK REQUEST":"QUOTE ENQUIRY")+'</p><h1 style="font-size:26px;margin:16px 0 8px">A customer reached out.</h1><p style="font-size:14px;color:#7c889d;margin:0 0 23px">'+(callback?"Someone requested a phone call.":"Someone submitted a quote enquiry.")+'</p><table width="100%" role="presentation" cellspacing="0" cellpadding="0">'+row("Name",name)+row("Email",email)+row("Phone",phone)+row("Source",callback?"Services page":"Website quote form")+'</table>'+(callback?"":'<p style="font-size:12px;font-weight:bold;letter-spacing:1px;margin:27px 0 12px;color:#79869b">MESSAGE</p><div style="padding:18px;border-radius:9px;background:#f6f8fc;border:1px solid #e9eef5;line-height:1.65;font-size:14px;overflow-wrap:anywhere">'+escape(message).replace(/\r?\n/g,"<br>")+'</div>')+'<div style="margin-top:28px">'+buttons+'</div></div></div><p style="text-align:center;color:#8794a8;font-size:12px;margin-top:18px">Sent from contourcarpentry.com</p></div></body></html>';
const payload={from:"Website Enquiries <"+from+">",to:[env.CONTACT_TO_EMAIL],subject:"Contour Carpentry — "+(callback?"Callback Request":"Website Enquiry"),html,text:"Contour Carpentry — "+(callback?"Callback request":"Quote enquiry")+"\nName: "+name+"\nEmail: "+(email||"Not provided")+"\nPhone: "+(phone||"Not provided")+"\nMessage: "+(callback?"Callback requested":message),...(email?{reply_to:email}:{})};
const sent=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json"},body:JSON.stringify(payload)});
if(!sent.ok){console.error("Resend",sent.status,await sent.text());return reply({error:"Unable to send your message. Please try again."},502);}
return reply({ok:true});
}catch(err){console.error("Contact error",err);return reply({error:"Unable to send your message. Please try again."},500);}
}
