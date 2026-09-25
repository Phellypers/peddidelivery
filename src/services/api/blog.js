import {peddiApi} from './peddiApi';
const auth=()=>({Authorization:`Bearer ${localStorage.getItem('peddi_access_token')||''}`});
export const listBlog=()=>peddiApi.request('/api/v1/blog');
export const getBlogArticle=slug=>peddiApi.request(`/api/v1/blog/${encodeURIComponent(slug)}`);
export const listAdminBlog=()=>peddiApi.request('/api/v1/admin/blog',{headers:auth()});
export const saveBlogArticle=(article,id)=>peddiApi.request(`/api/v1/admin/blog${id?`/${id}`:''}`,{method:id?'PATCH':'POST',headers:auth(),body:JSON.stringify(article)});
export const deleteBlogArticle=id=>peddiApi.request(`/api/v1/admin/blog/${id}`,{method:'DELETE',headers:auth()});
