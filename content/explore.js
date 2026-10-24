(() => {
  // Explore page sections: Sports, Today's News, trends, Who to follow and Posts for you
  // on the Explore tab. Each timeline cell is labelled with its section (data-xtrim-explore)
  // and explore.css hides the labelled cells behind root flags.
  const defaults={enabled:true,exploreSports:false,exploreNews:false,exploreTrends:false,exploreFollow:false,explorePosts:false};
  const sections={sports:'exploreSports',news:'exploreNews',trends:'exploreTrends',follow:'exploreFollow',posts:'explorePosts'};
  const keys=Object.keys(defaults);
  let settings={...defaults},loaded=false;
  const root=document.documentElement;
  // The Explore tab itself; Trending, News, Sports and Entertainment stay as X shows them.
  const exploreTab=()=>/^\/explore(?:\/tabs\/for[_-]you)?\/?$/i.test(xtrimPagePath());

  // What one cell holds, from X's test IDs and structure only, never its words.
  // X draws the Sports scores and the league row ("NFL Powered by ...") with its newer
  // renderer, which has no test IDs; its root class is the only marker.
  function kind(cell) {
    if(cell.querySelector('.jetfuel-style-root'))return 'sports';
    if(cell.querySelector('article[data-testid="tweet"]'))return 'posts';
    if(cell.querySelector('[data-testid="UserCell"], a[href^="/i/connect_people"]'))return 'follow';
    // News stories and trends share one test ID; only trends carry a More menu.
    const trend=cell.querySelector('[data-testid="trend"]');
    if(trend)return trend.querySelector('[data-testid="caret"]')?'trends':'news';
    if(cell.querySelector('h2[role="heading"]'))return 'heading';
    // Spacers between sections, and the loading row at the bottom.
    if(!cell.textContent.trim()&&!cell.querySelector('img, video, article, [data-testid]'))return 'filler';
    return null;
  }

  // Section headings look alike; each belongs to the section of the next content cell.
  // X drops cells far off screen, so remember what each heading led to on this visit.
  const headings=new Map();
  function label(cells) {
    const kinds=cells.map(kind),result=new Array(cells.length).fill(null);
    for(let i=0;i<cells.length;i++)if(kinds[i]!=='heading'&&kinds[i]!=='filler')result[i]=kinds[i];
    for(let i=cells.length-1;i>=0;i--) {
      if(kinds[i]!=='heading')continue;
      const text=cells[i].querySelector('h2[role="heading"]').textContent.trim();
      let next=i+1;
      while(next<cells.length&&(kinds[next]==='filler'||kinds[next]==='heading'))next++;
      const section=next<cells.length?result[next]:null;
      if(section)headings.set(text,section);
      result[i]=section||headings.get(text)||null;
    }
    // A spacer closes the section above it, so it goes with that section.
    for(let i=1;i<cells.length;i++)if(kinds[i]==='filler')result[i]=result[i-1];
    return result;
  }

  function apply() {
    const active=loaded&&settings.enabled!==false&&exploreTab();
    for(const [section,key] of Object.entries(sections))root.toggleAttribute('data-xtrim-explore-'+section,active&&!!settings[key]);
    if(!active)return;
    const column=document.querySelector('[data-testid="primaryColumn"]');
    if(!column)return;
    const lists=new Set([...column.querySelectorAll('[data-testid="cellInnerDiv"]')].map(cell=>cell.parentElement));
    for(const list of lists) {
      const cells=[...list.children].filter(cell=>cell.matches('[data-testid="cellInnerDiv"]'));
      label(cells).forEach((section,i)=>{
        const cell=cells[i];
        if(section){if(cell.getAttribute('data-xtrim-explore')!==section)cell.setAttribute('data-xtrim-explore',section);}
        else if(cell.hasAttribute('data-xtrim-explore'))cell.removeAttribute('data-xtrim-explore');
      });
    }
  }

  let queued=false,lastPath='';
  function schedule(){if(!queued){queued=true;setTimeout(()=>{queued=false;apply();},50);}}
  // Only changes in the main column (or a new page) need a pass; X's photo viewer and
  // other popups live in #layers and never touch the Explore timeline.
  new MutationObserver(records=>{
    if(!loaded||queued)return;
    const path=location.pathname;
    if(path!==lastPath){lastPath=path;schedule();return;}
    if(!exploreTab())return;
    for(const record of records)if(record.target.closest?.('[data-testid="primaryColumn"]')){schedule();return;}
  }).observe(root,{childList:true,subtree:true});
  browser.storage.local.get(defaults).then(value=>{settings=value;loaded=true;apply();});
  browser.storage.onChanged.addListener((changes,area)=>{
    if(area!=='local'||!keys.some(key=>key in changes))return;
    for(const key of keys)if(changes[key])settings[key]=changes[key].newValue??defaults[key];
    apply();
  });
  window.addEventListener('popstate',schedule);
})();
