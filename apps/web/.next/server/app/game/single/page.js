(()=>{var e={};e.id=184,e.ids=[184],e.modules={2934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},4580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},5869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},2356:(e,r,t)=>{"use strict";t.r(r),t.d(r,{GlobalError:()=>n.a,__next_app__:()=>c,originalPathname:()=>g,pages:()=>p,routeModule:()=>u,tree:()=>d}),t(8868),t(4531),t(5886);var a=t(1262),s=t(5317),i=t(918),n=t.n(i),o=t(3842),l={};for(let e in o)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(l[e]=()=>o[e]);t.d(r,l);let d=["",{children:["game",{children:["single",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(t.bind(t,8868)),"/home/user/risk-game/apps/web/src/app/game/single/page.tsx"]}]},{}]},{}]},{layout:[()=>Promise.resolve().then(t.bind(t,4531)),"/home/user/risk-game/apps/web/src/app/layout.tsx"],"not-found":[()=>Promise.resolve().then(t.t.bind(t,5886,23)),"next/dist/client/components/not-found-error"]}],p=["/home/user/risk-game/apps/web/src/app/game/single/page.tsx"],g="/game/single/page",c={require:t,loadChunk:()=>Promise.resolve()},u=new a.AppPageRouteModule({definition:{kind:s.x.APP_PAGE,page:"/game/single/page",pathname:"/game/single",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:d}})},8650:(e,r,t)=>{Promise.resolve().then(t.bind(t,7040))},7040:(e,r,t)=>{"use strict";t.r(r),t.d(r,{default:()=>p});var a=t(3109),s=t(371),i=t(5857),n=t(6698),o=t(2677),l=t(5327),d=t(7437);function p(){let[e,r]=(0,s.useState)(i.PA),t=`
    .game-layout {
      display: grid;
      grid-template-columns: 1fr;
      gap: 16px;
    }

    @media (min-width: 768px) {
      .game-layout {
        grid-template-columns: 2fr 1fr;
        gap: 24px;
      }
    }

    @media (min-width: 1024px) {
      .game-layout {
        grid-template-columns: 3fr 1fr;
        gap: 32px;
      }
    }
  `,{selectedTerritory:p,fortifyTroops:g,setFortifyTroops:c,transferTroops:u,setTransferTroops:m,message:x,handleTerritoryClick:h,handleSkip:y,handleTransfer:f,resetSelection:P}=(0,l.e)(e,r);return(0,a.jsxs)(a.Fragment,{children:[a.jsx("style",{children:t}),a.jsx("div",{style:{minHeight:"100vh",backgroundColor:"#0a0a0a",padding:"20px"},children:(0,a.jsxs)("div",{style:{maxWidth:"1400px",margin:"0 auto"},children:[(0,a.jsxs)("div",{style:{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"},children:[a.jsx("h1",{style:{color:"white",margin:0},children:"Risk PoC - Single Player"}),a.jsx(d.default,{href:"/",style:{padding:"10px 20px",backgroundColor:"#555",color:"white",textDecoration:"none",borderRadius:"8px"},children:"Back to Menu"})]}),x&&a.jsx("div",{style:{padding:"15px",backgroundColor:"#2a2a2a",color:"white",borderRadius:"8px",marginBottom:"20px"},children:x}),(0,a.jsxs)("div",{className:"game-layout",children:[a.jsx(n.t,{state:e,onTerritoryClick:(r,t)=>{"red"===e.currentPlayer&&h(r,"red",t)},selectedTerritory:p}),a.jsx(o.z,{state:e,selectedTerritory:p,onSkip:y,fortifyTroops:g,onFortifyTroopsChange:c,transferTroops:u,onTransferTroopsChange:m,onTransfer:f})]})]})})]})}},8868:(e,r,t)=>{"use strict";t.r(r),t.d(r,{default:()=>a});let a=(0,t(4361).createProxy)(String.raw`/home/user/risk-game/apps/web/src/app/game/single/page.tsx#default`)}};var r=require("../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),a=r.X(0,[661,437,869],()=>t(2356));module.exports=a})();