import { peddiApi, saveSession } from '@/services/api/peddiApi';
import { demoCreate, demoDelete, demoList, demoUpdate, isPresentationDemo, resetPresentationDemo } from '@/lib/presentationDemo';

let registration;
const visitor = () => {
  let value = localStorage.getItem('peddi_visitor');
  if (!value) { value = crypto.randomUUID(); localStorage.setItem('peddi_visitor', value); }
  return value;
};
const headers = () => {
  const token = localStorage.getItem('peddi_access_token');
  return { 'X-Peddi-Visitor': visitor(), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};
async function call(path, method = 'GET', data, extraHeaders = {}) {
  try {
    return await peddiApi.request(path, { method, headers: { ...headers(), ...extraHeaders },
      ...(data === undefined ? {} : { body: data instanceof Blob ? data : JSON.stringify(data) }) });
  } catch (error) {
    window.dispatchEvent(new CustomEvent('peddi-api-error', { detail: error.message }));
    throw error;
  }
}
const subscriptions = new Map();
const numericKeys = new Set(['price','cost','stock','promo_price','total','subtotal','delivery_fee','discount','quantity','unit_price','pack_size','current_stock','stock_min']);
const matchesFilter = (row, filter) => Object.entries(filter).every(([key, expected]) => {
  const actual = row[key];
  if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
    return Object.entries(expected).every(([operator, compare]) => {
      if (operator === '$in') return Array.isArray(compare) && compare.includes(actual);
      if (operator === '$nin') return Array.isArray(compare) && !compare.includes(actual);
      if (operator === '$ne') return actual !== compare;
      if (operator === '$gte') return actual >= compare;
      if (operator === '$gt') return actual > compare;
      if (operator === '$lte') return actual <= compare;
      if (operator === '$lt') return actual < compare;
      if (operator === '$exists') return compare ? actual !== undefined && actual !== null : actual === undefined || actual === null;
      return false;
    });
  }
  return actual === expected || (Array.isArray(actual) && actual.includes(expected));
});
const sortRows = (rows, sort) => {
  const descending = sort?.startsWith('-');
  const key = descending ? sort.slice(1) : sort;
  if (!key) return rows;
  return [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * (descending ? -1 : 1));
};
function normalize(row) {
  const result = { ...row };
  for (const key of numericKeys) if (result[key] !== undefined && result[key] !== null && result[key] !== '') result[key] = Number(result[key]);
  return result;
}
function emit(entity, event) {
  const state = subscriptions.get(entity);
  if (!state) return;
  if (event.type === 'delete') state.snapshot.delete(event.id);
  else state.snapshot.set(event.id, event.data);
  for (const listener of state.listeners) { try { listener(event); } catch (error) { console.error(error); } }
}
const makeEntity = name => {
  const route = `/api/v1/demo/entities/${name}`;
  const core = name === 'Product' ? ['products','product'] : name === 'Ingredient' ? ['ingredients','ingredient'] : null;
  const api = {
    list: (sort = '-created_date', limit = 1000, skip = 0) => api.filter({},sort,limit,skip),
    filter: async (filter = {}, sort = '-created_date', limit = 1000, skip = 0) => {
      const params = new URLSearchParams({ filter: JSON.stringify(filter), sort, limit: String(limit), skip: String(skip) });
      if (isPresentationDemo()) {
        const rows = await demoList(name, async () => (await call(`${route}?${new URLSearchParams({ filter: '{}', sort: '-created_date', limit: '1000', skip: '0' })}`)).map(normalize));
        return sortRows(rows.filter(row => matchesFilter(row, filter)), sort).slice(skip, skip + limit).map(normalize);
      }
      return (await call(`${route}?${params}`)).map(normalize);
    },
    get: async id => (await api.filter({ id }))[0],
    create: async data => {
      if (isPresentationDemo()) {
        await api.list();
        const result = normalize(await demoCreate(name, data));
        emit(name,{type:'create',id:result.id,data:result});
        return result;
      }
      const response = core ? (await call(`/api/v1/admin/${core[0]}`,'POST',data))[core[1]] : await call(route,'POST',data);
      const result = normalize(response);
      emit(name,{type:'create',id:result.id,data:result});
      return result;
    },
    update: async (id,data) => {
      data = data.$set || data;
      if (isPresentationDemo()) {
        await api.list();
        const result = normalize(await demoUpdate(name, id, data));
        emit(name,{type:'update',id:result.id,data:result});
        return result;
      }
      const response = core ? (await call(`/api/v1/admin/${core[0]}/${id}`,'PATCH',data))[core[1]] : await call(`${route}/${id}`,'PATCH',data);
      const result = normalize(response);
      emit(name,{type:'update',id:result.id,data:result});
      return result;
    },
    delete: async id => {
      if (isPresentationDemo()) {
        await api.list();
        await demoDelete(name, id);
        emit(name,{type:'delete',id,data:{}});
        return;
      }
      await call(core ? `/api/v1/admin/${core[0]}/${id}` : `${route}/${id}`,'DELETE');
      emit(name,{type:'delete',id,data:{}});
    },
    updateMany: async (filter,data) => Promise.all((await api.filter(filter)).map(row => api.update(row.id,data))),
    deleteMany: async filter => Promise.all((await api.filter(filter)).map(row => api.delete(row.id))),
    bulkCreate: async rows => Promise.all(rows.map(row => api.create(row))),
    subscribe: listener => {
      let state = subscriptions.get(name);
      if (!state) {
        state = { listeners:new Set(),snapshot:new Map(),initialized:false,busy:false };
        subscriptions.set(name,state);
        const poll = async () => {
          if (state.busy) return;
          state.busy = true;
          try {
            const rows = await api.list();
            if (!subscriptions.has(name)) return;
            const next = new Map(rows.map(row => [row.id,row]));
            if (state.initialized) {
              for (const [id,row] of next) {
                const old = state.snapshot.get(id);
                if (!old || JSON.stringify(old) !== JSON.stringify(row)) emit(name,{type:old?'update':'create',id,data:row});
              }
              for (const id of state.snapshot.keys()) if (!next.has(id)) emit(name,{type:'delete',id,data:{}});
            }
            state.snapshot = next;
            state.initialized = true;
          } catch { /* Request errors are displayed by the shared notice. */ }
          finally { state.busy = false; }
        };
        state.timer = setInterval(poll,3000);
        poll();
      }
      state.listeners.add(listener);
      return () => {
        state.listeners.delete(listener);
        if (!state.listeners.size) { clearInterval(state.timer); subscriptions.delete(name); }
      };
    },
  };
  return api;
};

