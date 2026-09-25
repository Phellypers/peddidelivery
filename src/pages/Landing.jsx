import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, ChevronLeft, ChevronRight, CreditCard, Facebook, Instagram, Megaphone, Menu, MessageCircle, Music2, PackageCheck, ShoppingBag, Users, Youtube } from 'lucide-react';
import peddiLogo from '../../Logo Peddi/logo3.png';
import './Landing.css';

const Button=({children,secondary=false,to='/register'})=><Link to={to} className={`lp-button ${secondary?'lp-button--secondary':''}`}>{children}<ArrowRight size={15}/></Link>;
const Media=({label,className=''})=><div className={`lp-media ${className}`} aria-label={label}><span>{label}</span></div>;

const steps=[
  ['01','Cadastre seu restaurante','É rápido, gratuito e sem burocracia.','/Landing/como-funciona-cadastro.png','Notebook exibindo a plataforma PEDDI'],
  ['02','Publique seu cardápio','Personalize produtos, preços e categorias.','/Landing/como-funciona-cardapio.png','Hambúrguer representando o cardápio digital'],
  ['03','Comece a receber pedidos','Pelo site, retirada ou delivery.','/Landing/como-funciona-pedidos.png','Entregador PEDDI em uma motocicleta'],
];
const features=[
  [ShoppingBag,'Cardápio digital'],[Megaphone,'Campanhas de marketing'],
  [MessageCircle,'Atendimento integrado'],[Users,'Programa de fidelidade'],
  [CreditCard,'Pagamentos organizados'],[BarChart3,'Gestão e relatórios'],
];
const posts=[
  ['Vendas','Como aumentar suas vendas no delivery com um cardápio atrativo'],
  ['Marketing','5 ideias de promoções para atrair mais pedidos'],
  ['Tendências','O futuro do delivery no Brasil'],
];

