const create=async(width,height)=>{
  const target=await (await fetch('http://127.0.0.1:9225/json/new?http://127.0.0.1:5173/loja',{method:'PUT'})).json();
  const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  let sequence=0;const waiting=new Map();socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id&&waiting.has(message.id)){waiting.get(message.id)(message);waiting.delete(message.id);}};
  const call=(method,params={})=>new Promise(resolve=>{const id=++sequence;waiting.set(id,resolve);socket.send(JSON.stringify({id,method,params}));});
  await call('Page.enable');await call('Runtime.enable');await call('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<600});
  await call('Page.navigate',{url:'http://127.0.0.1:5173/loja'});await new Promise(resolve=>setTimeout(resolve,8500));
  const result=await call('Runtime.evaluate',{returnByValue:true,expression:`(()=>{const toast=[...document.querySelectorAll('p')].find(node=>node.textContent.includes('Popular'))?.closest('.fixed');return {path:location.pathname,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,products:document.querySelectorAll('[data-product-id]').length,toast:toast?{width:Math.round(toast.getBoundingClientRect().width),top:Math.round(toast.getBoundingClientRect().top),text:toast.textContent}:null,fixed:[...document.querySelectorAll('.fixed')].map(x=>x.textContent.slice(0,100))};})()`});
  socket.close();return result.result.result.value;
};
for(const viewport of [[360,800],[1440,900]]){const value=await create(...viewport);if(value.overflow>1||!value.products||!value.toast)throw new Error(`UI validation failed ${JSON.stringify({viewport,value})}`);console.log(JSON.stringify({viewport,...value}));}

