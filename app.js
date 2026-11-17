(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const greetings = ["Merry Christmas!","Welcome to the holiday magic!","Season's greetings!","It's the most wonderful time of the year!","Happy holidays — come on in!","A little Christmas cheer, just for you!"];
  $("welcome-message").textContent = greetings[Math.floor(Math.random()*greetings.length)];
  window.addEventListener("load",()=>setTimeout(()=>$("welcome").classList.add("hide"),1050));
  const cfg=window.CHRISTMAS_CONFIG||{};
  const configured=cfg.supabaseUrl&&cfg.supabaseAnonKey&&!cfg.supabaseUrl.includes("YOUR_")&&!cfg.supabaseAnonKey.includes("YOUR_");
  const db=configured&&window.supabase?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey):null;
  let gifts=[],statuses={},selectedGift=null,selectedKind="purchase",toastTimer,audioContext,musicTimer,musicOn=false;
  const escapeHTML=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const money=n=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n)||0);
  function toast(msg){const el=$("toast");el.textContent=msg;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3200)}
  function token(){const a=new Uint8Array(32);crypto.getRandomValues(a);return Array.from(a,x=>x.toString(16).padStart(2,"0")).join("")}
  function setCountdown(){const now=new Date(),year=now.getMonth()===11&&now.getDate()>25?now.getFullYear()+1:now.getFullYear(),days=Math.ceil((new Date(year,11,25)-now)/86400000);$("countdown").textContent=days===0?"Merry Christmas! 🎄":days+" days until Christmas 🎁"}
  setCountdown();
  async function load(){
    if(!db){gifts=[];statuses={};render();$("inspo-content").textContent="The gift inspiration section will appear here once the site is connected to its database.";return}
    const {data,error}=await db.from("gifts").select("id,name,description,price,supplier,url,image_url,inspiration,created_at").order("created_at",{ascending:false});
    if(error){console.error(error);toast("Couldn't load the wishlist. Check your Supabase setup.");gifts=[];render();return}
    gifts=data||[];
    const {data:st,error:se}=await db.rpc("get_public_gift_statuses");
    if(!se&&Array.isArray(st))statuses=Object.fromEntries(st.map(x=>[x.gift_id,x]));
    render();
    const inspiration=gifts.map(g=>g.inspiration).filter(Boolean);
    $("inspo-content").textContent=inspiration.length?inspiration.join("\n\n"):"I'll add some ideas here soon!";
    if(!$("admin-panel").hidden)adminList();
  }
  function getStatus(g){const s=statuses[g.id];if(!s)return{status:"available"};if(s.status==="held"&&s.expires_at&&new Date(s.expires_at)<=new Date())return{status:"available"};return s}
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
      const st=getStatus(g),held=st.status==="held",bought=st.status==="bought",label=bought?"Bought":held?"On hold":"Available",ownsHold=held&&!!localStorage.getItem("gift-token-"+g.id);
      const image=g.image_url?'<img src="'+escapeHTML(g.image_url)+'" alt="'+escapeHTML(g.name)+'" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">':'<span class="gift-emoji">🎁</span>';
      const boughtButton=ownsHold?'<button class="maybe" data-action="bought" data-id="'+g.id+'">Bought</button>':"";
      return '<article class="gift-card"><div class="gift-image">'+image+'</div><div class="gift-card-body"><div class="gift-meta"><span class="supplier">'+escapeHTML(g.supplier||"Gift idea")+'</span><span class="status '+(bought?"bought":held?"held":"available")+'">'+label+'</span></div><h3>'+escapeHTML(g.name)+'</h3><p class="gift-description">'+escapeHTML(g.description||"A little something for Christmas.")+'</p><div class="gift-bottom"><strong class="gift-price">'+money(g.price)+'</strong></div><div class="gift-actions"><button class="purchase" data-action="purchase" data-id="'+g.id+'" '+(held||bought?"disabled":"")+'>'+(held?"On hold":bought?"Purchased":"🎁 Purchase")+'</button><button class="maybe" data-action="maybe" data-id="'+g.id+'" '+(held||bought?"disabled":"")+'>'+(held?"Reserved":bought?"Bought":"Maybe")+'</button>'+boughtButton+'</div>'+(held?'<p class="hold-info">Someone is thinking of buying this item · '+timeLeft(st.expires_at)+'</p>':"")+'<a class="product-link" href="'+escapeHTML(g.url)+'" target="_blank" rel="noopener noreferrer">View at '+escapeHTML(g.supplier||"the store")+' ↗</a></div></article>';
    }).join("");
  }
  function timeLeft(date){if(!date)return"24-hour hold";const ms=Math.max(0,new Date(date)-Date.now()),h=Math.floor(ms/3600000),m=Math.floor(ms%3600000/60000);return h+"h "+m+"m left"}
  ["search","sort","min-price","max-price","supplier-filter"].forEach(id=>$(id).addEventListener(id==="search"?"input":"change",render));
  $("clear-filters").addEventListener("click",()=>{$("search").value="";$("sort").value="featured";$("min-price").value="";$("max-price").value="";$("supplier-filter").value="";render()});
  $("wishlist-grid").addEventListener("click",async e=>{
    const b=e.target.closest("button[data-action]");if(!b)return;
    if(b.dataset.action==="bought"){await markBought(b.dataset.id);return}
    const gift=gifts.find(g=>g.id===b.dataset.id);if(!gift)return;selectedGift=gift;selectedKind=b.dataset.action;
    $("hold-title").textContent=selectedKind==="purchase"?"Reserve this gift?":"Maybe this one?";
    $("hold-description").textContent=selectedKind==="purchase"?"This puts the gift on hold for 24 hours. If you buy it, come back and mark it as bought.":"This lets everyone know someone is considering this gift. The hold lasts 24 hours.";
    $("guest-name").value="";$("hold-dialog").showModal();
  });
  $("hold-form").addEventListener("submit",async e=>{
    if(e.submitter?.value!=="confirm")return;e.preventDefault();
    if(!selectedGift||!db){toast("The wishlist database hasn't been connected yet.");$("hold-dialog").close();return}
    const t=token(),name=$("guest-name").value.trim();$("hold-confirm").disabled=true;
    const {error}=await db.rpc("reserve_gift",{p_gift_id:selectedGift.id,p_kind:selectedKind,p_guest_name:name||null,p_token:t});
    $("hold-confirm").disabled=false;
    if(error){toast(error.message.includes("already")?"Someone has already reserved this gift.":"Couldn't reserve that gift: "+error.message);return}
    localStorage.setItem("gift-token-"+selectedGift.id,t);$("hold-dialog").close();toast("Gift held for 24 hours. Thanks!");await load();
  });
  async function markBought(giftId){
    const t=localStorage.getItem("gift-token-"+giftId);if(!t){toast("Only the person who placed this hold can mark it bought from this browser.");return}
    const {error}=await db.rpc("mark_gift_bought",{p_gift_id:giftId,p_token:t});
    if(error){toast(error.message);return}
    localStorage.removeItem("gift-token-"+giftId);toast("Marked as bought — thanks for making Christmas special!");await load();
  }
  $("admin-open").addEventListener("click",()=>{$("admin-dialog").showModal();checkSession()});
  $("admin-close").addEventListener("click",()=>$("admin-dialog").close());
  async function checkSession(){
    if(!db){$("admin-login-form").hidden=false;$("admin-panel").hidden=true;$("admin-message").textContent="Add your Supabase settings and run the setup SQL first.";return}
    const {data}=await db.auth.getSession();if(data.session)showAdmin();else{$("admin-login-form").hidden=false;$("admin-panel").hidden=true}
  }
  function showAdmin(){$("admin-login-form").hidden=true;$("admin-panel").hidden=false;adminList()}
  $("admin-login-form").addEventListener("submit",async e=>{e.preventDefault();if(!db)return;const {error}=await db.auth.signInWithPassword({email:$("admin-email").value,password:$("admin-password").value});if(error){$("admin-message").textContent=error.message;return}$("admin-message").textContent="";showAdmin()});
  $("admin-signout").addEventListener("click",async()=>{await db.auth.signOut();$("admin-panel").hidden=true;$("admin-login-form").hidden=false;toast("Signed out.")});
  function adminList(){
    $("admin-gift-list").innerHTML=gifts.map(g=>'<div class="admin-gift-row"><div><strong>'+escapeHTML(g.name)+'</strong><small>'+money(g.price)+' · '+escapeHTML(g.supplier||"No store")+'</small></div><div><button data-edit="'+g.id+'">Edit</button><button data-bought="'+g.id+'">Mark bought</button><button data-delete="'+g.id+'">Delete</button></div></div>').join("")||"<p>No gifts yet.</p>";
  }
  $("admin-gift-list").addEventListener("click",async e=>{
    const edit=e.target.dataset.edit,del=e.target.dataset.delete,bought=e.target.dataset.bought;
    if(edit){const g=gifts.find(x=>x.id===edit);if(!g)return;$("gift-id").value=g.id;$("gift-name").value=g.name;$("gift-description").value=g.description||"";$("gift-price").value=g.price;$("gift-supplier").value=g.supplier||"";$("gift-url").value=g.url;$("gift-image").value=g.image_url||"";$("gift-inspo").value=g.inspiration||"";$("gift-form-title").textContent="Edit gift";$("gift-form").scrollIntoView({behavior:"smooth"})}
    if(bought){const {error}=await db.rpc("admin_mark_gift_bought",{p_gift_id:bought});if(error){toast(error.message);return}toast("Gift marked as bought.");await load();adminList()}
    if(del&&confirm("Delete this gift from the wishlist?")){const {error}=await db.from("gifts").delete().eq("id",del);if(error){toast(error.message);return}toast("Gift deleted.");await load();adminList()}
  });
  $("gift-cancel").addEventListener("click",()=>{$("gift-form").reset();$("gift-id").value="";$("gift-form-title").textContent="Add a gift"});
  $("gift-form").addEventListener("submit",async e=>{
    e.preventDefault();const id=$("gift-id").value,payload={name:$("gift-name").value.trim(),description:$("gift-description").value.trim(),price:Number($("gift-price").value),supplier:$("gift-supplier").value.trim(),url:$("gift-url").value.trim(),image_url:$("gift-image").value.trim()||null,inspiration:$("gift-inspo").value.trim()};
    const q=id?db.from("gifts").update(payload).eq("id",id):db.from("gifts").insert(payload);const {error}=await q;
    if(error){toast(error.message);return}toast(id?"Gift updated!":"Gift added!");$("gift-form").reset();$("gift-id").value="";$("gift-form-title").textContent="Add a gift";await load();adminList();
  });
  // Original synthesized bell-like tune; no copyrighted recording or lyrics.
  const notes=[659.25,783.99,880,783.99,659.25,587.33,523.25,587.33,659.25,659.25,587.33,587.33];
  function stopMusic(){musicOn=false;clearInterval(musicTimer);if(audioContext){audioContext.close();audioContext=null}$("music-toggle").innerHTML='♫ <span>Music off</span>'}
  $("music-toggle").addEventListener("click",async()=>{
    if(musicOn){stopMusic();return}
    try{audioContext=new(window.AudioContext||window.webkitAudioContext)();await audioContext.resume();musicOn=true;let i=0;
      const play=()=>{if(!audioContext||!musicOn)return;const osc=audioContext.createOscillator(),gain=audioContext.createGain();osc.type="sine";osc.frequency.value=notes[i++%notes.length];gain.gain.setValueAtTime(.0001,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.035,audioContext.currentTime+.025);gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+.48);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(audioContext.currentTime+.5)};
      play();musicTimer=setInterval(play,520);$("music-toggle").innerHTML='♫ <span>Music on</span>';
    }catch(e){toast("Audio isn't available in this browser.")}
  });
  if(db)db.auth.onAuthStateChange((_event,session)=>{if(session&&$("admin-dialog").open)showAdmin()});
  load();setInterval(()=>{if(db)load()},60000);
})();