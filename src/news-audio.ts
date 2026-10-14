import * as Speech from 'expo-speech';
import {briefing,NewsFeed} from './news';
export function readNews(feed:NewsFeed,minutes:number,onComplete:()=>void,onError:(message:string)=>void){let cancelled=false;Speech.stop();Speech.speak(briefing(feed,minutes),{language:'ko-KR',rate:0.88,onDone:()=>{if(!cancelled)onComplete()},onStopped:()=>{if(!cancelled)onComplete()},onError:()=>{if(!cancelled)onError('뉴스 음성을 재생하지 못했어요. 기기의 한국어 음성 설정과 볼륨을 확인해 주세요.')}});return()=>{cancelled=true;Speech.stop()};}
