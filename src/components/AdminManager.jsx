import React, { useEffect, useState } from 'react';
import Card from './Card';
import Button from './Button';
import Chip from './Chip';
import { listAdmins, addAdminEmail, removeAdminEmail } from '../services/supabase';

export default function AdminManager() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [removing, setRemoving] = useState(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const data = await listAdmins();
      setAdmins(data);
    } catch (e) {
      setError(e.message || 'Error cargando admins');
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); }, []);

  async function onAdd(e){
    e.preventDefault();
    setInfo(null); setError(null);
    const email = newEmail.trim().toLowerCase();
    if(!email){ setError('Email requerido'); return; }
    if(!/^[^@]+@[^@]+\.[^@]+$/.test(email)){ setError('Formato inválido'); return; }
    setAdding(true);
    try {
      await addAdminEmail(email);
      setInfo('Admin añadido');
      setNewEmail('');
      load();
    } catch(e){ setError(e.message); }
    finally { setAdding(false); }
  }

  async function onRemove(email){
    if(!window.confirm(`Quitar admin: ${email}?`)) return;
    setRemoving(email); setError(null); setInfo(null);
    try {
      await removeAdminEmail(email);
      setInfo('Admin eliminado');
      load();
    } catch(e){ setError(e.message); }
    finally { setRemoving(null); }
  }

  return (
    <div className="space-y-6">
      <Card title="Administradores" subtitle="Gestión de acceso a packs">
        {loading && <p className="text-sm opacity-70">Cargando…</p>}
        {!loading && admins.length === 0 && <p className="text-sm opacity-70">Sin admins registrados todavía.</p>}
        {!loading && admins.length > 0 && (
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-700 text-sm">
            {admins.map(a => (
              <li key={a.user_id || a.email} className="flex items-center justify-between py-2">
                <span className="font-mono text-xs">{a.email || a.user_id}</span>
                <div className="flex items-center gap-2">
                  {!a.user_id && <Chip>pendiente login</Chip>}
                  <Button variant="outline" size="sm" disabled={removing===a.email} onClick={()=>onRemove(a.email)}>
                    {removing===a.email ? 'Quitando…' : 'Quitar'}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={onAdd} className="mt-4 flex flex-col md:flex-row gap-3 md:items-end">
          <label className="flex flex-col text-xs gap-1">
            Email nuevo admin
            <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="usuario@dominio.com" className="px-3 py-2 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800" />
          </label>
          <Button type="submit" disabled={adding}>{adding ? 'Añadiendo…' : 'Añadir'}</Button>
          <Button type="button" variant="outline" onClick={load}>Refrescar</Button>
        </form>
        {error && <p className="text-xs text-red-600 dark:text-red-400 mt-2">{error}</p>}
        {info && <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2">{info}</p>}
        <p className="text-[11px] mt-4 opacity-70 leading-relaxed">Un admin agregado por email podrá crear/migrar/renombrar packs incluso antes de su primer login (aparecerá como <em>pendiente login</em> hasta que ingrese y se asocie su <code>user_id</code>). Asegura que tus políticas RLS de vocab_words usan la función <code>is_admin()</code>.</p>
      </Card>
    </div>
  );
}
