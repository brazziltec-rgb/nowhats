import { useState } from 'react';
import { Eye, EyeOff, Loader2, User, Mail, Lock, Phone } from 'lucide-react';
import { authAPI } from '../../lib/api';

// Componente para validação de senha
const PasswordValidation: React.FC<{ validation: any }> = ({ validation }) => (
  <div className="space-y-1">
    <div className={`flex items-center text-xs ${
      validation.minLength ? 'text-green-600' : 'text-red-500'
    }`}>
      <span className="mr-1">{validation.minLength ? '✓' : '✗'}</span>
      Pelo menos 6 caracteres
    </div>
    <div className={`flex items-center text-xs ${
      validation.hasLowerCase ? 'text-green-600' : 'text-red-500'
    }`}>
      <span className="mr-1">{validation.hasLowerCase ? '✓' : '✗'}</span>
      Uma letra minúscula
    </div>
    <div className={`flex items-center text-xs ${
      validation.hasUpperCase ? 'text-green-600' : 'text-red-500'
    }`}>
      <span className="mr-1">{validation.hasUpperCase ? '✓' : '✗'}</span>
      Uma letra maiúscula
    </div>
    <div className={`flex items-center text-xs ${
      validation.hasNumber ? 'text-green-600' : 'text-red-500'
    }`}>
      <span className="mr-1">{validation.hasNumber ? '✓' : '✗'}</span>
      Um número
    </div>
  </div>
);

interface AuthFormProps {
  onSuccess: (user: any, token: string) => void;
}

const AuthForm = ({ onSuccess }: AuthFormProps) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: ''
  });

  const validatePassword = (password: string) => {
    const minLength = password.length >= 6;
    const hasLowerCase = /[a-z]/.test(password);
    const hasUpperCase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    return {
      minLength,
      hasLowerCase,
      hasUpperCase,
      hasNumber,
      isValid: minLength && hasLowerCase && hasUpperCase && hasNumber
    };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Limpar erro ao digitar
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validação adicional no frontend para registro
    if (!isLogin) {
      if (!formData.name.trim()) {
        setError('Nome é obrigatório');
        setLoading(false);
        return;
      }
      
      const passwordValidation = validatePassword(formData.password);
      if (!passwordValidation.isValid) {
        setError('A senha deve ter pelo menos 6 caracteres, incluindo uma letra minúscula, uma maiúscula e um número');
        setLoading(false);
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError('As senhas não coincidem');
        setLoading(false);
        return;
      }
    }

    try {
      let response;
      
      if (isLogin) {
        response = await authAPI.login({
          email: formData.email,
          password: formData.password
        });
      } else {
        response = await authAPI.register({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
          phone: formData.phone || undefined
        });
      }

      if (response.data.success) {
        const { user, tokens } = response.data.data;
        localStorage.setItem('auth_token', tokens.accessToken);
        localStorage.setItem('refresh_token', tokens.refreshToken);
        onSuccess(user, tokens.accessToken);
      } else {
        setError(response.data.message || 'Erro na autenticação');
      }
    } catch (err: any) {
      console.error('Erro na autenticação:', err);
      
      // Tratar diferentes tipos de erro
      let errorMessage = 'Erro de conexão. Verifique se o servidor está rodando.';
      
      if (err.response) {
        // Erro com resposta do servidor
        const status = err.response.status;
        const data = err.response.data;
        
        switch (status) {
          case 429:
            // Rate limiting
            const retryAfter = data?.retryAfter || 900;
            const minutes = Math.ceil(retryAfter / 60);
            errorMessage = `Muitas tentativas de login. Aguarde ${minutes} minuto${minutes > 1 ? 's' : ''} antes de tentar novamente.`;
            break;
            
          case 401:
            // Credenciais inválidas
            errorMessage = data?.message || 'Email ou senha incorretos.';
            break;
            
          case 400:
            // Dados inválidos
            errorMessage = data?.message || 'Dados inválidos. Verifique as informações fornecidas.';
            break;
            
          case 409:
            // Conflito (email já existe)
            errorMessage = data?.message || 'Este email já está em uso.';
            break;
            
          case 500:
            // Erro interno do servidor
            errorMessage = 'Erro interno do servidor. Tente novamente em alguns minutos.';
            break;
            
          default:
            errorMessage = data?.message || `Erro ${status}: ${err.message}`;
        }
      } else if (err.message) {
        // Erro de rede ou outro tipo
        if (err.message.includes('Network Error') || err.message.includes('ECONNREFUSED')) {
          errorMessage = 'Não foi possível conectar ao servidor. Verifique sua conexão e se o servidor está rodando.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {isLogin ? 'Acesse sua conta' : 'Crie sua conta para começar'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
            <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome Completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-whatsapp-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Seu nome completo"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-whatsapp-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="seu@email.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-12 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-whatsapp-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Sua senha"
                required
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {!isLogin && formData.password && (
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-600 dark:text-gray-400">Requisitos da senha:</p>
                <PasswordValidation validation={validatePassword(formData.password)} />
              </div>
            )}
            {!isLogin && !formData.password && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                A senha deve conter pelo menos 6 caracteres, uma letra minúscula, uma maiúscula e um número
              </p>
            )}
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirmar Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className={`w-full pl-10 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-whatsapp-green focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    formData.confirmPassword && formData.password
                      ? formData.password === formData.confirmPassword
                        ? 'border-green-500 dark:border-green-400'
                        : 'border-red-500 dark:border-red-400'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Confirme sua senha"
                  required
                />
              </div>
              {formData.confirmPassword && formData.password && (
                <div className={`mt-1 text-xs flex items-center ${
                  formData.password === formData.confirmPassword
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-500 dark:text-red-400'
                }`}>
                  <span className="mr-1">
                    {formData.password === formData.confirmPassword ? '✓' : '✗'}
                  </span>
                  {formData.password === formData.confirmPassword
                    ? 'As senhas coincidem'
                    : 'As senhas não coincidem'
                  }
                </div>
              )}
            </div>
          )}

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Telefone (opcional)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-whatsapp-green focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-whatsapp-green hover:bg-whatsapp-green/90 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="animate-spin" size={18} />}
            {isLogin ? 'Entrar' : 'Criar Conta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
              setFormData({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
            }}
            className="text-whatsapp-green hover:text-whatsapp-green/80 text-sm font-medium"
          >
            {isLogin ? 'Não tem uma conta? Criar conta' : 'Já tem uma conta? Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthForm;