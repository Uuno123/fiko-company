import { useEffect, useMemo, useRef } from 'react'
import { StyleSheet, View } from 'react-native'

// Verkkoversion kartta (20.11.2026): react-native-maps ei toimi selaimessa,
// joten Leaflet iframen sisällä. Sama ilme kuin puhelimessa: vaalea harmaa
// pohja (OpenStreetMap harmaasävynä), musta reitti teitä pitkin ravintolasta
// kotiin (OSRM, ilmainen; muuten kaari), valkoinen päätepiste, ravintola
// mustana ja kuljettaja autona/pyöränä. Sijaintipäivitykset viestitään
// iframeen, joten kartta ei lataudu uudelleen.
const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/'

export default function TrackingMap({ restaurant, destination, courier, courierVehicle, hideRestaurant, bottomInset = 40, style }) {
  const frameRef = useRef(null)
  const data = {
    shop: point(restaurant),
    home: point(destination),
    courier: point(courier),
    hideShop: Boolean(hideRestaurant),
    car: courierVehicle === 'car',
    bottom: bottomInset,
  }
  const json = JSON.stringify(data)
  // Iframe rakennetaan kerran; muutokset lähetetään viestinä.
  const srcDoc = useMemo(() => html(json), []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage({ bidropMap: json }, '*')
  }, [json])

  return (
    <View style={[StyleSheet.absoluteFill, style]}>
      <iframe
        ref={frameRef}
        title="Kartta"
        srcDoc={srcDoc}
        onLoad={() => frameRef.current?.contentWindow?.postMessage({ bidropMap: json }, '*')}
        style={{ width: '100%', height: '100%', border: 0 }}
      />
    </View>
  )
}

function point(p) {
  if (!p || p.lat == null || p.lng == null) return null
  const lat = Number(p.lat)
  const lng = Number(p.lng)
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : null
}

const CAR_SVG = `<svg width="30" height="54" viewBox="0 0 44 80" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#bfc2c6"/><stop offset=".18" stop-color="#eceef0"/><stop offset=".5" stop-color="#fff"/><stop offset=".82" stop-color="#eceef0"/><stop offset="1" stop-color="#bfc2c6"/></linearGradient><linearGradient id="r" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#dfe1e4"/><stop offset=".5" stop-color="#fff"/><stop offset="1" stop-color="#dfe1e4"/></linearGradient><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a525c"/><stop offset="1" stop-color="#1b1f24"/></linearGradient></defs><path d="M22 5C32 5 39 8 40 15L41 64C41 74 35 79 22 79C9 79 3 74 3 64L4 15C5 8 12 5 22 5Z" opacity=".1"/><path d="M22 4C31 4 37 7 38 14L39 63C39 72 34 77 22 77C10 77 5 72 5 63L6 14C7 7 13 4 22 4Z" opacity=".12"/><path d="M4 27L1.5 26.5C.8 26.4.8 29.6 1.5 29.5L5 29Z" fill="#d7dade"/><path d="M40 27L42.5 26.5C43.2 26.4 43.2 29.6 42.5 29.5L39 29Z" fill="#d7dade"/><path d="M22 2C31 2 36.5 4.5 37.5 11L38.5 24C39.3 30 39.3 36 38.5 42L38.5 63C38.5 72 33 76 22 76C11 76 5.5 72 5.5 63L5.5 42C4.7 36 4.7 30 5.5 24L6.5 11C7.5 4.5 13 2 22 2Z" fill="url(#b)" stroke="#b3b6ba" stroke-width=".5"/><path d="M8.5 4.8C10 3.6 13 3.2 15 3.4L14 5.6C12 5.6 10 6 8.5 6.8Z" fill="#fffbe6"/><path d="M35.5 4.8C34 3.6 31 3.2 29 3.4L30 5.6C32 5.6 34 6 35.5 6.8Z" fill="#fffbe6"/><path d="M9 25C15 20.5 29 20.5 35 25L33 35.5C27 33.8 17 33.8 11 35.5Z" fill="url(#g)"/><path d="M7 38L9.8 36.5L9.8 56L7 57.5Z" fill="url(#g)"/><path d="M37 38L34.2 36.5L34.2 56L37 57.5Z" fill="url(#g)"/><path d="M11 36.5C17 35 27 35 33 36.5L33 56.5C27 58 17 58 11 56.5Z" fill="url(#r)"/><path d="M11 59C17 60.8 27 60.8 33 59L34.5 67C28 69.5 16 69.5 9.5 67Z" fill="url(#g)"/><path d="M8 73C9.5 74.4 12 75.2 15 75.4L15 74C12.5 73.8 10.2 73.2 8.6 72.2Z" fill="#e0453c"/><path d="M36 73C34.5 74.4 32 75.2 29 75.4L29 74C31.5 73.8 33.8 73.2 35.4 72.2Z" fill="#e0453c"/></svg>`

const BIKE_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#14150f" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>`

