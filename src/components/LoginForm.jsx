import React, { useState } from "react";
import { loginEmail, registerEmail } from "../services/supabase";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [pass,  setPass]  = useState("");
  const [msg,   setMsg]   = useState("");

  async function doLogin() {
    setMsg("");
    try {
      await loginEmail(email, pass);
      setMsg("Listo. Entrando…");
    } catch (e) {
      setMsg(e?.message || "No se pudo iniciar sesión.");
    }
  }

  async function doRegister() {
    setMsg("");
    try {
      const data = await registerEmail(email, pass);
      if (data?.session) {
        setMsg("Cuenta creada. Entrando…");
      } else {
        setMsg("Cuenta creada. Revisa tu email para confirmar el acceso.");
      }
    } catch (e) {
      setMsg(e?.message || "No se pudo registrar la cuenta.");
    }
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
