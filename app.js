(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const cfg = window.CHRISTMAS_CONFIG || {};
  const greetings = ["Merry Christmas!","Welcome to the holiday magic!","Season's greetings!","It's the most wonderful time of the year!","Happy holidays — come on in!","A little Christmas cheer, just for you!"];
  $("welcome-message").textContent = greetings[Math.floor(Math.random()*greetings.length)];
  const configured = cfg.firebaseConfig && cfg.firebaseConfig.apiKey && !cfg.firebaseConfig.apiKey.includes("YOUR_") && cfg.firebaseConfig.projectId && !cfg.firebaseConfig.projectId.includes("YOUR_");
  let auth=null, db=null, currentUser=null, gifts=[], statuses={}, purchases={}, selectedGift=null, selectedKind="purchase", toastTimer, draggedGiftId=null;
  if(configured && window.firebase) {
    try { firebase.initializeApp(cfg.firebaseConfig); auth=firebase.auth(); db=firebase.firestore(); } catch(e) { console.error(e); }
  }
  let pageLoaded=false, authReady=!auth, introResolved=false;
  function finishIntro(){
    if(introResolved||!pageLoaded||!authReady)return;
    introResolved=true;
    $("welcome").classList.add("hide");
    $("entry-gate").hidden=!!currentUser;
  }
  window.addEventListener("load",()=>{pageLoaded=true;setTimeout(finishIntro,1050)});
  const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n)||0);
  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3500)}
  function isAdmin(){return !!(currentUser && currentUser.email && currentUser.email.toLowerCase()===String(cfg.adminEmail||"").toLowerCase() && currentUser.emailVerified && currentUser.providerData.some(p=>p.providerId==="google.com"))}
  function setCountdown(){const now=new Date(),year=now.getMonth()===11&&now.getDate()>25?now.getFullYear()+1:now.getFullYear(),ms=Math.max(0,new Date(year,11,25)-now),days=Math.floor(ms/86400000),hours=Math.floor(ms%86400000/3600000),minutes=Math.floor(ms%3600000/60000),seconds=Math.floor(ms%60000/1000);$("countdown").textContent=ms===0?"Merry Christmas! 🎄":days+" days · "+hours+"h "+minutes+"m "+seconds+"s until Christmas 🎁"}
  setCountdown();setInterval(setCountdown,1000);
  const snowLayer=document.querySelector(".snow-layer");
  // Use individual icy snowflakes with a softer, subtle appearance.
  function sizeSnowLayer(){
    if(!snowLayer)return;
    const pageHeight=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,window.innerHeight);
    snowLayer.style.setProperty("--snow-page-height",pageHeight+"px");
    snowLayer.querySelectorAll(".snowflake").forEach(flake=>{
      const flakeSize=flake.getBoundingClientRect().width||32;
      const speed=42+(Number(flake.dataset.index||0)%5)*9;
      flake.style.setProperty("--snow-fall-distance",(pageHeight+flakeSize+20)+"px");
      flake.style.animationDuration=((pageHeight+flakeSize+20)/speed)+"s";
    });
  }
  if(snowLayer&&!snowLayer.querySelector(".snowflake")){
    const flakeCount=48;
    for(let i=0;i<flakeCount;i++){
      const flake=document.createElement("span");
      const sprite=(i%9)+1;
      flake.className="snowflake";
      flake.setAttribute("aria-hidden","true");
      flake.style.left=((i*37)%100)+"%";
      flake.style.top="0";
      flake.dataset.index=String(i);
      flake.style.width=(24+(i%5)*11)+"px";
      flake.style.backgroundImage='url("assets/snowflake-'+sprite+'.png?v=1")';
      flake.style.animationDuration="40s";
      flake.style.animationDelay=(i*0.7)+"s";
      flake.style.setProperty("--drift",(((i*19)%90)-45)+"px");
      snowLayer.appendChild(flake);
    }
  }
  // The snow layer is part of the full document, so it naturally scrolls upward
  // by exactly the same distance as the page instead of staying in the first viewport.
  sizeSnowLayer();
  window.addEventListener("resize",sizeSnowLayer,{passive:true});
  window.addEventListener("load",sizeSnowLayer,{once:true});
  if("ResizeObserver" in window){
    const snowResizeObserver=new ResizeObserver(sizeSnowLayer);
    snowResizeObserver.observe(document.body);
  }
  if("MutationObserver" in window){
    const snowMutationObserver=new MutationObserver(sizeSnowLayer);
    snowMutationObserver.observe(document.body,{childList:true,subtree:true});
  }
  $("snow-toggle").addEventListener("click",()=>{const off=snowLayer.classList.toggle("snow-off");$("snow-toggle").innerHTML=off?"<span>Snow off</span>":"<span>Snow</span>"});

  // Dark mode: remember the visitor's choice and keep the button label in sync.
  const themeToggle=$("theme-toggle");
  function applyTheme(theme){
    const dark=theme==="dark";
    if(dark) document.documentElement.setAttribute("data-theme","dark");
    else document.documentElement.removeAttribute("data-theme");
    themeToggle.innerHTML=dark?"☀ <span>Light mode</span>":"☾ <span>Dark mode</span>";
    themeToggle.setAttribute("aria-label",dark?"Switch to light mode":"Switch to dark mode");
    themeToggle.setAttribute("aria-pressed",String(dark));
    return dark;
  }
  let savedTheme="light";
  try{savedTheme=localStorage.getItem("christmas-theme")==="dark"?"dark":"light"}catch(e){}
  let darkMode=applyTheme(savedTheme);
  themeToggle.addEventListener("click",()=>{
    darkMode=!darkMode;
    applyTheme(darkMode?"dark":"light");
    try{localStorage.setItem("christmas-theme",darkMode?"dark":"light")}catch(e){}
  });
  async function ensureGoogleSignIn(){
    if(!auth)throw new Error("Firebase is not configured yet.");
    if(isAdmin())return currentUser;
    const alreadyGoogle=auth.currentUser&&auth.currentUser.providerData.some(p=>p.providerId==="google.com");
    if(alreadyGoogle){currentUser=auth.currentUser;return currentUser}
    const provider=new firebase.auth.GoogleAuthProvider();
    const result=await auth.signInWithPopup(provider);
    currentUser=result.user;
    return currentUser;
  }
  async function signInWithGoogle(){
    if(!auth)throw new Error("Google sign-in isn't available right now. Please try again later.");
    const provider=new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({prompt:"select_account"});
    const result=await auth.signInWithPopup(provider);
    currentUser=result.user;
    $("entry-gate").hidden=true;
    await load();
    return currentUser;
  }
  function stampDate(value){return value&&typeof value.toDate==="function"?value.toDate():value?new Date(value):null}
  async function load(){
    if(!db){gifts=[];statuses={};render();$("inspo-content").textContent="Connect Firebase to start adding gift ideas and inspiration.";return}
    try{
      const [giftSnap,holdSnap,purchaseSnap]=await Promise.all([db.collection("gifts").orderBy("createdAt","desc").get(),db.collection("giftHolds").get(),isAdmin()?db.collection("giftPurchases").get():Promise.resolve({docs:[]})]);
      gifts=giftSnap.docs.map(d=>({id:d.id,...d.data()}));
      statuses=Object.fromEntries(holdSnap.docs.map(d=>[d.id,d.data()]));
      purchases=Object.fromEntries(purchaseSnap.docs.map(d=>[d.id,d.data()]));
      render();
      const inspiration=gifts.map(g=>g.inspiration).filter(Boolean);
      $("inspo-content").textContent=inspiration.length?inspiration.join("\n\n"):"I'll add some ideas here soon!";
      if(isAdmin()&&!$("admin-panel").hidden)adminList();
    }catch(e){console.error(e);toast("Couldn't load the wishlist. Check Firebase setup and Firestore rules.");gifts=[];render()}
  }
  function getStatus(g){const s=statuses[g.id];if(!s)return{status:"available"};const expiry=stampDate(s.expiresAt);if(s.status==="held"&&expiry&&expiry<=new Date())return{status:"available"};return s}
  function render(){
    const term=$("search").value.trim().toLowerCase(),sort=$("sort").value,min=$("min-price").value,max=$("max-price").value,supplier=$("supplier-filter").value,category=$("category-filter").value;
    let list=gifts.filter(g=>(g.name+" "+(g.description||"")+" "+(g.supplier||"")+" "+(g.platform||"")+" "+(g.category||"Other")).toLowerCase().includes(term)&&(!min||Number(g.price)>=Number(min))&&(!max||Number(g.price)<=Number(max))&&(!supplier||(g.platform||g.supplier)===supplier)&&(!category||(g.category||"Other")===category));
    if(sort==="price-asc")list.sort((a,b)=>Number(a.price)-Number(b.price));
    if(sort==="price-desc")list.sort((a,b)=>Number(b.price)-Number(a.price));
    if(sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name));
    if(sort==="supplier")list.sort((a,b)=>(a.platform||a.supplier||"").localeCompare(b.platform||b.supplier||""));
    if(sort==="featured")list.sort((a,b)=>(Number(a.order)||0)-(Number(b.order)||0));
    $("gift-count").textContent=list.length+" "+(list.length===1?"gift":"gifts");
    const stores=[...new Set(gifts.map(g=>g.platform||g.supplier).filter(Boolean))].sort(),current=$("supplier-filter").value;
    $("supplier-filter").innerHTML='<option value="">All stores</option>'+stores.map(s=>'<option value="'+escapeHTML(s)+'">'+escapeHTML(s)+'</option>').join("");
    $("supplier-filter").value=stores.includes(current)?current:"";
    const cats=[...new Set(gifts.map(g=>g.category||"Other"))].sort(),chosen=$("category-filter").value;
    $("category-filter").innerHTML='<option value="">All categories</option>'+cats.map(v=>'<option value="'+escapeHTML(v)+'">'+escapeHTML(v)+'</option>').join("");$("category-filter").value=cats.includes(chosen)?chosen:"";
    if(!list.length){$("wishlist-grid").innerHTML='<div class="empty-state"><span>🎁</span><h3>No gifts found just yet</h3><p>Try changing your search or filters.</p></div>';return}
    $("wishlist-grid").innerHTML=list.map(g=>{
      const st=getStatus(g),held=st.status==="held",bought=st.status==="bought",label=bought?"Bought":held?"On hold":"Available";
      const ownsHold=held&&currentUser&&st.ownerUid===currentUser.uid;
      const image=g.imageUrl?'<img src="'+escapeHTML(g.imageUrl)+'" alt="'+escapeHTML(g.name)+'" loading="lazy" onerror="this.remove()">':'<span class="gift-emoji">🎁</span>';
      const boughtButton='<button class="maybe" data-action="bought" data-id="'+g.id+'" '+(bought?"disabled":"")+'>'+(bought?"Bought":"✓ Bought")+'</button>';
      return '<article class="gift-card" data-gift-card="'+g.id+'" tabindex="0" role="button" aria-label="View details for '+escapeHTML(g.name)+'"><div class="gift-image">'+image+'</div><div class="gift-card-body"><div class="gift-meta"><span class="supplier">'+escapeHTML(g.category||"Other")+' · '+escapeHTML((g.supplier||"Gift idea")+(g.platform?" via "+g.platform:""))+'</span><span class="status '+(bought?"bought":held?"held":"available")+'">'+label+'</span></div><h3>'+escapeHTML(g.name)+'</h3><div class="gift-bottom"><strong class="gift-price">'+money(g.price)+'</strong></div><div class="gift-actions">'+boughtButton+'<button class="maybe" data-action="maybe" data-id="'+g.id+'" '+(held||bought?"disabled":"")+'>'+(held?"Reserved":bought?"Bought":"Maybe")+'</button></div>'+(held?'<p class="hold-info">Someone is thinking of buying this item · '+timeLeft(st.expiresAt)+'</p>':"")+'</div></article>';
    }).join("");
  }
  function timeLeft(value){const date=stampDate(value);if(!date)return"24-hour hold";const ms=Math.max(0,date-Date.now()),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);return h+"h "+m+"m left"}
  ["search","sort","min-price","max-price","supplier-filter","category-filter"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",render));
  $("clear-filters").addEventListener("click",()=>{$("search").value="";$("sort").value="featured";$("min-price").value="";$("max-price").value="";$("supplier-filter").value="";$("category-filter").value="";render()});
  function openGiftDetails(g){
    if(!g)return;
    const image=g.imageUrl?'<img class="details-image" src="'+escapeHTML(g.imageUrl)+'" alt="'+escapeHTML(g.name)+'" onerror="this.style.display=\'none\'">':"";
    const st=getStatus(g),bought=st.status==="bought",held=st.status==="held";
    $("gift-details-content").innerHTML=image+'<p class="eyebrow">'+escapeHTML((g.supplier||"Gift idea")+(g.platform?" via "+g.platform:""))+'</p><h2>'+escapeHTML(g.name)+'</h2><p class="details-price">'+money(g.price)+'</p><p class="details-description">'+escapeHTML(g.description||"No description added.")+'</p>'+(g.inspiration?'<div class="details-extra"><h3>More information</h3><p>'+escapeHTML(g.inspiration)+'</p></div>':"")+'<p class="details-status">Status: '+(bought?"Bought":held?"On hold":"Available")+'</p>'+(g.url?'<a class="primary-button details-link" href="'+escapeHTML(g.url)+'" target="_blank" rel="noopener noreferrer">View product at '+escapeHTML(g.platform||g.supplier||"the store")+' ↗</a>':"");
    $("gift-details-dialog").classList.remove("gift-reveal");void $("gift-details-dialog").offsetWidth;$("gift-details-dialog").classList.add("gift-reveal");$("gift-details-dialog").showModal();
  }
  $("gift-details-close").addEventListener("click",()=>$("gift-details-dialog").close());
  function openHoldDialog(){
    if(!selectedGift)return;
    $("guest-name").value="";
    const buying=selectedKind==="bought";
    $("hold-title").textContent=buying?"Buying this gift?":"Maybe this one?";
    $("hold-description").textContent=buying?"I use your name so when it comes time to send you a text to thank you, I dont have to remember I can just look. And no, I do not check to see what I'm getting.":"This lets everyone know someone is thinking about this gift. The hold lasts 24 hours.";
    $("guest-name").required=buying;
    $("hold-confirm").textContent=buying?"Confirm Bought":"Confirm Maybe";
    $("hold-dialog").showModal();
  }
  $("wishlist-grid").addEventListener("click",async e=>{
    const b=e.target.closest("button[data-action]");
    if(b){
      const gift=gifts.find(g=>g.id===b.dataset.id);if(!gift)return;selectedGift=gift;selectedKind=b.dataset.action;
      if(!currentUser){$("signin-dialog").showModal();return;}
      openHoldDialog();return;
    }
    const card=e.target.closest("[data-gift-card]");if(card)openGiftDetails(gifts.find(g=>g.id===card.dataset.giftCard));
  });
  $("wishlist-grid").addEventListener("keydown",e=>{
    const card=e.target.closest("[data-gift-card]");
    if(card&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openGiftDetails(gifts.find(g=>g.id===card.dataset.giftCard))}
  });
  $("entry-guest").addEventListener("click",()=>{$("entry-gate").hidden=true});
  $("entry-google").addEventListener("click",async()=>{
    const button=$("entry-google");button.disabled=true;$("entry-message").textContent="Opening Google sign-in…";
    try{await signInWithGoogle();$("entry-message").textContent=""}
    catch(err){$("entry-message").textContent=err.message||"Couldn't sign in with Google."}
    finally{button.disabled=false}
  });
  $("signin-google").addEventListener("click",async()=>{
    const button=$("signin-google");button.disabled=true;$("signin-message").textContent="Opening Google sign-in…";
    try{await signInWithGoogle();$("signin-dialog").close();$("signin-message").textContent="";openHoldDialog()}
    catch(err){$("signin-message").textContent=err.message||"Couldn't sign in with Google."}
    finally{button.disabled=false}
  });
  $("signin-cancel").addEventListener("click",()=>{$("signin-dialog").close()});
  $("signin-cancel-x").addEventListener("click",()=>{$("signin-dialog").close()});
  $("hold-form").addEventListener("submit",async e=>{
    if(e.submitter?.value!=="confirm")return;e.preventDefault();
    if(!selectedGift||!db){toast("Firebase hasn't been connected yet.");$("hold-dialog").close();return}
        $("hold-confirm").disabled=true;
    try{
      await ensureGoogleSignIn();
      if(!$("guest-name").value.trim()&&currentUser.displayName)$("guest-name").value=currentUser.displayName;
      const finalGuestName=$("guest-name").value.trim();
      if(selectedKind==="bought"&&!finalGuestName)throw new Error("Please enter your name.");
      const ref=db.collection("giftHolds").doc(selectedGift.id);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref),existing=snap.exists?snap.data():null;
        const expiry=existing?stampDate(existing.expiresAt):null;
        if(existing&&existing.status==="bought")throw new Error("This gift has already been bought.");
        if(existing&&existing.status==="held"&&expiry&&expiry>new Date())throw new Error("Someone already has this gift on hold.");
        if(selectedKind==="bought"){
          tx.set(ref,{status:"bought",holdKind:"purchase",ownerUid:currentUser.uid,expiresAt:null,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
          tx.set(db.collection("giftPurchases").doc(selectedGift.id),{ownerUid:currentUser.uid,guestName:finalGuestName,createdAt:firebase.firestore.FieldValue.serverTimestamp()});
        }else{
          tx.set(ref,{status:"held",holdKind:selectedKind,ownerUid:currentUser.uid,guestName:finalGuestName||"",expiresAt:firebase.firestore.Timestamp.fromDate(new Date(Date.now()+24*60*60*1000)),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
        }
      });
      $("hold-dialog").close();toast(selectedKind==="bought"?"Marked as bought. Thank you!":"Gift held for 24 hours. Thanks!");await load();
    }catch(err){toast(err.message||"Couldn't update this gift. Check Firebase rules.");}
    finally{$("hold-confirm").disabled=false}
  });
  async function markBought(id){
    if(!db||!currentUser)return;
    const ref=db.collection("giftHolds").doc(id);
    try{await db.runTransaction(async tx=>{const snap=await tx.get(ref);if(!snap.exists){if(!isAdmin())throw new Error("This gift is no longer on hold.");tx.set(ref,{status:"bought",holdKind:null,ownerUid:currentUser.uid,expiresAt:null,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});return}
      if(snap.data().status!=="held")throw new Error("This gift is no longer on hold.");
      const data=snap.data();if(data.ownerUid!==currentUser.uid&&!isAdmin())throw new Error("Only the person who reserved this gift or the admin can mark it bought.");
      tx.update(ref,{status:"bought",expiresAt:null,updatedAt:firebase.firestore.FieldValue.serverTimestamp()})});toast("Marked as bought — thanks for making Christmas special!");await load()}
    catch(e){toast(e.message)}
  }
  $("admin-open").addEventListener("click",()=>{$("admin-dialog").showModal();checkSession()});
  $("admin-close").addEventListener("click",()=>$("admin-dialog").close());
  async function checkSession(){if(!auth){$("admin-message").textContent="Add your Firebase settings first.";return}currentUser=auth.currentUser;if(isAdmin())showAdmin();else{$("admin-login-form").hidden=false;$("admin-panel").hidden=true}}
  function showAdmin(){$("admin-login-form").hidden=true;$("admin-panel").hidden=false;adminList()}
  $("admin-google-login").addEventListener("click",async()=>{
    if(!auth)return;
    const button=$("admin-google-login");
    button.disabled=true;$("admin-message").textContent="Opening Google sign-in…";
    try{
      const provider=new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({prompt:"select_account"});
      const result=await auth.signInWithPopup(provider);
      currentUser=result.user;
      if(!isAdmin()){
        $("admin-message").textContent="That Google account isn't authorized. Sign in with vincenzobal12@gmail.com.";
        $("admin-panel").hidden=true;$("admin-login-form").hidden=false;
        return;
      }
      $("admin-message").textContent="";showAdmin();await load();
    }catch(err){$("admin-message").textContent=err.message}
    finally{button.disabled=false}
  });
  $("admin-signout").addEventListener("click",async()=>{await auth.signOut();currentUser=null;$("admin-panel").hidden=true;$("admin-login-form").hidden=false;toast("Signed out.");await load()});
  function adminList(){const counts=[["Total gifts",gifts.length],["Available",gifts.filter(g=>getStatus(g).status==="available").length],["On hold",gifts.filter(g=>getStatus(g).status==="held").length],["Bought",gifts.filter(g=>getStatus(g).status==="bought").length]];$("admin-stats").innerHTML=counts.map(x=>'<div class="admin-stat"><strong>'+x[1]+'</strong><span>'+x[0]+'</span></div>').join("");$("admin-gift-list").innerHTML=[...gifts].sort((x,y)=>(Number(x.order)||0)-(Number(y.order)||0)).map(g=>{const bought=getStatus(g).status==="bought",buyer=purchases[g.id]?.guestName;return '<div class="admin-gift-row" draggable="true" data-sort-gift="'+g.id+'"><div><strong>'+escapeHTML(g.name)+'</strong><small>'+escapeHTML(g.category||"Other")+' · '+money(g.price)+' · '+escapeHTML(g.supplier||"No store")+(bought&&buyer?' · Bought by '+escapeHTML(buyer):'')+'</small></div><div><button data-edit="'+g.id+'">Edit</button><button data-bought="'+g.id+'">'+(bought?"Mark not bought":"Mark bought")+'</button><button data-delete="'+g.id+'">Delete</button></div></div>'}).join("")||"<p>No gifts yet.</p>"}
  $("admin-gift-list").addEventListener("dragstart",e=>{const row=e.target.closest("[data-sort-gift]");if(!row)return;draggedGiftId=row.dataset.sortGift;e.dataTransfer.setData("text/plain",draggedGiftId);e.dataTransfer.effectAllowed="move";row.classList.add("dragging")});
  $("admin-gift-list").addEventListener("dragover",e=>{const row=e.target.closest("[data-sort-gift]");if(!row||!draggedGiftId)return;e.preventDefault();const moving=$("admin-gift-list").querySelector(".dragging");if(!moving)return;const r=row.getBoundingClientRect();row.parentNode.insertBefore(moving,e.clientY<r.top+r.height/2?row:row.nextSibling)});
  $("admin-gift-list").addEventListener("dragend",async()=>{if(!draggedGiftId)return;const rows=[...$("admin-gift-list").querySelectorAll("[data-sort-gift]")];try{await Promise.all(rows.map((row,i)=>db.collection("gifts").doc(row.dataset.sortGift).update({order:i})));gifts.sort((x,y)=>rows.findIndex(r=>r.dataset.sortGift===x.id)-rows.findIndex(r=>r.dataset.sortGift===y.id));toast("Gift order saved.");render()}catch(err){toast("Could not save order: "+err.message);adminList()}draggedGiftId=null});
  $("admin-gift-list").addEventListener("click",async e=>{
    const edit=e.target.dataset.edit,del=e.target.dataset.delete,bought=e.target.dataset.bought;
    if(edit){const g=gifts.find(x=>x.id===edit);if(!g)return;$("gift-save-message").hidden=true;$("gift-save-message").textContent="";$("gift-id").value=g.id;$("gift-name").value=g.name;$("gift-description").value=g.description||"";$("gift-price").value=g.price;$("gift-supplier").value=g.supplier||"";$("gift-platform").value=g.platform||"";$("gift-category").value=g.category||"Other";$("gift-url").value=g.url;$("gift-image").value=g.imageUrl||"";$("gift-inspo").value=g.inspiration||"";$("gift-form-title").textContent="Edit gift";$("gift-form").scrollIntoView({behavior:"smooth"})}
    if(bought){if(!isAdmin()){toast("Admin access required.");return}const status=getStatus(gifts.find(g=>g.id===bought)||{}).status;if(status==="bought"){try{await db.collection("giftHolds").doc(bought).delete();await db.collection("giftPurchases").doc(bought).delete();toast("Gift marked as not bought.");await load()}catch(err){toast(err.message)}}else{await markBought(bought)}}
    if(del&&confirm("Delete this gift from the wishlist?")){try{await db.collection("gifts").doc(del).delete();await db.collection("giftHolds").doc(del).delete();await db.collection("giftPurchases").doc(del).delete();toast("Gift deleted.");await load()}catch(err){toast(err.message)}}
  });
  $("gift-preview").addEventListener("click",()=>{const p={id:"preview",name:$("gift-name").value.trim()||"Gift preview",description:$("gift-description").value.trim(),price:$("gift-price").value,supplier:$("gift-supplier").value.trim(),platform:$("gift-platform").value.trim(),category:$("gift-category").value,imageUrl:$("gift-image").value.trim(),inspiration:$("gift-inspo").value.trim(),url:$("gift-url").value.trim()};openGiftDetails(p)});
  $("gift-cancel").addEventListener("click",()=>{$("gift-form").reset();$("gift-category").value="Other";$("gift-id").value="";$("gift-form-title").textContent="Add a gift";$("gift-save-message").hidden=true;$("gift-save-message").textContent=""});
  $("gift-form").addEventListener("submit",async e=>{
    e.preventDefault();$("gift-save-message").hidden=true;$("gift-save-message").textContent="";if(!isAdmin()){$("gift-save-message").textContent="Admin access required. Please sign in again.";$("gift-save-message").hidden=false;return}
    const id=$("gift-id").value,payload={name:$("gift-name").value.trim(),description:$("gift-description").value.trim(),price:Number($("gift-price").value),supplier:$("gift-supplier").value.trim(),platform:$("gift-platform").value.trim(),category:$("gift-category").value,order:id?(gifts.find(g=>g.id===id)?.order??gifts.length):gifts.length,url:$("gift-url").value.trim(),imageUrl:$("gift-image").value.trim()||"",inspiration:$("gift-inspo").value.trim(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    try{if(id)await db.collection("gifts").doc(id).update(payload);else await db.collection("gifts").add({...payload,createdAt:firebase.firestore.FieldValue.serverTimestamp()});toast(id?"Gift updated!":"Gift added!");$("gift-save-message").textContent=id?"Gift updated successfully!":"Gift added successfully!";$("gift-save-message").classList.remove("error");$("gift-save-message").classList.add("success");$("gift-save-message").hidden=false;$("gift-form").reset();$("gift-id").value="";$("gift-form-title").textContent="Add a gift";await load();adminList()}
    catch(err){$("gift-save-message").textContent="Couldn't save gift: "+(err.message||"Please check your connection and Firebase settings.");$("gift-save-message").classList.remove("success");$("gift-save-message").classList.add("error");$("gift-save-message").hidden=false;}
  });
  if(auth)auth.onAuthStateChanged(async user=>{currentUser=user;authReady=true;finishIntro();await load();if($("admin-dialog").open){if(isAdmin())showAdmin();else{$("admin-login-form").hidden=false;$("admin-panel").hidden=true}}});
  if(!auth)load();

  // Audio-only playlist. Put properly licensed MP3s in /music using these filenames.
  const tracks=[
    {file:"music/AudioTranscriberAI_O Come, O Come, Emmanuel (Piano & Cello Christmas Cover) - The Piano Guys.mp3",title:"O Come, O Come, Emmanuel"},
    {file:"music/AudioTranscriberAI_O Holy Night Instrumental Christmas Music Christmas Song.mp3",title:"O Holy Night"},
    {file:"music/AudioTranscriberAI_Royalty Free Carol of the Bells.mp3",title:"Carol of the Bells"},
    {file:"music/Joy to the World - Instrumental Christmas Music Orchestra.mp3",title:"Joy to the World"},
    {file:"music/Silent Night (INSTRUMENTAL) - Tommee Profitt.mp3",title:"Silent Night"},
    {file:"music/God Rest Ye Merry Gentlemen (INSTRUMENTAL) - Tommee Profitt.mp3",title:"God Rest Ye Merry, Gentlemen"}
  ];
  const audio=$("christmas-audio");
  let trackIndex=0,panelOpen=false,autoplayAttempted=false,shuffleEnabled=false,repeatEnabled=false;
  // Keep the open music panel attached directly beneath the sticky topbar,
  // including when the topbar wraps onto multiple rows on smaller screens.
  const siteHeader=document.querySelector(".site-header");
  function syncMusicPanelOffset(){
    if(siteHeader)document.documentElement.style.setProperty("--music-panel-sticky-top",siteHeader.getBoundingClientRect().height+"px");
  }
  syncMusicPanelOffset();
  if("ResizeObserver" in window&&siteHeader){
    const headerResizeObserver=new ResizeObserver(syncMusicPanelOffset);
    headerResizeObserver.observe(siteHeader);
  }else window.addEventListener("resize",syncMusicPanelOffset,{passive:true});
  audio.volume=.55;
  function showTrackTitle(title){
    $("now-playing-title").textContent=title;
    $("audio-current-title").textContent=title;$("mini-player-title").textContent=title;
    $("now-playing-title").classList.remove("scrolling");
    requestAnimationFrame(()=>{const el=$("now-playing-title");if(el.scrollWidth>el.parentElement.clientWidth)el.classList.add("scrolling")});
  }
  function updateTrackButtons(){
    $("music-track-list").innerHTML=tracks.map((t,i)=>'<button type="button" class="music-track '+(i===trackIndex?"active":"")+'" data-track="'+i+'"><span class="track-number">'+String(i+1).padStart(2,"0")+'</span><span class="track-name">'+escapeHTML(t.title)+'</span><span class="track-play">'+(i===trackIndex?"♫":"▶")+'</span></button>').join("");
  }
  function setPlayerState(playing){$("now-playing-state").textContent=playing?"♫":"▶";$("audio-play").disabled=playing;$("audio-pause").disabled=!playing}
  function formatTime(seconds){
    if(!Number.isFinite(seconds)||seconds<0)return "0:00";
    const total=Math.floor(seconds);
    return Math.floor(total/60)+":"+String(total%60).padStart(2,"0");
  }
  function updateAudioTime(){
    const current=formatTime(audio.currentTime),duration=formatTime(audio.duration);
    $("top-audio-time").textContent=current+"/"+duration;
    $("panel-audio-time").textContent=current+"/"+duration;$("mini-player-time").textContent=current+"/"+duration;
    const seek=$("audio-seek");
    if(Number.isFinite(audio.duration)&&audio.duration>0){
      seek.max=audio.duration;
      if(document.activeElement!==seek)seek.value=audio.currentTime;
    }else{seek.max=100;seek.value=0}
  }
  function seekBy(seconds){
    if(!Number.isFinite(audio.duration))return;
    audio.currentTime=Math.max(0,Math.min(audio.duration,audio.currentTime+seconds));
    updateAudioTime();
  }
  function skipTrack(){playTrack(shuffleEnabled?Math.floor(Math.random()*tracks.length):trackIndex+1,true)}
  ["audio-rewind","top-audio-rewind"].forEach(id=>$(id).addEventListener("click",e=>{e.stopPropagation();seekBy(-10)}));
  ["audio-forward","top-audio-forward"].forEach(id=>$(id).addEventListener("click",e=>{e.stopPropagation();seekBy(10)}));
  ["audio-skip","top-audio-skip"].forEach(id=>$(id).addEventListener("click",e=>{e.stopPropagation();skipTrack()}));
  $("audio-seek").addEventListener("input",e=>{if(Number.isFinite(audio.duration))audio.currentTime=Number(e.target.value)});
  audio.addEventListener("timeupdate",updateAudioTime);
  audio.addEventListener("loadedmetadata",updateAudioTime);
  audio.addEventListener("durationchange",updateAudioTime);
  audio.addEventListener("seeked",updateAudioTime);
  function playTrack(i,tryPlay=true){
    trackIndex=(i+tracks.length)%tracks.length;
    const track=tracks[trackIndex];
    showTrackTitle(track.title);updateTrackButtons();$("mini-player").hidden=panelOpen;
    audio.pause();audio.src=track.file;audio.load();
    if(tryPlay){
      audio.play().then(()=>{$("music-note").textContent="Now playing.";setPlayerState(true)})
      .catch(()=>{$("music-note").textContent="Your browser blocked automatic sound, or the MP3 is not uploaded yet. Press Play after adding the licensed audio files.";setPlayerState(false)});
    } else setPlayerState(false);
  }
  audio.addEventListener("ended",()=>{if(repeatEnabled){audio.currentTime=0;audio.play().catch(()=>{})}else playTrack(shuffleEnabled?Math.floor(Math.random()*tracks.length):trackIndex+1,true)});
  audio.addEventListener("play",()=>{setPlayerState(true);$("mini-player").hidden=panelOpen;$("mini-player-play").textContent="Ⅱ"});
  audio.addEventListener("pause",()=>{setPlayerState(false);$("mini-player-play").textContent="▶"});
  audio.addEventListener("error",()=>{$("music-note").textContent="This MP3 has not been uploaded yet. See music/README.md for the filenames.";setPlayerState(false)});
  $("audio-play").addEventListener("click",()=>audio.play().catch(()=>toast("That MP3 file isn't available yet.")));
  $("audio-pause").addEventListener("click",()=>audio.pause());
  $("audio-volume").addEventListener("input",e=>audio.volume=Number(e.target.value));
  $("audio-shuffle").addEventListener("click",()=>{shuffleEnabled=!shuffleEnabled;$("audio-shuffle").textContent="🔀 Shuffle: "+(shuffleEnabled?"On":"Off");$("audio-shuffle").setAttribute("aria-pressed",String(shuffleEnabled))});
  $("audio-repeat").addEventListener("click",()=>{repeatEnabled=!repeatEnabled;$("audio-repeat").textContent="🔁 Repeat: "+(repeatEnabled?"On":"Off");$("audio-repeat").setAttribute("aria-pressed",String(repeatEnabled))});
  $("mini-player-play").addEventListener("click",()=>audio.paused?audio.play().catch(()=>{}):audio.pause());$("mini-player-next").addEventListener("click",skipTrack);$("mini-player-open").addEventListener("click",()=>{panelOpen=true;$("music-panel").hidden=false;$("mini-player").hidden=true});
  function toggleMusicPanel(){panelOpen=!panelOpen;$("music-panel").hidden=!panelOpen;$("mini-player").hidden=panelOpen||!audio.src}
  $("music-toggle").addEventListener("click",toggleMusicPanel);
  $("now-playing").addEventListener("click",toggleMusicPanel);
  $("now-playing").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggleMusicPanel()}});
  $("music-close").addEventListener("click",()=>{panelOpen=false;$("music-panel").hidden=true;$("mini-player").hidden=!audio.src});
  $("music-track-list").addEventListener("click",e=>{const b=e.target.closest("[data-track]");if(b)playTrack(Number(b.dataset.track),true)});
  updateTrackButtons();
  window.addEventListener("load",()=>{
    if(autoplayAttempted)return;
    autoplayAttempted=true;
    playTrack(0,true);
  });
  // If audible autoplay is blocked, retry after the first real visitor gesture.
  const retryAutoplay=()=>{
    if(audio.paused&&audio.src)audio.play().catch(()=>{});
    document.removeEventListener("pointerdown",retryAutoplay);
    document.removeEventListener("keydown",retryAutoplay);
  };
  document.addEventListener("pointerdown",retryAutoplay,{once:true});
  document.addEventListener("keydown",retryAutoplay,{once:true});
})();