export function createLocalClient() {
  const entities = new Proxy({}, { get(target,name) {
    if (typeof name !== 'string') return undefined;
    if (!target[name]) target[name] = makeEntity(name);
    return target[name];
  } });
  return {
    entities,
    auth: {
      me: async () => { const result = await peddiApi.me(localStorage.getItem('peddi_access_token') || ''); return {...result.user,full_name:result.user.name}; },
      updateMe: async data => { const result = await peddiApi.me(localStorage.getItem('peddi_access_token') || ''); return entities.User.update(result.user.id,data); },
      loginViaEmailPassword: async (email,password) => { const result = await peddiApi.login(email,password);saveSession(result);return result; },
      isAuthenticated: async () => { try { await peddiApi.me(localStorage.getItem('peddi_access_token') || '');return true; } catch {return false;} },
      setToken: token => localStorage.setItem('peddi_access_token',token),
      logout: destination => {resetPresentationDemo();localStorage.removeItem('peddi_access_token');localStorage.removeItem('peddi_refresh_token');if(destination)window.location.href='/login';},
      redirectToLogin: destination => {window.location.href=`/login?returnTo=${encodeURIComponent(destination || window.location.pathname)}`;},
      register: async data => { const result = await call('/api/v1/demo/register','POST',{...data,role:window.location.pathname==='/'?'manager':window.location.pathname.startsWith('/entregador')?'courier':'customer'});registration=data;return result; },
      verifyOtp: async data => {if(data.otpCode!=='000000'||!registration||data.email!==registration.email)throw new Error('Use o código de teste 000000 após cadastrar a conta.');const result=await peddiApi.login(registration.email,registration.password);saveSession(result);registration=undefined;return {...result,access_token:result.accessToken};},
      resendOtp: async () => ({demo:true,message:'Código de confirmação local: 000000.'}),
      loginWithProvider: () => {window.dispatchEvent(new CustomEvent('peddi-api-error',{detail:'Login Google depende da integração externa. No teste local, use email e senha.'}));},
      resetPasswordRequest: email => call('/api/v1/demo/reset-request','POST',{email}),
      resetPassword: data => call('/api/v1/demo/reset-password','POST',data),
    },
    integrations: { Core: {
      UploadFile: ({file}) => isPresentationDemo() ? Promise.resolve({ file_url: URL.createObjectURL(file), demo_temporary: true }) : call('/api/v1/demo/upload','POST',file,{'Content-Type':file.type}),
      SendEmail: async data => {const result=isPresentationDemo()?{demo:true,message:'Envio simulado na apresentação.'}:await call('/api/v1/demo/email','POST',data);window.dispatchEvent(new CustomEvent('peddi-demo-email',{detail:result.message}));return result;},
    } },
  };
}
