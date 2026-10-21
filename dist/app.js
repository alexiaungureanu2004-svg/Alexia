const legacyProducts = [
  {id:'rds308',name:'Rochie lungă neagră cu corset',category:'Rochii',price:2690,badge:'NOU',basic:false,image:'assets/loomy/rochie-neagra-corset.jpg',sizes:['S','M','L']},
  {id:'corset279',name:'Corset cu volane din catifea',category:'Corsete',price:980,badge:'ATELIER PICK',basic:false,image:'assets/loomy/corset-catifea-albastru.jpg',sizes:['S','M','L']},
  {id:'sacougri',name:'Sacou gri oversized',category:'Tailoring',price:990,badge:'MADE TO ORDER',basic:false,image:'assets/loomy/costum-gri.jpg',sizes:['S','M','L']},
  {id:'fustaplisata',name:'Fustă plisată gri',category:'Separates',price:780,badge:'BESTSELLER',basic:false,image:'assets/loomy/fusta-plisata-gri.jpg',sizes:['S','M','L']},
  {id:'basictee',name:'Tricou oversized din satin bej',category:'Loomy Basic',price:590,badge:'LOOMY BASIC',basic:true,image:'assets/loomy/tricou-satin-bej.jpg',sizes:['S','M','L']},
  {id:'basicshirt',name:'Top din satin maro cu spate gol',category:'Loomy Basic',price:420,badge:'LOOMY BASIC',basic:true,image:'assets/loomy/top-satin-maro.jpg',sizes:['S','M','L']},
  {id:'pantaloni',name:'Pantaloni lungi roz',category:'Separates',price:820,badge:'MADE TO ORDER',basic:false,image:'assets/loomy/pantaloni-roz.jpg',sizes:['S','M','L']},
  {id:'rochiesatin',name:'Rochie din satin maro cu spate gol',category:'Rochii',price:790,badge:'NOU',basic:false,image:'assets/loomy/rochie-satin-maro.jpg',sizes:['S','M','L']}
];
const importedProducts = window.loomyCatalogProducts || [];
const importedIds = new Set(importedProducts.map(p => p.id));
const legacyProductUrls = {corset279:'https://www.loomythebrand.com/corset-cu-volane-din-catifea-albastra/pd/t-158',pantalonioffice:'https://www.loomythebrand.com/pantaloni-office/pd/p-232'};
legacyProducts.forEach(p => { p.sourceUrl = legacyProductUrls[p.id] || p.sourceUrl; });
const products = [...importedProducts, ...legacyProducts.filter(p => !importedIds.has(p.id))];
const money = n => new Intl.NumberFormat('ro-RO').format(n) + ' lei';
let cart = [];
try {
  const saved = JSON.parse(localStorage.getItem('loomy-cart') || '[]');
  if (Array.isArray(saved)) cart = saved.filter(x => x && products.some(p => p.id === x.id) && ['S','M','L'].includes(x.size) && Number.isInteger(x.qty) && x.qty > 0 && x.qty <= 10);
} catch { /* Start with an empty cart if browser storage is unavailable or invalid. */ }
let currentFilter = 'Toate';
let searchSource = 'all';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function productCard(p){return `<article class="product-card" data-id="${p.id}"><div class="product-image"><img src="${p.image}" alt="${p.name}" loading="lazy"><span class="product-badge">${p.badge}</span><button class="save-button" aria-label="Salvează ${p.name} la favorite" data-fav="${p.id}" data-saved="false">SALVEAZĂ</button></div><div class="product-meta"><span class="product-name">${p.name}</span><span class="product-price">${money(p.price)}</span></div><div class="product-sub">${p.category} · fiecare piesă este croită la comandă</div>${p.sourceUrl?`<a class="product-source-link" href="${p.sourceUrl}" target="_blank" rel="noopener">DETALIILE PRODUSULUI ↗</a>`:""}<div class="product-actions"><div class="size-row">${p.sizes.map((s,i)=>`<button class="size-chip ${i===1?'selected':''}" data-size="${s}" aria-label="Mărimea ${s}">${s}</button>`).join('')}</div><button class="add-button" data-add="${p.id}">ALEGE FIT-UL +</button></div><button class="product-tryon-link" type="button" data-open-tryon="${p.id}">Încearcă virtual ↗</button></article>`}
function renderProducts(){
  $('#new-arrivals').innerHTML=products.map(productCard).join('');
  const visible=products.filter(p=>currentFilter==='Toate'||p.category===currentFilter);
  $('#catalog-products').innerHTML=visible.map(productCard).join('')||'<p>Nu am găsit produse în această categorie.</p>';
}
function updateCart(){
  try { localStorage.setItem('loomy-cart',JSON.stringify(cart)); } catch { /* The current cart still works without persistence. */ }
  $('#bag-count').textContent=cart.reduce((n,x)=>n+x.qty,0);
  $('#cart-empty').style.display=cart.length?'none':'grid';
  $('#cart-bottom').style.display=cart.length?'block':'none';
  $('#cart-items').innerHTML=cart.map(x=>{const p=products.find(a=>a.id===x.id);return p?`<div class="cart-row"><img src="${p.image}" alt=""><div><strong>${p.name}</strong><small>Mărimea ${x.size} · ${x.qty} buc.</small></div><div><b>${money(p.price*x.qty)}</b><br><button data-remove="${x.id}|${x.size}">Elimină</button></div></div>`:''}).join('');
  $('#cart-subtotal').textContent=money(cart.reduce((n,x)=>n+products.find(p=>p.id===x.id).price*x.qty,0));
  const subtotal=cart.reduce((n,x)=>n+products.find(p=>p.id===x.id).price*x.qty,0);
  const shipping=$('#shipping-summary');
  if(shipping)shipping.textContent=subtotal>1000?'Livrare gratuită în România.':'Livrare gratuită pentru comenzi peste 1.000 lei. Costul transportului se confirmă la checkout.';
}
function showToast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2500)}
function openOverlay(el){$('#overlay').classList.add('open');el.classList.add('open');el.setAttribute('aria-hidden','false');document.body.classList.add('no-scroll')}
function closeAll(){[$('#cart-drawer'),$('#measure-modal'),$('#search-modal')].forEach(x=>{x.classList.remove('open');x.setAttribute('aria-hidden','true')});$('#overlay').classList.remove('open');document.body.classList.remove('no-scroll')}
function openMeasurements(){openOverlay($('#measure-modal'))}
function openCart(){updateCart();openOverlay($('#cart-drawer'))}
function selectedSize(button){return button.closest('.product-card').querySelector('.size-chip.selected')?.dataset.size||'M'}

