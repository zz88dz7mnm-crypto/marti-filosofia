# Nietzsche: Soy Dinamita

Página interactiva para estudiar a Friedrich Nietzsche (Filosofía contemporánea, Unidad IV): vida, obra, las nueve ideas principales, actualización, juegos y un simulacro de examen.

Basada en el apunte *Historia de la filosofía contemporánea*, cap. "La reacción antirracionalista", págs. 88–97.

## Cómo verla

Es un sitio estático (HTML + CSS + JS, con GSAP desde CDN). Se puede publicar con GitHub Pages o abrir con cualquier servidor local:

```bash
python3 -m http.server 5173
```

y entrar a http://localhost:5173.

## Estructura

- `index.html`: contenido y secciones.
- `css/styles.css`: diseño, responsive y animaciones CSS.
- `js/main.js`: animaciones de scroll (GSAP + ScrollTrigger), índice y navegación.
- `js/games.js`: los 7 juegos, el progreso guardado y el simulacro con corrección por palabras clave.
