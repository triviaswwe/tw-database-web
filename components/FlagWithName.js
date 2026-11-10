// components/FlagWithName.js
import React from "react";

export default function FlagWithName({ code, name, breakOnSpace = false }) {
  if (!name && !code) return null;

  const displayName =
    breakOnSpace && typeof name === "string" && name.includes(" ")
      ? name.split(" ").map((part, i, arr) => (
          <React.Fragment key={i}>
            {part}
            {i < arr.length - 1 && (
              <>
                <span className="hidden md:inline"> </span>
                <br className="md:hidden" />
              </>
            )}
          </React.Fragment>
        ))
      : name;

  if (!code) {
    return <span>{displayName}</span>;
  }

  const flagImg = (
    <img
      src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
      alt={`${code} flag`}
      className="inline-block w-5 h-3 rounded-sm shadow shrink-0 align-middle"
      onError={(e) => {
        // Si flagcdn.com falla o el código no existe,
        // oculta la imagen rota en lugar de mostrar el ícono broken
        e.currentTarget.style.display = "none";
      }}
    />
  );

  if (!name) {
    return (
      <span className="inline-flex items-center align-middle">
        {flagImg}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-left leading-tight align-top">
      {flagImg}
      <span className="inline-block">{displayName}</span>
    </span>
  );
}