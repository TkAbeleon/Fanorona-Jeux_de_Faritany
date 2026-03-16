// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS & BOARD UTILITIES
// ══════════════════════════════════════════════════════════════════════════════
export const COLS = 9, ROWS = 5;
export const DIRS = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];

export const hasDir = (r:number,c:number,dr:number,dc:number) => (dr===0||dc===0) ? true : (r+c)%2===0;
export const idx = (r:number,c:number) => r*COLS+c;
export const inB = (r:number,c:number) => r>=0&&r<ROWS&&c>=0&&c<COLS;
export const count = (b:number[],p:number) => b.reduce((n:number,v:number)=>n+(v===p?1:0),0);

export function neighbors(r:number,c:number): [number,number,number,number][] {
  return DIRS.flatMap(([dr,dc]) => {
    if(!hasDir(r,c,dr,dc)) return [];
    const nr=r+dr, nc=c+dc;
    return inB(nr,nc)?[[nr,nc,dr,dc] as [number,number,number,number]]:[];
  });
}

export function getCaptures(board:number[],fr:number,fc:number,tr:number,tc:number){
  const dr=tr-fr, dc=tc-fc;
  const opp = board[idx(fr,fc)]===1?2:1;
  const approach:[number,number][]=[], withdraw:[number,number][]=[];
  let nr=tr+dr, nc=tc+dc;
  while(inB(nr,nc)&&board[idx(nr,nc)]===opp){ approach.push([nr,nc]); nr+=dr; nc+=dc; }
  nr=fr-dr; nc=fc-dc;
  while(inB(nr,nc)&&board[idx(nr,nc)]===opp){ withdraw.push([nr,nc]); nr-=dr; nc-=dc; }
  return { approach, withdraw };
}

export const applyCaptures = (board:number[],caps:[number,number][]) => {
  const nb=[...board]; caps.forEach(([r,c])=>nb[idx(r,c)]=0); return nb;
};

export function hasAnyCapture(board:number[],player:number){
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(board[idx(r,c)]===player){
      for(const[nr,nc] of neighbors(r,c)){
        if(board[idx(nr,nc)]===0){
          const{approach,withdraw}=getCaptures(board,r,c,nr,nc);
          if(approach.length||withdraw.length) return true;
        }
      }
    }
  }
  return false;
}

export function initBoard(){
  const b=new Array(ROWS*COLS).fill(0);
  for(let c=0;c<COLS;c++){ b[idx(0,c)]=2; b[idx(1,c)]=2; b[idx(3,c)]=1; b[idx(4,c)]=1; }
  [1,2,1,2,0,1,2,1,2].forEach((v,c)=>b[idx(2,c)]=v);
  return b;
}

// ══════════════════════════════════════════════════════════════════════════════
// MOVE GENERATION
// ══════════════════════════════════════════════════════════════════════════════
export interface MultiState {
  movedPiece: [number,number];
  visitedCells: [number,number][];
  board: number[];
}

export interface Move {
  board: number[];
  fromR: number; fromC: number;
  toR: number; toC: number;
  caps: [number,number][];
  capType: string;
}

export function generateMoves(board:number[], player:number, multiState:MultiState|null=null): Move[] {
  const moves:Move[]=[], forceCapture=hasAnyCapture(board,player);
  const pieces:([number,number])[] = multiState
    ? [multiState.movedPiece]
    : Array.from({length:ROWS*COLS},(_,i)=>i).filter(i=>board[i]===player).map(i=>[Math.floor(i/COLS),i%COLS] as [number,number]);

  for(const [fr,fc] of pieces){
    for(const [nr,nc] of neighbors(fr,fc)){
      if(board[idx(nr,nc)]!==0) continue;
      if(multiState&&multiState.visitedCells.some(([a,b])=>a===nr&&b===nc)) continue;
      const {approach,withdraw}=getCaptures(board,fr,fc,nr,nc);
      const hasAny=approach.length||withdraw.length;
      if((forceCapture||multiState)&&!hasAny) continue;
      const base=[...board]; base[idx(nr,nc)]=player; base[idx(fr,fc)]=0;
      if(approach.length&&withdraw.length){
        moves.push({board:applyCaptures(base,approach),fromR:fr,fromC:fc,toR:nr,toC:nc,caps:approach,capType:"approach"});
        moves.push({board:applyCaptures(base,withdraw),fromR:fr,fromC:fc,toR:nr,toC:nc,caps:withdraw,capType:"withdraw"});
      } else if(approach.length){
        moves.push({board:applyCaptures(base,approach),fromR:fr,fromC:fc,toR:nr,toC:nc,caps:approach,capType:"approach"});
      } else if(withdraw.length){
        moves.push({board:applyCaptures(base,withdraw),fromR:fr,fromC:fc,toR:nr,toC:nc,caps:withdraw,capType:"withdraw"});
      } else {
        moves.push({board:base,fromR:fr,fromC:fc,toR:nr,toC:nc,caps:[],capType:"none"});
      }
    }
  }
  return moves;
}