document.addEventListener('click',e=>{
  const add=e.target.closest('[data-add]');if(add){const card=add.closest('.product-card'),id=add.dataset.add,size=selectedSize(add);const item=cart.find(x=>x.id===id&&x.size===size);if(item)item.qty++;else cart.push({id,size,qty:1});updateCart();showToast('Piesa a fost adăugată în coș.');return}
  const size=e.target.closest('.size-chip');if(size){size.closest('.size-row').querySelectorAll('.size-chip').forEach(x=>x.classList.remove('selected'));size.classList.add('selected');return}
  const remove=e.target.closest('[data-remove]');if(remove){const [id,size]=remove.dataset.remove.split('|');cart=cart.filter(x=>!(x.id===id&&x.size===size));updateCart();return}
  const fav=e.target.closest('[data-fav]');if(fav){const on=fav.dataset.saved==='true';fav.dataset.saved=String(!on);fav.textContent=on?'SALVEAZĂ':'SALVAT';fav.setAttribute('aria-label',`${on?'Salvează':'Elimină'} ${products.find(p=>p.id===fav.dataset.fav)?.name||'produsul'} ${on?'la':'din'} favorite`);showToast(on?'Eliminat din favorite.':'Adăugat la favorite.');return}
  const tryon=e.target.closest('[data-open-tryon]');if(tryon){$('#tryon-product').value=tryon.dataset.openTryon;$('#try-on').scrollIntoView({behavior:'smooth'});$('#tryon-photo').focus({preventScroll:true});return}
  const category=e.target.closest('[data-filter]');if(category){e.preventDefault();currentFilter=category.dataset.filter;$('#category-filter').value=currentFilter;renderProducts();$('#catalog').scrollIntoView({behavior:'smooth'});return}
  if(e.target.closest('[data-basic-link]')){e.preventDefault();currentFilter='Loomy Basic';$('#category-filter').value=currentFilter;renderProducts();$('#catalog').scrollIntoView({behavior:'smooth'});return}
  const search=e.target.closest('#search-trigger');if(search){searchSource='all';openOverlay($('#search-modal'));$('#search-input').focus();renderSearch();return}
  if(e.target.closest('[data-close]')){closeAll();return}
});

