(async ()=>{
  try{
    const res = await fetch('http://localhost:3001/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:'test+local@aaspass.test',password:'Password123!',role:'student'})});
    const text = await res.text();
    console.log('STATUS',res.status);
    console.log(text);
  }catch(e){
    console.error(e);
  }
})();
