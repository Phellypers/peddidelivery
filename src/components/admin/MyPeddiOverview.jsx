import React, { useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Crown, GraduationCap, Store, Headphones, Zap, Settings, UserRound, Wallet, Megaphone, Clock, ArrowRight, ChevronRight } from 'lucide-react';
import './my-peddi.css';

const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0) / 100);
const date = value => value ? new Date(value).toLocaleDateString('pt-BR') : '—';
const art = {
  FOUNDER: { icon: Crown, file: 'fundador', tone: 'mint' },
  TRAINING: { icon: GraduationCap, file: 'treinamento', tone: 'blue' },
  STORE_SETUP: { icon: Store, file: 'loja-pronta', tone: 'blue' },
  EXCLUSIVE_SUPPORT: { icon: Headphones, file: 'suporte', tone: 'mint' },
  QUICK_HELP: { icon: Zap, file: 'atendimento-rapido', tone: 'peach' },
  ASSISTED_SETUP: { icon: Settings, file: 'configuracao-assistida', tone: 'mint' },
  ADVANCED_HELP: { icon: UserRound, file: 'atendimento-avancado', tone: 'blue' },
};
function ServiceArt({ id, banner = false }) {
  const item = art[id] || art.ADVANCED_HELP;
  const Icon = item.icon;
  const [failed, setFailed] = useState(false);
  return <span className={`${banner ? 'mp-banner-art' : 'mp-service-art'} mp-tone-${item.tone}`} aria-hidden="true">
    {failed ? <Icon strokeWidth={1.6} /> : <img src={`/minha-peddi/${item.file}.webp`} alt="" onError={() => setFailed(true)} />}
  </span>;
}

