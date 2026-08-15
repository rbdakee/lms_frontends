"use client";

/**
 * Состояние прототипа. Хранится в localStorage, чтобы клики «жили»
 * между страницами и после перезагрузки: отправил заявку — она видна
 * в кабинете и в админке; админ открыл доступ — курс появился в «Моих курсах».
 *
 * Доступ к курсу выдаёт админ вручную, поэтому у курса три состояния:
 * заявки нет → заявка отправлена → доступ открыт.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  adminQuestions,
  adminReviews,
  DEMO_COURSE_ID,
  notificationIds,
  teacherProfile,
  type LessonKind,
  type ThreadReply,
} from "./data";
import { dict, type UiLang } from "@lms/ui/i18n";

export type TaskStatus = "none" | "review" | "accepted" | "rework";

/**
 * Элементы программы, добавленные админом прямо в прототипе — раздел 5.17.
 * Живут в общем состоянии, чтобы новый урок был виден и в дереве программы,
 * и в своём редакторе, куда его открывают сразу после добавления.
 */
export interface DraftItem {
  id: string;
  courseId: string;
  moduleId: string;
  title: string;
  kind: LessonKind;
  timeMin: number;
}

export interface DraftModule {
  id: string;
  courseId: string;
  title: string;
}

/** Состояние курса у учителя — раздел 5.3 брифа. */
export type CourseAccess = "none" | "requested" | "granted";

export interface QuizResult {
  score: number;
  maxScore: number;
  pct: number;
  passed: boolean;
  minutesSpent: number;
  answers: Record<string, number[]>;
  timedOut?: boolean;
  date: string;
}

/** Попытки не затираются никогда, даже когда засчитывается последняя. */
export interface QuizAttempt extends QuizResult {
  id: string;
}

export interface Profile {
  lastName: string;
  firstName: string;
  middleName: string;
  email: string;
  school: string;
  position: string;
  region: string;
  city: string;
  subject: string;
  experience: string;
  phone: string;
}

interface State {
  authed: boolean;
  onboarded: boolean;
  lang: UiLang;
  /** Курсы, к которым админ открыл доступ */
  enrolled: string[];
  /** Отправленные заявки: courseId → сколько дней назад отправлена */
  requests: Record<string, number>;
  /** courseId → список id пройденных уроков */
  completed: Record<string, string[]>;
  /** lessonId теста → зачётный результат */
  quizzes: Record<string, QuizResult>;
  /** lessonId теста → все попытки, включая незачётные */
  attempts: Record<string, QuizAttempt[]>;
  /** разрешённые админом пересдачи (только у непересдаваемых тестов) */
  quizRetakes: string[];
  /** lessonId задания → статус */
  tasks: Record<string, TaskStatus>;
  readNotifications: string[];
  profile: Profile;
  /** есть ли загруженное фото — без него показываем инициалы */
  hasPhoto: boolean;
  /** курсы, по которым выдан сертификат */
  certs: string[];
  /** оценки курсов */
  ratings: Record<string, number>;
  /** курсы со строгим последовательным порядком уроков (настройка админа) */
  strictCourses: string[];
  /** Ответы в тредах: id вопроса → добавленные ответы.
      Живут в общем состоянии, чтобы ответ из карточки курса был виден
      и в разделе «Вопросы», и под уроком. */
  threadReplies: Record<string, ThreadReply[]>;
  /** Ответы админа на отзывы: id отзыва → текст */
  reviewReplies: Record<string, string>;
  /** Удалённые отзывы — премодерации нет, есть удаление постфактум */
  hiddenReviews: string[];
  /** Заявки в админке: id заявки → статус (переопределяет данные моков) */
  leadStatus: Record<string, string>;
  /** Отозванные сессии в профиле */
  revokedSessions: string[];
  /** Модули, добавленные админом в редакторе программы */
  draftModules: DraftModule[];
  /** Уроки, тесты и задания, добавленные админом в редакторе программы */
  draftItems: DraftItem[];
  /** Режим «Предпросмотр как учитель»: ничего не записывается */
  preview: boolean;
}

