import React, { useState } from "react";
import { loginEmail, registerEmail } from "../services/firebase";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [msg,   setMsg]   = useState("");

  async function doLogin() {
    try { await loginEmail(email, pass); setMsg("Listo. Entrando…"); }
    catch (e) { setMsg(e.message); }
  }
  async function doRegister() {
    try { await registerEmail(email, pass); setMsg("Cuenta creada. Entrando…"); }
    catch (e) { setMsg(e.message); }
  }

  return (
    <div style={{minHeight:"100vh", display:"grid", placeItems:"center", background:"#faf7ef"}}>
      <div style={{width:360, padding:20, borderRadius:16, background:"#fff", boxShadow:"0 6px 30px rgba(0,0,0,.08)"}}>
        <h2 style={{marginTop:0}}>Ingresá a Lingua Avventura</h2>
        <div style={{display:"grid", gap:8}}>
          <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
          <input placeholder="Contraseña" type="password" value={pass} onChange={e=>setPass(e.target.value)} />
          <div style={{display:"flex", gap:8}}>
            <button onClick={doLogin}>Entrar</button>
            <button onClick={doRegister}>Registrar</button>
          </div>
          {msg && <div style={{color:"#b00"}}>{msg}</div>}
        </div>
      </div>
    </div>
  );
}
