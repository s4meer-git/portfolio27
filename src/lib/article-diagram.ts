// Small, server-rendered diagrams authored in CMS Markdown. No client library.
const escape = (text: string) => text.replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]!));
type DiagramNode = { id: string; text: string };
export function renderArticleDiagram(content: string): string | undefined {
  try {
    const data = JSON.parse(content);
    if (typeof data.title !== 'string' || !Array.isArray(data.rows) || !data.rows.length || data.rows.length > 6) return;
    const rows: DiagramNode[][] = data.rows;
    if (rows.some(row => !Array.isArray(row) || !row.length || row.length > 3 || row.some(node => typeof node.id !== 'string' || typeof node.text !== 'string' || node.text.length > 100))) return;
    const edges: { from: string; to: string; label?: string }[] = data.edges || [];
    if (!Array.isArray(edges) || edges.length > 24) return;
    const caption=typeof data.caption==='string'?data.caption:'';
    const columns=Math.max(...rows.map(row=>row.length));
    function draw(width:number,compact:boolean):string|undefined {
      const nodes=new Map<string,{x:number;y:number;w:number;h:number;text:string}>();
      const step=compact?124:108,h=compact?80:64,gap=compact?16:24,padding=compact?24:48;
      for(const [r,row] of rows.entries()) {
        const w=Math.min(280,(width-padding-gap*(row.length-1))/row.length);
        for(const [c,node] of row.entries()) {
          if(nodes.has(node.id))throw Error('Duplicate node');
          nodes.set(node.id,{x:(width-row.length*w-(row.length-1)*gap)/2+c*(w+gap),y:r*step+12,w,h,text:node.text});
        }
      }
      let svg='';
      for(const edge of edges){
        const a=nodes.get(edge.from),b=nodes.get(edge.to);
        if(!a||!b||b.y<=a.y||(edge.label!==undefined&&typeof edge.label!=='string'))return;
        const x1=a.x+a.w/2,y1=a.y+a.h,x2=b.x+b.w/2,y2=b.y,mid=(y1+y2)/2;
        svg+=`<path d="M${x1} ${y1} C${x1} ${mid},${x2} ${mid},${x2} ${y2-4}" fill="none" class="diagram-edge"/><path d="M${x2-4} ${y2-10} L${x2} ${y2-3} L${x2+4} ${y2-10}" fill="none" class="diagram-edge"/>`;
        if(edge.label){
          const vertical=Math.abs(x1-x2)<1;
          svg+=`<text x="${(x1+x2)/2+(vertical?8:0)}" y="${mid-7}" text-anchor="${vertical?'start':'middle'}" class="diagram-edge-label">${escape(edge.label.slice(0,40))}</text>`;
        }
      }
      for(const node of nodes.values()){
        const max=node.w>240?32:Math.floor(node.w/8.3),lines:string[]=[];
        for(const word of node.text.split(/\s+/)){
          if(!lines.length||(lines.at(-1)+' '+word).length>max)lines.push(word);
          else lines[lines.length-1]+=' '+word;
        }
        if(lines.length>(compact?4:3))return;
        const top=node.y+node.h/2-(lines.length-1)*9;
        svg+=`<rect x="${node.x}" y="${node.y}" width="${node.w}" height="${node.h}" rx="9" class="diagram-node"/><text x="${node.x+node.w/2}" text-anchor="middle" class="diagram-node-label">${lines.map((line,i)=>`<tspan x="${node.x+node.w/2}" y="${top+i*18+5}">${escape(line)}</tspan>`).join('')}</text>`;
      }
      return `<svg class="diagram-${compact?'compact':'wide'}" viewBox="0 0 ${width} ${rows.length*step+12}" role="img" aria-label="${escape(data.title)}"><title>${escape(data.title)}</title>${caption?`<desc>${escape(caption)}</desc>`:''}${svg}</svg>`;
    }
    const wide=draw(columns===1?340:columns===2?640:920,false);
    if(!wide)return;
    const compact=draw(340,true);
    return `<figure class="article-diagram${compact?' has-compact-diagram':''}"><div class="diagram-scroll">${wide}${compact||''}</div><figcaption><strong>${escape(data.title)}</strong>${caption?`<br>${escape(caption)}`:''}</figcaption></figure>\n`;
  } catch { return; }
}
