
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = innerWidth;
  canvas.height = innerHeight;
}
resize();
addEventListener("resize", resize);

const WORLD = { w: 3200, h: 2400 };

const islands = [
  {x:1600,y:1200,r:145,name:"PIRATE SHOP",shop:true},
  {x:350,y:300,r:115,name:"NORTHWEST PORT",port:true},
  {x:2850,y:300,r:115,name:"NORTHEAST PORT",port:true},
  {x:350,y:2100,r:115,name:"SOUTHWEST PORT",port:true},
  {x:2850,y:2100,r:115,name:"SOUTHEAST PORT",port:true}
];

const ships = [
  {name:"Raft",cost:0,hp:100,speed:2.6,damage:12,rate:650,size:15},
  {name:"Sloop",cost:300,hp:180,speed:3.1,damage:18,rate:550,size:19},
  {name:"Brig",cost:900,hp:350,speed:2.6,damage:30,rate:450,size:24},
  {name:"Galleon",cost:2200,hp:650,speed:2.1,damage:48,rate:400,size:29},
  {name:"Warship",cost:5000,hp:1200,speed:1.8,damage:75,rate:330,size:35}
];

let money = 0;
let kills = 0;
let shipIndex = 0;
let health = ships[0].hp;

const player = {
  x:1600,
  y:1600,
  angle:-Math.PI/2,
  speed:0,
  lastShot:0
};

let enemies = [];
let bullets = [];
let particles = [];
let keys = {};
let mouse = {x:innerWidth/2,y:innerHeight/2};
let shopOpen = false;
let lastTime = performance.now();

const camera = {x:0,y:0};

function distance(a,b) {
  return Math.hypot(a.x-b.x,a.y-b.y);
}

function random(min,max) {
  return Math.random()*(max-min)+min;
}

function notify(text) {
  const el = document.getElementById("message");
  el.textContent = text;
  clearTimeout(notify.timer);
  notify.timer = setTimeout(()=>el.textContent="",2200);
}

function updateHUD() {
  document.getElementById("money").textContent = money;
  document.getElementById("kills").textContent = kills;
  document.getElementById("health").textContent = Math.ceil(health);
  document.getElementById("shipName").textContent = ships[shipIndex].name;
}

function spawnEnemy() {
  const a = random(0,Math.PI*2);
  const d = random(500,1000);

  const x = Math.max(100,Math.min(WORLD.w-100,player.x+Math.cos(a)*d));
  const y = Math.max(100,Math.min(WORLD.h-100,player.y+Math.sin(a)*d));

  if (Math.hypot(x-player.x,y-player.y)<450) return;

  enemies.push({
    x,y,
    angle:random(0,Math.PI*2),
    hp:random(55,110),
    maxHp:110,
    speed:random(.5,1.1),
    damage:10,
    value:Math.floor(random(60,130)),
    size:random(16,23),
    lastShot:0,
    color:"#a84b36"
  });
}

function spawnPortShips() {
  islands.filter(i=>i.port).forEach(island=>{
    enemies.push({
      x:island.x+170,
      y:island.y+25,
      angle:Math.PI,
      hp:700,
      maxHp:700,
      speed:0,
      damage:35,
      value:800,
      size:42,
      lastShot:0,
      color:"#293c55",
      portShip:true
    });
  });
}

spawnPortShips();

for(let i=0;i<12;i++) spawnEnemy();

function fireBullet(owner,x,y,angle,damage) {
  bullets.push({
    x,y,
    vx:Math.cos(angle)*7,
    vy:Math.sin(angle)*7,
    damage,
    owner,
    life:100
  });
}

function playerShoot() {
  const now = performance.now();
  const ship = ships[shipIndex];

  if(now-player.lastShot<ship.rate) return;
  player.lastShot=now;

  const dx=mouse.x-canvas.width/2;
  const dy=mouse.y-canvas.height/2;
  const angle=Math.atan2(dy,dx);

  fireBullet("player",player.x,player.y,angle,ship.damage);

  for(let i=0;i<7;i++) {
    particles.push({
      x:player.x,y:player.y,
      vx:random(-2,2),vy:random(-2,2),
      life:random(8,18),color:"#ffd38a"
    });
  }
}

