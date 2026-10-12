// components/FlagWithName.js

export default function FlagWithName({ code, name }) {
  if (!name && !code) return null;

  if (!code) {
    return <span>{name}</span>;
  }

  const flagImg = (
    <img
      src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
      alt={`${code} flag`}
      className="w-5 h-3 rounded-sm shadow shrink-0"
      onError={(e) => {
        // Si flagcdn.com falla o el código no existe,
        // oculta la imagen rota en lugar de mostrar el ícono broken
        e.currentTarget.style.display = "none";
      }}
    />
  );

  if (!name) {
    return flagImg;
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-left leading-tight">
      {flagImg}
      <span className="inline-block">{name}</span>
    </span>
  );
}