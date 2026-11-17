(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const cfg = window.CHRISTMAS_CONFIG || {};
  const greetings = ["Merry Christmas!","Welcome to the holiday magic!","Season's greetings!","It's the most wonderful time of the year!","Happy holidays — come on in!","A little Christmas cheer, just for you!"];
  $("welcome-message").textContent = greetings[Math.floor(Math.random()*greetings.length)];
  window.addEventListener("load",()=>setTimeout(()=>$("welcome").classList.add("hide"),1050));
  const configured = cfg.firebaseConfig && cfg.firebaseConfig.apiKey && !cfg.firebaseConfig.apiKey.includes("YOUR_") && cfg.firebaseConfig.projectId && !cfg.firebaseConfig.projectId.includes("YOUR_");
  let auth=null, db=null, currentUser=null, gifts=[], statuses={}, selectedGift=null, selectedKind="purchase", toastTimer;
  if(configured && window.firebase) {
    try { firebase.initializeApp(cfg.firebaseConfig); auth=firebase.auth(); db=firebase.firestore(); } catch(e) { console.error(e); }
  }
  const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n)||0);
  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3500)}
  function isAdmin(){return !!(currentUser && cfg.adminUid && currentUser.uid===cfg.adminUid)}
  function setCountdown(){const now=new Date(),year=now.getMonth()===11&&now.getDate()>25?now.getFullYear()+1:now.getFullYear(),days=Math.ceil((new Date(year,11,25)-now)/86400000);$("countdown").textContent=days===0?"Merry Christmas! 🎄":days+" days until Christmas 🎁"}
  setCountdown();
  async function ensureAnonymous(){if(!auth)throw new Error("Firebase is not configured yet.");if(!auth.currentUser){await auth.signInAnonymously()}currentUser=auth.currentUser}
  function stampDate(value){return value&&typeof value.toDate==="function"?value.toDate():value?new Date(value):null}
  async function load(){
    if(!db){gifts=[];statuses={};render();$("inspo-content").textContent="Connect Firebase to start adding gift ideas and inspiration.";return}
    try{
      const [giftSnap,holdSnap]=await Promise.all([db.collection("gifts").orderBy("createdAt","desc").get(),db.collection("giftHolds").get()]);
      gifts=giftSnap.docs.map(d=>({id:d.id,...d.data()}));
      statuses=Object.fromEntries(holdSnap.docs.map(d=>[d.id,d.data()]));
      render();
      const inspiration=gifts.map(g=>g.inspiration).filter(Boolean);
      $("inspo-content").textContent=inspiration.length?inspiration.join("\n\n"):"I'll add some ideas here soon!";
      if(isAdmin()&&!$("admin-panel").hidden)adminList();
    }catch(e){console.error(e);toast("Couldn't load the wishlist. Check Firebase setup and Firestore rules.");gifts=[];render()}
  }
  function getStatus(g){const s=statuses[g.id];if(!s)return{status:"available"};const expiry=stampDate(s.expiresAt);if(s.status==="held"&&expiry&&expiry<=new Date())return{status:"available"};return s}
  function render(){
    const term=$("search").value.trim().toLowerCase(),sort=$("sort").value,min=$("min-price").value,max=$("max-price").value,supplier=$("supplier-filter").value;
    let list=gifts.filter(g=>(g.name+" "+(g.description||"")+" "+(g.supplier||"")).toLowerCase().includes(term)&&(!min||Number(g.price)>=Number(min))&&(!max||Number(g.price)<=Number(max))&&(!supplier||g.supplier===supplier));
    if(sort==="price-asc")list.sort((a,b)=>Number(a.price)-Number(b.price));
    if(sort==="price-desc")list.sort((a,b)=>Number(b.price)-Number(a.price));
    if(sort==="name")list.sort((a,b)=>a.name.localeCompare(b.name));
    if(sort==="supplier")list.sort((a,b)=>(a.supplier||"").localeCompare(b.supplier||""));
    $("gift-count").textContent=list.length+" "+(list.length===1?"gift":"gifts");
    const stores=[...new Set(gifts.map(g=>g.supplier).filter(Boolean))].sort(),current=$("supplier-filter").value;
    $("supplier-filter").innerHTML='<option value="">All stores</option>'+stores.map(s=>'<option value="'+escapeHTML(s)+'">'+escapeHTML(s)+'</option>').join("");
    $("supplier-filter").value=stores.includes(current)?current:"";
    if(!list.length){$("wishlist-grid").innerHTML='<div class="empty-state"><span>🎁</span><h3>No gifts found just yet</h3><p>Try changing your search or filters.</p></div>';return}
    $("wishlist-grid").innerHTML=list.map(g=>{
      const st=getStatus(g),held=st.status==="held",bought=st.status==="bought",label=bought?"Bought":held?"On hold":"Available";
      const ownsHold=held&&currentUser&&st.ownerUid===currentUser.uid;
      const image=g.imageUrl?'<img src="'+escapeHTML(g.imageUrl)+'" alt="'+escapeHTML(g.name)+'" loading="lazy" onerror="this.remove()">':'<span class="gift-emoji">🎁</span>';
      const boughtButton='<button class="maybe" data-action="bought" data-id="'+g.id+'" '+(bought||(!isAdmin()&&!(held&&ownsHold))?"disabled":"")+'>'+(bought?"Bought":"✓ Bought")+'</button>';
      return '<article class="gift-card" data-gift-card="'+g.id+'" tabindex="0" role="button" aria-label="View details for '+escapeHTML(g.name)+'"><div class="gift-image">'+image+'</div><div class="gift-card-body"><div class="gift-meta"><span class="supplier">'+escapeHTML(g.supplier||"Gift idea")+'</span><span class="status '+(bought?"bought":held?"held":"available")+'">'+label+'</span></div><h3>'+escapeHTML(g.name)+'</h3><div class="gift-bottom"><strong class="gift-price">'+money(g.price)+'</strong></div><div class="gift-actions">'+boughtButton+'<button class="maybe" data-action="maybe" data-id="'+g.id+'" '+(held||bought?"disabled":"")+'>'+(held?"Reserved":bought?"Bought":"Maybe")+'</button></div>'+(held?'<p class="hold-info">Someone is thinking of buying this item · '+timeLeft(st.expiresAt)+'</p>':"")+'</div></article>';
    }).join("");
  }
  function timeLeft(value){const date=stampDate(value);if(!date)return"24-hour hold";const ms=Math.max(0,date-Date.now()),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);return h+"h "+m+"m left"}
  ["search","sort","min-price","max-price","supplier-filter"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",render));
  $("clear-filters").addEventListener("click",()=>{$("search").value="";$("sort").value="featured";$("min-price").value="";$("max-price").value="";$("supplier-filter").value="";render()});
  function openGiftDetails(g){
    if(!g)return;
    const image=g.imageUrl?'<img class="details-image" src="'+escapeHTML(g.imageUrl)+'" alt="'+escapeHTML(g.name)+'" onerror="this.style.display=\'none\'">':"";
    const st=getStatus(g),bought=st.status==="bought",held=st.status==="held";
    $("gift-details-content").innerHTML=image+'<p class="eyebrow">'+escapeHTML(g.supplier||"Gift idea")+'</p><h2>'+escapeHTML(g.name)+'</h2><p class="details-price">'+money(g.price)+'</p><p class="details-description">'+escapeHTML(g.description||"No description added.")+'</p>'+(g.inspiration?'<div class="details-extra"><h3>More information</h3><p>'+escapeHTML(g.inspiration)+'</p></div>':"")+'<p class="details-status">Status: '+(bought?"Bought":held?"On hold":"Available")+'</p>'+(g.url?'<a class="primary-button details-link" href="'+escapeHTML(g.url)+'" target="_blank" rel="noopener noreferrer">View product at '+escapeHTML(g.supplier||"the store")+' ↗</a>':"");
    $("gift-details-dialog").showModal();
  }
  $("gift-details-close").addEventListener("click",()=>$("gift-details-dialog").close());
  $("wishlist-grid").addEventListener("click",async e=>{
    const b=e.target.closest("button[data-action]");
    if(b){
      if(b.dataset.action==="bought"){await markBought(b.dataset.id);return}
      const gift=gifts.find(g=>g.id===b.dataset.id);if(!gift)return;selectedGift=gift;selectedKind=b.dataset.action;
      $("hold-title").textContent="Maybe this one?";
      $("hold-description").textContent="This lets everyone know someone is thinking about this gift. The hold lasts 24 hours.";
      $("guest-name").value="";$("hold-dialog").showModal();return;
    }
    const card=e.target.closest("[data-gift-card]");if(card)openGiftDetails(gifts.find(g=>g.id===card.dataset.giftCard));
  });
  $("wishlist-grid").addEventListener("keydown",e=>{
    const card=e.target.closest("[data-gift-card]");
    if(card&&(e.key==="Enter"||e.key===" ")){e.preventDefault();openGiftDetails(gifts.find(g=>g.id===card.dataset.giftCard))}
  });
  $("hold-form").addEventListener("submit",async e=>{
    if(e.submitter?.value!=="confirm")return;e.preventDefault();
    if(!selectedGift||!db){toast("Firebase hasn't been connected yet.");$("hold-dialog").close();return}
    $("hold-confirm").disabled=true;
    try{
      await ensureAnonymous();
      const ref=db.collection("giftHolds").doc(selectedGift.id);
      await db.runTransaction(async tx=>{
        const snap=await tx.get(ref),existing=snap.exists?snap.data():null;
        const expiry=existing?stampDate(existing.expiresAt):null;
        if(existing&&existing.status==="bought")throw new Error("This gift has already been bought.");
        if(existing&&existing.status==="held"&&expiry&&expiry>new Date())throw new Error("Someone already has this gift on hold.");
        tx.set(ref,{status:"held",holdKind:selectedKind,ownerUid:currentUser.uid,expiresAt:firebase.firestore.Timestamp.fromDate(new Date(Date.now()+24*60*60*1000)),updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      });
      $("hold-dialog").close();toast("Gift held for 24 hours. Thanks!");await load();
    }catch(err){toast(err.message||"Couldn't reserve this gift. Check Firebase rules.");}
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
  async function checkSession(){if(!auth){$("admin-message").textContent="Add your Firebase settings first.";return}if(!auth.currentUser){await ensureAnonymous()}currentUser=auth.currentUser;if(isAdmin())showAdmin();else{$("admin-login-form").hidden=false;$("admin-panel").hidden=true}}
  function showAdmin(){$("admin-login-form").hidden=true;$("admin-panel").hidden=false;adminList()}
  $("admin-login-form").addEventListener("submit",async e=>{
    e.preventDefault();if(!auth)return;
    try{const cred=await auth.signInWithEmailAndPassword($("admin-email").value,$("admin-password").value);currentUser=cred.user;if(!isAdmin()){await auth.signOut();await ensureAnonymous();currentUser=auth.currentUser;throw new Error("This account isn't configured as the website admin. Check adminUid in config.js and firestore.rules.")}$("admin-message").textContent="";showAdmin();await load()}
    catch(err){$("admin-message").textContent=err.message}
  });
  $("admin-signout").addEventListener("click",async()=>{await auth.signOut();await ensureAnonymous();currentUser=auth.currentUser;$("admin-panel").hidden=true;$("admin-login-form").hidden=false;toast("Signed out.");await load()});
  function adminList(){$("admin-gift-list").innerHTML=gifts.map(g=>'<div class="admin-gift-row"><div><strong>'+escapeHTML(g.name)+'</strong><small>'+money(g.price)+' · '+escapeHTML(g.supplier||"No store")+'</small></div><div><button data-edit="'+g.id+'">Edit</button><button data-bought="'+g.id+'">Mark bought</button><button data-delete="'+g.id+'">Delete</button></div></div>').join("")||"<p>No gifts yet.</p>"}
  $("admin-gift-list").addEventListener("click",async e=>{
    const edit=e.target.dataset.edit,del=e.target.dataset.delete,bought=e.target.dataset.bought;
    if(edit){const g=gifts.find(x=>x.id===edit);if(!g)return;$("gift-save-message").hidden=true;$("gift-save-message").textContent="";$("gift-id").value=g.id;$("gift-name").value=g.name;$("gift-description").value=g.description||"";$("gift-price").value=g.price;$("gift-supplier").value=g.supplier||"";$("gift-url").value=g.url;$("gift-image").value=g.imageUrl||"";$("gift-inspo").value=g.inspiration||"";$("gift-form-title").textContent="Edit gift";$("gift-form").scrollIntoView({behavior:"smooth"})}
    if(bought)await markBought(bought);
    if(del&&confirm("Delete this gift from the wishlist?")){try{await db.collection("gifts").doc(del).delete();await db.collection("giftHolds").doc(del).delete();toast("Gift deleted.");await load()}catch(err){toast(err.message)}}
  });
  $("gift-cancel").addEventListener("click",()=>{$("gift-form").reset();$("gift-id").value="";$("gift-form-title").textContent="Add a gift";$("gift-save-message").hidden=true;$("gift-save-message").textContent=""});
  $("gift-form").addEventListener("submit",async e=>{
    e.preventDefault();$("gift-save-message").hidden=true;$("gift-save-message").textContent="";if(!isAdmin()){$("gift-save-message").textContent="Admin access required. Please sign in again.";$("gift-save-message").hidden=false;return}
    const id=$("gift-id").value,payload={name:$("gift-name").value.trim(),description:$("gift-description").value.trim(),price:Number($("gift-price").value),supplier:$("gift-supplier").value.trim(),url:$("gift-url").value.trim(),imageUrl:$("gift-image").value.trim()||"",inspiration:$("gift-inspo").value.trim(),updatedAt:firebase.firestore.FieldValue.serverTimestamp()};
    try{if(id)await db.collection("gifts").doc(id).update(payload);else await db.collection("gifts").add({...payload,createdAt:firebase.firestore.FieldValue.serverTimestamp()});toast(id?"Gift updated!":"Gift added!");$("gift-save-message").textContent=id?"Gift updated successfully!":"Gift added successfully!";$("gift-save-message").classList.remove("error");$("gift-save-message").classList.add("success");$("gift-save-message").hidden=false;$("gift-form").reset();$("gift-id").value="";$("gift-form-title").textContent="Add a gift";await load();adminList()}
    catch(err){$("gift-save-message").textContent="Couldn't save gift: "+(err.message||"Please check your connection and Firebase settings.");$("gift-save-message").classList.remove("success");$("gift-save-message").classList.add("error");$("gift-save-message").hidden=false;}
  });
  if(auth)auth.onAuthStateChanged(async user=>{currentUser=user;if(user){await load();if($("admin-dialog").open&&isAdmin())showAdmin()}else{try{await auth.signInAnonymously()}catch(e){console.error(e)}}});
  if(!auth)load();

  // Audio-only playlist. Put properly licensed MP3s in /music using these filenames.
  const tracks=[
    {file:"music/01-your-youtube-pick.mp3",title:"Your Christmas pick 1"},
    {file:"music/02-your-youtube-pick.mp3",title:"Your Christmas pick 2"},
    {file:"music/03-your-youtube-pick.mp3",title:"Your Christmas pick 3"},
    {file:"music/04-joy-to-the-world.mp3",title:"Joy to the World"},
    {file:"music/05-silent-night.mp3",title:"Silent Night"},
    {file:"music/06-god-rest-ye-merry-gentlemen.mp3",title:"God Rest Ye Merry, Gentlemen"}
  ];
  const audio=$("christmas-audio");
  let trackIndex=0,panelOpen=false,autoplayAttempted=false;
  audio.volume=.55;
  function showTrackTitle(title){
    $("now-playing-title").textContent=title;
    $("audio-current-title").textContent=title;
    $("now-playing-title").classList.remove("scrolling");
    requestAnimationFrame(()=>{const el=$("now-playing-title");if(el.scrollWidth>el.parentElement.clientWidth)el.classList.add("scrolling")});
  }
  function updateTrackButtons(){
    $("music-track-list").innerHTML=tracks.map((t,i)=>'<button type="button" class="music-track '+(i===trackIndex?"active":"")+'" data-track="'+i+'"><span class="track-number">'+String(i+1).padStart(2,"0")+'</span><span class="track-name">'+escapeHTML(t.title)+'</span><span class="track-play">'+(i===trackIndex?"♫":"▶")+'</span></button>').join("");
  }
  function setPlayerState(playing){$("now-playing-state").textContent=playing?"♫":"▶";$("audio-play").disabled=playing;$("audio-pause").disabled=!playing}
  function playTrack(i,tryPlay=true){
    trackIndex=(i+tracks.length)%tracks.length;
    const track=tracks[trackIndex];
    showTrackTitle(track.title);updateTrackButtons();
    audio.pause();audio.src=track.file;audio.load();
    if(tryPlay){
      audio.play().then(()=>{$("music-note").textContent="Now playing.";setPlayerState(true)})
      .catch(()=>{$("music-note").textContent="Your browser blocked automatic sound, or the MP3 is not uploaded yet. Press Play after adding the licensed audio files.";setPlayerState(false)});
    } else setPlayerState(false);
  }
  audio.addEventListener("ended",()=>playTrack(trackIndex+1,true));
  audio.addEventListener("play",()=>setPlayerState(true));
  audio.addEventListener("pause",()=>setPlayerState(false));
  audio.addEventListener("error",()=>{$("music-note").textContent="This MP3 has not been uploaded yet. See music/README.md for the filenames.";setPlayerState(false)});
  $("audio-play").addEventListener("click",()=>audio.play().catch(()=>toast("That MP3 file isn't available yet.")));
  $("audio-pause").addEventListener("click",()=>audio.pause());
  $("audio-volume").addEventListener("input",e=>audio.volume=Number(e.target.value));
  function toggleMusicPanel(){panelOpen=!panelOpen;$("music-panel").hidden=!panelOpen}
  $("music-toggle").addEventListener("click",toggleMusicPanel);
  $("now-playing").addEventListener("click",toggleMusicPanel);
  $("now-playing").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();toggleMusicPanel()}});
  $("music-close").addEventListener("click",()=>{panelOpen=false;$("music-panel").hidden=true});
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