export type Entity = 'users'|'deals'|'comments'|'stores'|'categories'|'banners';
export const EditableColumns:Record<Entity,string[]> = {
  users:['username','display_name','avatar_url','bio','role','reputation','banned','ban_reason'],
  deals:['title','description','price','original_price','status','category_id','store_id','tags','images','city','state','country','is_online','start_date','expiry_date'],
  comments:['content','status','is_deleted'],
  stores:['name','slug','logo_url','verified','website_url','description'],
  categories:['name','emoji','active','slug'],
  banners:['title','image_url','link_url','active','starts_at','ends_at','priority']
};
export const TextSearchColumns:Partial<Record<Entity,string[]>> = {
  users:['username','display_name','email'],
  deals:['title','description','city','state'],
  comments:['content'],
  stores:['name','slug'],
  categories:['name','slug'],
  banners:['title','link_url']
};
export function sanitizeEntity(entity:string):Entity{const allowed:Entity[]=['users','deals','comments','stores','categories','banners'];if(!allowed.includes(entity as Entity)) throw new Response(JSON.stringify({error:'invalid_entity'}),{status:400});return entity as Entity;}
export function filterData(entity:Entity, data:Record<string,unknown>){const allowed=new Set(EditableColumns[entity]);const clean:Record<string,unknown>={};for(const [k,v] of Object.entries(data||{})){if(allowed.has(k)) clean[k]=v;}return clean;}
