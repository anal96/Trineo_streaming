import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register Service Worker early on window load
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => {
        console.log('Service Worker registered from main.tsx:', reg.scope);
      })
      .catch(err => {
        console.error('Service Worker registration failed from main.tsx:', err);
      });
  });
}