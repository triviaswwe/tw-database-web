// pages/stipulations.js
import pool from "../lib/db";

export async function getServerSideProps() {
  const [rows] = await pool.query(
    `SELECT id, name FROM match_types ORDER BY id`
  );
  return { props: { stipulations: rows } };
}

export default function Stipulations({ stipulations }) {
  // Mapa de descripciones extraídas desde Google Docs
  const descriptions = {
    "2 out of 3 Falls": `3 rondas; cada ronda la gana el primero que llega a 5 (en lugar de 5 preguntas).`,
    Death: `Combate titular a 7 preguntas que consiste en ir subiendo de nivel mediante las épocas en las que WWE (y sus derivados a través del tiempo) funcionó como empresa.
Se correrá la regla conocida como Only-One-Shot (no se puede responder más de una vez cada pregunta).
Tendrán 30 segundos de reloj por cada pregunta. El árbitro escribirá ⌛TIEMPO⌛ cuando su cronómetro marque 0, y sólo contará la respuesta de cada luchador si lo ha enviado antes de ese mensaje.
Las preguntas se desarrollarán según estos años:

2020 a 2025
2010 a 2019
2000 a 2009
1990 a 1999
1980 a 1989
1970 a 1979
1950 a 1969`,
    "Elimination Chamber": `Empiezan 2 luchadores, mientras los 4 restantes esperan su turno en cada cámara.
Cada luchador tendrá 4 vidas.
Cada 3 preguntas, entrará un nuevo luchador.
Tendrán 5 minutos para presentarse cuando les toque entrar.
La persona que responda último correctamente en cada pregunta o no responda, perderá una vida.
Ganará el luchador que termine con todas las vidas de sus adversarios.`,
    "Elimination Chamber Tag Team": `Empiezan 2 equipos, mientras los 4 equipos restantes esperan su turno en cada cámara.
Cada equipo tendrá 4 vidas.
Cada 3 preguntas, entrará un nuevo equipo.
Tendrán 5 minutos para presentarse cuando les toque entrar.
La persona que responda último correctamente en cada pregunta o no responda, su equipo perderá una vida.
Cabe aclarar que en cada pregunta sólo uno de los dos participantes de cada equipo podrá responder, y ya se ha establecido el orden del mismo para que la lucha sea lo más diversa posible.
Ganará el equipo que termine con todas las vidas de sus adversarios.`,
    "Extreme Rules": `Lucha a 7 preguntas.
Cada pregunta tendrá como temática a siete promociones distintas de la lucha libre profesional (WWE, WCW, ECW, AEW, TNA, ROH y NJPW).`,
    "Falls Count Anywhere": `Lucha a 15 preguntas.
Gana el luchador que más puntos haya obtenido luego de la 15ta pregunta. En caso de empate, se debe desempatar, ya que no hay descalificación ni count out.
Quien logre dos puntos seguidos (sin contar nulas) podrá elegir el área donde esa parte de la lucha tendrá lugar.
Cada área tiene diferentes características.
Las áreas son:

• Ring: Reglas normales.
• Ringside: Abreviaciones no permitidas en 2 letras; a partir de 3 válido.
• Stage: Preguntas sobre personajes.
• Backstage: Finishers y Theme Songs.
• Estacionamiento: Main Events.
• Entre el público: Elegir un periodo de años.`,
    "Hell in a Cell": `Lucha a 25 preguntas.`,
    "Iron Man": `Lucha de relevos australianos con 30 minutos de límite de tiempo.
Ganará el Tag Team que más caídas obtenga durante ese lapso.
Para ganar una caída, es necesario obtener más puntos en cada combate normal Tag Team de 5 preguntas.`,
    Ladder: `Gana el luchador que llega a 7 respuestas correctas.
Cuando un luchador gana un punto, puede elegir si sumarse o restar al rival.`,
    "Ladder Tag Team": `Se lleva a cabo bajo las reglas Tornado (todos pueden responder).
Gana el equipo que llega a 7 respuestas correctas.
Cuando un equipo gana un punto, puede elegir si sumarse o restar al equipo rival.`,
    "Money in the Bank": `Preguntas con temática Money in the Bank (PPV o estipulación).
Cuando se gana un punto se puede elegir si sumarse un punto o restarle un punto a alguno de sus rivales.
No se puede restar puntos a un luchador que está en 0.
El ganador será el luchador que llegue a 6 puntos.
El portador del maletín puede canjearlo siempre y cuando el campeón esté luchando en algún show.
Se deberá esperar a que el campeón termine su lucha para hacer efectivo el canjeo.
La lucha será a 5 preguntas, y Mr. Money in the Bank solo necesitará una para capturar el campeonato.`,
    "No Holds Barred": `Lucha a 10 preguntas.
La primera pregunta la elige el árbitro como de costumbre.
El ganador de la primera pregunta (salvo que sea nula) debe elegir una palabra o un conjunto numérico para darle temática a la pregunta siguiente.
Siempre elegirá la temática de la pregunta siguiente quien gane la pregunta actual.
En caso de nulas, pregunta normal del árbitro.`,
    "Only-One-Shot": `Lucha a 10 preguntas.
Esta estipulación consiste en que solo pueden responder UNA única vez por cada pregunta hecha por el árbitro.`,
    "Pitch Black": `Lucha a 10 preguntas.
Las preguntas estarán encriptadas sustituyendo las letras por números. Ejemplo: Luch4 p0r 3l WW3 Ch4mp10nsh1p.`,
    "Royal Rumble": `Todos empiezan con 3 vidas (y esa es la cantidad máxima de vidas que se puede tener).
Si ganas un punto: decidís si sumarte una vida o restarle a un rival.
Cada 3 preguntas entra un luchador nuevo al ring.
Al ser un combate largo, el árbitro debe empezar a contar "Nula en..." a partir de 5 (en lugar de 10 como en el resto de estipulaciones).
Cuando ingresa el #30, se deshabilita la opción de sumarse vidas.
Gana el único que quede con vida dentro del ring y se gana la posibilidad de retar a un campeón mundial en WrestleMania.`,
    "Steel Cage": `Lucha a 10 puntos, pero si uno contesta 3 seguidas ganará la lucha por salir del ring. En esa pregunta clave, el rival deberá evitar eso contestando correctamente y cortando la racha.`,
    Tables: `Lucha a 10 preguntas.
El árbitro establece temática cada ronda.
Los competidores tendrán 20 segundos para UNA respuesta con tantas sub-respuestas como quieran.
Cada respuesta incorrecta resta una correcta.
Para ganar: más aciertos; en empate menos fallos; si persiste, primero en responder.`,
    TLC: `Gana quien responda 10 preguntas y descuelga el título subiendo a la escalera.
• Chairs (2 veces): descuenta 1 punto rival.
• Tables (1 vez): descuenta 2 puntos rival.
• Ladders: tras 10 puntos, contestar 3 preguntas cortas para ganar el título.`,
    "Tribal Combat": `Lucha a 7 preguntas.
Preguntas samoanas con su traducción.
El ganador se quedará con el Ula Fala y será reconocido como Jefe Tribal.`,
    "Undisputed Era Rules": `Lucha a 10 preguntas.
Undisputed Era con reglas especiales (escribir "ERA" para permitir que cualquier miembro responda).
Los rivales con reglas normales.`,
    WarGames: `Dos luchadores de equipos distintos comienzan en jaulas.
Cada respuesta correcta suma 1 punto.
Cada 3 preguntas entra nuevo luchador (equipo con ventaja primero).
Al activar reglas WarGames, cada acierto resta 1 punto al rival.
Gana el equipo que deje al otro con 0 puntos.`,
  };

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Stipulations</h1>
      <ul className="space-y-6">
        {stipulations.map(({ name }) => (
          <li key={name}>
            <h2 className="text-2xl font-semibold mb-1">{name}</h2>
            <p className="text-base whitespace-pre-line">
              {descriptions[name] || "No hay reglas especiales para esta estipulación."}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
