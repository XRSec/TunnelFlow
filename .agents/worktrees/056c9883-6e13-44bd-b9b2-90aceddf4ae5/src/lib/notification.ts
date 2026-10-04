export function sendNotification(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (Notification.permission === "granted") {
    new Notification(title, { body });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification(title, { body });
      }
    });
  }
}
