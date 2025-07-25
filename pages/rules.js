// pages/rules.js
export default function Rules() {
  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Reglamento Oficial</h1>

      <section id="descripcion" className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Descripción</h2>
        <p className="text-base whitespace-pre-line">
          El Campeonato de Trivias de WWE es una competencia emocionante que se
          lleva a cabo en tres marcas: Undisputed WWE Championship (para
          SmackDown), World Heavyweight Championship (para RAW) y NXT
          Championship (para NXT). Las preguntas giran en torno a la historia de
          la WWE, incluyendo luchadores, eventos históricos, movimientos
          especiales, títulos y campeonatos, entre otros temas relevantes.
        </p>
      </section>

      <section id="participacion" className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Participación</h2>
        <p className="text-base">
          Para unirte al Campeonato de Trivias de WWE, comunícate con{" "}
          <a
            href="https://www.instagram.com/triviaswwe"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-blue-600 dark:text-sky-300"
          >
            @triviaswwe
          </a>{" "}
          a través de Instagram para recibir la invitación a los grupos de
          WhatsApp correspondientes a cada marca.
        </p>
      </section>

      <section id="horarios" className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Horarios y Fechas</h2>
        <ul className="list-disc list-inside text-base">
          <li>RAW: Todos los lunes a partir de las 20:00hs Argentina.</li>
          <li>NXT: Todos los martes a partir de las 20:00hs Argentina.</li>
          <li>Speed: Todos los jueves a partir de las 20:00hs Argentina.</li>
          <li>
            SmackDown: Todos los viernes a partir de las 20:00hs Argentina.
          </li>
          <li>PPVs y Lives: Días y horarios a definir.</li>
        </ul>
      </section>

      <section id="plataforma" className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Plataforma y Formato</h2>
        <p className="text-base whitespace-pre-line">
          El campeonato se lleva a cabo exclusivamente en WhatsApp. Cada marca
          tiene su grupo respectivo, además de un grupo de difusión donde se
          compartirán fechas, fixtures, tablas de posiciones y otras noticias
          relevantes. También existe otros dos grupos: Uno llamado "WWE Promo",
          donde los luchadores podrán ir armando sus storylines con el objetivo
          de desarrollar sus rivalidades; y otro llamado "WWE Backstage", donde
          todos los participantes pueden reunirse para discutir el torneo, lucha
          libre y otros temas relacionados. Por lo tanto, los grupos para shows
          como RAW, SmackDown, Speed y PLE son solamente utilizados para las
          luchas y está prohibido hablar por ese medio. Todos los grupos están
          conectados por la Comunidad de Trivias de WWE.
        </p>
      </section>

      <section id="puntuacion" className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">
          Puntuación y Clasificación
        </h2>
        <ul className="list-disc list-inside text-base">
          <li>Ganador: 3 puntos.</li>
          <li>Derrotado: 0 puntos.</li>
          <li>Empate: 1 punto para cada luchador.</li>
        </ul>
      </section>

      <section id="eleccion" className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">
          Elección de los luchadores
        </h2>
        <p className="text-base whitespace-pre-line">
          A partir de la finalización del Road to Money in the Bank 2024 (22 de
          julio), queda inaugurada la sección Alumni en la descripción de ⚫
          Comunidad Trivias WWE ⚫. Esto significa que ya no se permite elegir
          luchadores que fueron ocupados anteriormente por otro jugador de
          Trivias, con el objetivo de respetar el legado y la historia de cada
          luchador.
        </p>
        <ul className="list-disc list-inside text-base">
          <li>
            Pedirlo con tiempo durante algún Road y esperar a que dicha
            competición termine.
          </li>
          <li>
            Que el luchador/PJ a cambiar no se encuentre ni en el roster actual
            ni en la sección alumni.
          </li>
          <li>
            Haber cumplido al menos 1 año de manera ininterrumpida en el main
            roster representando al actual luchador/PJ.
          </li>
        </ul>
      </section>

      <section id="reglas" className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">Reglas Generales</h2>
        <ul className="list-disc list-inside text-base space-y-1">
          <li>
            Las respuestas deben ser escritas de manera completa y sin faltas de
            ortografía para que se consideren válidas.
          </li>
          <li>
            Los participantes deben mantenerse activos en los grupos y
            participar en las trivias de manera puntual.
          </li>
          <li>Se requiere respeto mutuo entre todos los participantes.</li>
          <li>
            Está estrictamente prohibido hacer trampa, como salirse del chat
            para utilizar buscadores en línea o compartir respuestas con otros
            luchadores.
          </li>
          <li>
            Se utilizará como método las llamadas de atención a aquellos que
            hagan uso de estas trampas. A la segunda llamada de atención se
            procederá a restarle un punto al luchador. Llegadas las tres
            llamadas de atención el luchador queda automáticamente descalificado
            del combate.
          </li>
          <li>
            No hace falta utilizar el término "The" en respuestas como
            Undertaker, Ultimate Warrior, Big Show, ni en Tag Teams / Stables
            como Hardy Boyz, Final Testament, entre otros.
          </li>
          <li>
            Es obligatorio usar "The" solo en casos como The Miz, The Rock, The
            Usos, The Shield, The Revival, The Bloodline, The Corporation, The Authority, The
            Nexus, The Corre, The Bar, The Club, The Darkstate.
          </li>
          <li>
            No se tomará en cuenta como respuesta un mensaje editado que
            contenía anteriormente una respuesta incorrecta; se deberá contestar
            la pregunta en un nuevo mensaje.
          </li>
          <li>
            A la hora de responder preguntas como "Finisher de" o "Theme Song
            de", se tomará válida cualquier canción o finisher que haya tenido
            el luchador mencionado en toda su carrera, a menos que el árbitro
            especifique lo contrario.
          </li>
        </ul>
      </section>

      <section id="speed" className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">
          Reglamento Campeonato Speed
        </h2>
        <p className="text-base whitespace-pre-line">
          Podrán competir por este título aquellos competidores que no sean o
          hayan sido campeones individuales de otro título (Undisputed WWE
          Championship, World Heavyweight Championship, Intercontinental
          Championship, United States Championship, NXT Championship). Además,
          si eres el vigente poseedor del Tag Team Championship no podrás
          competir en la división, pudiendo hacerlo solo luego de perder el
          mismo. El formato de los combates no titulares será de 3 preguntas
          cortas de rápida respuesta, la cual deberá estar de manera completa
          (no se aceptan abreviaciones). El formato de los combates titulares
          será de 5 preguntas cortas de rápida respuesta, la cual deberá estar
          de manera completa (no se aceptan abreviaciones).
        </p>
      </section>

      <section id="disputas" className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">
          Mecanismos de Resolución de Disputas
        </h2>
        <p className="text-base">
          Cualquier queja o reclamación será analizada por los administradores
          del campeonato, quienes tomarán la decisión correspondiente a cada
          caso. Su determinación será definitiva y no estará sujeta a apelación.
        </p>
      </section>

      <section id="sanciones" className="mb-6">
        <h2 className="text-2xl font-semibold mb-2">
          Responsabilidades y Sanciones
        </h2>
        <p className="text-base">
          Los participantes son responsables de cumplir con las reglas
          establecidas en este reglamento. El incumplimiento grave o reiterado
          de las normas puede resultar en sanciones, que pueden incluir la
          descalificación del campeonato.
        </p>
        <p className="text-base">
          Dependiendo de la gravedad de la trampa, se podrán aplicar estas
          mismas sanciones o no, a otros competidores. Este es el baremo a
          seguir:
        </p>
        <h3 className="text-xl font-semibold">Por trampa:</h3>
        <ol className="list-decimal list-inside text-base mb-4">
          <li>En combate de Road, alterar el combate aún perdiendo.</li>
          <li>En combate de Road, alterar el combate y ganar/empatar.</li>
          <li>
            En combate de Road, alterar el combate y obtener una oportunidad
            titular/salvarse del descenso.
          </li>
          <li>En combate titular, alterar el combate y obtener el empate.</li>
          <li>En combate titular, alterar el combate y obtener la victoria.</li>
        </ol>
        <p className="text-base">
          En caso de darse el punto 1, 2 ó 3, el competidor recibirá un aviso, y
          en caso de repetir la infracción, conllevará a sanción. En caso de
          darse el punto 4 ó 5, la sanción será directa.
        </p>
        <h3 className="text-xl font-semibold">PRIMERA ACCIÓN FRAUDULENTA:</h3>
        <ul className="list-disc list-inside text-base mb-4">
          <li>
            Un Road de suspensión sin competir en ninguna marca (al regreso en
            NXT).
          </li>
          <li>
            Dos Roads sin poder competir por un campeonato (desde el regreso).
          </li>
          <li>
            No poder competir en PLE Bookeado (los tres Roads de sanción).
          </li>
        </ul>
        <h3 className="text-xl font-semibold">SEGUNDA ACCIÓN FRAUDULENTA:</h3>
        <ul className="list-disc list-inside text-base mb-6">
          <li>Baneo inmediato de mínimo un año.</li>
        </ul>
        <h3 className="text-xl font-semibold">Por mal comportamiento:</h3>
        <p className="text-base">
          Un Road de suspensión con la imposibilidad de clasificar y competir
          por cualquier campeonato individual de cualquiera de las tres marcas
          principales.
        </p>
        <ol className="list-decimal list-inside text-base mb-4">
          <li>Dicha sanción no aplica para los campeonatos en parejas.</li>
          <li>
            Al ser el sancionado poseedor de un campeonato individual, dicha
            sanción correrá a partir de que el competidor pierda el campeonato.
          </li>
        </ol>
        <p className="text-base">
          Dependiendo de la gravedad y la reiteración de los actos o
          comentarios, se podrán aplicar estas mismas sanciones o no, a otros
          competidores.
        </p>
        <h3 className="text-xl font-semibold">PRIMERA ACCIÓN INDEBIDA:</h3>
        <ul className="list-disc list-inside text-base mb-2">
          <li>
            Suspensión sin competir por un título individual de mínimo un road.
          </li>
        </ul>
        <h3 className="text-xl font-semibold">SEGUNDA ACCIÓN INDEBIDA:</h3>
        <ul className="list-disc list-inside text-base mb-2">
          <li>
            Suspensión sin competir por un título individual de mínimo dos
            roads.
          </li>
        </ul>
        <h3 className="text-xl font-semibold">TERCERA ACCIÓN INDEBIDA:</h3>
        <ul className="list-disc list-inside text-base mb-2">
          <li>
            Suspensión sin competir por un título individual de mínimo tres
            roads.
          </li>
        </ul>
        <h3 className="text-xl font-semibold">CUARTA ACCIÓN INDEBIDA:</h3>
        <ul className="list-disc list-inside text-base mb-6">
          <li>Baneo inmediato de al menos 6 meses.</li>
        </ul>
        <p className="text-center font-semibold mt-8">
          ¡Disfruta del Campeonato de Trivias de WWE y demuestra tus
          conocimientos sobre la lucha libre!
        </p>
      </section>
    </div>
  );
}