/** Стартовое состояние — сразу все интересные случаи, как просит бриф. */
function initialState(): State {
  return {
    authed: true,
    onboarded: true,
    lang: "ru",
    /* Доступ открыт к двум курсам: один в процессе, один завершён с сертификатом */
    enrolled: [DEMO_COURSE_ID, "formative-assessment"],
    /* Заявка отправлена два дня назад — курса ещё нет, ждём администратора */
    requests: { "ai-for-teacher": 2 },
    completed: {
      [DEMO_COURSE_ID]: ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8", "l9", "l10", "l11", "l12"],
      "formative-assessment": [],
    },
    quizzes: {
      l4: {
        score: 7,
        maxScore: 8,
        pct: 88,
        passed: true,
        minutesSpent: 9,
        answers: {},
        date: "6 августа 2026",
      },
      l9: {
        score: 9,
        maxScore: 10,
        pct: 90,
        passed: true,
        minutesSpent: 11,
        answers: {},
        date: "10 августа 2026",
      },
    },
    attempts: {
      l4: [
        {
          id: "a-l4-1",
          score: 7,
          maxScore: 8,
          pct: 88,
          passed: true,
          minutesSpent: 9,
          answers: {},
          date: "6 августа 2026",
        },
      ],
      l9: [
        {
          id: "a-l9-1",
          score: 9,
          maxScore: 10,
          pct: 90,
          passed: true,
          minutesSpent: 11,
          answers: {},
          date: "10 августа 2026",
        },
      ],
    },
    quizRetakes: [],
    tasks: { l7: "accepted", l12: "rework", l17: "none" },
    readNotifications: [],
    profile: {
      lastName: teacherProfile.lastName,
      firstName: teacherProfile.firstName,
      middleName: teacherProfile.middleName,
      email: "",
      school: teacherProfile.school,
      position: teacherProfile.position,
      region: teacherProfile.region,
      city: teacherProfile.city,
      subject: teacherProfile.subject,
      experience: teacherProfile.experience,
      phone: teacherProfile.phone,
    },
    hasPhoto: false,
    certs: ["formative-assessment"],
    ratings: {},
    strictCourses: [],
    threadReplies: {},
    reviewReplies: {},
    hiddenReviews: [],
    leadStatus: {},
    revokedSessions: [],
    draftModules: [],
    draftItems: [],
    preview: false,
  };
}

/** Состояние «новый пользователь» — для проверки пустых экранов. */
function emptyState(): State {
  const s = initialState();
  return {
    ...s,
    authed: false,
    onboarded: false,
    enrolled: [],
    requests: {},
    completed: {},
    quizzes: {},
    attempts: {},
    tasks: {},
    certs: [],
    profile: { ...s.profile, lastName: "", firstName: "", middleName: "", email: "" },
  };
}

interface Ctx extends State {
  t: (typeof dict)["ru"];
  ready: boolean;
  set: (patch: Partial<State> | ((s: State) => Partial<State>)) => void;
  setLang: (l: UiLang) => void;
  /** Учитель нажал «Записаться» — заявка ушла администратору */
  requestAccess: (courseId: string) => void;
  /** Админ открыл доступ — курс появился у учителя */
  grantAccess: (courseId: string) => void;
  /** Админ закрыл доступ — прогресс и результаты остаются */
  revokeAccess: (courseId: string) => void;
  access: (courseId: string) => CourseAccess;
  isEnrolled: (courseId: string) => boolean;
  requestDays: (courseId: string) => number | null;
  completeLesson: (courseId: string, lessonId: string) => void;
  uncompleteLesson: (courseId: string, lessonId: string) => void;
  isCompleted: (courseId: string, lessonId: string) => boolean;
  saveQuiz: (quizId: string, r: QuizResult) => void;
  allowRetake: (quizId: string) => void;
  setTask: (taskId: string, status: TaskStatus) => void;
  markAllRead: () => void;
  markRead: (id: string) => void;
  issueCert: (courseId: string) => void;
  rateCourse: (courseId: string, stars: number) => void;
  setStrict: (courseId: string, strict: boolean) => void;
  isStrict: (courseId: string) => boolean;
  /** Ответ в тред вопроса — от админа или от коллеги */
  addReply: (threadId: string, reply: ThreadReply) => void;
  repliesFor: (threadId: string, base: ThreadReply[]) => ThreadReply[];
  replyToReview: (id: string, text: string) => void;
  hideReview: (id: string) => void;
  setLeadStatus: (id: string, status: string) => void;
  revokeSession: (id: string) => void;
  revokeOtherSessions: () => void;
  /** Добавить модуль в программу курса */
  addModule: (courseId: string, title: string) => DraftModule;
  /** Добавить урок, тест или задание внутрь модуля */
  addItem: (item: Omit<DraftItem, "id">) => DraftItem;
  /** Правки из редактора элемента возвращаются в дерево программы */
  updateDraft: (id: string, patch: Partial<Omit<DraftItem, "id" | "courseId">>) => void;
  removeDraft: (id: string) => void;
  /** Элементы, добавленные в конкретный модуль */
  draftsOf: (courseId: string, moduleId: string) => DraftItem[];
  /** Модули, добавленные в курс */
  modulesOf: (courseId: string) => DraftModule[];
  findDraft: (id: string) => DraftItem | undefined;
  enterPreview: () => void;
  exitPreview: () => void;
  resetDemo: (mode?: "default" | "empty") => void;
  fullName: string;
  initials: string;
  toast: (text: string, kind?: ToastKind) => void;
  toasts: Toast[];
}

