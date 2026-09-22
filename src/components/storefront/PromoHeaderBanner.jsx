import React,{useEffect,useMemo,useState} from 'react';
import {base44} from '@/api/base44Client';
import {ChevronRight,Gift,Tag,Truck} from 'lucide-react';
import {Link,useLocation} from 'react-router-dom';
import {storefrontStoreRef,withStore} from '@/lib/storefrontTenant';

const activeToday=item=>{const today=new Date().toISOString().slice(0,10);return item?.is_active!==false&&(!item?.start_date||item.start_date<=today)&&(!item?.expires_at||item.expires_at>=today)&&(!item?.end_date||item.end_date>=today)};
const linkedIds=promotion=>Array.from(new Set([promotion?.product_id,...(promotion?.product_ids||[]),promotion?.benefit_product_id].filter(Boolean)));

export default function PromoHeaderBanner({products=[]}){
 const[messages,setMessages]=useState([]),[promotions,setPromotions]=useState([]);const location=useLocation(),storeRef=storefrontStoreRef(location.search);
 useEffect(()=>{Promise.all([base44.entities.PromoMessage.filter({is_active:true},'sort_order'),base44.entities.Coupon.filter({is_active:true})]).then(([m,p])=>{setMessages(m.filter(activeToday));setPromotions(p.filter(activeToday))}).catch(()=>{})},[storeRef]);
 const cards=useMemo(()=>messages.map(message=>{const promotion=promotions.find(item=>item.id===message.promotion_id);if(!promotion||promotion.display_in_catalog===false)return null;const ids=linkedIds(promotion),product=products.find(item=>ids.includes(item.id));return{...message,promotion,title:message.text||promotion.mini_banner_text||promotion.name,subtitle:promotion.name&&promotion.name!==(message.text||promotion.mini_banner_text)?promotion.name:(promotion.code?`Use o cupom ${promotion.code}`:''),image:promotion.image_url||product?.images?.[0]}}).filter(Boolean),[messages,promotions,products]);
 if(!cards.length)return null;
 return <section aria-label="Promoções em destaque" className="px-4 py-2"><div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain pb-1">{cards.map(card=>{const Icon=card.promotion.promotion_type==='free_shipping'?Truck:card.promotion.promotion_type==='buy_x_get_y'?Gift:Tag;return <Link key={card.id} to={withStore(`/loja/promocao/${card.promotion.id}`,storeRef)} className="relative block aspect-[4/1] w-[calc(100%-1rem)] shrink-0 snap-start overflow-hidden rounded-2xl border border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 shadow-sm" aria-label={`${card.title}. ${card.cta_label||'Ver promoção'}`}>{card.image?<img src={card.image} alt={card.title} className="absolute inset-0 h-full w-full object-cover" loading="lazy"/>:<span className="flex h-full min-w-0 items-center gap-3 px-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-primary"><Icon size={26}/></span><span className="min-w-0 flex-1"><strong className="block line-clamp-2 text-sm leading-tight text-gray-900">{card.title}</strong>{card.subtitle&&<span className="mt-1 block truncate text-[11px] text-gray-500">{card.subtitle}</span>}</span><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm"><ChevronRight size={18}/></span></span>}</Link>})}</div></section>;
}
