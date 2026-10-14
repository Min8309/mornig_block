export const dialModes=['스트레칭','뉴스','영어','명상'] as const;
export type DialMode=typeof dialModes[number];
export const modeIndex=(angle:number)=>((Math.round(-angle/90)%4)+4)%4;
export const shortestDelta=(from:number,to:number)=>((to-from+540)%360)-180;
export const snapAngle=(angle:number)=>Math.round(angle/90)*90;
export function angleForIndex(angle:number,index:number){const target=-index*90;return target+Math.round((angle-target)/360)*360;}