['#open-measurements','#open-measurements-2','#open-measurements-3'].forEach(s=>$(s).addEventListener('click',openMeasurements));
$('#bag-trigger').addEventListener('click',openCart);
$('#overlay').addEventListener('click',closeAll);
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeAll()});
$('#category-filter').addEventListener('change',e=>{currentFilter=e.target.value;renderProducts()});
$('#products-next').addEventListener('click',()=>$('#new-arrivals').scrollBy({left:260,behavior:'smooth'}));
$('#products-prev').addEventListener('click',()=>$('#new-arrivals').scrollBy({left:-260,behavior:'smooth'}));
$('#new-arrivals').style.overflowX='auto';
$('#new-arrivals').style.scrollbarWidth='none';
$('#menu-toggle').addEventListener('click',()=>$('.main-nav').classList.toggle('open'));
$('#account-trigger').addEventListener('click',()=>showToast('Conturile LOOMY vor fi disponibile la lansare.'));

const profileKey='loomy-fit-profile';
function loadProfile(){try{const data=JSON.parse(localStorage.getItem(profileKey)||'{}');const form=$('#measure-form');Object.entries(data).forEach(([k,v])=>{if(form.elements[k]){if(form.elements[k].type==='radio'){const item=form.querySelector(`[name="${k}"][value="${v}"]`);if(item)item.checked=true}else form.elements[k].value=v}});return data}catch{return{}}}
let fitStep=0;
function showFitStep(step){fitStep=Math.max(0,Math.min(2,step));$$('.fit-step').forEach((el,i)=>el.classList.toggle('is-active',i===fitStep));$('#fit-step-kicker').textContent=`PROFIL MADE TO MEASURE · PASUL ${fitStep+1} DIN 3`;$('#fit-step-count').textContent=`${fitStep+1} / 3`;$('#fit-progress-fill').style.width=`${((fitStep+1)/3)*100}%`;$('#fit-back').hidden=fitStep===0;$('#fit-next').hidden=fitStep===2;$('#fit-save').hidden=fitStep!==2;$('#profile-message').textContent=''}
$('#fit-next').addEventListener('click',()=>showFitStep(fitStep+1));
$('#fit-back').addEventListener('click',()=>showFitStep(fitStep-1));
$('#measure-form').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());try{localStorage.setItem(profileKey,JSON.stringify(d));$('#profile-message').textContent='Profilul tău made to measure a fost salvat pe acest dispozitiv.';showToast('Profilul tău de fit este salvat.')}catch{$('#profile-message').textContent='Nu am putut salva profilul în acest browser.'}});
$('#clear-profile').addEventListener('click',()=>{localStorage.removeItem(profileKey);$('#measure-form').reset();showFitStep(0);$('#profile-message').textContent='Profilul salvat a fost șters de pe acest dispozitiv.'});
loadProfile();