function enemyShoot(enemy) {
  const angle=Math.atan2(player.y-enemy.y,player.x-enemy.x);
  fireBullet("enemy",enemy.x,enemy.y,angle,enemy.damage);
}

function openShop() {
  if(distance(player,islands[0])>230) {
    notify("Sail closer to the central island!");
    return;
  }

  shopOpen=true;
  document.getElementById("shop").classList.remove("hidden");
  renderShop();
}

function closeShop() {
  shopOpen=false;
  document.getElementById("shop").classList.add("hidden");
}

function renderShop() {
  const box=document.getElementById("shopItems");
  box.innerHTML="";

  ships.forEach((s,i)=>{
    const item=document.createElement("div");
    item.className="shop-item";

    item.innerHTML=`
      <h3>🚢 ${s.name}</h3>
      <p>Health: ${s.hp}</p>
      <p>Speed: ${s.speed}</p>
      <p>Cannon damage: ${s.damage}</p>
      <p>Price: ${s.cost} gold</p>
    `;

    const button=document.createElement("button");

    if(i===shipIndex) {
      button.textContent="EQUIPPED";
      button.disabled=true;
    } else if(i<shipIndex) {
      button.textContent="Already owned";
      button.disabled=true;
    } else {
      button.textContent="Buy Ship";
      button.disabled=money<s.cost;
    }

    button.onclick=()=>buyShip(i);
    item.appendChild(button);
    box.appendChild(item);
  });

  const repair=document.createElement("button");
  repair.textContent="Repair ship - 100 gold";
  repair.onclick=()=>{
    if(money>=100 && health<ships[shipIndex].hp) {
      money-=100;
      health=ships[shipIndex].hp;
      updateHUD();
      renderShop();
      notify("Ship repaired!");
    } else {
      notify("Not enough gold or already repaired!");
    }
  };

  box.appendChild(repair);
}

function buyShip(i) {
  const s=ships[i];

  if(i<=shipIndex || money<s.cost) {
    notify("You need more gold!");
    return;
  }

  money-=s.cost;
  shipIndex=i;
  health=s.hp;

  notify("New ship purchased: "+s.name+"!");
  updateHUD();
  renderShop();
}

function update(dt) {
  if(shopOpen) return;

  const ship=ships[shipIndex];

  if(keys["w"] || keys["ArrowUp"]) {
    player.speed=Math.min(ship.speed,player.speed+0.07*dt);
  } else if(keys["s"] || keys["ArrowDown"]) {
    player.speed=Math.max(-ship.speed*.5,player.speed-0.07*dt);
  } else {
    player.speed*=Math.pow(.985,dt);
  }

  if(keys["a"] || keys["ArrowLeft"]) player.angle-=.045*dt;
  if(keys["d"] || keys["ArrowRight"]) player.angle+=.045*dt;

  player.x+=Math.cos(player.angle)*player.speed*dt;
  player.y+=Math.sin(player.angle)*player.speed*dt;

  player.x=Math.max(40,Math.min(WORLD.w-40,player.x));
  player.y=Math.max(40,Math.min(WORLD.h-40,player.y));

  // Enemies move and attack
  enemies.forEach(enemy=>{
    if(enemy.hp<=0) return;

    const d=distance(player,enemy);

    if(!enemy.portShip) {
      const angle=Math.atan2(player.y-enemy.y,player.x-enemy.x);

      if(d>260) {
        enemy.angle=angle;
        enemy.x+=Math.cos(angle)*enemy.speed*dt;
        enemy.y+=Math.sin(angle)*enemy.speed*dt;
      } else {
        enemy.angle=angle+Math.PI/2;
        enemy.x+=Math.cos(angle)*enemy.speed*.3*dt;
        enemy.y+=Math.sin(angle)*enemy.speed*.3*dt;
      }
    }

    if(d<650 && performance.now()-enemy.lastShot>1700) {
      enemy.lastShot=performance.now();
      enemyShoot(enemy);
    }
  });

  // Bullets
  bullets.forEach(b=>{
    b.x+=b.vx*dt;
    b.y+=b.vy*dt;
    b.life-=dt;

    if(b.owner==="player") {
      enemies.forEach(e=>{
        if(e.hp>0 && Math.hypot(e.x-b.x,e.y-b.y)<e.size+7) {
          e.hp-=b.damage;
          b.life=0;

          if(e.hp<=0) {
            money+=e.value;
            kills++;
            notify("Ship sunk! +"+e.value+" gold");
            updateHUD();
          }
        }
      });
    } else {
      if(Math.hypot(player.x-b.x,player.y-b.y)<ships[shipIndex].size+8) {
        health-=b.damage;
        b.life=0;

        if(health<=0) {
          health=0;
          player.speed=0;
          notify("Your ship was defeated! Returning to port...");
          setTimeout(()=>{
            money=Math.floor(money*.8);
            health=ships[shipIndex].hp;
            player.x=1600;
            player.y=1600;
            updateHUD();
          },1300);
        }
        updateHUD();
      }
    }
  });

  bullets=bullets.filter(b=>b.life>0);

  // Particles
  particles.forEach(p=>{
    p.x+=p.vx*dt;
    p.y+=p.vy*dt;
    p.life-=dt;
  });
  particles=particles.filter(p=>p.life>0);

  // Spawn more enemies
  if(enemies.filter(e=>!e.portShip && e.hp>0).length<13) {
    if(Math.random()<.015*dt) spawnEnemy();
  }

  camera.x=player.x-canvas.width/2;
  camera.y=player.y-canvas.height/2;

  camera.x=Math.max(0,Math.min(WORLD.w-canvas.width,camera.x));
  camera.y=Math.max(0,Math.min(WORLD.h-canvas.height,camera.y));

  updateHUD();
}