// ══════════════════════════════════════════════════════════════════════════════
// NEURAL NETWORK HEURISTIC
// Réseau: 12 features → ReLU hidden(8) → tanh → score
// Poids calibrés manuellement par analyse stratégique du Fanorona
// ══════════════════════════════════════════════════════════════════════════════
const W1=[
  [ 2.8,-0.3, 0.5, 1.2,-0.2,-0.4, 0.6, 0.8, 0.3, 0.1,-1.5, 0.4],
  [ 0.4, 2.5, 1.8, 0.6, 1.2,-0.8, 0.4, 0.3, 0.7, 0.5,-0.6, 0.3],
  [ 0.6, 0.4, 0.8, 3.1, 0.3,-0.2, 0.2, 0.4, 0.5,-0.1,-0.8, 1.2],
  [-0.2, 1.1, 1.4, 0.5, 2.8,-1.2, 1.5, 0.2, 0.4, 1.1,-0.3, 0.1],
  [ 0.5, 0.8, 0.6, 0.7, 0.4,-0.5, 0.3, 1.5, 2.2, 0.6,-0.4, 0.6],
  [ 0.3, 0.5, 0.3, 0.4, 1.3,-1.5, 2.1, 0.6,-0.1, 0.8,-0.9,-0.2],
  [ 1.8, 0.2, 1.1, 1.4,-0.1,-0.3, 0.2, 0.4, 0.8, 0.2,-2.1, 0.9],
  [ 0.4, 0.7, 2.0, 1.5, 0.5,-0.4, 0.3, 0.5, 0.6,-0.2,-0.7, 2.3],
];
const B1=[0.1,-0.2,0.3,-0.1,0.2,-0.3,0.0,0.1];
const W2=[1.8,2.1,2.4,1.6,1.9,1.4,2.0,2.2];

export function extractFeatures(board:number[], player:number){
  const opp=player===1?2:1;
  const my=count(board,player), op=count(board,opp), tot=my+op||1;

  const materialAdv=(my-op)/22;

  let ctr=0,ctrO=0;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const w=Math.max(0,7-Math.abs(r-2)-Math.abs(c-4))/7;
    if(board[idx(r,c)]===player) ctr+=w;
    if(board[idx(r,c)]===opp) ctrO+=w;
  }
  const centerControl=(ctr-ctrO)/10;

  const myM=generateMoves(board,player).length, opM=generateMoves(board,opp).length;
  const mobility=(myM-opM)/Math.max(myM+opM,1);

  let myT=0,opT=0;
  generateMoves(board,player).forEach(m=>myT+=m.caps.length);
  generateMoves(board,opp).forEach(m=>opT+=m.caps.length);
  const captureThreats=(myT-opT)/Math.max(myT+opT,1);

  function connectivity(p:number){
    let e=0;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++)
      if(board[idx(r,c)]===p) for(const[nr,nc] of neighbors(r,c)) if(board[idx(nr,nc)]===p) e++;
    return e/2;
  }
  const mc=connectivity(player),oc=connectivity(opp);
  const conn=(mc-oc)/Math.max(mc+oc,1);

  let mE=0,oE=0;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const e=(r===0||r===ROWS-1||c===0||c===COLS-1)?1:0;
    if(board[idx(r,c)]===player) mE+=e;
    if(board[idx(r,c)]===opp) oE+=e;
  }
  const edgePenalty=-(mE-oE)/Math.max(my,1);

  function cluster(p:number){
    let s=0;
    for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++)
      if(board[idx(r,c)]===p) for(const[nr,nc] of neighbors(r,c)) if(board[idx(nr,nc)]===p) s++;
    return s;
  }
  const grouping=(cluster(player)-cluster(opp))/10;

  let adv=0;
  const tR=player===2?4:0;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++)
    if(board[idx(r,c)]===player) adv+=(ROWS-1-Math.abs(r-tR))/(ROWS-1);
  const kingRow=adv/Math.max(my,1)-0.5;

  let adv2=0;
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(board[idx(r,c)]===player) adv2+=(player===2?r:ROWS-1-r);
    if(board[idx(r,c)]===opp) adv2-=(opp===2?r:ROWS-1-r);
  }
  const advancement=adv2/(ROWS*Math.max(my,1));
  const pieceDensity=my/tot-0.5;

  let vuln=0; generateMoves(board,opp).forEach(m=>vuln+=m.caps.length);
  const vulnerability=-vuln/Math.max(my,1);
  const tempo=hasAnyCapture(board,player)?1:hasAnyCapture(board,opp)?-1:0;

  return [materialAdv,centerControl,mobility,captureThreats,conn,
          edgePenalty,grouping,kingRow,advancement,pieceDensity,vulnerability,tempo];
}

