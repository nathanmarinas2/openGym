# LiftNex en Cloudflare Workers + D1

Esta es la versión pública recomendada de LiftNex. El mismo Worker sirve la
web y la API, mientras D1 guarda usuarios, sesiones y datos; de esta forma la
sesión funciona en móviles sin depender de cookies entre dominios. El backend
Docker sigue funcionando para instalaciones locales.

El plan gratuito de D1 es suficiente para empezar: 500 MB por base de datos,
5 millones de filas leídas al día y 100.000 filas escritas al día. Esos límites
son de uso y cuota, no borran los datos; si se agotan, las consultas fallan
hasta que se restablece la cuota diaria.

## Despliegue manual

Necesitas una cuenta de Cloudflare. Desde PowerShell:

```powershell
cd cloudflare
npm exec wrangler login
npm exec wrangler d1 create liftnex
```

Copia el `database_id` que devuelve el comando en `wrangler.toml`, sustituyendo
`REPLACE_WITH_D1_DATABASE_ID`. Después compila la web, aplica el esquema y
despliega:

```powershell
npm --prefix ../frontend ci --no-audit --no-fund
$env:VITE_DEMO = "0"
$env:VITE_API_ORIGIN = ""
npm --prefix ../frontend run build
npm exec wrangler d1 migrations apply liftnex --remote
npm exec wrangler secret put GEMINI_API_KEY
npm exec wrangler deploy
```

La URL resultante será parecida a y servirá tanto la web como la API:

```text
https://liftnex-api.<tu-subdominio>.workers.dev
```

Comprueba la API así:

```powershell
Invoke-RestMethod "https://liftnex-api.<tu-subdominio>.workers.dev/api/health"
```

Debe devolver `ok: true` y `provider: cloudflare-d1`.

Abre la aplicación directamente en la raíz del Worker:

```text
https://liftnex-api.<tu-subdominio>.workers.dev/#/home
```

## Opcional: mantener GitHub Pages

También puedes seguir usando la URL de GitHub Pages como frontend separado.
En ese caso crea la variable de repositorio `LIFTNEX_API_ORIGIN` con la URL
HTTPS del Worker, sin `/` al final, y ejecuta el workflow `Deploy LiftNex web`.
El workflow compilará el frontend con cuentas reales en vez de modo demo.

Para una instalación nueva se recomienda usar la URL del Worker como URL
principal, porque web y API quedan en el mismo origen.

## Variables opcionales

```text
GEMINI_API_KEY       # secreto de Worker, nunca en el frontend
GEMINI_MODEL         # por defecto gemini-3.5-flash-lite
USDA_API_KEY         # opcional
ADMIN_UIDS           # IDs separados por comas
ADMIN_USERNAMES      # nombres de usuario separados por comas
INVITE_ONLY=0        # 1 para exigir invitaciones
```

## Qué se conserva

- Registro e inicio de sesión con usuario y contraseña.
- Sesiones HttpOnly y cookies seguras en el mismo origen.
- Estado completo por usuario y sincronización con control de conflictos.
- Nutrición Open Food Facts con caché D1 persistente y fallback de dominios.
- USDA opcional, coach Gemini, exportación JSON/CSV y tokens personales.
- Pasos, descansos, entrenamientos, peso, recetas, agua y demás datos porque
  forman parte del estado sincronizado de LiftNex.

Las notificaciones locales del móvil siguen funcionando. El envío Web Push
remoto queda desactivado en esta primera versión de Workers; no afecta al
temporizador local ni a la barra de notificaciones del dispositivo.

El workflow de GitHub Actions comprueba primero los secretos y el
`database_id`. Hasta que estén configurados, omite el despliegue con un aviso
en lugar de producir un fallo engañoso.

## Importante

La base D1 comienza vacía. Los datos de `data/db.json` y los ficheros de estado
locales no se suben automáticamente ni se incluyen en Git. Si quieres migrar
una cuenta local existente, haz una copia privada antes de preparar una
importación explícita.
