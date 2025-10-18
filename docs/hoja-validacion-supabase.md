# Hoja de validación de conexión con Supabase

Esta hoja sirve como guía para comprobar paso a paso la configuración necesaria
para que la aplicación pueda comunicarse correctamente con Supabase. Cada
validación deja constancia en un registro JSON generado automáticamente por el
script `npm run validate:supabase`.

## Pasos sugeridos

| Paso | Descripción | Resultado manual | Notas |
| --- | --- | --- | --- |
| 1 | Ejecutar `npm run validate:supabase` para generar un log con los valores detectados y el estado de la conectividad. | ✅ / ⚠️ / ❌ | Revisa el archivo creado en `logs/` para más detalles. |
| 2 | Confirmar que `VITE_SUPABASE_URL` coincide con la URL del proyecto en Supabase (Settings → API → Project URL). | ✅ / ⚠️ / ❌ | La URL debe comenzar con `https://` y terminar en `.supabase.co`. |
| 3 | Confirmar que `VITE_SUPABASE_ANON_KEY` corresponde a la clave pública (anon). | ✅ / ⚠️ / ❌ | Copiar la clave desde Supabase (Settings → API → Project API keys). |
| 4 | Verificar conectividad manual con `curl "${VITE_SUPABASE_URL}/auth/v1/health" -H "apikey: ${VITE_SUPABASE_ANON_KEY}"`. | ✅ / ⚠️ / ❌ | Esperar un código 200 en la respuesta. |
| 5 | Revisar la tabla configurada (`VITE_SUPABASE_PROGRESS_TABLE` o `user_progress` por defecto). | ✅ / ⚠️ / ❌ | Debe existir en la base de datos o actualizar la variable para apuntar a la tabla correcta. |

## Registro de resultados

Los logs se almacenan en `logs/supabase-validation-<timestamp>.json` con el
detalle de cada paso ejecutado automáticamente por el script. Se recomienda
adjuntar el archivo correspondiente al reportar incidencias para acelerar el
diagnóstico del equipo técnico.

