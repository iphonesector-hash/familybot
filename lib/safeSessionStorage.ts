export function sessionGet(key:string){try{return window.sessionStorage.getItem(key)}catch{return null}}
export function sessionSet(key:string,value:string){try{window.sessionStorage.setItem(key,value);return true}catch{return false}}
export function sessionRemove(key:string){try{window.sessionStorage.removeItem(key);return true}catch{return false}}
