import React, { useState } from 'react';
import { Routes, Route, Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Truck, Loader2 } from 'lucide-react';
import GoogleButton, { GOOGLE_CLIENT_ID } from './GoogleButton';

function Shell({ title, subtitle, children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-2xl mb-4 shadow-lg shadow-emerald-500/20">
            <Truck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">TransportaBR</h1>
          {subtitle && <p className="text-slate-400">{subtitle}</p>}
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {title && <h2 className="text-lg font-semibold text-slate-800 mb-6">{title}</h2>}
          {children}
        </div>
      </div>
    </div>
  );
}

function ErrorMsg({ children }) {
  if (!children) return null;
  return <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{children}</p>;
}

function SocialBlock({ onError }) {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const handleGoogle = async (credential) => {
    try {
      await loginWithGoogle(credential);
      navigate('/');
    } catch (e) {
      onError(e.message || 'Falha no login com Google');
    }
  };
  if (!GOOGLE_CLIENT_ID) return null;
  return (
    <div className="mt-6">
      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-white px-2 text-slate-400">ou continue com</span>
        </div>
      </div>
      <GoogleButton onCredential={handleGoogle} onError={(e) => onError(e.message)} />
    </div>
  );
}

function LoginScreen() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetHint, setResetHint] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setResetHint(false);
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      if (err.data?.code === 'PASSWORD_RESET_REQUIRED') {
        setResetHint(true);
        setError(err.data.message);
      } else {
        setError(err.message || 'Não foi possível entrar');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell subtitle="Entre na sua conta">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-slate-700">E-mail</Label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">Senha</Label>
          <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>
        <ErrorMsg>{error}</ErrorMsg>
        {resetHint && (
          <Link to="/forgot-password" className="block text-sm text-emerald-600 font-medium">
            Definir/redefinir minha senha →
          </Link>
        )}
        <Button type="submit" disabled={loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Entrar'}
        </Button>
      </form>

      <SocialBlock onError={setError} />

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link to="/forgot-password" className="text-slate-500 hover:text-slate-700">Esqueci a senha</Link>
        <Link to="/register" className="text-emerald-600 font-medium">Criar conta</Link>
      </div>
    </Shell>
  );
}

function RegisterScreen() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Não foi possível criar a conta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell subtitle="Crie sua conta">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label className="text-slate-700">Nome</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">E-mail</Label>
          <Input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="h-11" />
        </div>
        <div className="space-y-2">
          <Label className="text-slate-700">Senha (mín. 6 caracteres)</Label>
          <Input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-11" />
        </div>
        <ErrorMsg>{error}</ErrorMsg>
        <Button type="submit" disabled={loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Criar conta'}
        </Button>
      </form>
      <SocialBlock onError={setError} />
      <div className="mt-6 text-sm text-center">
        <Link to="/login" className="text-emerald-600 font-medium">Já tenho conta — entrar</Link>
      </div>
    </Shell>
  );
}

function ForgotScreen() {
  const { forgotPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Shell subtitle="Recuperar acesso">
      {sent ? (
        <div className="space-y-4">
          <p className="text-slate-700">
            Se o e-mail existir, enviamos um link para definir sua senha. Verifique sua caixa de entrada.
          </p>
          <Link to="/login" className="block text-emerald-600 font-medium">← Voltar ao login</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-slate-500">
            Informe seu e-mail e enviaremos um link para definir ou redefinir sua senha.
          </p>
          <div className="space-y-2">
            <Label className="text-slate-700">E-mail</Label>
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-11" />
          </div>
          <Button type="submit" disabled={loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar link'}
          </Button>
          <Link to="/login" className="block text-sm text-slate-500 text-center">Voltar ao login</Link>
        </form>
      )}
    </Shell>
  );
}

function ResetScreen() {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const email = params.get('email') || '';
  const token = params.get('token') || '';
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await resetPassword(email, token, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Não foi possível redefinir a senha');
    } finally {
      setLoading(false);
    }
  };

  if (!email || !token) {
    return (
      <Shell subtitle="Link inválido">
        <p className="text-slate-700">Este link de redefinição é inválido ou está incompleto.</p>
        <Link to="/forgot-password" className="block mt-4 text-emerald-600 font-medium">Solicitar novo link</Link>
      </Shell>
    );
  }

  return (
    <Shell subtitle="Definir nova senha">
      <form onSubmit={submit} className="space-y-4">
        <p className="text-sm text-slate-500">Definindo a senha para <strong>{email}</strong>.</p>
        <div className="space-y-2">
          <Label className="text-slate-700">Nova senha (mín. 6 caracteres)</Label>
          <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
        </div>
        <ErrorMsg>{error}</ErrorMsg>
        <Button type="submit" disabled={loading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-base font-semibold">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar e entrar'}
        </Button>
      </form>
    </Shell>
  );
}

/** Rotas exibidas quando o usuário NÃO está autenticado. */
export default function AuthScreens() {
  return (
    <Routes>
      <Route path="/login" element={<LoginScreen />} />
      <Route path="/register" element={<RegisterScreen />} />
      <Route path="/forgot-password" element={<ForgotScreen />} />
      <Route path="/reset-password" element={<ResetScreen />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
