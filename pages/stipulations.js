// pages/stipulations.js

import Head from "next/head";
import pool from "../lib/db";
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDown, Swords, ScrollText, AlertTriangle } from "lucide-react";

export async function getStaticProps() {
  try {
    const [rows] = await pool.query(
      `SELECT name FROM match_types ORDER BY order_in_page`,
    );
    return { props: { stipulations: rows }, revalidate: 60 };
  } catch (err) {
    console.error("Error in stipulations getStaticProps:", err);
    return { props: { stipulations: [], error: true }, revalidate: 60 };
  }
}

export default function Stipulations({ stipulations, error }) {
  const descriptions = {
    Singles: `Lucha clásica a 5 preguntas (10 si es titular).`,
    "Triple Threat": `Lucha de tres integrantes a 7 preguntas (10 si es titular).`,
    "Fatal 4-Way": `Lucha de cuatro integrantes a 9 preguntas (10 si es titular).`,
    "Samoan Tag Team": `Las reglas son las mismas que una combate Tag Team clásico, pero con la particularidad de que las preguntas estarán referidas a los samoanos y su historia en la lucha libre profesional.`,
    "Tag Team": `Lucha a 5 preguntas donde dos luchadores forman un equipo.
El árbitro informa cual luchador de cada tag team va a disputar las primeras 4 preguntas de la lucha, de modo tal que todos se enfrenten con todos en 1 pregunta.
En la última pregunta, cada tag team debe decidir qué luchador va a disputarla e informarla al árbitro del encuentro.
Está totalmente prohibido que un luchador responda una pregunta que no le corresponda responder. De lo contrario, el punto a disputar se lo llevará automáticamente el tag team rival.

Ejemplo: Supongamos que se enfrentan Daniel Bryan & Jon Moxley vs. Seth Rollins & Bron Breakker.
El árbitro del encuentro escribirá lo siguiente:
• Primera pregunta para Bryan & Seth
• Segunda pregunta para Moxley & Bron
• Tercera pregunta para Bryan & Bron
• Cuarta pregunta para Moxley & Seth
• Última pregunta, ¿quién de cada tag team responde?`,
    "6-Man Tag Team": `Lucha a 9 preguntas donde tres luchadores forman un equipo.
El árbitro informa cual luchador de cada trío va a disputar las preguntas de la lucha, de modo tal que todos se enfrenten con todos en 1 pregunta.
Está totalmente prohibido que un luchador responda una pregunta que no le corresponda responder. De lo contrario, el punto a disputar se lo llevará automáticamente el trío rival.

Ejemplo: Supongamos que se enfrentan Daniel Bryan, Jon Moxley & Cody Rhodes vs. Seth Rollins, Bron Breakker & Buddy Murphy.
El árbitro del encuentro escribirá lo siguiente:
• Primera pregunta para Bryan & Seth
• Segunda pregunta para Moxley & Bron
• Tercera pregunta para Cody & Murphy
• Cuarta pregunta para Bryan & Bron
• Quinta pregunta para Cody & Seth
• Sexta pregunta para Moxley & Murphy
• Séptima pregunta para Cody & Bron
• Octava pregunta para Bryan & Murphy
• Novena pregunta para Moxley & Seth`,
    "Mask vs Hair": `Lucha de apuestas con estipulación de por medio dependiendo la rivalidad.`,
    "Mask vs Mask": `Lucha de apuestas con estipulación de por medio dependiendo la rivalidad.`,
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
Tendrán 3 minutos para presentarse cuando les toque entrar.
La persona que responda último correctamente en cada pregunta o no responda, perderá una vida.
Ganará el luchador que termine con todas las vidas de sus adversarios.`,
    "Elimination Chamber Tag Team": `Empiezan 2 equipos, mientras los 4 equipos restantes esperan su turno en cada cámara.
Cada equipo tendrá 4 vidas.
Cada 3 preguntas, entrará un nuevo equipo.
Tendrán 3 minutos para presentarse cuando les toque entrar.
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
    "Money in the Bank": `Preguntas con temática Money in the Bank (PLE o estipulación).
Cuando se gana un punto se puede elegir si sumarse un punto o restarle un punto a alguno de sus rivales.
No se puede restar puntos a un luchador que está en 0.
El ganador será el luchador que llegue a 6 puntos.
El portador del maletín puede canjearlo siempre y cuando el campeón esté luchando en algún show.
Se deberá esperar a que el campeón termine su lucha para hacer efectivo el canjeo.
La lucha será a 5 preguntas, y Mr. Money in the Bank solo necesitará una para capturar el campeonato.`,
    "No Holds Barred": `Lucha a 7 preguntas, (10 si es titular).
La primera pregunta la elige el árbitro como de costumbre.
El ganador de la primera pregunta (salvo que sea nula) debe elegir una palabra o un conjunto numérico para darle temática a la pregunta siguiente.
Siempre elegirá la temática de la pregunta siguiente quien gane la pregunta actual.
En caso de nulas, pregunta normal del árbitro.`,
    "Only-One-Shot": `Lucha a 7 preguntas, (10 si es titular).
Esta estipulación consiste en que solo pueden responder UNA única vez por cada pregunta hecha por el árbitro.`,
    "Pitch Black": `Lucha a 7 preguntas, (10 si es titular).
Las preguntas estarán encriptadas sustituyendo las letras por números. Ejemplo: Luch4 p0r 3l WW3 Ch4mp10nsh1p.`,
    "Royal Rumble": `Para presentarse, deben subir su imagen con número de entrada.
Cada 3 preguntas entra un luchador nuevo al ring.
Todos empiezan con 3 vidas (y esa es la cantidad máxima de vidas que se puede tener).
Si ganas un punto: decidís si sumarte una vida o restarle a un rival.
Al ser un combate largo, el árbitro debe empezar a contar "Nula en..." a partir de 5 (en lugar de 10 como en el resto de estipulaciones).
Cuando ingresa el #30, se deshabilita la opción de sumarse vidas.
Gana el único que quede con vida dentro del ring y se gana la posibilidad de retar a un campeón mundial en WrestleMania.`,
    "Steel Cage": `Lucha a 7 puntos (10 si es titular), pero si uno contesta 3 seguidas ganará la lucha por salir del ring. En esa pregunta clave, el rival deberá evitar eso contestando correctamente y cortando la racha.`,
    "Street Fight": `Lucha a 7 preguntas, (10 si es titular).
Abreviaciones no permitidas en 2 letras; a partir de 3 válido.`,
    Tables: `Lucha a 7 preguntas, (10 si es titular).
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
    "Undisputed Era Rules": `Lucha a 7 preguntas, (10 si es titular).
Undisputed Era con reglas especiales (escribir "ERA" para permitir que cualquier miembro responda).
Los rivales con reglas normales.`,
    WarGames: `Dos luchadores de equipos distintos comienzan en jaulas.
Cada respuesta correcta suma 1 punto.
Cada 3 preguntas entra nuevo luchador (equipo con ventaja primero).
Al activar reglas WarGames, cada acierto resta 1 punto al rival.
Gana el equipo que deje al otro con 0 puntos.`,
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-gray-50 dark:bg-zinc-950">
        <div className="bg-white dark:bg-zinc-900 p-8 rounded-2xl shadow-lg border border-red-100 dark:border-red-900/30 text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Error al cargar</h1>
          <p className="text-gray-500 dark:text-gray-400">
            No se pudo conectar a la base de datos. Intentá de nuevo en unos segundos.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Stipulations — Trivias WWE</title>
        <meta
          name="description"
          content="Reglas de todas las estipulaciones del Campeonato de Trivias WWE: Ladder, Hell in a Cell, Royal Rumble, WarGames y más."
        />
      </Head>

      <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 font-sans">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-6 shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
              <Swords className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
              Stipulations
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Reglas y condiciones especiales de todas las estipulaciones y tipos de combates del Campeonato de Trivias WWE.
            </p>
          </div>

          <div className="space-y-4">
            {stipulations.map(({ name }) => (
              <Disclosure as="div" key={name} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200/60 dark:border-zinc-800 overflow-hidden transition-all hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/30">
                {({ open }) => (
                  <>
                    <DisclosureButton className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-opacity-75 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 shadow-sm">
                          <ScrollText className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {name}
                        </span>
                      </div>
                      <div className={`p-2 rounded-full transition-colors ${open ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-gray-50 dark:bg-zinc-800'}`}>
                        <ChevronDown
                          className={`${
                            open ? 'transform rotate-180 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'
                          } w-5 h-5 transition-transform duration-300`}
                        />
                      </div>
                    </DisclosureButton>
                    <DisclosurePanel 
                      transition 
                      className="px-6 pb-8 pt-2 origin-top transition duration-200 ease-out data-[closed]:-translate-y-4 data-[closed]:opacity-0"
                    >
                      <div className="border-t border-gray-100 dark:border-zinc-800 pt-6">
                        <p className="text-base text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                          {descriptions[name] || "No hay reglas especiales para esta estipulación."}
                        </p>
                      </div>
                    </DisclosurePanel>
                  </>
                )}
              </Disclosure>
            ))}
          </div>

        </div>
      </div>
    </>
  );
}
