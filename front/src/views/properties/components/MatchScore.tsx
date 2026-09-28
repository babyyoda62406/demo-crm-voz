import { scoreTone } from '../enums/propertyCatalogs';

interface MatchScoreProps {
  score: number;
  /** Tamaño del anillo. Se puede reducir en pantallas estrechas. */
  className?: string;
}

/** Anillo de puntuación (0-100) de una coincidencia. */
export const MatchScore = ({ score, className = 'w-[68px] h-[68px]' }: MatchScoreProps) => {
  const tono = scoreTone(score);
  const grados = Math.round((Math.max(0, Math.min(100, score)) / 100) * 360);

  return (
    <div
      className={`relative flex-shrink-0 rounded-full p-[3px] ${className}`}
      style={{
        background: `conic-gradient(${tono.ring} ${grados}deg, rgba(148, 163, 184, 0.28) ${grados}deg)`,
      }}
      role="img"
      aria-label={`Puntuación ${score} sobre 100`}
    >
      <div className="w-full h-full rounded-full backdrop-blur-md bg-white/75 flex flex-col items-center justify-center leading-none">
        <span className={`text-lg font-bold ${tono.text}`}>{score}</span>
        <span className="text-[10px] font-semibold text-gray-600">/ 100</span>
      </div>
    </div>
  );
};
