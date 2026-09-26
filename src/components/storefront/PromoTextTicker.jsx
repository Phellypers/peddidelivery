import React,{useMemo}from'react';
const activeToday=item=>{const today=new Date().toISOString().slice(0,10);return item?.is_active!==false&&(!item?.start_date||item.start_date<=today)&&(!item?.end_date||item.end_date>=today)};
export default function PromoTextTicker({messages=[],textColor='#111827',backgroundColor='#FFF7ED'}){
 const active=useMemo(()=>messages.filter(activeToday).sort((a,b)=>Number(a.sort_order||0)-Number(b.sort_order||0)),[messages]);
 if(!active.length)return null;
 const group=suffix=><div className="flex min-w-full shrink-0 items-center justify-center gap-3 px-3">{active.map((message,index)=><React.Fragment key={`${message.id}-${suffix}`}><span className="inline-block whitespace-nowrap text-xs font-semibold sm:text-sm">{message.text}</span>{index<active.length-1&&<span aria-hidden="true" className="opacity-55">|</span>}</React.Fragment>)}<span aria-hidden="true" className="opacity-55">|</span></div>;
 return <section aria-label="Faixa promocional" className="overflow-hidden py-2" style={{color:textColor,backgroundColor}}><div className="peddi-text-ticker flex w-max min-w-full">{group('a')}{group('b')}</div></section>;
}