export default function MyPeddiOverview({ data, chooseService, setTab, setNews }) {
  const [viewport, carousel] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps' });
  const [selected, setSelected] = useState(0);
  const [snaps, setSnaps] = useState([]);
  useEffect(() => {
    if (!carousel) return;
    const update = () => { setSelected(carousel.selectedScrollSnap()); setSnaps(carousel.scrollSnapList()); };
    update(); carousel.on('select', update); carousel.on('reInit', update);
    return () => { carousel.off('select', update); carousel.off('reInit', update); };
  }, [carousel]);
  const banners = ['FOUNDER', 'TRAINING', 'EXCLUSIVE_SUPPORT'].map(id => data.services.find(item => item.id === id)).filter(Boolean);
  const bannerText = {
    FOUNDER: { badge: 'MAIS POPULAR', text: '30 dias com acesso completo aos módulos da PEDDI.', action: 'Ver detalhes' },
    TRAINING: { badge: 'Do básico ao avançado', text: 'Aprenda a usar a PEDDI na rotina da sua loja.', action: 'Solicitar' },
    EXCLUSIVE_SUPPORT: { badge: 'Especialistas ao seu lado', text: '8 solicitações assistidas por 30 dias.', action: 'Conhecer' },
  };
  return <>
    <section className="mp-promotions" aria-label="Serviços em destaque">
      <div className="mp-carousel-viewport" ref={viewport}>
        <div className="mp-carousel-track">{banners.map(item => <button key={item.id} className={`mp-banner mp-banner-${item.id.toLowerCase()}`} onClick={() => chooseService(item)}>
          <span className="mp-banner-copy">
            {item.id === 'FOUNDER' && <span className="mp-popular">{bannerText[item.id].badge}</span>}
            <strong>{item.name}</strong><span className="mp-banner-description">{bannerText[item.id].text}</span>
            {item.id !== 'TRAINING' && <span className="mp-banner-price">{money(item.priceCents)} <small>{item.id === 'FOUNDER' ? 'único' : '/ 30 dias'}</small></span>}
            <span className="mp-banner-action">{bannerText[item.id].action}<ArrowRight size={17} /></span>
          </span>
          <ServiceArt id={item.id} banner />
          {item.id !== 'FOUNDER' && <span className="mp-banner-note">{bannerText[item.id].badge}</span>}
        </button>)}</div>
      </div>
      {snaps.length > 1 && <button className="mp-carousel-next" aria-label="Próximo banner" onClick={() => carousel?.scrollNext()} disabled={!carousel?.canScrollNext()}><ChevronRight size={19} /></button>}
      <div className="mp-carousel-dots" aria-label="Posição dos banners">{(snaps.length > 1 ? snaps : [0]).map((_, index) => <button key={index} aria-label={`Mostrar banner ${index + 1}`} aria-current={index === selected ? 'true' : undefined} onClick={() => carousel?.scrollTo(index)} className={index === selected ? 'is-active' : ''} />)}</div>
    </section>
    <section aria-labelledby="mp-services-title">
      <div className="mp-section-heading"><div><h2 id="mp-services-title">Serviços para sua loja</h2><p>Escolha os serviços ideais para impulsionar o seu negócio.</p></div><a href="#mp-services" className="mp-text-action">Ver todos os serviços<ArrowRight size={15} /></a></div>
      <div id="mp-services" className="mp-services-grid">{data.services.map((item, index) => {
        const founder = item.id === 'FOUNDER';
        const alreadyFounder = founder && data.access.founderBadge;
        return <article key={item.id} className={`mp-service-card ${index < 3 ? 'mp-service-wide' : 'mp-service-small'} ${founder ? 'mp-service-featured' : ''}`}>
          {founder && <span className="mp-featured-label">Em destaque</span>}
          <ServiceArt id={item.id} />
          <div className="mp-service-copy"><h3>{item.name}</h3><p>{item.description}</p><div className="mp-service-bottom"><span className="mp-service-price">{money(item.priceCents)}<small>{founder ? ' único' : item.durationDays ? ' / 30 dias' : ''}</small></span><button disabled={alreadyFounder} onClick={() => chooseService(item)} className={`mp-detail-button ${founder ? 'mp-button-primary' : ''}`}>{alreadyFounder ? 'Selo já adquirido' : 'Ver detalhes'}<ArrowRight size={16} /></button></div></div>
        </article>;
      })}</div>
    </section>
    <section className="mp-bottom-grid" aria-label="Resumo da conta">
      <article className="mp-summary-card"><div className="mp-summary-title"><span className="mp-summary-icon"><Wallet size={23} /></span><h2>Seus créditos</h2></div><div className="mp-credit-copy"><strong>{money(data.creditCents)}</strong><p>Saldo registrado na sua conta.<br />Sem créditos cadastrados, o saldo é zero.</p></div><button className="mp-credit-action" onClick={() => setTab('history')}>Ver histórico de créditos<ArrowRight size={17} /></button></article>
      <article className="mp-summary-card"><div className="mp-summary-heading"><div className="mp-summary-title"><span className="mp-summary-icon"><Megaphone size={23} /></span><h2>Novidades da PEDDI</h2></div><button className="mp-text-action" onClick={() => setTab('news')}>Ver todas<ArrowRight size={13} /></button></div>{data.news.length ? <ul className="mp-news-list">{data.news.slice(0, 2).map((item, index) => <li key={item.id}><span className={`mp-news-dot ${index === 0 ? 'is-new' : ''}`} /><button onClick={() => setNews(item)}><strong>{item.title}</strong><span>{item.summary}</span></button><time dateTime={item.published_at}>{date(item.published_at)}</time></li>)}</ul> : <p className="mp-empty">Nenhuma novidade publicada ainda.</p>}</article>
      <article className="mp-summary-card"><div className="mp-summary-heading"><div className="mp-summary-title"><span className="mp-summary-icon"><Clock size={23} /></span><h2>Histórico recente</h2></div><button className="mp-text-action" onClick={() => setTab('history')}>Ver tudo<ArrowRight size={13} /></button></div>{data.events.length ? <ul className="mp-history-list">{data.events.slice(0, 4).map(event => <li key={event.id}><Clock size={16} /><span>{event.description}</span><time dateTime={event.created_at}>{date(event.created_at)}</time></li>)}</ul> : <p className="mp-empty">Nenhuma movimentação registrada.</p>}</article>
    </section>
  </>;
}