const quizQuestions=[
  {title:'Unde te duce <em>ziua ta?</em>',answers:[['O cină sau un eveniment','rochii'],['O zi în oraș','everyday'],['Vreau un look puternic','tailoring']]},
  {title:'Ce energie vrei <em>să porți?</em>',answers:[['Feminină și fluidă','fluid'],['Relaxată și firească','soft'],['Sigură pe mine','bold']]},
  {title:'Alege detaliul tău <em>preferat.</em>',answers:[['O talie conturată','corset'],['O piesă versatilă','basic'],['Un look din două piese','separates']]}
];
let quizStep=0,quizAnswers=[];
function renderQuiz(){const q=quizQuestions[quizStep];$('#quiz-step-label').textContent=`PASUL ${quizStep+1} DIN 3`;$('#quiz-progress-fill').style.width=`${(quizStep+1)/3*100}%`;$('#quiz-question').innerHTML=`<h3>${q.title}</h3>`;$('#quiz-options').innerHTML=q.answers.map(([label,value],i)=>`<button class="quiz-option ${quizAnswers[quizStep]===value?'selected':''}" type="button" data-quiz-answer="${value}" aria-pressed="${quizAnswers[quizStep]===value}"><span>0${i+1}</span>${label}<i>↗</i></button>`).join('');$('#quiz-next').disabled=!quizAnswers[quizStep];$('#quiz-back').hidden=quizStep===0;$('#quiz-result').hidden=true;$('#quiz-options').hidden=false;$('#quiz-next').hidden=false;$('#quiz-restart').hidden=true}
function finishQuiz(){const points={};quizAnswers.forEach(x=>points[x]=(points[x]||0)+1);const key=Object.keys(points).sort((a,b)=>points[b]-points[a])[0];const group={rochii:['Rochii','rochiesatin'],everyday:['Loomy Basic','basictee'],tailoring:['Tailoring','sacougri'],fluid:['Rochii','rochiesatin'],soft:['Loomy Basic','basicshirt'],bold:['Tailoring','sacougri'],corset:['Corsete','corset279'],basic:['Loomy Basic','basictee'],separates:['Separates','fustaplisata']}[key]||['Rochii','rochiesatin'];const item=products.find(p=>p.id===group[1]);$('#quiz-options').hidden=true;$('#quiz-question').innerHTML='<h3>Uite piesa ta <em>de azi.</em></h3>';$('#quiz-result').innerHTML=`<img src="${item.image}" alt="${item.name}"><div><span class="eyebrow">ALEASĂ PENTRU STILUL TĂU</span><h4>${item.name}</h4><p>${money(item.price)} · realizată la comandă, după profilul tău de fit.</p><button class="button button-dark" type="button" data-quiz-product="${item.id}">Descoperă piesa ↗</button></div>`;$('#quiz-result').hidden=false;$('#quiz-next').hidden=true;$('#quiz-back').hidden=true;$('#quiz-restart').hidden=false}
renderQuiz();
$('#quiz-options').addEventListener('click',e=>{const answer=e.target.closest('[data-quiz-answer]');if(!answer)return;quizAnswers[quizStep]=answer.dataset.quizAnswer;renderQuiz()});
$('#quiz-next').addEventListener('click',()=>{if(quizStep<2){quizStep++;renderQuiz()}else finishQuiz()});
$('#quiz-back').addEventListener('click',()=>{quizStep=Math.max(0,quizStep-1);renderQuiz()});
$('#quiz-restart').addEventListener('click',()=>{quizStep=0;quizAnswers=[];renderQuiz()});
$('#quiz-result').addEventListener('click',e=>{const b=e.target.closest('[data-quiz-product]');if(!b)return;currentFilter='Toate';$('#category-filter').value=currentFilter;renderProducts();$('#catalog').scrollIntoView({behavior:'smooth'});showToast('Piesa ta te așteaptă în colecție.')});

