# Feature Blueprint: Championship Records & Routing Refactor

## 1. Objetivo General
Refactorizar la sección de campeonatos para dividirla en dos sub-rutas accesibles mediante pestañas (tabs), replicando el comportamiento visual y de carga de la página `/records`.
- `/championships/championship-reigns`: Mantendrá el historial clásico que ya existía.
- `/championships/championship-records`: Contendrá la nueva lógica del **Grand Slam Championship** y **Triple Crown Championship**.

## 2. Arquitectura de Rutas y UX (Estilo /records)
Antigravity debe crear un archivo base de enrutamiento (ej. `pages/championships/index.js` o ajustar el layout principal de la sección) que contenga:
*   Un menú de navegación con dos pestañas: "Championship Reigns" y "Championship Records".
*   Un detector de eventos del enrutador (`router.events.on('routeChangeStart')` y `routeChangeComplete`) para gestionar un estado de `loading`.
*   Mientras se carga la ruta dinámica (que procesa consultas SQL pesadas), se debe mostrar visualmente un componente de Spinner o indicador de carga para dar feedback al usuario, exactamente igual que en `/records`[cite: 5].

## 3. Contexto de Base de Datos y Lógica Tag Team (¡CRUCIAL!)
El esquema de TiDB tiene la siguiente estructura para evaluar los logros:
*   **Tabla `championships`:** Columna `type` (`main`, `mid`, `tag`).
*   **Tabla `championship_titles`:** Diseños históricos cruzando fechas (`start_date` a `end_date` o nulo).
*   **Tabla `reign_members`:** **MUY IMPORTANTE.** Para contar los títulos `tag` (y en general, cualquier título ganado por un luchador individual o en equipo), la consulta SQL **NO DEBE** limitarse a buscar el `wrestler_id` en `championship_reigns`. Los miembros individuales de un Tag Team campeón se encuentran en la tabla `reign_members` vinculando `reign_members.reign_id = championship_reigns.id` y `reign_members.wrestler_id = wrestlers.id`[cite: 8]. La API debe unificar los títulos ganados individualmente y en equipo haciendo uso de esta tabla para saber el palmarés real de cada luchador.

## 4. Lógica de Negocio (Requisitos de los Logros)
Al iterar sobre el historial de cada luchador (extrayendo sus reinados vía `reign_members` o `championship_reigns`):
*   **Triple Crown:** Requiere al menos 1 título `main` + 1 título `mid` + 1 título `tag`.
*   **Grand Slam Original:** Requiere al menos 1 título `main` + Intercontinental (`mid`) + United States (`mid`) + 1 título `tag`.
*   **Regla de Instancias:** Para el primer logro de la historia de un luchador, se toma el *primer* título cronológico que ganó de cada categoría. Para ser "Doble Grand Slam", se toman los *segundos* títulos ganados cronológicamente, y así sucesivamente.
*   **Diseño Dinámico:** La imagen a renderizar para cada título en la lista se determina cruzando la fecha de la victoria (`won_date`) con el rango (`start_date` / `end_date`) de la tabla `championship_titles`.

## 5. UI y Renderizado Frontend (/championship-records)
*   Renderizar el listado ordenado cronológicamente por la fecha en la que el luchador completó el requisito final.
*   Incluir foto/render del luchador, nombre, fecha del logro y las imágenes de los títulos (diseños históricos precisos según `championship_titles`).
*   Implementar un acordeón/dropdown que, al hacer clic, despliegue una lista (`ul/li`) detallando el nombre de cada campeonato requerido, su icono y la fecha exacta de victoria.
*   **Potenciales Campeones:** Listados separados de luchadores a los que les falta **exactamente 1 campeonato**. El campeonato faltante debe renderizarse usando la imagen genérica actual con estilo `opacity: 0.2`.

## 6. Instrucciones de Implementación para Antigravity
1.  **Backend:** Crea el endpoint `/api/championships/records` asegurando que la consulta SQL extraiga a los luchadores usando un `JOIN` con `reign_members` para no omitir a los campeones Tag Team.
2.  **Rutas:** Refactoriza el frontend dividiendo la página en `/championship-reigns` y `/championship-records` con el sistema de pestañas y el estado de carga de `Next Router`.
3.  **UI:** Construye el listado de récords consumiendo la nueva API e implementando el diseño visual de SmackDown Hotel (desplegables e imágenes históricas).