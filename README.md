# 🏢 Megumin Estate AI — Frontend Dashboard

![Next.js](https://img.shields.io/badge/Next.js-16.2-8B5CF6?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-06B6D4?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-A855F7?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-0EA5E9?style=flat-square&logo=tailwindcss&logoColor=white)
![UploadThing](https://img.shields.io/badge/UploadThing-7.7-D946EF?style=flat-square&logoColor=white)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-EC4899?style=flat-square&logo=vercel&logoColor=white)
![License](https://img.shields.io/badge/license-Private-64748B?style=flat-square)

Dashboard profesional para la gestión de contratos inmobiliarios con IA integrada. Este repositorio corresponde exclusivamente al **frontend** de la plataforma Megumin Estate AI — una solución SaaS PropTech que automatiza el procesamiento, análisis y almacenamiento de contratos de arrendamiento mediante inteligencia artificial.

---

## 📋 Descripción

Megumin Estate AI permite a los agentes inmobiliarios de Rikka Solutions centralizar su operación desde un único panel de control: cargar contratos en PDF para que sean procesados automáticamente por IA, consultar métricas clave en tiempo real, gestionar archivos asociados a cada contrato, y conversar con un asistente de IA especializado en el portafolio.

El frontend actúa como cliente HTTP puro hacia un backend independiente en FastAPI. No existe lógica de negocio en este repositorio; toda la extracción de datos, análisis y persistencia ocurre en el servicio externo.

---

### 🌐 Arquitectura Separada (Microservicios)
Este repositorio contiene únicamente el **Dashboard (Frontend)** construido con Next.js. 

⚙️ **[Haz clic aquí para ver el repositorio del Backend en FastAPI](https://github.com/Diego-Roman/Megumin-estate-ai)**

---

### 🎥 Demostración del Sistema
> **Nota de Seguridad:** Para proteger las cuotas y claves de la API de Inteligencia Artificial (Open Router), el entorno de producción se mantiene privado. 
> 
> Puedes ver el flujo completo de la plataforma, desde la carga del PDF hasta la extracción de datos, en el siguiente video:
> 
> **[👉 Ver Video Demostrativo de Megumin Estate AI](#)**

---

## 🛠️ Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.6 |
| UI Library | React | 19 |
| Lenguaje | TypeScript | 5 |
| Estilos | Tailwind CSS | 4 (CSS-first) |
| Animaciones | Framer Motion | 12 |
| Iconografía | Lucide React | 1.16 |
| **☁️ Almacenamiento de archivos** | **UploadThing** | **7.7** |
| Generación de PDF | pdfmake | 0.3.9 |
| Despliegue | Vercel | — |

---

## 📁 Estructura del proyecto

```
megumin-frontend/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/
│   │   │   └── uploadthing/          # API Routes para subida y borrado de archivos
│   │   │       ├── core.ts           # Configuración del router de UploadThing
│   │   │       ├── route.ts          # Handler GET/POST para el endpoint de upload
│   │   │       └── delete/
│   │   │           └── route.ts      # Handler DELETE para eliminar archivos via UTApi
│   │   ├── globals.css               # Tokens de diseño globales (Tailwind v4 @theme)
│   │   ├── layout.tsx                # Layout raíz — fuentes, metadata
│   │   └── page.tsx                  # Página principal: Dashboard, KPIs, tabla, DropZone
│   │
│   ├── components/                   # Componentes React reutilizables
│   │   ├── DashboardLayout.tsx       # Shell de la aplicación: sidebar + área de contenido
│   │   ├── AiChat.tsx                # Interfaz de chat con el asistente IA + exportación PDF
│   │   ├── FilesView.tsx             # Gestión de archivos PDF por contrato (UploadThing)
│   │   ├── SettingsView.tsx          # Panel de configuración y perfil de agente
│   │   └── ConfirmDeleteModal.tsx    # Modal de confirmación reutilizable para borrados
│   │
│   ├── types/
│   │   └── pdfmake.d.ts              # Declaraciones de tipos para pdfmake (sin typings oficiales)
│   │
│   └── utils/
│       └── uploadthing.ts            # Componentes tipados generados por UploadThing
│
├── public/                           # Assets estáticos servidos por Next.js
├── .env.local                        # Variables de entorno locales (no versionar)
├── next.config.ts                    # Configuración de Next.js
├── postcss.config.mjs                # PostCSS + Tailwind v4
└── tsconfig.json                     # Configuración de TypeScript
```

---

## 🔌 Integración con el Backend

Este frontend se comunica exclusivamente con la API REST del backend FastAPI desplegado en Render:

```
https://megumin-estate-ai.onrender.com
```

### Endpoints consumidos

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/contracts` | Obtiene la lista completa de contratos activos |
| `POST` | `/upload-contract` | Envía un PDF para procesamiento con IA |
| `DELETE` | `/contracts/:id` | Elimina un contrato por ID |
| `PATCH` | `/contracts/:id/archivo` | Asocia o desvincula un PDF almacenado en UploadThing |
| `POST` | `/chat` | Envía un mensaje al asistente IA y recibe respuesta |

La comunicación es HTTP estándar (`fetch`). No se usa ningún cliente generado ni SDK del backend.

---

## 🔐 Variables de entorno

Crea un archivo `.env.local` en la raíz con las siguientes variables:

```env
# UploadThing — gestión de archivos PDF
UPLOADTHING_TOKEN=tu_token_aqui
```

> 💡 El token se obtiene en el dashboard de [uploadthing.com](https://uploadthing.com) bajo tu aplicación.

---

## 🚀 Instalación y desarrollo local

**Requisitos previos:** Node.js ≥ 20, npm ≥ 10.

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/megumin-frontend.git
cd megumin-frontend

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Edita .env.local con tu UPLOADTHING_TOKEN

# 4. Iniciar el servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`. 🎉

### ⚡ Scripts disponibles

```bash
npm run dev      # Servidor de desarrollo con HMR
npm run build    # Build de producción
npm run start    # Servidor de producción (requiere build previo)
npm run lint     # Análisis estático con ESLint
```

---

## ☁️ Despliegue en Vercel

Este proyecto está configurado para desplegarse automáticamente en Vercel con zero-config:

1. Conectar el repositorio en [vercel.com](https://vercel.com)
2. Añadir las variables de entorno en el dashboard de Vercel
3. Cada push a `main` dispara un deploy automático 🔄

---

## ✅ Funcionalidades implementadas

- 📊 **Dashboard de contratos** — tabla en vivo con KPIs dinámicos (contratos activos, canon mensual total, vencimientos próximos)
- 📤 **Carga de contratos** — DropZone nativo con animaciones Framer Motion + modal alternativo; procesamiento vía IA en el backend
- 📂 **Gestión de archivos** — subida de PDFs a UploadThing con vinculación por contrato, visualización y borrado
- 🤖 **Asistente IA** — chat en tiempo real con el backend, historial persistido en `localStorage`, exportación de respuestas a PDF vectorial (pdfmake)
- ⚙️ **Panel de ajustes** — perfil editable, preferencias y gestión de sesión

---

## 🏗️ Arquitectura de decisiones

### ☁️ Flujo de subida de PDFs con UploadThing

La gestión de archivos sigue un flujo desacoplado en dos etapas que evita enviar binarios al backend FastAPI:

```
📄 Usuario selecciona PDF
        │
        ▼
☁️ UploadThing (CDN)  ←── El frontend sube directamente el PDF
        │
        │  retorna { url: "https://ufs.sh/f/..." }
        ▼
🔗 PATCH /contracts/:id/archivo  ←── El frontend envía solo la URL al backend FastAPI
        │
        ▼
🗄️ Backend persiste { pdf_url: "https://..." } en la base de datos
```

1. El componente `FilesView` usa el hook `UploadDropzone` de UploadThing para subir el PDF directamente al CDN desde el navegador, sin pasar por el servidor de Next.js ni por el backend.
2. UploadThing devuelve la URL pública del archivo (`res[0].url`) en el callback `onClientUploadComplete`.
3. El frontend realiza entonces un `PATCH` al backend FastAPI con `{ pdf_url: url }`, asociando el archivo al contrato correspondiente.
4. Para borrado, el frontend llama a la API Route interna `/api/uploadthing/delete` que ejecuta `UTApi.deleteFiles()`, y luego envía un segundo `PATCH` con `{ pdf_url: null }` para desvincular el archivo del registro en el backend.

Este diseño mantiene los binarios fuera del backend FastAPI, reduce la latencia de carga y delega el almacenamiento a una infraestructura especializada.

### 🧩 Otras decisiones

- **Next.js App Router** sobre Pages Router por colocation de layouts, Server Components y API Routes nativas
- **Tailwind v4 CSS-first** sin `tailwind.config.ts`; tokens de diseño declarados en `@theme` dentro de `globals.css`
- **pdfmake** sobre html2pdf/jsPDF por generación de texto vectorial seleccionable y control programático de saltos de página

---

*🏢 Megumin Estate AI — Rikka Solutions · Frontend Repository*