function html(initial) {
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="${LEAFLET}leaflet.css">
<style>
html,body,#m{margin:0;height:100%;background:#eef0f2}
.leaflet-tile-pane{filter:grayscale(1) brightness(1.1) contrast(.82)}
.leaflet-control-attribution{font-size:9px;background:rgba(255,255,255,.6)!important}
.end{width:12px;height:12px;border-radius:50%;background:#fff;border:5px solid #14150f;box-shadow:0 2px 6px rgba(20,21,15,.25)}
.shop{width:24px;height:24px;border-radius:50%;background:#14150f;border:2px solid #fff;box-shadow:0 2px 6px rgba(20,21,15,.25);display:flex;align-items:center;justify-content:center}
.bike{width:38px;height:38px;border-radius:50%;background:#fff;box-shadow:0 3px 8px rgba(20,21,15,.28);display:flex;align-items:center;justify-content:center}
.car{transition:transform .3s}
</style></head><body><div id="m"></div>
<script src="${LEAFLET}leaflet.js"></script>
<script>
var map=L.map('m',{zoomControl:false,attributionControl:true}).setView([62.8924,27.677],14);
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
var passedLine=L.polyline([],{color:'#a9adb3',weight:5,lineCap:'round',lineJoin:'round'}).addTo(map);
var line=L.polyline([],{color:'#14150f',weight:5,lineCap:'round',lineJoin:'round'}).addTo(map);
var shopM=null,homeM=null,courierM=null,route=null,routeKey='',fitted='',state=null;
var CAR=${JSON.stringify(CAR_SVG)},BIKE=${JSON.stringify(BIKE_SVG)};
function curve(a,b){var m=[(a[0]+b[0])/2+(b[1]-a[1])*.25,(a[1]+b[1])/2-(b[0]-a[0])*.25],o=[];for(var i=0;i<=32;i++){var t=i/32,u=1-t;o.push([u*u*a[0]+2*u*t*m[0]+t*t*b[0],u*u*a[1]+2*u*t*m[1]+t*t*b[1]])}return o}
function bearing(a,b){var r=Math.PI/180,y=Math.sin((b[1]-a[1])*r)*Math.cos(b[0]*r),x=Math.cos(a[0]*r)*Math.sin(b[0]*r)-Math.sin(a[0]*r)*Math.cos(b[0]*r)*Math.cos((b[1]-a[1])*r);return(Math.atan2(y,x)/r+360)%360}
function snap(p,r){var k=Math.cos(p[0]*Math.PI/180),best=null;for(var i=0;i<r.length-1;i++){var a=r[i],b=r[i+1],ax=a[1]*k,ay=a[0],dx=b[1]*k-ax,dy=b[0]-ay,l=dx*dx+dy*dy,t=l>0?Math.max(0,Math.min(1,((p[1]*k-ax)*dx+(p[0]-ay)*dy)/l)):0,qx=ax+dx*t,qy=ay+dy*t,d=(p[1]*k-qx)*(p[1]*k-qx)+(p[0]-qy)*(p[0]-qy);if(!best||d<best.d)best={d:d,i:i,p:[qy,qx/k],h:bearing(a,b)}}return best&&Math.sqrt(best.d)*111000<150?best:null}
function icon(cls,inner,w,h){return L.divIcon({className:'',html:'<div class="'+cls+'">'+(inner||'')+'</div>',iconSize:[w,h],iconAnchor:[w/2,h/2]})}
function draw(){
  var s=state;if(!s)return;
  var from=s.shop||s.courier,to=s.home;
  var key=from&&to?from.join()+'|'+to.join():'';
  if(key!==routeKey){routeKey=key;route=from&&to?curve(from,to):null;
    if(from&&to){fetch('https://router.project-osrm.org/route/v1/driving/'+from[1]+','+from[0]+';'+to[1]+','+to[0]+'?overview=full&geometries=geojson').then(function(r){return r.ok?r.json():null}).then(function(j){var c=j&&j.routes&&j.routes[0]&&j.routes[0].geometry.coordinates;if(c&&c.length>1&&key===routeKey){route=c.map(function(x){return[x[1],x[0]]});draw()}}).catch(function(){})}}
  var onRoute=s.hideShop||!s.shop,sn=s.courier&&route&&onRoute?snap(s.courier,route):null;
  line.setLatLngs(route?(sn?[sn.p].concat(route.slice(sn.i+1)):route):[]);
  passedLine.setLatLngs(route&&sn?route.slice(0,sn.i+1).concat([sn.p]):[]);
  if(s.shop&&!s.hideShop){if(!shopM)shopM=L.marker(s.shop,{icon:icon('shop','<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"><path d="M3 9l1.5-5h15L21 9M4 9v11h16V9M9 20v-6h6v6"/></svg>',28,28)}).addTo(map);else shopM.setLatLng(s.shop)}else if(shopM){map.removeLayer(shopM);shopM=null}
  if(s.home){if(!homeM)homeM=L.marker(s.home,{icon:icon('end','',22,22)}).addTo(map);else homeM.setLatLng(s.home)}
  var cp=sn?sn.p:s.courier;
  if(cp){var target=onRoute?s.home:s.shop,h=s.car?(sn?sn.h:target?bearing(cp,target):0):0;
    var ic=s.car?icon('car" style="transform:rotate('+h+'deg)',CAR,30,54):icon('bike',BIKE,38,38);
    if(!courierM)courierM=L.marker(cp,{icon:ic,zIndexOffset:1000}).addTo(map);else{courierM.setLatLng(cp);courierM.setIcon(ic)}}
  else if(courierM){map.removeLayer(courierM);courierM=null}
  var pts=[s.shop&&!s.hideShop?s.shop:null,s.home,cp].filter(Boolean).concat(route||[]);
  var fk=pts.length+'|'+s.bottom+'|'+routeKey+'|'+(route?route.length:0);
  if(pts.length>1&&fk!==fitted){fitted=fk;map.fitBounds(L.latLngBounds(pts),{paddingTopLeft:[40,90],paddingBottomRight:[40,s.bottom+20]})}
}
window.addEventListener('message',function(e){if(e.data&&e.data.bidropMap){state=JSON.parse(e.data.bidropMap);draw()}});
state=${initial};draw();
</script></body></html>`
}
