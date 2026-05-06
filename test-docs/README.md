# Tesztelési módszerek beadandó - Excalidraw

Projektnek az Excalidraw nevű webalkalmazás függvénylefedettségének növelésére vállalkoztunk.

## Alkalmazásról

Az Excalidraw egy virtuális Whiteboard webalkalmazás, amely lehetőséget ad kollaborációra tervezéshez, ötleteléshez, vagy rajzoláshoz.

## Teszt

Az alkalmazást a fejlesztők [Vitest](https://vitest.dev/)-tel tesztelték, amely Typescripthez készült teszt keretrendszer (magában foglalja az eszközöket teszt írásához, futtatásához és lefedettség méréséhez).

Az alkalmazás kódja a `packages` mappában található, a logikai egységek ebben a mappában vannak ún. csomagokra bontva. A lefedettséget csak ebben a mappában mérjük.

### Kezdeti lefedettség

_Ennek méréséhez egy tesztesetet ignorálni kellett, a `packages/excalidraw/tests/scene/export.test.ts` tesztfájl `exportToSvg > with a CJK font` nevű tesztesetét, mert az bukott._

Kezdeti coverage megtalálható a [start-coverage.txt](start-coverage.txt) fájlban, illetve az ebből készült report a [start-coverage](start-coverage) mappában.
