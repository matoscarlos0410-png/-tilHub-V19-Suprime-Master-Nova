============================================================
ÚTILHUB V19 — NOVA FLOW
============================================================

Versión: V19
Nombre: ÚtilHub
Sistema visual: NOVA FLOW
Tipo: Sitio web de herramientas útiles
Formato: Web + PWA instalable


============================================================
1. ¿QUÉ ES ÚTILHUB?
============================================================

ÚtilHub es una plataforma web que reúne diferentes herramientas
útiles en un solo lugar.

Su objetivo es facilitar tareas cotidianas, conversiones,
cálculos, organización, productividad y otras actividades.

V19 incorpora una versión mejorada de NOVA FLOW y una estructura
más estable para las herramientas.


============================================================
2. ARCHIVOS DEL PROYECTO
============================================================

index.html
    Estructura principal de ÚtilHub.

style.css
    Diseño, animaciones, interfaz y adaptación a dispositivos.

script.js
    Funcionamiento de las herramientas, NOVA FLOW, configuración,
    favoritos, recientes y almacenamiento local.

manifest.webmanifest
    Configuración para instalar ÚtilHub como aplicación.

sw.js
    Service Worker encargado de la caché y funcionamiento básico
    sin conexión.

README.txt
    Información y documentación del proyecto.


============================================================
3. NOVA FLOW
============================================================

NOVA FLOW es el sistema de animación visual de ÚtilHub.

V19 incluye 20 modos:

1. Cosmic
2. Aurora
3. Pulse
4. Matrix
5. Nebula
6. Waves
7. Starfield
8. Vortex
9. Firefly
10. Rain
11. Grid
12. Spiral
13. Orbit
14. Plasma
15. DNA
16. Snow
17. Lightning
18. Galaxy
19. Comet
20. Quantum

Cada modo tiene un comportamiento visual diferente.

La intensidad de NOVA FLOW puede modificarse desde la interfaz.

También existen controles de rendimiento para reducir el consumo
de recursos en dispositivos con menor capacidad.


============================================================
4. HERRAMIENTAS
============================================================

ÚtilHub V19 incluye herramientas como:

- Calculadora
- Porcentajes
- Descuentos
- Regla de tres
- Conversión de longitud
- Conversión de peso
- Conversión de volumen
- Conversión de temperatura
- Conversión de tiempo
- Conversión de moneda
- Diferencia entre fechas
- Calculadora de edad
- Temporizador
- Cronómetro
- Reloj
- Modo concentración
- Herramientas de texto
- Diccionario
- Notas
- Tareas
- Lista de compras
- Comida
- Búsqueda de productos
- Generador de contraseñas
- Generador aleatorio
- Generador QR


============================================================
5. COMPRAS Y COMIDA
============================================================

Las herramientas de comida y compras solamente ayudan a encontrar
opciones mediante búsquedas externas.

ÚtilHub NO realiza automáticamente compras ni pedidos.

El usuario decide qué comprar o pedir y completa el proceso
directamente en el sitio correspondiente.


============================================================
6. FAVORITOS Y RECIENTES
============================================================

ÚtilHub permite guardar herramientas favoritas.

También registra herramientas utilizadas recientemente para poder
acceder a ellas rápidamente.

Estos datos se guardan localmente en el navegador.


============================================================
7. NOTAS Y TAREAS
============================================================

Las notas y tareas se almacenan mediante localStorage.

Esto permite conservar la información en el navegador después de
cerrar o actualizar la página.

Los datos dependen del almacenamiento del navegador utilizado.


============================================================
8. TEMA
============================================================

ÚtilHub dispone de:

- Tema oscuro
- Tema claro

La configuración seleccionada se guarda localmente.


============================================================
9. MODO CONCENTRACIÓN
============================================================

El modo concentración reduce elementos visuales secundarios para
permitir una interfaz más enfocada.


============================================================
10. RENDIMIENTO
============================================================

NOVA FLOW dispone de diferentes niveles de rendimiento.

Se recomienda utilizar el modo de rendimiento reducido en
dispositivos antiguos o con pocos recursos.


============================================================
11. PWA
============================================================

ÚtilHub está preparado para funcionar como una Progressive Web App.

Para instalarla como aplicación se necesita:

- HTTPS
o
- localhost

GitHub Pages proporciona HTTPS, por lo que puede utilizarse para
publicar el proyecto.


============================================================
12. GITHUB PAGES
============================================================

Para publicar ÚtilHub:

1. Crear un repositorio en GitHub.

2. Subir estos archivos:

   index.html
   style.css
   script.js
   manifest.webmanifest
   sw.js
   README.txt

3. Entrar en:

   Settings
   → Pages

4. Seleccionar la rama principal.

5. Seleccionar la carpeta raíz:

   /

6. Guardar.

7. Esperar a que GitHub Pages publique el sitio.

Después se podrá abrir mediante la dirección proporcionada por
GitHub Pages.


============================================================
13. INTERNET
============================================================

Algunas funciones utilizan servicios externos.

Por ejemplo:

- Diccionario
- Código QR
- Conversión de moneda
- Búsquedas externas de productos
- Búsquedas externas de comida

Estas funciones pueden necesitar conexión a Internet.


============================================================
14. ALMACENAMIENTO
============================================================

ÚtilHub utiliza almacenamiento local del navegador para conservar
determinadas configuraciones y datos.

Entre ellos pueden encontrarse:

- Tema
- Preferencias de NOVA FLOW
- Favoritos
- Herramientas recientes
- Notas
- Tareas
- Listas


============================================================
15. ACTUALIZACIÓN DE VERSIÓN
============================================================

V19 utiliza una caché independiente:

utilhub-v19-nova-flow-v1

Cuando se cree una nueva versión importante, se recomienda cambiar
el nombre de la caché en sw.js.

Ejemplo:

utilhub-v20-nova-flow-v1


============================================================
16. ICONO
============================================================

El icono de ÚtilHub está integrado directamente mediante código
SVG dentro de index.html.

No es necesario utilizar un archivo de imagen externo para el
icono principal del navegador.


============================================================
17. PRIVACIDAD
============================================================

Las notas, tareas, favoritos y configuraciones locales permanecen
en el almacenamiento del navegador utilizado.

Las funciones que utilizan servicios externos pueden enviar la
información necesaria para realizar la solicitud a dichos
servicios.

No se debe introducir información privada o sensible en servicios
externos.


============================================================
18. OBJETIVO DE V19
============================================================

V19 busca reunir las mejoras de versiones anteriores en una
edición más estable de ÚtilHub.

Objetivos principales:

- NOVA FLOW funcional
- 20 modos visuales
- Herramientas funcionales
- Diseño adaptable
- Mejor funcionamiento en dispositivos móviles
- PWA instalable
- Favoritos
- Herramientas recientes
- Notas y tareas
- Tema claro y oscuro
- Modo concentración
- Controles de rendimiento
- Sistema de caché actualizado
- Mejor manejo de errores


============================================================
ÚTILHUB V19
NOVA FLOW
"Todo lo útil, en un solo lugar."
============================================================
