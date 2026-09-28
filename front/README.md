# CRMIA · Frontend

CRM Inmobiliario Inteligente. React 19 + Vite 7 + TypeScript + Tailwind 4
(CSS-first, sin `tailwind.config.js`). Estética glassmorphism y UI 100 % en español.

## Puesta en marcha

```bash
npm install
npm run dev      # http://localhost:5173 (proxy /api -> http://localhost:3000)
npm run build    # tsc -b && vite build
npm run preview
npm run typecheck  # tsc -b --noEmit
npm run lint       # eslint .
```

## Estructura

```
src/
  components/     Componentes base reutilizables (Button, Input, Table, Modal,
                  ConfirmDialog, Pagination, FilterBar, KanbanBoard, TagInput,
                  Navbar, Sidebar, StubView, Logo)
  config/         global.ts (APP_CONFIG), i18n.config.ts, routePrivileges.ts
  context/        AuthContext, SidebarContext, ModalZIndexContext
  enums/          Privileges
  helpers/        errorHandler, successHandler, formatters, privilegesNormalizer
  hooks/          useFetch, useMutation, usePrivileges, useLogin
  layouts/        MainLayout (Navbar + Sidebar + contenido)
  requests/       axios.config.ts (header `token`, logout en 401) y por dominio
  routes/         AppRoutes.tsx, PrivilegedRoute.tsx
  translations/   es (commons, login, flags)
  types/          api.types.ts (ItFindAllResponse, ItResponse)
  validations/    auth.validations.ts
  views/          Una carpeta por dominio: dashboard, clients, properties,
                  contracts, documents, billing, assistant, auth
```

## Convenciones

- Cada dominio vive en `src/views/<dominio>/` y, si necesita llamadas propias,
  en `src/requests/<dominio>/`. Todo lo que no comparta con otro dominio se
  queda dentro de esa carpeta.
- `src/routes/AppRoutes.tsx` y `src/components/Sidebar.tsx` son los dos puntos
  compartidos: una pantalla nueva se registra en ambos y en `routePrivileges.ts`
  con el mismo privilegio que exige su endpoint en el backend.
- El nombre del componente exportado por cada vista es estable
  (`DashboardView`, `ClientsView`, `PropertiesView`, `ContractsView`,
  `DocumentsView`, `InvoicesView`, `AssistantView`).

## Rutas

| Ruta           | Vista                                  |
| -------------- | -------------------------------------- |
| `/login`       | `views/auth/LoginView.tsx`             |
| `/dashboard`   | `views/dashboard/DashboardView.tsx`    |
| `/clientes`    | `views/clients/ClientsView.tsx`        |
| `/propiedades` | `views/properties/PropertiesView.tsx`  |
| `/contratos`   | `views/contracts/ContractsView.tsx`    |
| `/documentos`  | `views/documents/DocumentsView.tsx`    |
| `/facturas`    | `views/billing/InvoicesView.tsx`       |
| `/asistente`   | `views/assistant/AssistantView.tsx`    |

El botón de micrófono de la barra superior navega a `/asistente`.

## Backend

El contrato de respuesta es `{ message, flag, data }` y la paginación
`{ data, metadata: { records, frame, frameSize, lastFrame } }`
(`src/types/api.types.ts`). El token se envía en la cabecera `token`; un 401
dispara el evento `auth:logout` que cierra la sesión.