const tryonSelect=$('#tryon-product'),tryonInput=$('#tryon-photo'),tryonConsent=$('#tryon-consent'),tryonButton=$('#tryon-submit');
tryonSelect.innerHTML=products.map(p=>`<option value="${p.id}">${p.name} · ${money(p.price)}</option>`).join('');
let photoFile=null,photoUrl=null;
function clearTryonPhoto(){photoFile=null;tryonInput.value='';tryonConsent.checked=false;$('#tryon-preview-wrap').hidden=true;$('#tryon-preview').removeAttribute('src');if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;$('#tryon-result').hidden=true;$('#tryon-result-image').removeAttribute('src');$('#tryon-status').textContent='';updateTryonReady()}
function updateTryonReady(){tryonButton.disabled=!(photoFile&&tryonConsent.checked);}
tryonInput.addEventListener('change',()=>{const f=tryonInput.files?.[0];if(!f)return;if(!/^image\/(jpeg|png|webp)$/.test(f.type)||f.size>10*1024*1024){clearTryonPhoto();$('#tryon-status').textContent='Alege o imagine JPG, PNG sau WebP de maximum 10 MB.';return}photoFile=f;if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=URL.createObjectURL(f);$('#tryon-preview').src=photoUrl;$('#tryon-preview-wrap').hidden=false;$('#tryon-result').hidden=true;$('#tryon-status').textContent='Previzualizarea rămâne locală până când alegi să generezi.';updateTryonReady()});
$('#tryon-clear').addEventListener('click',clearTryonPhoto);tryonConsent.addEventListener('change',updateTryonReady);
function compressTryonImage(file){return new Promise((resolve,reject)=>{const img=new Image(),url=URL.createObjectURL(file);img.onload=()=>{URL.revokeObjectURL(url);const scale=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight));const canvas=document.createElement('canvas');canvas.width=Math.round(img.naturalWidth*scale);canvas.height=Math.round(img.naturalHeight*scale);canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);let quality=.86;const encode=()=>canvas.toBlob(blob=>{if(!blob)return reject(new Error('Nu am putut pregăti imaginea.'));if(blob.size>2.8*1024*1024&&quality>.48){quality-=.12;encode();return}if(blob.size>2.8*1024*1024)return reject(new Error('Fotografia este prea mare chiar și după optimizare.'));const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error('Nu am putut citi fotografia.'));reader.readAsDataURL(blob)},'image/jpeg',quality)};img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Nu am putut deschide fotografia.'))};img.src=url})}
async function startTryon(){if(!photoFile||!tryonConsent.checked)return;tryonButton.disabled=true;$('#tryon-result').hidden=true;$('#tryon-status').textContent='Pregătim fotografia pe dispozitivul tău…';try{const modelImage=await compressTryonImage(photoFile);$('#tryon-status').textContent='Trimitem fotografia către FASHN pentru o singură simulare…';const start=await fetch('/api/try-on',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:tryonSelect.value,modelImage})});const started=await start.json().catch(()=>({}));if(!start.ok)throw new Error(started.message||'Proba virtuală nu este activată încă.');let predictionId=started.id;if(!predictionId)throw new Error('Serviciul nu a pornit simularea. Încearcă din nou.');for(let i=0;i<36;i++){await new Promise(r=>setTimeout(r,2500));const poll=await fetch(`/api/try-on?predictionId=${encodeURIComponent(predictionId)}`);const status=await poll.json().catch(()=>({}));if(!poll.ok)throw new Error(status.message||'Nu am putut prelua rezultatul.');if(status.status==='completed'){const result=status.output?.[0];if(typeof result!=='string'||!result.startsWith('data:image/'))throw new Error('Serviciul nu a returnat imaginea în formatul așteptat.');$('#tryon-result-image').src=result;$('#tryon-result').hidden=false;$('#tryon-status').textContent='Simularea ta este gata. Rezultatul nu indică mărimea sau potrivirea reală.';return}if(status.status==='failed')throw new Error(status.message||'Simularea nu a reușit pentru această fotografie.');$('#tryon-status').textContent='Generăm simularea…'}throw new Error('Generarea durează mai mult decât de obicei. Încearcă din nou.')}catch(err){$('#tryon-status').textContent=err.message}finally{updateTryonReady()}}
tryonButton.addEventListener('click',startTryon);window.addEventListener('pagehide',()=>{if(photoUrl)URL.revokeObjectURL(photoUrl)});

function renderSearch(){const term=$('#search-input').value.toLocaleLowerCase('ro');const found=products.filter(p=>(p.name+' '+p.category).toLocaleLowerCase('ro').includes(term));$('#search-results').innerHTML=found.map(p=>`<button class="search-result" data-search-product="${p.id}"><strong>${p.name}</strong><small>${p.category} · ${money(p.price)}</small></button>`).join('')||'<p>Nu am găsit produse. Încearcă „rochie” sau „corset”.</p>'}
$('#search-input').addEventListener('input',renderSearch);
$('#search-results').addEventListener('click',e=>{const b=e.target.closest('[data-search-product]');if(!b)return;closeAll();currentFilter='Toate';$('#category-filter').value=currentFilter;renderProducts();$('#catalog').scrollIntoView({behavior:'smooth'});showToast(products.find(p=>p.id===b.dataset.searchProduct).name)});
// Newsletter submissions are handled by supabase-newsletter.js.
renderProducts();updateCart();