export function neuralEval(board:number[], player:number){
  const f=extractFeatures(board,player);
  const h=W1.map((w,j)=>Math.max(0,w.reduce((s:number,wi:number,i:number)=>s+wi*f[i],B1[j])));
  const out=W2.reduce((s:number,w:number,j:number)=>s+w*h[j],0);
  return Math.tanh(out/5)*100;
}

// ══════════════════════════════════════════════════════════════════════════════
// MINIMAX + ALPHA-BETA (Théorie des Graphes — arbre de jeu)
// ══════════════════════════════════════════════════════════════════════════════
export const TT=new Map<string,number>();

export function minimax(board:number[],depth:number,alpha:number,beta:number,maximizing:boolean,aiP:number,multiState:MultiState|null=null):number{
  const humP=aiP===2?1:2, currP=maximizing?aiP:humP;
  if(count(board,aiP)===0) return -1000+depth;
  if(count(board,humP)===0) return 1000-depth;
  if(depth===0) return neuralEval(board,aiP);

  const key=board.join('')+depth+maximizing+(multiState?'M'+multiState.movedPiece:'');
  if(TT.has(key)) return TT.get(key) as number;

  const moves=generateMoves(board,currP,multiState);
  if(!moves.length){ const v=maximizing?-900:900; TT.set(key,v); return v; }
  moves.sort((a,b)=>b.caps.length-a.caps.length);

  let best=maximizing?-Infinity:Infinity;
  for(const m of moves){
    const vis=multiState?[...multiState.visitedCells,[m.toR,m.toC] as [number,number]]:[[m.fromR,m.fromC],[m.toR,m.toC]] as [number,number][];
    let val:number;
    if(m.caps.length>0){
      const nm:MultiState={movedPiece:[m.toR,m.toC],visitedCells:vis,board:m.board};
      const cont=generateMoves(m.board,currP,nm);
      val=cont.length>0
        ? minimax(m.board,depth,alpha,beta,maximizing,aiP,nm)
        : minimax(m.board,depth-1,alpha,beta,!maximizing,aiP,null);
    } else {
      val=minimax(m.board,depth-1,alpha,beta,!maximizing,aiP,null);
    }
    if(maximizing){ best=Math.max(best,val); alpha=Math.max(alpha,val); }
    else { best=Math.min(best,val); beta=Math.min(beta,val); }
    if(beta<=alpha) break;
  }
  TT.set(key,best);
  return best;
}

export function getBestMove(board:number[],aiP:number,difficulty:string): Move|null {
  TT.clear();
  const depth:Record<string,number>={easy:1,medium:2,hard:3};
  const d = depth[difficulty] ?? 2;
  const moves=generateMoves(board,aiP);
  if(!moves.length) return null;
  if(difficulty==='easy'&&Math.random()<0.45) return moves[Math.floor(Math.random()*moves.length)];
  const sorted=[...moves].sort((a,b)=>b.caps.length-a.caps.length);
  let bestVal=-Infinity, bestMove:Move|null=null;
  for(const m of sorted){
    const v=minimax(m.board,d-1,-Infinity,Infinity,false,aiP,null);
    if(v>bestVal){ bestVal=v; bestMove=m; }
  }
  return bestMove;
}
