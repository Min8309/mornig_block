import AsyncStorage from '@react-native-async-storage/async-storage';
import {alarmKey,MorningCall,validateCall} from './alarm-model';
export async function saveCall(call:MorningCall,_routineName:string){validateCall(call);await AsyncStorage.setItem(alarmKey,JSON.stringify(call));}
export async function testCall(_sound:boolean){throw new Error('실제 모닝콜 테스트는 iOS·Android 앱에서 가능해요. 웹은 설정 미리보기만 제공해요.');}
export function listenForCall(_fn:(routineId:string)=>void){return()=>{};}
