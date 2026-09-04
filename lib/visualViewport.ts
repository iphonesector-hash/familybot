export function keyboardInset(layoutHeight:number,visualHeight:number){
  return Math.max(0,Math.round(layoutHeight-visualHeight));
}

export function keyboardOpen(inset:number,offsetTop=0){
  return inset>80||offsetTop>24;
}

export function visualCssVars(input:{innerHeight:number;visualHeight:number;offsetTop:number}){
  const inset=keyboardInset(input.innerHeight,input.visualHeight);
  return {
    "--visual-vh":`${Math.round(input.visualHeight)}px`,
    "--keyboard-inset":`${inset}px`,
    "--vv-offset-top":`${Math.round(input.offsetTop||0)}px`,
    open:keyboardOpen(inset,input.offsetTop)
  };
}
