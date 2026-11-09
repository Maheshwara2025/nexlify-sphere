<script>
  import { impactColor, magnetTheme, shortenCardText, splitHighlight } from '$lib/magnetNews.js';
  export let article;
  export let card = false;
  $: theme = magnetTheme(article?.theme_key,article?.headline);
  $: points = Array.isArray(article?.points) ? article.points : [];
  $: headingParts = splitHighlight(article?.headline || '');
  $: location = article?.location_town || 'తెలంగాణ';
  $: photo = article?.image_url || article?.preview_url || '';
</script>

<article class:sharecard={card} class:fullarticle={!card}
  style:--magnet-primary={theme.primary} style:--magnet-highlight={theme.highlight} style:--magnet-dark={theme.dark}>
  <div class="hero">
    {#if photo}
      <img src={photo} alt={article?.headline || 'NS NEWS'} crossorigin="anonymous" class="photo" />
    {:else}
      <div class="no-photo">ఫొటోను ఎంచుకోండి</div>
    {/if}
    <div class="gradient"></div>
    <div class="hero-top">
      <span class="logo"><b>NS</b> <strong>NS NEWS</strong></span>
      <span class="news-badge">మ్యాగ్నెట్ న్యూస్</span>
    </div>
    <div class="hero-bottom">
      <div class="eyebrow">{location} • NS NEWS</div>
      <h1>{headingParts[0] || 'మీ ప్రధాన శీర్షిక ఇక్కడ కనిపిస్తుంది'} <span class="highlight">{headingParts[1] || ''}</span> {headingParts[2] || ''}</h1>
    </div>
  </div>

  <div class="content">
    <div class="strips">
      {#each points as item,i (i)}
        <div class="strip" style:--strip={impactColor(i,article?.headline).ink} style:--strip-bg={impactColor(i,article?.headline).bg}>
          <span class="number">{String(i+1).padStart(2,'0')}</span>
          <div class="strip-copy">
            <h2>{item.title}</h2>
            {#if item.description}
              <p>{card ? shortenCardText(item.description,83) : item.description}</p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
    {#if !card}
      <div class="story">
        {#each String(article?.body || '').split(/\n{2,}/).filter(Boolean) as paragraph}
          <p>{paragraph}</p>
        {/each}
      </div>
    {/if}
    <p class="closing">{article?.ending_line || 'మరిన్ని వార్తల కోసం NS NEWS ను అనుసరించండి.'}</p>
    <footer><span><b>NS NEWS</b> • A.S.V Digital Network</span><span>nexlifynucleus.in</span></footer>
  </div>
</article>

<style>
  article { font-family:'Noto Sans Telugu','Nirmala UI','Gautami',sans-serif; color:#111a30; overflow:hidden; background:#fff; }
  .fullarticle { width:100%; border:1px solid #dfe5ee; border-radius:20px; box-shadow:0 14px 36px #0b1b4012; }
  .hero {height:clamp(330px,43vw,530px); position:relative; background:var(--magnet-dark); overflow:hidden;}
  .photo {width:100%; height:100%; object-fit:cover; object-position:center; display:block;}
  .no-photo {height:100%; display:grid; place-items:center; color:#fff9;}
  .gradient {position:absolute; inset:0; background:linear-gradient(180deg,#0004 0%,#050a1955 45%,#020614f5 100%);}
  .hero-top {position:absolute; z-index:2; top:18px; right:18px; left:18px; display:flex; justify-content:space-between; align-items:start; gap:8px;}
  .logo {background:#071020ed; color:#fff; border:1px solid #ffffff44; display:inline-flex; align-items:center; gap:7px; padding:5px 9px 5px 5px; border-radius:10px; font-family:Arial,sans-serif; font-size:12px;}
  .logo b {font-size:16px; padding:7px; border-radius:7px; background:#e60019;}
  .news-badge {color:#201300; font-size:11px; font-weight:900; background:#ffca3f; border-radius:999px; padding:8px 10px;}
  .hero-bottom {position:absolute; z-index:2; bottom:22px; left:25px; right:25px;}
  .eyebrow {color:#ffdf67; font-size:12px; font-weight:800; margin-bottom:10px;}
  h1 {color:#fff; font-size:clamp(26px,3.3vw,42px); font-weight:900; line-height:1.48; text-shadow:0 2px 9px #0009; margin:0;}
  .highlight {color:var(--magnet-highlight);}
  .content {padding:24px clamp(14px,3vw,30px);}
  .strips {display:grid; grid-template-columns:1fr; gap:11px;}
  .strip {display:flex; align-items:flex-start; gap:12px; background:var(--strip-bg); border-left:4px solid var(--strip); border-radius:13px; padding:13px 15px; min-width:0; }
  .number {display:grid; place-items:center; flex:0 0 35px; width:35px; height:35px; background:var(--strip); color:#fff; border-radius:10px; font-family:Arial,sans-serif; font-size:13px; font-weight:900;}
  .strip-copy {min-width:0;}
  h2 {color:var(--strip); font-size:16px; margin:0 0 4px; line-height:1.5; font-weight:900;}
  .strip p {color:#273348; margin:0; font-size:14px; line-height:1.85; font-weight:500; overflow-wrap:anywhere;}
  .story {border-top:1px solid #e6e9f0; margin-top:25px; padding-top:19px;}
  .story p {font-size:16px; line-height:2.05; margin:0 0 14px; white-space:pre-wrap;}
  .closing {font-size:14px; line-height:1.7; font-weight:800; background:#f3f6fb; border-left:4px solid var(--magnet-primary); border-radius:9px; margin:20px 0; padding:12px 15px;}
  footer {display:flex; justify-content:space-between; flex-wrap:wrap; gap:9px; border-top:1px solid #e7ebf1; padding-top:15px; font-size:11px; color:#617187;}
  footer b {color:#c91734;}
  .sharecard {width:540px; height:675px; max-width:none; border-radius:0;}
  .sharecard .hero {height:214px;}
  .sharecard .hero-top {top:13px; left:15px; right:15px;}
  .sharecard .hero-bottom {left:21px; right:21px; bottom:15px;}
  .sharecard h1 {font-size:27px; line-height:1.42; display:-webkit-box;-webkit-line-clamp:3;line-clamp:3;-webkit-box-orient:vertical; overflow:hidden;}
  .sharecard .eyebrow {font-size:10px; margin-bottom:6px;}
  .sharecard .content {padding:12px 17px;}
  .sharecard .strips {gap:6px;}
  .sharecard .strip {height:62px; min-height:62px; padding:7px 9px; gap:9px; border-radius:9px;}
  .sharecard .number {width:28px; height:28px; flex-basis:28px; font-size:10px; border-radius:7px;}
  .sharecard h2 {font-size:13px; line-height:1.3; margin-bottom:2px;}
  .sharecard .strip p {font-size:11px; line-height:1.45; display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical; overflow:hidden;}
  .sharecard .closing {padding:6px 9px; font-size:10px; margin:8px 0 6px; line-height:1.3;}
  .sharecard footer {padding-top:7px; font-size:9px;}
  @media (max-width:640px) {
    .hero {height:370px;}
    h1 {font-size:27px;}
    .hero-bottom {left:17px; right:17px;}
    .strip {padding:11px; gap:9px;}
    h2 {font-size:15px;}
    .strip p {font-size:13px;}
    .story p {font-size:15px;}
  }
</style>