type ToastKind = "info" | "success" | "error";
interface Toast {
  id: number;
  text: string;
  kind: ToastKind;
}

const StoreContext = createContext<Ctx | null>(null);
const KEY = "lms-preview-v2";

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(initialState);
  const [ready, setReady] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  /** Снимок состояния на входе в предпросмотр — выход возвращает всё как было */
  const [snapshot, setSnapshot] = useState<State | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initialState(), ...JSON.parse(raw) });
    } catch {
      /* повреждённое хранилище — стартуем с дефолта */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* приватный режим — просто не сохраняем */
    }
  }, [state, ready]);

  const set = useCallback((patch: Partial<State> | ((s: State) => Partial<State>)) => {
    setState((s) => ({ ...s, ...(typeof patch === "function" ? patch(s) : patch) }));
  }, []);

  const toast = useCallback((text: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo<Ctx>(() => {
    const p = state.profile;
    const fullName = [p.lastName, p.firstName, p.middleName].filter(Boolean).join(" ");
    const initials =
      ((p.firstName?.[0] ?? "") + (p.lastName?.[0] ?? "")).toUpperCase() || "??";

    return {
      ...state,
      ready,
      t: dict[state.lang],
      set,
      setLang: (l) => set({ lang: l }),

      requestAccess: (courseId) =>
        set((s) =>
          s.enrolled.includes(courseId) || courseId in s.requests
            ? {}
            : { requests: { ...s.requests, [courseId]: 0 } },
        ),
      grantAccess: (courseId) =>
        set((s) => {
          const requests = { ...s.requests };
          delete requests[courseId];
          return {
            requests,
            enrolled: s.enrolled.includes(courseId) ? s.enrolled : [...s.enrolled, courseId],
            completed: { ...s.completed, [courseId]: s.completed[courseId] ?? [] },
          };
        }),
      revokeAccess: (courseId) =>
        set((s) => ({ enrolled: s.enrolled.filter((c) => c !== courseId) })),
      access: (courseId) =>
        state.enrolled.includes(courseId)
          ? "granted"
          : courseId in state.requests
            ? "requested"
            : "none",
      isEnrolled: (courseId) => state.enrolled.includes(courseId),
      requestDays: (courseId) => state.requests[courseId] ?? null,

      completeLesson: (courseId, lessonId) =>
        set((s) => {
          const list = s.completed[courseId] ?? [];
          if (list.includes(lessonId)) return {};
          return { completed: { ...s.completed, [courseId]: [...list, lessonId] } };
        }),
      uncompleteLesson: (courseId, lessonId) =>
        set((s) => ({
          completed: {
            ...s.completed,
            [courseId]: (s.completed[courseId] ?? []).filter((l) => l !== lessonId),
          },
        })),
      isCompleted: (courseId, lessonId) => (state.completed[courseId] ?? []).includes(lessonId),

      saveQuiz: (quizId, r) =>
        set((s) => {
          const prev = s.attempts[quizId] ?? [];
          const attempt: QuizAttempt = { ...r, id: `a-${quizId}-${prev.length + 1}` };
          return {
            quizzes: { ...s.quizzes, [quizId]: r },
            attempts: { ...s.attempts, [quizId]: [...prev, attempt] },
            quizRetakes: s.quizRetakes.filter((q) => q !== quizId),
          };
        }),
      allowRetake: (quizId) =>
        set((s) => ({
          quizRetakes: s.quizRetakes.includes(quizId) ? s.quizRetakes : [...s.quizRetakes, quizId],
        })),
      setTask: (taskId, status) => set((s) => ({ tasks: { ...s.tasks, [taskId]: status } })),

      markAllRead: () => set({ readNotifications: [...notificationIds] }),
      markRead: (id) =>
        set((s) =>
          s.readNotifications.includes(id)
            ? {}
            : { readNotifications: [...s.readNotifications, id] },
        ),
      issueCert: (courseId) =>
        set((s) => (s.certs.includes(courseId) ? {} : { certs: [...s.certs, courseId] })),
      rateCourse: (courseId, stars) =>
        set((s) => ({ ratings: { ...s.ratings, [courseId]: stars } })),
      setStrict: (courseId, strict) =>
        set((s) => ({
          strictCourses: strict
            ? Array.from(new Set([...s.strictCourses, courseId]))
            : s.strictCourses.filter((c) => c !== courseId),
        })),
      isStrict: (courseId) => state.strictCourses.includes(courseId),

      addReply: (threadId, reply) =>
        set((s) => ({
          threadReplies: {
            ...s.threadReplies,
            [threadId]: [...(s.threadReplies[threadId] ?? []), reply],
          },
        })),
      repliesFor: (threadId, base) => [...base, ...(state.threadReplies[threadId] ?? [])],
      replyToReview: (id, text) =>
        set((s) => ({ reviewReplies: { ...s.reviewReplies, [id]: text } })),
      hideReview: (id) =>
        set((s) =>
          s.hiddenReviews.includes(id) ? {} : { hiddenReviews: [...s.hiddenReviews, id] },
        ),
      setLeadStatus: (id, status) =>
        set((s) => ({ leadStatus: { ...s.leadStatus, [id]: status } })),
      revokeSession: (id) =>
        set((s) =>
          s.revokedSessions.includes(id) ? {} : { revokedSessions: [...s.revokedSessions, id] },
        ),
      revokeOtherSessions: () => set({ revokedSessions: ["s-2", "s-3"] }),

      addModule: (courseId, title) => {
        const mod: DraftModule = { id: `dm${Date.now()}`, courseId, title };
        set((s) => ({ draftModules: [...s.draftModules, mod] }));
        return mod;
      },
      addItem: (item) => {
        const created: DraftItem = { ...item, id: `d${Date.now()}` };
        set((s) => ({ draftItems: [...s.draftItems, created] }));
        return created;
      },
      updateDraft: (id, patch) =>
        set((s) => ({
          draftItems: s.draftItems.map((d) => (d.id === id ? { ...d, ...patch } : d)),
        })),
      removeDraft: (id) =>
        set((s) => ({ draftItems: s.draftItems.filter((d) => d.id !== id) })),
      draftsOf: (courseId, moduleId) =>
        state.draftItems.filter((d) => d.courseId === courseId && d.moduleId === moduleId),
      modulesOf: (courseId) => state.draftModules.filter((m) => m.courseId === courseId),
      findDraft: (id) => state.draftItems.find((d) => d.id === id),

      enterPreview: () => {
        setSnapshot(state);
        set({ preview: true });
      },
      exitPreview: () => {
        if (snapshot) setState({ ...snapshot, preview: false, lang: state.lang });
        else set({ preview: false });
        setSnapshot(null);
      },

      resetDemo: (mode = "default") => {
        const next = mode === "empty" ? emptyState() : initialState();
        next.lang = state.lang;
        setSnapshot(null);
        setState(next);
      },
      fullName,
      initials,
      toast,
      toasts,
    };
  }, [state, ready, set, toast, toasts, snapshot]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore должен вызываться внутри <StoreProvider>");
  return ctx;
}

/** Ответы на отзывы и вопросы, заготовленные в моках, плюс добавленные админом. */
export function useModeration() {
  const { reviewReplies, hiddenReviews, threadReplies } = useStore();
  return {
    reviewReply: (id: string) =>
      reviewReplies[id] ?? adminReviews.find((r) => r.id === id)?.reply?.text ?? null,
    isHidden: (id: string) => hiddenReviews.includes(id),
    replyCount: (id: string) =>
      (adminQuestions.find((q) => q.id === id)?.replies.length ?? 0) +
      (threadReplies[id]?.length ?? 0),
  };
}
