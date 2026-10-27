import { Suspense, lazy } from "react";
import Notch from "./components/Notch";
import TypingTest from "./components/TypingTest";
import { SettingsProvider } from "./contexts/SettingsContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { UIProvider } from "./contexts/UIContext";
import { AuthProvider } from "./hooks/useAuth";
import { useRoute } from "./utils/router";

const Reports = lazy(() => import("./components/Reports"));

function App() {
  const path = useRoute();
  const onReports = path === "/reports";

  return (
    <ThemeProvider>
      <SettingsProvider>
        <AuthProvider>
          <UIProvider>
            <Notch />
            {onReports ? (
              <Suspense
                fallback={
                  <main className="page-loading" aria-busy="true">
                    Loading reports…
                  </main>
                }
              >
                <Reports />
              </Suspense>
            ) : (
              <TypingTest />
            )}
          </UIProvider>
        </AuthProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}

export default App;
