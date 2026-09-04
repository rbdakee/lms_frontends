"use client";

/**
 * Общая обвязка движения второй площадки.
 *
 * Библиотека `motion` подключается лениво: `LazyMotion` подгружает набор
 * `domAnimation` — анимации, выходы и жесты, — и не тянет перетаскивание
 * и layout-проекции, которых на витрине нет. Это примерно треть веса пакета
 * вместо целого; площадку открывают с телефона и часто с мобильного
 * интернета, поэтому цена движения считается в килобайтах, а не только
 * в кадрах.
 *
 * Из-за `strict` в разметке разрешены только компоненты `m.*`. Обычный
 * `motion.*` тянет весь пакет мимо ленивой загрузки и здесь падает
 * намеренно: иначе экономия исчезнет от одной случайной строки.
 *
 * `Reveal` — единственный способ появления блока при прокрутке на всей
 * площадке. Отдельный компонент, а не `whileInView`, скопированный в каждую
 * секцию: пороги и задержки иначе разъедутся, и страница задышит вразнобой.
 * Тег задаётся снаружи (`as`), потому что появляться приходится и пунктам
 * списков: обёртка `div` вокруг `li` сломала бы и сетку, и разметку списка.
 *
 * `prefers-reduced-motion` уважается здесь, а не в каждом вызове. Человеку,
 * который попросил систему убрать движение, блоки показываются сразу
 * и без сдвига — «появления» для него просто нет.
 */

import { LazyMotion, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import type { ReactNode } from "react";

/** Кривая всей площадки: быстрый старт, длинное мягкое торможение.
    Одна на все переходы — разнобой кривых заметен даже там, где совпадают
    длительности. */
export const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/** Набор возможностей приезжает отдельным куском — см. `features.ts`. */
const loadFeatures = () => import("./features").then((mod) => mod.default);

const TAGS = { div: m.div, li: m.li } as const;

export function Reveal({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: keyof typeof TAGS;
}) {
  const still = useReducedMotion();
  if (still) {
    return as === "li" ? (
      <li className={className}>{children}</li>
    ) : (
      <div className={className}>{children}</div>
    );
  }
  const Tag = TAGS[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      /* `once` обязателен: блок, который уезжает и приезжает обратно при
         каждой прокрутке вверх, читается как дефект, а не как оформление. */
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -60px 0px" }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

/** Провайдер ленивой загрузки. Своего DOM не создаёт — это только контекст,
    поэтому его можно обернуть вокруг полос во всю ширину окна. */
export function MotionRoot({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      {children}
    </LazyMotion>
  );
}
