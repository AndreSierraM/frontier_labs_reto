# 🎬 Guion de Voz en Off — La Caja Negra

> **Video:** `out/demo-final-v8.mp4` · 1920×1080 @ 30fps · **93.5 s**
> **10 escenas** con transiciones · **logos reales** (Node, PostgreSQL, Neon, Vercel, GitHub Actions)
> **Syntax highlighting** real en la escena de código

Timestamps con el solape de transiciones (0.5 s c/u).

---

## ESCENA 1 · Intro — `0:00 → 0:06`

**Visual:** Título gigante "La Caja Negra", logo, 3 tags.

**Voz:**
> "La Caja Negra. Reto 2 de Frontier Labs. Un reemplazo HTTP compatible, modelado como máquina de estados pura, con vigilancia autónoma y un enjambre de agentes que se adapta solo."

---

## ESCENA 2 · El Problema — `0:05.5 → 0:14.5`

**Visual:** Dos cards + 3 métricas + terminal con `curl`.

**Voz:**
> "El problema: un servicio HTTP cuya especificación solo existe en sus respuestas. No hay código, no hay documentación. Cada petición es una hipótesis. Hicimos trescientas sesenta y seis observaciones para descifrar su comportamiento."

---

## ESCENA 3 · Arquitectura — `0:14 → 0:24`

**Visual:** Diagrama por 3 capas con logos reales:
- **Capa 1 · Plataforma:** Cliente → Vercel → Node (domain.js) → Neon PostgreSQL
- **Capa 2 · Vigilancia:** Laboratorio → Monitor (31 puntos) → GitHub Actions
- **Capa 3 · Adaptación:** Enjambre (5 roles → 1 PR)

**Voz:**
> "La arquitectura se organiza en tres capas. La plataforma de servicio: el cliente entra por el API en Vercel, el mensaje llega a domain.js, que es un motor de estados en Node puro, y el estado persiste en Neon, PostgreSQL, como JSONB con select for update. La segunda capa es la vigilancia: el monitor prueba el original en el laboratorio y GitHub Actions corre cada quince minutos. Y la tercera capa es la adaptación: el enjambre de agentes que investiga, parchea y abre un pull request."

**Tono:** Señalando cada capa. Pausa al cambiar de capa.

---

## ESCENA 4 · El Código — `0:23.5 → 0:36.5` ⭐

**Visual:** `processMessage` con **syntax highlighting real** (keywords púrpura, strings verde, números naranja) y stepper de 4 fases con mini-diagrama de guardas.

**Voz (sigue el stepper):**
> "Miremos el código. `processMessage` recibe el estado y el mensaje.
>
> **Uno:** separamos el cuerpo y el dígito de control con el último punto y coma.
>
> **Dos:** guardas de forma. Un segmento vacío devuelve E104; el comando se normaliza a mayúsculas.
>
> **Tres:** verificamos el control con ISO 7064 módulo noventa y siete, menos diez, el algoritmo del IBAN. Formato inválido, E201; cálculo distinto, E202.
>
> **Cuatro:** despachamos por comando. Cada rama valida aridad, montos y cuentas, y muta el estado. Un depósito reinicia el contador de fallos; un transfer que supera cien mil incrementa fallos y devuelve E506."

---

## ESCENA 5 · Monitor — `0:36 → 0:47`

**Visual:** Terminal de la batería + captura real del dashboard + badges.

**Voz:**
> "El monitor corre cada quince minutos en GitHub Actions. Ejecuta la batería de treinta y un puntos contra el original, compara el snapshot con el anterior usando SHA-256 y, si el hash cambia, dispara el enjambre. Los resultados viven en Neon como JSONB. El cuatrocientos veintinueve de infraestructura se ignora: no es comportamiento del servicio."

---

## ESCENA 6 · Enjambre de Agentes — `0:46.5 → 0:58.5`

**Visual:** Pipeline de 5 roles con logos + terminal de logs.

**Voz:**
> "Cuando hay un cambio, entran los agentes. Los scouts investigan en paralelo. El analista diagnostica y decide: parche sí o no. El fixer escribe el código, el test y actualiza el SPEC. El verificador arranca el reemplazo local y exige cero divergencias contra el snapshot: si el fixer alucina, lo rechaza. Y el reporter abre el pull request. El enjambre abre PR, nunca mergea."

---

## ESCENA 7 · Flujo Completo — `0:58 → 1:08` ⭐ (rediseñada)

**Visual:** Pipeline numerado de **12 pasos** en 3 fases, con números, logos, flechas rectas y conectores etiquetados ("si cambió", "0 divergencias").

**Voz:**
> "El pipeline completo tiene doce pasos. Vigilancia: el cron dispara el monitor, corre la batería, guarda el snapshot y compara el hash. Si cambió, se pasa a investigación: los scouts exploran, el analista diagnostica, el fixer parchea y el verificador confirma cero divergencias. Y si todo pasa, la entrega: el reporter redacta el PR, se abre el pull request y el merge despliega en producción."

**Tono:** Rítmico, siguiendo los números en pantalla.

---

## ESCENA 8 · Evidencia — `1:07.5 → 1:17.5`

**Visual:** Capturas reales rotando (Diseño, Arquitectura, Entregables) en marcos de navegador.

**Voz:**
> "Y todo queda documentado. El diseño de sistemas con decisiones y trade-offs. El diagrama de arquitectura con la topología desplegada. Y el índice que enlaza SPEC, bitácora y el log de experimentos."

---

## ESCENA 9 · Resultados — `1:17 → 1:27`

**Visual:** Cuatro métricas grandes + terminal de tests + stack.

**Voz:**
> "Los números finales. Veintiún tests unitarios. Ciento dieciséis validaciones de extremo a extremo. Trescientas sesenta y seis observaciones documentadas. Y cero divergencias. Node, PostgreSQL, Vercel, GitHub Actions y modelos vía OpenRouter."

---

## ESCENA 10 · Cierre — `1:26.5 → 1:33.5`

**Visual:** Logo, título, links.

**Voz:**
> "La Caja Negra. En GitHub y desplegada en Vercel. Máquina de estados, vigilancia autónoma, enjambre de agentes."

---

## 💡 Tips de grabación

1. **Escena 3 (arquitectura):** pausa entre cada capa ("plataforma… vigilancia… adaptación").
2. **Escena 4 (código):** el corazón técnico. Habla lento y deja que el highlight avance.
3. **Escena 7 (flujo):** sigue los números 1..12, sube el ritmo.
4. **Pausas técnicas:** antes/después de "ISO 7064", "SHA-256", "JSONB", "E506".

---

## 🛠️ Comandos

```bash
cd demo-video

./node_modules/.bin/remotion studio src/index.ts --no-open
./node_modules/.bin/remotion render src/index.ts la-caja-negra-demo out/demo-final-v8.mp4 --codec=h264
./node_modules/.bin/remotion render src/index.ts 07-flujo out/flujo.mp4
```

## 📁 Assets

- `public/logos/*.svg` — logos oficiales (Node, PostgreSQL, Neon, Vercel, GH Actions, GitHub, OpenRouter)
- `public/captures/*.png` — capturas reales del sistema
- `src/TechLogos.tsx` — componente `TechLogo` + `LogoNode`
- `src/CodeHighlight.tsx` — tokenizer JS con colores reales