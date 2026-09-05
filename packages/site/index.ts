/**
 * Общие экраны площадки. Сами экраны — в `@lms/site/screens`, кадр и адреса
 * приложения — в `@lms/site/host`. Здесь то, что нужно самому приложению:
 * заслонки заблокированного аккаунта и незаконченного онбординга плюс разбор
 * уведомлений — их же показывает колокольчик в шапке, а шапка у каждой
 * площадки своя.
 *
 * Помощники формы профиля (`lib/userForm`) наружу не отдаются: ими пользуются
 * только экраны пакета, и публичным API это делать незачем.
 */

export { BlockedGate } from "./components/BlockedGate";
export { OnboardingGate } from "./components/OnboardingGate";
export {
  NOTIF_ICONS,
  markRead,
  notificationHref,
  onNotificationsChanged,
} from "./lib/notifications";
