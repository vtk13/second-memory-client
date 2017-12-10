function postpone(f){
    return new Promise(resolve=>{
        setTimeout(()=>resolve(f()), 0);
    });
}

export {postpone}
