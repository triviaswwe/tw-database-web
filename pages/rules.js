import Head from "next/head";
import Image from "next/image";
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { ChevronDown, ShieldAlert, Clock, MonitorPlay, Trophy, UserPlus, FileText, Gavel, AlertOctagon } from "lucide-react";

const BLOB_BASE_URL = 'https://ljejfdquofuxccca.public.blob.vercel-storage.com';

export default function Rules() {
  const sections = [
    {
      id: "descripcion",
      title: "Descripción",
      icon: <FileText className="w-5 h-5 text-indigo-500" />,
      content: (
        <p className="text-base text-gray-700 dark:text-gray-300">
          El Campeonato de Trivias de WWE es una competencia emocionante que se lleva a cabo en tres marcas: Undisputed WWE Championship (para SmackDown), World Heavyweight Championship (para RAW) y NXT Championship (para NXT). Las preguntas giran en torno a la historia de la WWE, incluyendo luchadores, eventos históricos, movimientos especiales, títulos y campeonatos, entre otros temas relevantes.
        </p>
      )
    },
    {
      id: "participacion",
      title: "Participación",
      icon: <UserPlus className="w-5 h-5 text-blue-500" />,
      content: (
        <p className="text-base text-gray-700 dark:text-gray-300">
          Para unirte al Campeonato de Trivias de WWE, comunícate con{" "}
          <a href="https://www.instagram.com/triviaswwe" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 dark:text-sky-400 hover:underline">
            @triviaswwe
          </a>{" "}
          a través de Instagram para recibir la invitación a los grupos de WhatsApp correspondientes a cada marca.
        </p>
      )
    },
    {
      id: "horarios",
      title: "Horarios y Fechas",
      icon: <Clock className="w-5 h-5 text-yellow-500" />,
      content: (
        <div className="text-base text-gray-700 dark:text-gray-300">
          <div className="mb-4 bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-xl border border-yellow-200 dark:border-yellow-700/50 flex items-start gap-3 shadow-sm">
            <AlertOctagon className="w-6 h-6 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Atención:</strong> Todos tendrán como máximo 5 minutos de tolerancia para presentarse con respecto al horario oficial de la lucha. En caso de no cumplir con esta norma, tendrá la lucha perdida por default.
            </span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <li className="flex items-center gap-4 bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow">
              <span className="w-4 h-4 bg-red-600 rounded-full shadow-sm flex-shrink-0"></span> 
              <div>
                <div className="mb-1">
                  <Image src={`${BLOB_BASE_URL}/raw.png`} alt="RAW" width={70} height={25} className="h-6 w-auto object-contain" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Lunes 20:00hs (ARG)</span>
              </div>
            </li>
            <li className="flex items-center gap-4 bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow">
              <span className="w-4 h-4 bg-gray-400 rounded-full shadow-sm flex-shrink-0"></span> 
              <div>
                <div className="mb-1">
                  <Image src={`${BLOB_BASE_URL}/nxt.png`} alt="NXT" width={70} height={25} className="h-6 w-auto object-contain" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Martes 20:00hs (ARG)</span>
              </div>
            </li>
            <li className="flex items-center gap-4 bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow">
              <span className="w-4 h-4 bg-blue-600 rounded-full shadow-sm flex-shrink-0"></span> 
              <div>
                <div className="mb-1">
                  <Image src={`${BLOB_BASE_URL}/sd.png`} alt="SmackDown" width={90} height={25} className="h-6 w-auto object-contain" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Viernes 20:00hs (ARG)</span>
              </div>
            </li>
            <li className="flex items-center gap-4 bg-white dark:bg-zinc-800 p-4 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm hover:shadow-md transition-shadow">
              <span className="w-4 h-4 bg-purple-600 rounded-full shadow-sm flex-shrink-0"></span> 
              <div>
                <div className="mb-1">
                  <strong className="text-lg">PLEs y Lives</strong>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">Días y horarios a definir</span>
              </div>
            </li>
          </ul>
        </div>
      )
    },
    {
      id: "plataforma",
      title: "Plataforma y Formato",
      icon: <MonitorPlay className="w-5 h-5 text-green-500" />,
      content: (
        <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
          <p>
            El campeonato se lleva a cabo exclusivamente en <strong>WhatsApp</strong>. Cada marca tiene su grupo respectivo, además de un grupo de difusión donde se compartirán fechas, fixtures, tablas de posiciones y otras noticias relevantes.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-5 rounded-xl border border-gray-200 dark:border-zinc-700">
              <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <MonitorPlay className="w-5 h-5"/> Grupos de Combate
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">Grupos para RAW, SmackDown, NXT y PLE. Solamente utilizados para las luchas. <strong className="text-red-500 dark:text-red-400">Prohibido hablar por ese medio.</strong></p>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-5 rounded-xl border border-gray-200 dark:border-zinc-700">
              <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <UserPlus className="w-5 h-5"/> Interacción Social
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <li><strong className="text-gray-800 dark:text-gray-200">WWE Promo:</strong> Para armar storylines y desarrollar rivalidades.</li>
                <li><strong className="text-gray-800 dark:text-gray-200">WWE Backstage:</strong> Para discutir el torneo, lucha libre y otros temas.</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl text-center text-indigo-700 dark:text-indigo-300 text-sm font-medium border border-indigo-100 dark:border-indigo-900/30">
            Todos los grupos están conectados por la Comunidad de Trivias de WWE.
          </div>
        </div>
      )
    },
    {
      id: "puntuacion",
      title: "Puntuación y Clasificación",
      icon: <Trophy className="w-5 h-5 text-amber-500" />,
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
          <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-2xl border border-green-200 dark:border-green-800/50 flex flex-col items-center justify-center transform transition-transform hover:scale-105">
            <div className="text-green-700 dark:text-green-400 font-black text-4xl mb-2">3</div>
            <div className="text-xs font-bold text-green-800 dark:text-green-500 uppercase tracking-widest bg-green-200 dark:bg-green-800/50 px-3 py-1 rounded-full">Ganador</div>
          </div>
          <div className="bg-gray-100 dark:bg-zinc-800/80 p-6 rounded-2xl border border-gray-200 dark:border-zinc-700 flex flex-col items-center justify-center transform transition-transform hover:scale-105">
            <div className="text-gray-700 dark:text-gray-300 font-black text-4xl mb-2">1</div>
            <div className="text-xs font-bold text-gray-800 dark:text-gray-400 uppercase tracking-widest bg-gray-200 dark:bg-zinc-700 px-3 py-1 rounded-full">Empate</div>
          </div>
          <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-2xl border border-red-200 dark:border-red-800/50 flex flex-col items-center justify-center transform transition-transform hover:scale-105">
            <div className="text-red-700 dark:text-red-400 font-black text-4xl mb-2">0</div>
            <div className="text-xs font-bold text-red-800 dark:text-red-500 uppercase tracking-widest bg-red-200 dark:bg-red-800/50 px-3 py-1 rounded-full">Derrotado</div>
          </div>
        </div>
      )
    },
    {
      id: "eleccion",
      title: "Elección de Luchadores",
      icon: <UserPlus className="w-5 h-5 text-pink-500" />,
      content: (
        <div className="text-base text-gray-700 dark:text-gray-300 bg-pink-50 dark:bg-pink-900/10 p-5 rounded-xl border border-pink-100 dark:border-pink-900/30">
          <p>
            A partir del año 2026, <strong className="text-pink-700 dark:text-pink-400">queda descartada la posibilidad de cambiar de luchador a interpretar</strong>. Cada competidor deberá elegir un luchador y mantenerlo durante toda su estadía en el grupo.
          </p>
          <p className="mt-3 text-sm text-pink-600 dark:text-pink-300">
            * En caso de que el luchador elegido se retire, se podrá elegir ese luchador solo en caso de revisión por parte de la Junta Directiva.
          </p>
        </div>
      )
    },
    {
      id: "reglas",
      title: "Reglas Generales",
      icon: <ShieldAlert className="w-5 h-5 text-red-500" />,
      content: (
        <ul className="space-y-4 text-sm md:text-base text-gray-700 dark:text-gray-300">
          <li className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            <div className="min-w-6 mt-0.5 text-indigo-500"><FileText className="w-5 h-5" /></div>
            <div><strong className="text-gray-900 dark:text-white">Formato de respuesta:</strong> Al presentarse, se deberá especificar el formato de escritura (MAYÚSCULAS, minúsculas o Formato frase). Una vez elegido, no se podrá cambiar durante la lucha.</div>
          </li>
          <li className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            <div className="min-w-6 mt-0.5 text-indigo-500"><FileText className="w-5 h-5" /></div>
            <div>Las respuestas deben ser escritas de manera completa, sin faltas de ortografía, y en el formato elegido.</div>
          </li>
          <li className="flex items-start gap-4 bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30">
            <div className="min-w-6 mt-0.5 text-red-500"><AlertOctagon className="w-5 h-5" /></div>
            <div><strong className="text-red-700 dark:text-red-400">Prohibido hacer trampa:</strong> No se puede salir del chat para usar buscadores ni compartir respuestas.</div>
          </li>
          <li className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            <div className="min-w-6 mt-0.5 text-yellow-500"><ShieldAlert className="w-5 h-5" /></div>
            <div>Se usarán llamadas de atención por trampa. A la <strong className="text-yellow-600 dark:text-yellow-500">2da llamada</strong> se resta un punto. A la <strong className="text-red-600 dark:text-red-500">3ra llamada</strong>, descalificación del combate.</div>
          </li>
          <li className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            <div className="min-w-6 mt-0.5 text-indigo-500"><FileText className="w-5 h-5" /></div>
            <div>Es obligatorio usar "The" en nombres de una sola palabra (ej: The Miz). Es opcional en nombres de más de una palabra (ej: Big Show).</div>
          </li>
          <li className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            <div className="min-w-6 mt-0.5 text-indigo-500"><FileText className="w-5 h-5" /></div>
            <div>No se tomará en cuenta un mensaje editado que contenía una respuesta incorrecta; se debe enviar un nuevo mensaje.</div>
          </li>
          <li className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            <div className="min-w-6 mt-0.5 text-indigo-500"><FileText className="w-5 h-5" /></div>
            <div>Para "Finisher" o "Theme Song", cualquier canción o finisher de toda su carrera es válido, salvo que el árbitro indique lo contrario.</div>
          </li>
        </ul>
      )
    },
    {
      id: "disputas",
      title: "Mecanismos de Resolución de Disputas",
      icon: <Gavel className="w-5 h-5 text-orange-500" />,
      content: (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 p-6 rounded-2xl border border-orange-200 dark:border-orange-900/30 flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
          <div className="bg-white dark:bg-zinc-900 p-4 rounded-full shadow-sm">
            <Gavel className="w-10 h-10 text-orange-500" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-orange-800 dark:text-orange-400 mb-2">Decisión de Administradores</h4>
            <p className="text-base text-gray-700 dark:text-gray-300">
              Cualquier queja o reclamación será analizada por los administradores del campeonato, quienes tomarán la decisión correspondiente a cada caso. <strong className="text-orange-800 dark:text-orange-300 block mt-2">Su determinación será definitiva y no estará sujeta a apelación.</strong>
            </p>
          </div>
        </div>
      )
    },
    {
      id: "sanciones",
      title: "Responsabilidades y Sanciones",
      icon: <AlertOctagon className="w-5 h-5 text-red-600" />,
      content: (
        <div className="space-y-8 text-gray-700 dark:text-gray-300">
          <p className="text-base bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            Los participantes deben cumplir con las reglas. El incumplimiento grave o reiterado puede resultar en descalificación.
          </p>
          
          <div className="border border-red-200 dark:border-red-900/50 rounded-2xl overflow-hidden shadow-sm">
            <div className="bg-red-50 dark:bg-red-900/20 px-5 py-4 border-b border-red-200 dark:border-red-900/50">
              <h3 className="font-bold text-xl text-red-700 dark:text-red-400 flex items-center gap-3">
                <AlertOctagon className="w-6 h-6" /> Sanciones por Trampa
              </h3>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-900/30">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3">Casos de Trampa:</h4>
                  <ol className="list-decimal list-inside space-y-2 text-sm md:text-base text-gray-600 dark:text-gray-400">
                    <li>En combate de Road, alterar el combate aún perdiendo.</li>
                    <li>En combate de Road, alterar el combate y ganar/empatar.</li>
                    <li>En combate de Road, alterar el combate y obtener oportunidad titular/salvarse del descenso.</li>
                    <li>En combate titular, alterar el combate y obtener el empate.</li>
                    <li>En combate titular, alterar el combate y obtener la victoria.</li>
                  </ol>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-800/80 p-4 rounded-xl flex flex-col justify-center">
                  <div className="flex items-start gap-3 mb-3">
                    <ShieldAlert className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">Puntos <strong>1, 2 ó 3</strong>: El competidor recibe un aviso. La reiteración conlleva sanción.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertOctagon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm">Puntos <strong>4 ó 5</strong>: La sanción será directa.</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50/50 dark:bg-red-900/10 p-5 rounded-xl border border-red-100 dark:border-red-900/30">
                  <h4 className="font-bold text-red-700 dark:text-red-400 text-sm mb-4 uppercase tracking-wider flex items-center gap-2">
                    <span className="bg-red-200 dark:bg-red-900/50 text-red-800 dark:text-red-200 w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
                    Primera Acción Fraudulenta
                  </h4>
                  <ul className="space-y-3 text-sm">
                    <li className="flex gap-3 items-start"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></div>1 Road de suspensión sin competir en ninguna marca.</li>
                    <li className="flex gap-3 items-start"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></div>2 Roads sin poder competir por un campeonato.</li>
                    <li className="flex gap-3 items-start"><div className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0"></div>No poder competir en PLE Bookeado.</li>
                  </ul>
                </div>
                <div className="bg-red-600 p-5 rounded-xl border border-red-700 shadow-md flex flex-col justify-center items-center text-center text-white">
                  <h4 className="font-bold text-red-100 text-sm mb-2 uppercase tracking-wider flex items-center gap-2">
                    <span className="bg-red-800 text-red-100 w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
                    Segunda Acción Fraudulenta
                  </h4>
                  <p className="text-xl font-black mt-2">Baneo inmediato</p>
                  <p className="text-red-200 text-sm mt-1">Mínimo un año</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border border-orange-200 dark:border-orange-900/50 rounded-2xl overflow-hidden shadow-sm mt-8">
            <div className="bg-orange-50 dark:bg-orange-900/20 px-5 py-4 border-b border-orange-200 dark:border-orange-900/50">
              <h3 className="font-bold text-xl text-orange-700 dark:text-orange-400 flex items-center gap-3">
                <ShieldAlert className="w-6 h-6" /> Sanciones por Mal Comportamiento
              </h3>
            </div>
            <div className="p-5 bg-white dark:bg-zinc-900/30">
              <p className="mb-6 text-sm md:text-base text-gray-600 dark:text-gray-400 bg-orange-50/50 dark:bg-orange-900/10 p-4 rounded-xl">
                Un Road de suspensión con la imposibilidad de clasificar y competir por cualquier campeonato individual (no aplica a campeonatos en parejas). Si el sancionado posee un campeonato individual, la sanción correrá a partir de que lo pierda.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border-t-4 border-orange-300 dark:border-orange-700 shadow-sm">
                  <h4 className="font-bold text-orange-600 dark:text-orange-400 text-xs mb-3 uppercase tracking-widest text-center">1ra Acción</h4>
                  <p className="text-sm text-center">Suspensión de título individual<br/><strong className="text-lg mt-1 block text-gray-900 dark:text-white">1 Road</strong></p>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border-t-4 border-orange-400 dark:border-orange-600 shadow-sm">
                  <h4 className="font-bold text-orange-700 dark:text-orange-400 text-xs mb-3 uppercase tracking-widest text-center">2da Acción</h4>
                  <p className="text-sm text-center">Suspensión de título individual<br/><strong className="text-lg mt-1 block text-gray-900 dark:text-white">2 Roads</strong></p>
                </div>
                <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border-t-4 border-orange-500 dark:border-orange-500 shadow-sm">
                  <h4 className="font-bold text-orange-800 dark:text-orange-300 text-xs mb-3 uppercase tracking-widest text-center">3ra Acción</h4>
                  <p className="text-sm text-center">Suspensión de título individual<br/><strong className="text-lg mt-1 block text-gray-900 dark:text-white">3 Roads</strong></p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border-t-4 border-red-600 dark:border-red-500 shadow-sm">
                  <h4 className="font-bold text-red-700 dark:text-red-400 text-xs mb-3 uppercase tracking-widest text-center">4ta Acción</h4>
                  <p className="text-sm text-center">Baneo inmediato<br/><strong className="text-lg mt-1 block text-red-700 dark:text-red-400">Mínimo 6 meses</strong></p>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      )
    }
  ];

  return (
    <>
      <Head>
        <title>Reglamento Oficial — Trivias WWE</title>
        <meta
          name="description"
          content="Reglamento oficial del Campeonato de Trivias de WWE. Reglas, horarios, puntuación, sanciones y más."
        />
      </Head>

      <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 font-sans">
        <div className="max-w-4xl mx-auto">
          
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl mb-6 shadow-sm transform -rotate-3 hover:rotate-0 transition-transform">
              <Trophy className="w-10 h-10 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
              Reglamento Oficial
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Todo lo que necesitas saber sobre el Campeonato de Trivias de WWE. Conoce las normas, horarios y sistema de competición.
            </p>
          </div>

          <div className="space-y-4">
            {sections.map((section) => (
              <Disclosure as="div" key={section.id} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-200/60 dark:border-zinc-800 overflow-hidden transition-all hover:shadow-md hover:border-indigo-100 dark:hover:border-indigo-900/30">
                {({ open }) => (
                  <>
                    <DisclosureButton className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-opacity-75 transition-colors hover:bg-gray-50 dark:hover:bg-zinc-800/50">
                      <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-100 dark:border-zinc-700 shadow-sm">
                          {section.icon}
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                          {section.title}
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
                        {section.content}
                      </div>
                    </DisclosurePanel>
                  </>
                )}
              </Disclosure>
            ))}
          </div>

          <div className="mt-16 text-center bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-10 shadow-xl text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
            
            <div className="relative z-10">
              <Trophy className="w-14 h-14 mx-auto mb-5 text-indigo-200" />
              <h2 className="text-3xl font-bold mb-3">¿Listo para competir?</h2>
              <p className="text-indigo-100 mb-8 max-w-lg mx-auto text-lg">
                ¡Disfruta del Campeonato de Trivias de WWE y demuestra tus conocimientos sobre la lucha libre!
              </p>
              <a 
                href="https://www.instagram.com/triviaswwe" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-4 rounded-full font-bold hover:bg-indigo-50 hover:scale-105 transition-all shadow-lg hover:shadow-xl"
              >
                Unirse al Torneo en Instagram <UserPlus className="w-5 h-5" />
              </a>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
