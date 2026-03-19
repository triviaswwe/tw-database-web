// components/FlagWithName.js

export default function FlagWithName({ code, name }) {
  if (!code) {
    return (
      <span className="inline-flex items-center gap-1">
        <span>{name}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <img
        src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
        alt={`${code} flag`}
        className="w-5 h-3 rounded-sm shadow"
        onError={(e) => {
          // Si flagcdn.com falla o el código no existe,
          // oculta la imagen rota en lugar de mostrar el ícono broken
          e.currentTarget.style.display = "none";
        }}
      />
      <span>{name}</span>
    </span>
  );
}