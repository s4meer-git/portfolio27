/** Fill new wording controls without publishing or replacing a separate site draft. */
const defaults = require('./article-engagement-defaults.json');
module.exports = async function migrateArticleEngagement(strapi) {
  const store = strapi.store({type:'core',name:'portfolio'});
  const key = 'article-engagement-labels-v2';
  if(await store.get({key})) return;
  const component = strapi.db.query('portfolio.article-labels');
  for(const value of await component.findMany()) {
    const data = Object.fromEntries(Object.entries(defaults).filter(([field])=>value[field]==null));
    if(Object.keys(data).length) await component.update({where:{id:value.id},data});
  }
  await store.set({key,value:true});
};
