const products = [
  {id:'rds308',name:'Rochie lungă neagră cu corset',category:'Rochii',price:2690,badge:'NOU',basic:false,image:'assets/loomy/rochie-neagra-corset.jpg',sizes:['S','M','L']},
  {id:'corset279',name:'Corset cu volane din catifea',category:'Corsete',price:980,badge:'ATELIER PICK',basic:false,image:'assets/loomy/corset-catifea-albastru.jpg',sizes:['S','M','L']},
  {id:'sacougri',name:'Sacou gri oversized',category:'Tailoring',price:990,badge:'MADE TO ORDER',basic:false,image:'assets/loomy/costum-gri.jpg',sizes:['S','M','L']},
  {id:'fustaplisata',name:'Fustă plisată gri',category:'Separates',price:780,badge:'BESTSELLER',basic:false,image:'assets/loomy/fusta-plisata-gri.jpg',sizes:['S','M','L']},
  {id:'basictee',name:'Tricou oversized din satin bej',category:'Loomy Basic',price:590,badge:'LOOMY BASIC',basic:true,image:'assets/loomy/tricou-satin-bej.jpg',sizes:['S','M','L']},
  {id:'basicshirt',name:'Top din satin maro cu spate gol',category:'Loomy Basic',price:420,badge:'LOOMY BASIC',basic:true,image:'assets/loomy/top-satin-maro.jpg',sizes:['S','M','L']},
  {id:'pantaloni',name:'Pantaloni lungi roz',category:'Separates',price:820,badge:'MADE TO ORDER',basic:false,image:'assets/loomy/pantaloni-roz.jpg',sizes:['S','M','L']},
  {id:'rochiesatin',name:'Rochie din satin maro cu spate gol',category:'Rochii',price:790,badge:'NOU',basic:false,image:'assets/loomy/rochie-satin-maro.jpg',sizes:['S','M','L']}
];
const money = n => new Intl.NumberFormat('ro-RO').format(n) + ' lei';
let cart = JSON.parse(localStorage.getItem('loomy-cart') || '[]');
let currentFilter = 'Toate';
let searchSource = 'all';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

function productCard(p){return `<article class="product-card" data-id="${p.id}"><div class="product-image"><img src="${p.image}" alt="${p.name}" loading="lazy"><span class="product-badge">${p.badge}</span><button class="heart-button" aria-label="Adaugă ${p.name} la favorite" data-fav="${p.id}">♡</button></div><div class="product-meta"><span class="product-name">${p.name}</span><span class="product-price">${money(p.price)}</span></div><div class="product-sub">${p.category} · creată la comandă</div><div class="product-actions"><div class="size-row">${p.sizes.map((s,i)=>`<button class="size-chip ${i===1?'selected':''}" data-size="${s}" aria-label="Mărimea ${s}">${s}</button>`).join('')}</div><button class="add-button" data-add="${p.id}">ADAUGĂ +</button></div></article>`}
function renderProducts(){
  $('#new-arrivals').innerHTML=products.map(productCard).join('');
  const visible=products.filter(p=>currentFilter==='Toate'||p.category===currentFilter);
  $('#catalog-products').innerHTML=visible.map(productCard).join('')||'<p>Nu am găsit produse în această categorie.</p>';
}
function updateCart(){
  localStorage.setItem('loomy-cart',JSON.stringify(cart));
  $('#bag-count').textContent=cart.reduce((n,x)=>n+x.qty,0);
  $('#cart-empty').style.display=cart.length?'none':'grid';
  $('#cart-bottom').style.display=cart.length?'block':'none';
  $('#cart-items').innerHTML=cart.map(x=>{const p=products.find(a=>a.id===x.id);return p?`<div class="cart-row"><img src="${p.image}" alt=""><div><strong>${p.name}</strong><small>Mărimea ${x.size} · ${x.qty} buc.</small></div><div><b>${money(p.price*x.qty)}</b><br><button data-remove="${x.id}|${x.size}">Elimină</button></div></div>`:''}).join('');
  $('#cart-subtotal').textContent=money(cart.reduce((n,x)=>n+products.find(p=>p.id===x.id).price*x.qty,0));
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
  const fav=e.target.closest('[data-fav]');if(fav){const on=fav.textContent==='♥';fav.textContent=on?'♡':'♥';showToast(on?'Eliminat din favorite.':'Adăugat la favorite.');return}
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
$('#checkout-button').addEventListener('click',()=>showToast('Checkout-ul online urmează să fie conectat.'));
$('#menu-toggle').addEventListener('click',()=>$('.main-nav').classList.toggle('open'));
$('#account-trigger').addEventListener('click',()=>showToast('Conturile LOOMY vor fi disponibile la lansare.'));

const profileKey='loomy-fit-profile';
function loadProfile(){try{const data=JSON.parse(localStorage.getItem(profileKey)||'{}');const form=$('#measure-form');Object.entries(data).forEach(([k,v])=>{if(form.elements[k]){if(form.elements[k].type==='radio'){const item=form.querySelector(`[name="${k}"][value="${v}"]`);if(item)item.checked=true}else form.elements[k].value=v}});return data}catch{return{}}}
$('#measure-form').addEventListener('submit',e=>{e.preventDefault();const d=Object.fromEntries(new FormData(e.currentTarget).entries());try{localStorage.setItem(profileKey,JSON.stringify(d));$('#profile-message').textContent='Profilul tău de fit a fost salvat pe acest dispozitiv.'}catch{$('#profile-message').textContent='Nu am putut salva profilul în acest browser.'}});
$('#clear-profile').addEventListener('click',()=>{localStorage.removeItem(profileKey);$('#measure-form').reset();$('#profile-message').textContent='Profilul salvat a fost șters de pe acest dispozitiv.'});
loadProfile();

function renderSearch(){const term=$('#search-input').value.toLocaleLowerCase('ro');const found=products.filter(p=>(p.name+' '+p.category).toLocaleLowerCase('ro').includes(term));$('#search-results').innerHTML=found.map(p=>`<button class="search-result" data-search-product="${p.id}"><strong>${p.name}</strong><small>${p.category} · ${money(p.price)}</small></button>`).join('')||'<p>Nu am găsit produse. Încearcă „rochie” sau „corset”.</p>'}
$('#search-input').addEventListener('input',renderSearch);
$('#search-results').addEventListener('click',e=>{const b=e.target.closest('[data-search-product]');if(!b)return;closeAll();currentFilter='Toate';$('#category-filter').value=currentFilter;renderProducts();$('#catalog').scrollIntoView({behavior:'smooth'});showToast(products.find(p=>p.id===b.dataset.searchProduct).name)});
$('#newsletter-form').addEventListener('submit',e=>{e.preventDefault();showToast('Mulțumim! Abonarea va fi activată la lansare.');e.currentTarget.reset()});
renderProducts();updateCart();
