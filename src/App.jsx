import React from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import AuthScreens from '@/components/auth/AuthScreens';
import { AnimatePresence, motion } from 'framer-motion';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const PageTransition = ({ children }) => (
  <motion.div
    initial={{ opacity: 0, x: 10 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -10 }}
    transition={{ duration: 0.18, ease: 'easeOut' }}
    style={{ height: '100%' }}
  >
    {children}
  </motion.div>
);

const AnimatedRoutes = ({ Pages, Layout, mainPageKey, MainPage }) => {
  const location = useLocation();
  // Nome da página atual derivado da rota. O Layout fica montado de forma
  // persistente (fora do <AnimatePresence>), então não re-monta a cada
  // navegação — apenas o conteúdo da página anima. Isso elimina a "piscada".
  const currentPageName =
    location.pathname === '/' ? mainPageKey : location.pathname.slice(1);
  const LayoutWrapper = Layout
    ? ({ children }) => <Layout currentPageName={currentPageName}>{children}</Layout>
    : ({ children }) => <>{children}</>;

  return (
    <LayoutWrapper>
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={
            <PageTransition><MainPage /></PageTransition>
          } />
          {Object.entries(Pages).map(([path, Page]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={<PageTransition><Page /></PageTransition>}
            />
          ))}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </AnimatePresence>
    </LayoutWrapper>
  );
};

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated } = useAuth();

  // Spinner enquanto verifica o token
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Não autenticado: telas de login/registro/redefinição (dentro do app)
  if (!isAuthenticated) {
    return <AuthScreens />;
  }

  // Autenticado: app principal
  return <AnimatedRoutes Pages={Pages} Layout={Layout} mainPageKey={mainPageKey} MainPage={MainPage} />;
};


function App() {
  // O app é desenhado para o tema claro (cartões brancos, cores slate). Garante
  // que o modo escuro do sistema operacional não seja aplicado — senão o texto
  // dos inputs fica branco sobre fundo branco.
  React.useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App