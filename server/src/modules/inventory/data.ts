import type { PoolClient } from 'pg';

type Unit='unidade'|'pacote'|'grama'|'quilo'|'ml'|'litro';
type MovementType='purchase_entry'|'manual_exit'|'sale_consumption'|'stock_adjustment'|'waste';

const factor=(unit:Unit,packSize=1)=>unit==='pacote'?packSize:unit==='quilo'||unit==='litro'?1000:1;
const base=(unit:Unit)=>unit==='grama'||unit==='quilo'?'mass':unit==='ml'||unit==='litro'?'volume':'count';
const nativeQuantity=(quantity:number,from:Unit,to:Unit,packSize=1)=>{
  if(base(from)!==base(to))throw new Error('Unidade da ficha técnica incompatível com o insumo.');
  return quantity*factor(from,packSize)/factor(to,packSize);
};
const round=(value:number,digits=4)=>Number(value.toFixed(digits));

export async function registerInventoryMovement(client:PoolClient,input:{storeId:string;ingredientId:string;type:MovementType;quantity:number;cost?:number;reason?:string;metadata?:Record<string,unknown>}){
  const found=await client.query('SELECT id,details FROM ingredients WHERE id=$1 AND store_id=$2 FOR UPDATE',[input.ingredientId,input.storeId]);
  if(!found.rowCount)throw new Error('Insumo não encontrado.');
  const details=found.rows[0].details||{},quantity=Math.abs(Number(input.quantity));
  if(!Number.isFinite(quantity)||quantity<=0)throw new Error('Informe uma quantidade válida.');
  const direction=input.type==='purchase_entry'?1:-1;
  const before=Number(details.current_stock||0),after=round(before+direction*quantity);
  const purchaseCost=input.type==='purchase_entry'?Number(input.cost||0):0;
  if(input.type==='purchase_entry'&&(!Number.isFinite(purchaseCost)||purchaseCost<=0))throw new Error('Informe o custo total da compra.');
  const purchased=Number(details.quantity_purchased||0),historicCost=Number(details.cost||0);
  const unitCost=input.type==='purchase_entry'?purchaseCost/quantity:(purchased>0?historicCost/purchased:0);
  const movement={type:direction>0?'entry':'exit',movement_type:input.type,quantity,cost:purchaseCost,date:new Date().toISOString(),reason:input.reason||({purchase_entry:'Entrada por compra',manual_exit:'Saída manual',stock_adjustment:'Ajuste de estoque',waste:'Perda/descarte',sale_consumption:'Consumo por venda'} as const)[input.type]};
  const next={...details,current_stock:after,movements:[...(details.movements||[]),movement]};
  if(input.type==='purchase_entry'){next.quantity_purchased=purchased+quantity;next.cost=historicCost+purchaseCost;}
  await client.query('UPDATE ingredients SET details=$3 WHERE id=$1 AND store_id=$2',[input.ingredientId,input.storeId,JSON.stringify(next)]);
  await client.query(`INSERT INTO inventory_movements(store_id,ingredient_id,movement_type,quantity_delta,unit,unit_cost,total_cost,stock_before,stock_after,reason,metadata)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,[input.storeId,input.ingredientId,input.type,direction*quantity,details.unit,unitCost,input.type==='purchase_entry'?purchaseCost:round(unitCost*quantity,2),before,after,movement.reason,JSON.stringify(input.metadata||{})]);
  return {...next,id:input.ingredientId};
}

export async function consumeInventoryForDeliveredOrder(client:PoolClient,storeId:string,orderId:string){
  const order=await client.query('SELECT id,status,details FROM orders WHERE id=$1 AND store_id=$2 FOR UPDATE',[orderId,storeId]);
  if(!order.rowCount||order.rows[0].status!=='delivered')return {applied:false,totalCogs:0};
  const already=await client.query("SELECT 1 FROM inventory_movements WHERE order_id=$1 AND movement_type='sale_consumption' LIMIT 1",[orderId]);
  if(already.rowCount)return {applied:false,totalCogs:Number(order.rows[0].details?.cogs_total||0)};
  const items=await client.query(`SELECT oi.id,oi.product_id,oi.product_name,oi.quantity,p.details
    FROM order_items oi JOIN products p ON p.id=oi.product_id WHERE oi.order_id=$1 ORDER BY oi.id FOR UPDATE OF oi,p`,[orderId]);
  const ingredientIds=[...new Set(items.rows.flatMap(row=>(row.details?.recipe||[]).map((item:{ingredient_id:string})=>item.ingredient_id)))].sort();
  const ingredientRows=ingredientIds.length?await client.query('SELECT id,details FROM ingredients WHERE store_id=$1 AND id=ANY($2::uuid[]) ORDER BY id FOR UPDATE',[storeId,ingredientIds]):{rows:[]};
  const ingredients=new Map(ingredientRows.rows.map(row=>[row.id,row.details]));
  const consumption=new Map<string,{quantity:number;cost:number;unit:Unit;before:number;details:Record<string,any>;lines:Array<Record<string,unknown>>}>();
  let totalCogs=0;
  for(const item of items.rows){
    let itemUnitCogs=0;const snapshot=[];
    for(const recipe of item.details?.recipe||[]){
      const ingredient=ingredients.get(recipe.ingredient_id);
      if(!ingredient)throw new Error(`Insumo da ficha técnica de ${item.product_name} não encontrado.`);
      const perProduct=nativeQuantity(Number(recipe.quantity),recipe.unit,ingredient.unit,Number(ingredient.pack_size||1));
      const used=round(perProduct*Number(item.quantity));
      const unitCost=Number(ingredient.quantity_purchased||0)>0?Number(ingredient.cost||0)/Number(ingredient.quantity_purchased):0;
      const lineCost=round(used*unitCost,2);itemUnitCogs+=lineCost/Number(item.quantity);
      snapshot.push({ingredient_id:recipe.ingredient_id,ingredient_name:ingredient.name,quantity:used,unit:ingredient.unit,unit_cost:unitCost,total_cost:lineCost});
      const aggregate=consumption.get(recipe.ingredient_id)||{quantity:0,cost:0,unit:ingredient.unit as Unit,before:Number(ingredient.current_stock||0),details:ingredient,lines:[] as Array<Record<string,unknown>>};
      aggregate.quantity+=used;aggregate.cost+=lineCost;aggregate.lines.push({order_item_id:item.id,product_id:item.product_id,quantity:used});consumption.set(recipe.ingredient_id,aggregate);
    }
    const itemTotal=round(itemUnitCogs*Number(item.quantity),2);totalCogs+=itemTotal;
    await client.query(`INSERT INTO order_item_cost_snapshots(store_id,order_id,order_item_id,product_id,product_name,quantity,unit_cogs,total_cogs,recipe_snapshot)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT(order_item_id) DO NOTHING`,[storeId,orderId,item.id,item.product_id,item.product_name,item.quantity,round(itemUnitCogs),itemTotal,JSON.stringify(snapshot)]);
  }
  for(const [ingredientId,used] of consumption){
    const quantity=round(used.quantity),after=round(used.before-quantity),unitCost=quantity>0?used.cost/quantity:0;
    const movement={type:'exit',movement_type:'sale_consumption',quantity,cost:round(used.cost,2),date:new Date().toISOString(),reason:'Consumo por venda',order_id:orderId};
    await client.query('UPDATE ingredients SET details=$3 WHERE id=$1 AND store_id=$2',[ingredientId,storeId,JSON.stringify({...used.details,current_stock:after,movements:[...(used.details.movements||[]),movement]})]);
    await client.query(`INSERT INTO inventory_movements(store_id,ingredient_id,order_id,movement_type,quantity_delta,unit,unit_cost,total_cost,stock_before,stock_after,reason,metadata)
      VALUES($1,$2,$3,'sale_consumption',$4,$5,$6,$7,$8,$9,'Consumo por venda',$10)`,[storeId,ingredientId,orderId,-quantity,used.unit,unitCost,round(used.cost,2),used.before,after,JSON.stringify({lines:used.lines})]);
  }
  totalCogs=round(totalCogs,2);
  await client.query("UPDATE orders SET details=details||$3::jsonb,updated_at=now() WHERE id=$1 AND store_id=$2",[orderId,storeId,JSON.stringify({cogs_total:totalCogs,inventory_consumed_at:new Date().toISOString()})]);
  return {applied:true,totalCogs};
}