function drawShip(x,y,angle,size,color) {
  ctx.save();
  ctx.translate(x,y);
  ctx.rotate(angle);

  ctx.fillStyle="#36271b";
  ctx.beginPath();
  ctx.moveTo(size*1.5,0);
  ctx.lineTo(-size,-size*.7);
  ctx.lineTo(-size*.8,size*.7);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle=color;
  ctx.beginPath();
  ctx.moveTo(size,0);
  ctx.lineTo(-size*.8,-size*.45);
  ctx.lineTo(-size*.7,size*.45);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle="#e9d5a4";
  ctx.fillRect(-size*.3,-2, size*.7,4);

  ctx.strokeStyle="#d6b77a";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(-size*.1,0);
  ctx.lineTo(-size*.1,-size*1.5);
  ctx.stroke();

  ctx.fillStyle="#f5e9c9";
  ctx.beginPath();
  ctx.moveTo(-size*.1,-size*1.4);
  ctx.lineTo(-size*.1,-size*.2);
  ctx.lineTo(size*.5,-size*.4);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawIsland(island) {
  const x=island.x-camera.x;
  const y=island.y-camera.y;

  ctx.fillStyle="#b7a16b";
  ctx.beginPath();
  ctx.arc(x,y,island.r+12,0,Math.PI*2);
  ctx.fill();

  ctx.fillStyle="#dfd08d";
  ctx.beginPath();
  ctx.arc(x,y,island.r,0,Math.PI*2);
  ctx.fill();

  // Grass
  ctx.fillStyle="#398b49";
  ctx.beginPath();
  ctx.arc(x,y,island.r*.82,0,Math.PI*2);
  ctx.fill();

  // Trees
  for(let i=0;i<9;i++) {
    const a=i*2.4;
    const tx=x+Math.cos(a)*island.r*.48;
    const ty=y+Math.sin(a)*island.r*.48;

    ctx.fillStyle="#684628";
    ctx.fillRect(tx-3,ty,6,12);

    ctx.fillStyle="#176c35";
    ctx.beginPath();
    ctx.arc(tx,ty,13,0,Math.PI*2);
    ctx.fill();
  }

  if(island.shop) {
    ctx.fillStyle="#75482b";
    ctx.fillRect(x-32,y-20,64,45);

    ctx.fillStyle="#c49b54";
    ctx.beginPath();
    ctx.moveTo(x-40,y-20);
    ctx.lineTo(x,y-48);
    ctx.lineTo(x+40,y-20);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle="white";
    ctx.font="bold 15px Arial";
    ctx.textAlign="center";
    ctx.fillText("SHIP SHOP",x,y+55);
  }

  if(island.port) {
    ctx.fillStyle="#674a30";
    ctx.fillRect(x-65,y-12,130,25);

    ctx.fillStyle="#333";
    ctx.fillRect(x-40,y-45,80,25);

    ctx.fillStyle="#f7d879";
    ctx.font="bold 14px Arial";
    ctx.textAlign="center";
    ctx.fillText("NAVAL PORT",x,y+65);
  }
}

function draw() {
  ctx.fillStyle="#0875a4";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Ocean pattern
  ctx.strokeStyle="rgba(255,255,255,.12)";
  ctx.lineWidth=1;

  for(let x=0;x<canvas.width;x+=90) {
    for(let y=0;y<canvas.height;y+=80) {
      ctx.beginPath();
      ctx.arc(x+((y%3)*5),y,8,0,Math.PI);
      ctx.stroke();
    }
  }

  // World boundaries
  ctx.strokeStyle="#d7c17e";
  ctx.lineWidth=8;
  ctx.strokeRect(-camera.x,-camera.y,WORLD.w,WORLD.h);

  islands.forEach(drawIsland);

  // Ships
  enemies.forEach(e=>{
    if(e.hp<=0) return;

    drawShip(e.x-camera.x,e.y-camera.y,e.angle,e.size,e.color);

    if(e.hp<e.maxHp) {
      ctx.fillStyle="#333";
      ctx.fillRect(e.x-camera.x-25,e.y-camera.y-35,50,5);
      ctx.fillStyle="#e34838";
      ctx.fillRect(e.x-camera.x-25,e.y-camera.y-35,50*Math.max(0,e.hp/e.maxHp),5);
    }
  });

  drawShip(
    player.x-camera.x,
    player.y-camera.y,
    player.angle,
    ships[shipIndex].size,
    "#e3b83e"
  );

  // Cannonballs
  bullets.forEach(b=>{
    ctx.fillStyle=b.owner==="player"?"#171717":"#ff7542";
    ctx.beginPath();
    ctx.arc(b.x-camera.x,b.y-camera.y,5,0,Math.PI*2);
    ctx.fill();
  });

  particles.forEach(p=>{
    ctx.fillStyle=p.color;
    ctx.globalAlpha=Math.max(0,p.life/18);
    ctx.fillRect(p.x-camera.x,p.y-camera.y,4,4);
    ctx.globalAlpha=1;
  });

  // Shop distance
  if(distance(player,islands[0])<230) {
    ctx.fillStyle="white";
    ctx.font="bold 17px Arial";
    ctx.textAlign="center";
    ctx.fillText("PRESS E TO ENTER SHOP",canvas.width/2,canvas.height-75);
  }

  drawMinimap();
}

function drawMinimap() {
  const w=165,h=125;
  const x=canvas.width-w-15,y=canvas.height-h-15;

  ctx.fillStyle="rgba(0,15,30,.8)";
  ctx.fillRect(x,y,w,h);

  ctx.strokeStyle="#fff";
  ctx.strokeRect(x,y,w,h);

  islands.forEach(i=>{
    ctx.fillStyle=i.shop?"#ffd34e":"#d4c48a";
    ctx.beginPath();
    ctx.arc(x+i.x/WORLD.w*w,y+i.y/WORLD.h*h,4,0,Math.PI*2);
    ctx.fill();
  });

  enemies.forEach(e=>{
    if(e.hp>0) {
      ctx.fillStyle="#f45b43";
      ctx.fillRect(x+e.x/WORLD.w*w-1,y+e.y/WORLD.h*h-1,3,3);
    }
  });

  ctx.fillStyle="#ffff00";
  ctx.beginPath();
  ctx.arc(x+player.x/WORLD.w*w,y+player.y/WORLD.h*h,4,0,Math.PI*2);
  ctx.fill();
}

function loop(now) {
  const dt=Math.min((now-lastTime)/16.67,2);
  lastTime=now;

  update(dt);
  draw();

  requestAnimationFrame(loop);
}

addEventListener("keydown",e=>{
  keys[e.key.toLowerCase()]=true;

  if(e.key.toLowerCase()==="e" && !shopOpen) openShop();

  if(e.key==="Escape") closeShop();
});

addEventListener("keyup",e=>{
  keys[e.key.toLowerCase()]=false;
});

canvas.addEventListener("mousemove",e=>{
  mouse.x=e.clientX;
  mouse.y=e.clientY;
});

canvas.addEventListener("mousedown",()=>{
  if(!shopOpen) playerShoot();
});

updateHUD();
requestAnimationFrame(loop);
