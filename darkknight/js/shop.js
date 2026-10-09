/* Shop listing — direct REST */
(function(){
  var URL="https://exaryvtjayuwgyqnioem.supabase.co";
  var KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4YXJ5dnRqYXl1d2d5cW5pb2VtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk1NzgxMjUsImV4cCI6MjEwNTE1NDEyNX0.qMKyG9gwUTeNbfXhzbSbTEJMEh4Dy-5M3gZ9vXpmsKs";
  function h(){return {"apikey":KEY,"Authorization":"Bearer "+KEY};}
  function esc(s){if(s==null)return"";return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
  function price(n){return Number(n||0).toLocaleString("fa-IR")+" تومان";}
  function empty(el,t){el.innerHTML='<div class="empty-state"><div class="empty-state-icon">📦</div><p>'+esc(t)+'</p></div>';}

  var cat = (new URLSearchParams(location.search)).get("cat") || null;

  document.addEventListener("DOMContentLoaded", function(){
    var y=document.getElementById("year"); if(y) y.textContent=new Date().getFullYear();
    var toggle=document.getElementById("menu-toggle"), nav=document.getElementById("nav");
    if(toggle&&nav) toggle.onclick=function(){nav.classList.toggle("open");toggle.classList.toggle("open");};
    loadCats();
    loadProducts();
    var search=document.getElementById("shop-search");
    if(search){
      var t; search.oninput=function(){ clearTimeout(t); t=setTimeout(loadProducts, 300); };
    }
  });

  function loadCats(){
    var list=document.getElementById("cat-list"); if(!list) return;
    fetch(URL+"/rest/v1/product_categories?select=name,slug,icon&is_active=eq.true&order=display_order",{headers:h()})
      .then(function(r){return r.ok?r.json():[];})
      .then(function(data){
        (data||[]).forEach(function(c){
          var a=document.createElement("a");
          a.href="shop.html?cat="+encodeURIComponent(c.slug);
          a.textContent=(c.icon?c.icon+" ":"")+c.name;
          if(c.slug===cat) a.classList.add("active");
          list.appendChild(a);
        });
        if(cat){ var all=list.querySelector('[data-slug=""]'); if(all) all.classList.remove("active"); }
      }).catch(function(){});
  }

  function loadProducts(){
    var grid=document.getElementById("products-grid"); if(!grid) return;
    grid.innerHTML='<div class="loading-state"><div class="spinner"></div></div>';
    var q="/rest/v1/products?select=id,name,slug,short_description,price,sale_price,cover_url,category_id&is_published=eq.true&order=published_at.desc.nullslast&limit=24";
    var search=document.getElementById("shop-search");
    var term=search?search.value.trim():"";
    var chain=Promise.resolve(null);
    if(cat){
      chain=fetch(URL+"/rest/v1/product_categories?select=id&slug=eq."+encodeURIComponent(cat),{headers:h()}).then(function(r){return r.json();}).then(function(rows){return rows[0]&&rows[0].id;});
    }
    chain.then(function(catId){
      if(catId) q+="&category_id=eq."+catId;
      if(term) q+="&or=(name.ilike.*"+encodeURIComponent(term)+"*,short_description.ilike.*"+encodeURIComponent(term)+"*)";
      return fetch(URL+q,{headers:h()});
    }).then(function(r){
      if(!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function(data){
      if(!data||!data.length){ empty(grid,"محصولی یافت نشد"); return; }
      grid.innerHTML=data.map(function(p){
        var img=p.cover_url?'<img class="product-card-img" src="'+esc(p.cover_url)+'" alt="'+esc(p.name)+'" loading="lazy">':'<div class="product-card-img" style="display:flex;align-items:center;justify-content:center;opacity:.4;font-size:2rem">⚔</div>';
        var pr=p.sale_price!=null?'<span>'+price(p.sale_price)+'</span><span class="price-old">'+price(p.price)+'</span>':'<span>'+price(p.price)+'</span>';
        return '<a href="product.html?slug='+encodeURIComponent(p.slug)+'" class="card product-card">'+img+'<div class="product-card-body"><h3 class="card-title">'+esc(p.name)+'</h3><p class="text-muted" style="font-size:.85rem;flex:1">'+esc(p.short_description||'')+'</p><div class="product-price">'+pr+'</div></div></a>';
      }).join("");
    }).catch(function(){ empty(grid,"فروشگاه در حال آماده‌سازی است"); });
  }
})();
