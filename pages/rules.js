import Head from "next/head";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { 
  ChevronDown, 
  ShieldAlert, 
  Clock, 
  MonitorPlay, 
  Trophy, 
  UserPlus, 
  FileText, 
  Gavel, 
  AlertOctagon,
  Scale,
  Sparkles,
  UserCheck,
  CheckSquare,
  XCircle,
  HelpCircle,
  ThumbsUp,
  AlertCircle
} from "lucide-react";

const BLOB_BASE_URL = 'https://ljejfdquofuxccca.public.blob.vercel-storage.com';

export default function Rules() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("competidores");

  useEffect(() => {
    if (router.query.tab === "arbitros" || window.location.hash === "#arbitros") {
      setActiveTab("arbitros");
    } else if (router.query.tab === "competidores" || window.location.hash === "#competidores") {
      setActiveTab("competidores");
    }
  }, [router.query]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    router.replace({ pathname: "/rules", query: { tab } }, undefined, { shallow: true });
  };

  const competitorSections = [
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
          Para unirte al Campeonato de Trivias de WWE, únete al grupo de{" "}
          <a href="https://chat.whatsapp.com/D7vkfUKTujZ8nr6xlQj02C" target="_blank" rel="noopener noreferrer" className="font-semibold text-green-600 dark:text-green-400 hover:underline">
            Backstage en WhatsApp
          </a>{" "}
          para recibir la invitación a los grupos correspondientes a cada marca.
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
            <div><strong className="text-red-700 dark:text-red-400">Prohibido hacer trampa:</strong> No se puede salir del chat para usar buscadores ni compartir respuestas. Del mismo modo herramientas como el teclado predictivo de WhatsApp o aplicaciones similares también están completamente prohibidas.</div>
          </li>
          <li className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            <div className="min-w-6 mt-0.5 text-yellow-500"><ShieldAlert className="w-5 h-5" /></div>
            <div>Se usarán llamadas de atención por trampa. A la <strong className="text-yellow-600 dark:text-yellow-500">2da llamada</strong> se resta un punto. A la <strong className="text-red-600 dark:text-red-500">3ra llamada</strong>, descalificación del combate.</div>
          </li>
          <li className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            <div className="min-w-6 mt-0.5 text-indigo-500"><FileText className="w-5 h-5" /></div>
            <div>Es obligatorio usar &quot;The&quot; en nombres de luchadores, tag teams o stables de una sola palabra (ej: The Miz). Es opcional en nombres de más de una palabra (ej: Big Show).</div>
          </li>
          <li className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            <div className="min-w-6 mt-0.5 text-indigo-500"><FileText className="w-5 h-5" /></div>
            <div>No se tomará en cuenta un mensaje editado que contenía una respuesta incorrecta; se debe enviar un nuevo mensaje.</div>
          </li>
          <li className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            <div className="min-w-6 mt-0.5 text-indigo-500"><FileText className="w-5 h-5" /></div>
            <div>Para &quot;Finisher&quot; o &quot;Theme Song&quot;, cualquier canción o finisher de toda su carrera es válido, salvo que el árbitro indique lo contrario.</div>
          </li>
          <li className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            <div className="min-w-6 mt-0.5 text-indigo-500"><FileText className="w-5 h-5" /></div>
            <div>Cuando se pide nombrar una lucha, se debe agregar <strong className="text-gray-900 dark:text-white">SIN EXCEPCIÓN</strong> el &quot;vs&quot; entre participantes, pero cuando se pide nombrar participantes, <strong className="text-gray-900 dark:text-white">NO</strong> se tomará por válido si escriben &quot;vs&quot; entre los mismos.</div>
          </li>
          <li className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl">
            <div className="min-w-6 mt-0.5 text-indigo-500"><FileText className="w-5 h-5" /></div>
            <div>Cuando se pide la estipulación de un combate, es obligatorio agregar &quot;match&quot; al final de la estipulación (ej: Steel Cage match).</div>
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

  const refereeSections = [
    {
      id: "preparativos",
      title: "1. Preparativos de la Lucha",
      icon: <Clock className="w-5 h-5 text-blue-500" />,
      content: (
        <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
          <p>
            Para llamar a los competidores hay que copiar <strong>ÚNICAMENTE</strong> la lucha de la cartelera que se va a llevar a cabo a continuación (incluyendo las banderas que notifican el horario), y debajo de los nombres de los PJ, se les arroba para que les llegue la notificación, acompañado del tiempo restante que tienen para presentarse.
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30 space-y-3">
            <h4 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Tolerancia y Plazo de Espera
            </h4>
            <p className="text-sm md:text-base">
              El tiempo restante puede variar, pero como máximo tienen <strong>CINCO MINUTOS</strong> pasada la hora de la mención para presentarse y empezar a competir:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-blue-200 dark:border-zinc-700 shadow-sm text-sm">
                <strong className="text-blue-600 dark:text-blue-400 block mb-1">Llamado en la hora fijada:</strong>
                Si la lucha está estipulada para las <strong>21:30</strong>, los competidores tienen como máximo hasta las <strong>21:35</strong> para presentarse, y se les debe notificar expresamente.
              </div>
              <div className="bg-white dark:bg-zinc-800 p-4 rounded-xl border border-blue-200 dark:border-zinc-700 shadow-sm text-sm">
                <strong className="text-blue-600 dark:text-blue-400 block mb-1">Llamado con margen anticipado:</strong>
                Si la lucha anterior deja suficiente margen y se les llama a las <strong>21:22</strong> para las <strong>21:30</strong>, se les debe notificar que disponen de <strong>13 minutos</strong> (8 min hasta la hora fijada + 5 min de margen permitido).
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 flex items-start gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400 mt-0.5">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-gray-900 dark:text-white mb-1">Otorgar Rango de Administrador</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Tras el llamado, se les designa como administradores del grupo para que puedan escribir en el chat de combate.
                </p>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-200 dark:border-zinc-700 flex items-start gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400 mt-0.5">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-bold text-gray-900 dark:text-white mb-1">Confirmar Formato de Respuesta</h5>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  El árbitro debe conocer con cuál de los tres formatos (<strong>MAYÚSCULAS</strong>, <strong>minúsculas</strong> o <strong>Formato Frase</strong>) competirán los luchadores. Una vez sabido, la lucha puede comenzar.
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "desarrollo-lucha",
      title: "2. Dinámica y Desarrollo de la Lucha",
      icon: <HelpCircle className="w-5 h-5 text-indigo-500" />,
      content: (
        <div className="space-y-5 text-base text-gray-700 dark:text-gray-300">
          <div className="bg-indigo-50/70 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
            <h4 className="font-bold text-indigo-800 dark:text-indigo-300 mb-1 flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Preparación Previa de Preguntas
            </h4>
            <p className="text-sm md:text-base text-gray-600 dark:text-gray-300">
              El árbitro debe preparar las correspondientes preguntas antes de que comience la lucha (las cuales deben ser lo más específicas posibles) y haber comprobado minuciosamente que todo está correcto en sus apuntes, evitando posibles conflictos en mitad de la lucha que perjudicarían al show por retrasarlo en caso de polémicas.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 dark:text-white text-lg">
              Protocolo paso a paso durante cada pregunta:
            </h4>

            <div className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-700">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                1
              </div>
              <div className="space-y-1">
                <strong className="text-gray-900 dark:text-white block">Separación estricta de mensajes</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Para cada pregunta, se debe decir primero el número en un mensaje aparte: <code className="bg-indigo-100 dark:bg-zinc-700 px-2 py-0.5 rounded font-mono text-indigo-700 dark:text-indigo-300 font-bold">PRIMERA PREGUNTA</code>. <span className="text-red-500 dark:text-red-400 font-semibold">(Nada de &quot;1 - ¿Qué luchador...?&quot;)</span>. Es obligatorio que el número de la pregunta y la formulación estén separados. Luego se envía la pregunta en otro mensaje.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-700">
              <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                2
              </div>
              <div className="space-y-1">
                <strong className="text-gray-900 dark:text-white flex items-center gap-2">
                  Confirmación con reacción <ThumbsUp className="w-4 h-4 text-green-500" />
                </strong>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Se espera a que un competidor acierte la respuesta. Cuando lo haga, el árbitro debe reaccionar a ese mensaje con el emoticono del pulgar hacia arriba (👍).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-700">
              <div className="w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/50 text-yellow-600 dark:text-yellow-400 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                3
              </div>
              <div className="space-y-1">
                <strong className="text-gray-900 dark:text-white block">Comprobación de actividad con puntos</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Es importante enviar puntos (<code className="bg-gray-200 dark:bg-zinc-700 px-1.5 py-0.5 rounded font-bold">.</code>) de vez en cuando para asegurarse de que los competidores siguen en el chat y la conexión fluye con normalidad.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-700">
              <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                4
              </div>
              <div className="space-y-1">
                <strong className="text-gray-900 dark:text-white block">Cuenta regresiva de pregunta nula</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Si tras un tiempo indefinido ninguno de los dos da con la respuesta correcta, se comienza el conteo escribiendo <code className="bg-orange-100 dark:bg-zinc-700 px-2 py-0.5 rounded font-bold text-orange-700 dark:text-orange-300">Nula en</code> y después una cuenta regresiva desde diez hasta cero (10, 9, 8... 0).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-xl border border-gray-100 dark:border-zinc-700">
              <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm flex-shrink-0 mt-0.5">
                5
              </div>
              <div className="space-y-1">
                <strong className="text-gray-900 dark:text-white block">Actualización de marcador y siguiente pregunta</strong>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Cuando el resultado de la pregunta esté decidido, se notifica el marcador: <code className="font-semibold">1-0</code> (o <code className="font-semibold">0-0</code> en caso de nula). Luego se anuncia <code className="font-semibold">SEGUNDA PREGUNTA</code> y se repite el proceso. <strong className="text-purple-600 dark:text-purple-400 block mt-1">Importante: En caso de que alguna pregunta quede nula, siempre se debe recordar el marcador anterior</strong> (por ejemplo: si iban 2-1, y la cuarta pregunta queda nula, se vuelve a recordar que se mantiene ese 2-1).
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "comandos-arbitro",
      title: "3. Vocabulario Oficial de Corrección: NO, MAL ESCRITO, MAL FORMATO, FALTA",
      icon: <AlertCircle className="w-5 h-5 text-red-500" />,
      content: (
        <div className="space-y-6 text-base text-gray-700 dark:text-gray-300">
          <div className="bg-red-50 dark:bg-red-900/15 p-4 rounded-2xl border border-red-200 dark:border-red-900/40">
            <p className="font-semibold text-red-800 dark:text-red-300 text-sm md:text-base">
              ⚠️ <strong>Regla estricta:</strong> Son las <u>únicas frases</u> con las que el árbitro debe dirigirse a los competidores en mitad de una pregunta cuando formulen una respuesta errónea o incompleta.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-zinc-800 p-5 rounded-2xl border-2 border-red-200 dark:border-red-900/50 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-red-600 dark:text-red-400 font-black text-xl tracking-wide">
                <XCircle className="w-6 h-6" /> NO
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Se utiliza cuando la respuesta es directamente incorrecta.
              </p>
              <div className="bg-gray-50 dark:bg-zinc-900/70 p-3.5 rounded-xl text-xs md:text-sm font-mono border border-gray-100 dark:border-zinc-700">
                <span className="text-gray-500 block mb-1">Ejemplo (Main Event de WrestleMania 30):</span>
                <span className="text-red-500">Respuesta: &quot;The Undertaker vs Edge&quot;</span>
                <span className="text-gray-900 dark:text-white block font-black mt-1">→ Árbitro responde: NO</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-5 rounded-2xl border-2 border-amber-200 dark:border-amber-900/50 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-amber-600 dark:text-amber-400 font-black text-xl tracking-wide">
                <FileText className="w-6 h-6" /> MAL ESCRITO
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Se utiliza cuando la respuesta es correcta en contenido pero tiene errores de ortografía, o cuando no se usa el gimmick / ring name que corresponde al período de tiempo en que se ubica la pregunta.
              </p>
              <div className="bg-gray-50 dark:bg-zinc-900/70 p-3.5 rounded-xl text-xs md:text-sm font-mono border border-gray-100 dark:border-zinc-700 space-y-2.5">
                <div>
                  <span className="text-gray-500 block">Ejemplo ortográfico (ME de WrestleMania 30):</span>
                  <span className="text-amber-500">&quot;Daniek Bryan vs Batistta vs Randy Oryon&quot;</span>
                  <span className="text-gray-900 dark:text-white block font-black mt-0.5">→ Árbitro responde: MAL ESCRITO</span>
                </div>
                <div className="border-t border-gray-200 dark:border-zinc-700 pt-2 font-sans text-xs text-gray-600 dark:text-gray-400">
                  <strong className="text-gray-800 dark:text-gray-200 block mb-1">Gimmick o Ring Name histórico:</strong>
                  Si se pregunta por los miembros de <em>League of Nations</em> y responden <em>Wade Barrett</em>, es erróneo porque en ese momento su gimmick era <strong>King Barrett</strong>. Lo mismo aplica a <em>Theory</em> vs <em>Austin Theory</em>, <em>Antonio Cesaro</em> vs <em>Cesaro</em>, o <em>Johnny Nitro</em> vs <em>John Morrison</em>. Se debe escribir el nombre del período exacto.
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-5 rounded-2xl border-2 border-blue-200 dark:border-blue-900/50 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400 font-black text-xl tracking-wide">
                <CheckSquare className="w-6 h-6" /> MAL FORMATO
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Se utiliza cuando un competidor se sale del formato elegido previamente para responder con otro.
              </p>
              <div className="bg-gray-50 dark:bg-zinc-900/70 p-3.5 rounded-xl text-xs md:text-sm font-mono border border-gray-100 dark:border-zinc-700">
                <span className="text-gray-500 block mb-1">Ejemplo:</span>
                <span className="text-blue-500">Eligió minúsculas y aparece alguna mayúscula en su respuesta.</span>
                <span className="text-gray-900 dark:text-white block font-black mt-1">→ Árbitro responde: MAL FORMATO</span>
                <span className="text-xs text-gray-500 font-sans block mt-1">Por mucho que sea correcta, no se dará por válida por no haberla escrito dentro de su formato.</span>
              </div>
            </div>

            <div className="bg-white dark:bg-zinc-800 p-5 rounded-2xl border-2 border-purple-200 dark:border-purple-900/50 shadow-sm">
              <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400 font-black text-xl tracking-wide">
                <AlertCircle className="w-6 h-6" /> FALTA
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                Se utiliza cuando la respuesta está incompleta respecto a la consigna planteada.
              </p>
              <div className="bg-gray-50 dark:bg-zinc-900/70 p-3.5 rounded-xl text-xs md:text-sm font-mono border border-gray-100 dark:border-zinc-700">
                <span className="text-gray-500 block mb-1">Ejemplo (Main Event de WrestleMania 30):</span>
                <span className="text-purple-500">Respuesta: &quot;Daniel Bryan vs Batista&quot;</span>
                <span className="text-gray-900 dark:text-white block font-black mt-1">→ Árbitro responde: FALTA</span>
                <span className="text-xs text-gray-500 font-sans block mt-1">(Falta Randy Orton en la triple amenaza).</span>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-indigo-50/30 dark:from-zinc-800/80 dark:to-zinc-800/40 p-5 rounded-2xl border border-gray-200 dark:border-zinc-700">
            <h4 className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> Combinación de Señales de Corrección
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              El &quot;Mal escrito&quot;, &quot;Mal formato&quot; y &quot;Falta&quot; pueden incluso combinarse si el participante comete más de un error a la vez en su respuesta:
            </p>
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl mt-3 text-xs md:text-sm font-mono border border-gray-200 dark:border-zinc-700">
              <span className="text-gray-500 block mb-1">Pregunta: Main Event de WM 30 (Competidor en minúsculas)</span>
              <span className="text-indigo-600 dark:text-indigo-400 block font-bold">Respuesta enviada: &quot;Daniek bryan vs randy ortin&quot;</span>
              <div className="text-gray-900 dark:text-white font-extrabold mt-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                → Árbitro responde: <span className="text-amber-600 dark:text-amber-400">MAL ESCRITO</span>, <span className="text-purple-600 dark:text-purple-400">FALTA</span>, <span className="text-blue-600 dark:text-blue-400">MAL FORMATO</span>
              </div>
              <span className="text-xs text-gray-500 font-sans block mt-1.5">
                (Están mal escritos los nombres, falta agregar a Batista, y además contestó con una mayúscula fuera de su formato elegido).
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "polemicas",
      title: "4. Gestión de Polémicas",
      icon: <Scale className="w-5 h-5 text-orange-500" />,
      content: (
        <div className="space-y-4 text-base text-gray-700 dark:text-gray-300">
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 p-6 rounded-2xl border border-orange-200 dark:border-orange-900/30 flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-full shadow-sm flex-shrink-0">
              <Scale className="w-10 h-10 text-orange-500" />
            </div>
            <div className="space-y-2">
              <h4 className="text-lg font-bold text-orange-800 dark:text-orange-400">
                Resolución en Junta Directiva post-lucha
              </h4>
              <p className="text-sm md:text-base text-gray-700 dark:text-gray-300">
                En caso de que alguna pregunta genere polémica, se les notifica a los competidores que <strong>se estudiará el caso en Junta Directiva una vez termine la lucha</strong>, y posteriormente se determinará un veredicto final.
              </p>
              <div className="mt-3 p-3.5 bg-white/80 dark:bg-zinc-900/60 rounded-xl text-xs md:text-sm text-gray-600 dark:text-gray-400 border border-orange-100 dark:border-orange-900/30">
                <strong>Propósito fundamental:</strong> No afectar al desarrollo normal del encuentro y resguardar la puntualidad con la que deben llevarse a cabo el resto de luchas de la cartelera del show.
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "conclusion-cartelera",
      title: "5. Conclusión y Registro de la Cartelera",
      icon: <Trophy className="w-5 h-5 text-green-500" />,
      content: (
        <div className="space-y-6 text-base text-gray-700 dark:text-gray-300">
          <p>
            Una vez termine la lucha, el árbitro debe informar a los competidores sobre el resultado final (por ejemplo, <code className="font-bold">3-2</code>). Tras esto, el árbitro debe copiar la cartelera completa en la que ya se han establecido los resultados anteriores y agregar el resultado de la lucha que acaba de finalizar.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50/70 dark:bg-green-900/10 p-5 rounded-2xl border border-green-200 dark:border-green-800/40 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-green-800 dark:text-green-400 text-sm uppercase tracking-wider mb-2">
                  Lucha con Ganador
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Al ganador se le resalta en <strong>negrita</strong> colocando un asterisco al comienzo y al final de su nombre, y se coloca el resultado final entre los nombres de los competidores.
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl font-mono text-xs md:text-sm border border-green-200 dark:border-zinc-700 text-center font-bold text-gray-900 dark:text-white">
                *Axiom* 3-2 Jacob Fatu
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-zinc-800/50 p-5 rounded-2xl border border-gray-200 dark:border-zinc-700 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-gray-700 dark:text-gray-300 text-sm uppercase tracking-wider mb-2">
                  Lucha en Empate
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  En caso de empate, <strong>no se resalta NADA en negrita</strong>: ni los nombres de los competidores, ni el resultado.
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl font-mono text-xs md:text-sm border border-gray-200 dark:border-zinc-700 text-center text-gray-700 dark:text-gray-300">
                Axiom 2-2 Jacob Fatu
              </div>
            </div>

            <div className="bg-red-50/70 dark:bg-red-900/10 p-5 rounded-2xl border border-red-200 dark:border-red-800/40 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-red-800 dark:text-red-400 text-sm uppercase tracking-wider mb-2">
                  No Presentación / Default (5-0)
                </h5>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  El ausente pierde por <strong>5-0</strong>. Se resalta al ganador en negrita, se coloca el marcador y al perdedor se le ubica un punto entre paréntesis <code className="font-bold text-red-600 dark:text-red-400">(.)</code> en la parte de su nombre más próxima al resultado.
                </p>
              </div>
              <div className="bg-white dark:bg-zinc-900 p-2.5 rounded-xl font-mono text-xs border border-red-200 dark:border-zinc-700 space-y-1.5 text-center text-gray-900 dark:text-white">
                <div className="font-bold">*Axiom* 5-0 (.)Jacob Fatu</div>
                <div className="text-gray-400 text-[10px]">Orden inverso:</div>
                <div className="font-bold">Jacob Fatu(.) 0-5 *Axiom*</div>
              </div>
            </div>
          </div>

          <div className="bg-indigo-50 dark:bg-indigo-900/10 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <p className="text-sm text-indigo-900 dark:text-indigo-200">
              <strong>Paso de Administrador:</strong> Cuando todo ese trabajo esté hecho, se les quita el admin a los competidores que hayan terminado, y se les entrega a los siguientes que vayan a competir.
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <>
      <Head>
        <title>
          {activeTab === "arbitros"
            ? "Manual de Árbitros — Trivias WWE"
            : "Reglamento Oficial — Trivias WWE"}
        </title>
        <meta
          name="description"
          content={
            activeTab === "arbitros"
              ? "Manual oficial de árbitros para el Campeonato de Trivias de WWE. Funciones, protocolo de llamadas, comandos de corrección y reporte de resultados."
              : "Reglamento oficial del Campeonato de Trivias de WWE. Reglas, horarios, puntuación, sanciones y más."
          }
        />
      </Head>

      <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200 font-sans">
        <div className="max-w-4xl mx-auto">
          
          {/* Selector de Sección: Competidores vs Árbitros */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex p-1.5 bg-gray-200/80 dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm max-w-md w-full">
              <button
                type="button"
                onClick={() => handleTabChange("competidores")}
                className={`flex-1 py-3 px-4 rounded-xl text-sm md:text-base font-bold flex items-center justify-center gap-2.5 transition-all ${
                  activeTab === "competidores"
                    ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Trophy className="w-4 h-4 flex-shrink-0" />
                <span>Competidores</span>
              </button>
              <button
                type="button"
                onClick={() => handleTabChange("arbitros")}
                className={`flex-1 py-3 px-4 rounded-xl text-sm md:text-base font-bold flex items-center justify-center gap-2.5 transition-all ${
                  activeTab === "arbitros"
                    ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-sm"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                <Gavel className="w-4 h-4 flex-shrink-0" />
                <span>Manual de Árbitros</span>
              </button>
            </div>
          </div>

          {/* Header dinámico según la sección activa */}
          {activeTab === "competidores" ? (
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
          ) : (
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center p-4 bg-amber-100 dark:bg-amber-900/30 rounded-2xl mb-6 shadow-sm transform rotate-3 hover:rotate-0 transition-transform">
                <Gavel className="w-10 h-10 text-amber-600 dark:text-amber-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
                Manual de Árbitros
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                Guía oficial y protocolos para arbitrar en Trivias WWE: preparativos, dinámicas en combate, vocabulario estricto y resolución de resultados.
              </p>
            </div>
          )}

          {/* Contenido: Manual de Árbitros */}
          {activeTab === "arbitros" && (
            <div className="mb-8 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl border border-zinc-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-amber-500/20 rounded-xl text-amber-400 border border-amber-500/30">
                  <Gavel className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold">¿Cómo arbitrar en Trivias WWE?</h2>
              </div>
              <p className="text-gray-300 text-base leading-relaxed mb-6">
                Las funciones de un árbitro en Trivias WWE son varias: primero debe avisar a los competidores al horario correspondiente para su lucha, después debe saber el formato con el que cada uno de los participantes va a competir, realizar las preguntas y determinar quién es el ganador de cada punto y por consiguiente de la lucha.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">1</span>
                  <span className="text-sm font-medium text-gray-200">Avisar a competidores en su horario pactado</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">2</span>
                  <span className="text-sm font-medium text-gray-200">Verificar el formato elegido de respuesta</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">3</span>
                  <span className="text-sm font-medium text-gray-200">Formular preguntas claras y validadas</span>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">4</span>
                  <span className="text-sm font-medium text-gray-200">Determinar los puntos y ganador final</span>
                </div>
              </div>
            </div>
          )}

          {/* Acordeón de secciones según la pestaña activa */}
          <div className="space-y-4">
            {(activeTab === "competidores" ? competitorSections : refereeSections).map((section) => (
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

          {/* Call to action inferior */}
          {activeTab === "competidores" ? (
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
                  href="https://chat.whatsapp.com/D7vkfUKTujZ8nr6xlQj02C" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-indigo-600 px-8 py-4 rounded-full font-bold hover:bg-indigo-50 hover:scale-105 transition-all shadow-lg hover:shadow-xl"
                >
                  Unirse al Torneo en WhatsApp <UserPlus className="w-5 h-5" />
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-16 text-center bg-gradient-to-br from-amber-600 via-amber-700 to-orange-700 rounded-3xl p-10 shadow-xl text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
              <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-white opacity-10 rounded-full blur-xl"></div>
              
              <div className="relative z-10">
                <Gavel className="w-14 h-14 mx-auto mb-5 text-amber-200" />
                <h2 className="text-3xl font-bold mb-3">Compromiso y Neutralidad</h2>
                <p className="text-amber-100 mb-8 max-w-xl mx-auto text-lg">
                  Un arbitraje ordenado, riguroso y puntual garantiza la legitimidad del Campeonato de Trivias de WWE.
                </p>
                <a 
                  href="https://chat.whatsapp.com/D7vkfUKTujZ8nr6xlQj02C" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-white text-amber-700 px-8 py-4 rounded-full font-bold hover:bg-amber-50 hover:scale-105 transition-all shadow-lg hover:shadow-xl"
                >
                  Grupo de Backstage en WhatsApp <UserPlus className="w-5 h-5" />
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