export default function Landing(){
 return <div className="lp-page">
  <header className="lp-header"><div className="lp-wrap lp-nav">
    <Link to="/" className="lp-logo"><img src={peddiLogo} alt="PEDDI"/></Link>
    <nav><a href="#inicio">Home</a><a href="#sobre">Sobre nós</a><a href="#recursos">Funcionalidades</a><a href="#planos">Planos</a><a href="#contato">Contato</a></nav>
    <div className="lp-nav-actions"><Link to="/gestor/login" className="lp-login">Entrar</Link><Button>Cadastre-se</Button></div>
    <button className="lp-menu" aria-label="Abrir menu"><Menu/></button>
  </div></header>

  <main>
   <section id="inicio" className="lp-hero"><div className="lp-wrap lp-hero-grid">
    <div className="lp-hero-copy"><span className="lp-eyebrow">Tecnologia para restaurantes</span><h1>Seu restaurante<br/>no digital,<br/><em>sem complicação.</em></h1><p>Cardápio digital e delivery para vender mais, sem taxas por pedido e sem mensalidades escondidas.</p><div className="lp-actions"><Button>Cadastre seu restaurante</Button><Button secondary to="/loja?demo=1">Ver como funciona</Button></div></div>
    <div className="lp-hero-art"><div className="lp-blob"></div><img src="/Landing/hero-principal.png" alt="Profissional de restaurante apresentando o cardápio digital PEDDI" className="lp-hero-image"/><div className="lp-floating lp-floating--top"><PackageCheck/> Pedidos em tempo real</div><div className="lp-floating lp-floating--bottom"><BarChart3/> Mais controle, mais vendas</div></div>
   </div></section>

   <section id="sobre" className="lp-section lp-how"><div className="lp-wrap"><div className="lp-heading"><h2>Como <em>funciona?</em></h2><p>Em poucos passos seu restaurante já está vendendo no digital.</p></div><div className="lp-steps">{steps.map(([n,title,text,image,alt],i)=><article key={n}><div className="lp-step-media"><img src={image} alt={alt} loading="lazy"/></div><b>{n}</b><h3>{title}</h3><p>{text}</p>{i<2&&<ArrowRight className="lp-step-arrow"/>}</article>)}</div></div></section>

   <section className="lp-trust"><div className="lp-wrap"><h2>Restaurantes que já <em>confiam na PEDDI</em></h2><div className="lp-brands" role="list" aria-label="Restaurantes parceiros">{['Rota 58','Pizza Point','Delizato','Brasa e Lenha','Jules'].map((name,index)=><span key={name} role="listitem" aria-label={name} style={{backgroundPosition:`${index*25}% center`}}/>)}</div></div></section>

   <section id="recursos" className="lp-section"><div className="lp-wrap lp-split"><div><span className="lp-eyebrow">Tudo em um só lugar</span><h2>Tudo que seu restaurante precisa para <em>vender mais.</em></h2><p>A PEDDI organiza seu atendimento, pedidos e operação para você concentrar energia no crescimento do seu negócio.</p><Button>Conheça as funcionalidades</Button></div><div className="lp-feature-art"><div className="lp-blob lp-blob--soft"></div><img src="/Landing/gestora-recursos.png" alt="Gestora de restaurante usando os recursos da PEDDI em um tablet" className="lp-feature-image" loading="lazy"/>{features.map(([Icon,label],i)=><span key={label} className={`lp-chip lp-chip--${i+1}`}><Icon size={17}/>{label}</span>)}</div></div></section>

   <section className="lp-section lp-menu-showcase"><div className="lp-wrap lp-split lp-split--reverse"><div className="lp-feature-art"><div className="lp-blob"></div><img src="/Landing/celular-cardapio.png" alt="Cardápio digital PEDDI exibido em um celular" className="lp-phone-image" loading="lazy"/><span className="lp-cart"><ShoppingBag/></span></div><div><span className="lp-eyebrow">A cara da sua marca</span><h2>Um cardápio digital <em>com a cara do seu negócio.</em></h2><p>Personalize sua vitrine, destaque seus produtos, adicione fotos e receba pedidos de forma prática e organizada.</p><Button to="/loja?demo=1">Ver exemplo de cardápio</Button></div></div></section>

   <section id="planos" className="lp-results"><div className="lp-wrap"><div className="lp-heading"><h2>Resultados que <em>fazem a diferença.</em></h2></div><div className="lp-stats"><div><strong>976</strong><span>restaurantes cadastrados</span></div><div><strong>12</strong><span>cidades atendidas</span></div><div><strong>1K+</strong><span>pedidos todos os dias</span></div></div></div></section>

   <section className="lp-section lp-testimonial"><div className="lp-wrap lp-split"><div><span className="lp-eyebrow">Histórias reais</span><h2>O que nossos clientes <em>dizem sobre a PEDDI.</em></h2><blockquote>“A PEDDI facilitou muito o nosso dia a dia. Hoje recebemos mais pedidos, sem pagar taxas e com um sistema simples de usar.”</blockquote><div className="lp-author"><span>MO</span><div><b>Marcos Oliveira</b><small>Restaurante Sabor Expresso</small><div className="lp-stars">★★★★★</div></div></div><div className="lp-arrows"><button><ChevronLeft/></button><button><ChevronRight/></button></div></div><div className="lp-testimonial-art"><img src="/Landing/cliente-depoimento.png" alt="Cliente PEDDI usando o sistema em um tablet" loading="lazy"/></div></div></section>

   <section className="lp-join"><div className="lp-wrap"><div className="lp-heading"><h2>Quer fazer parte?</h2><p>Cadastre seu restaurante agora e comece a vender no digital.</p></div><div className="lp-join-grid"><article><Media label="Imagem — novo restaurante"/><div><b>Sou dono de restaurante</b><Button>Quero me cadastrar</Button></div></article><article><Media label="Imagem — gestor acessando painel"/><div><b>Já tenho conta</b><Button secondary to="/gestor/login">Entrar no sistema</Button></div></article></div></div></section>

   <section className="lp-section lp-content"><div className="lp-wrap"><div className="lp-heading lp-heading--left"><h2>Novidades e dicas <em>para o seu negócio.</em></h2></div><div className="lp-posts">{posts.map(([tag,title],i)=><article key={title}><Media label={`Imagem do conteúdo ${i+1}`}/><span>{tag}</span><h3>{title}</h3><a href="#contato">Ler mais <ArrowRight size={14}/></a></article>)}</div></div></section>

   <section className="lp-news"><div className="lp-wrap lp-news-inner"><Media label="Ilustração da newsletter"/><div><h2>Receba novidades e conteúdos exclusivos da PEDDI.</h2><form onSubmit={e=>e.preventDefault()}><input type="email" placeholder="Seu melhor e-mail" aria-label="Seu melhor e-mail"/><button>Inscrever</button></form></div></div></section>
  </main>

  <footer id="contato" className="lp-footer"><div className="lp-wrap lp-footer-grid"><div><img src={peddiLogo} alt="PEDDI"/><p>Simples para pedir,<br/><strong>fácil para vender.</strong></p></div><div><b>Menu</b><a href="#inicio">Home</a><a href="#sobre">Sobre nós</a><a href="#recursos">Funcionalidades</a><a href="#planos">Planos</a></div><div><b>Contato</b><a href="mailto:contato@peddi.com.br">contato@peddi.com.br</a><span>Brasília — DF</span><div className="lp-social"><a href="https://instagram.com/peddidelivery" target="_blank" rel="noreferrer" aria-label="Instagram da PEDDI" title="Instagram"><Instagram/></a><a href="https://www.tiktok.com/@peddi.delivery" target="_blank" rel="noreferrer" aria-label="TikTok da PEDDI" title="TikTok"><Music2/></a><a href="https://www.youtube.com/@peddi.oficial" target="_blank" rel="noreferrer" aria-label="YouTube da PEDDI" title="YouTube"><Youtube/></a><a href="https://facebook.com/peddidelivery" target="_blank" rel="noreferrer" aria-label="Facebook da PEDDI" title="Facebook"><Facebook/></a></div></div></div><div className="lp-wrap lp-legal"><span>© {new Date().getFullYear()} PEDDI. Todos os direitos reservados.</span><span>Política de Privacidade · Termos de Uso</span></div></footer>
 </div>
}
