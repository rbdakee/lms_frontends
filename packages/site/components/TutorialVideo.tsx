"use client";

/**
 * Обучающий ролик на главной. Ссылку ставит админ в настройках, своя
 * у каждой площадки, а сервер приводит её к виду `watch?v=…` — поэтому
 * разбор тот же, что у плеера урока.
 *
 * Разметка плеера та же, что у видеоурока: учитель увидит здесь тот же
 * проигрыватель, что потом в уроках. Секцию вокруг рисует сама площадка —
 * лендинги у них свёрстаны по-разному.
 */

import { youtubeId } from "@lms/course";

export function TutorialVideo({ url, title }: { url: string; title: string }) {
  const id = youtubeId(url);
  if (!id) return null;
  return (
    <div className="player">
      {/* nocookie-домен: пока учитель не нажал «плей», YouTube не пишет куки */}
      <iframe
        className="player-frame"
        src={`https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1`}
        title={title}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
